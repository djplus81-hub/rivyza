import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { AccessToken, RoomServiceClient } from 'livekit-server-sdk';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const json = (body, status = 200) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } });

async function authenticate(req) {
  const bearer = req.headers.get('authorization') || '';
  if (!bearer.startsWith('Bearer ')) return null;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) throw new Error('Supabase no está configurado');
  const client = createClient(url, anon, {
    global: { headers: { Authorization: bearer } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await client.auth.getUser(bearer.slice(7));
  if (error || !data.user) return null;
  return { user: data.user, client };
}

function adminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error('Falta SUPABASE_SERVICE_ROLE_KEY en Vercel');
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function isModerator(db, roomId, uid) {
  const { data, error } = await db.from('rivyza_live_moderators').select('user_id').eq('room_id', roomId).eq('user_id', uid).maybeSingle();
  if (error) throw error;
  return Boolean(data);
}
function roomService() {
  const url = process.env.LIVEKIT_URL;
  if (!url || !process.env.LIVEKIT_API_KEY || !process.env.LIVEKIT_API_SECRET) throw new Error('LiveKit no está configurado');
  return new RoomServiceClient(url.replace(/^wss:/, 'https:').replace(/^ws:/, 'http:'), process.env.LIVEKIT_API_KEY, process.env.LIVEKIT_API_SECRET);
}
async function liveParticipant(roomId, guestId) {
  return (await roomService().listParticipants(`rivyza-${roomId}`)).find(p => p.identity === guestId);
}
async function getRoom(db, id) {
  const { data, error } = await db.from('rivyza_live_rooms')
    .select('id,host_id,title,status,created_at').eq('id', id).maybeSingle();
  if (error) throw error;
  return data;
}

export async function GET(req) {
  try {
    if (process.env.RIVYZA_LIVE_BETA_ENABLED !== 'true') return json({ error: 'LIVE aún está en preparación' }, 503);
    const auth = await authenticate(req);
    if (!auth) return json({ error: 'Inicia sesión' }, 401);
    const db = adminClient();
    const params = new URL(req.url).searchParams;
    if (params.get('mode') === 'blocked') {
      const room = await getRoom(db, params.get('room'));
      if (!room || (room.host_id !== auth.user.id && !(await isModerator(db,room.id,auth.user.id)))) return json({error:'No autorizado'},403);
      const {data: blocked,error} = await db.from('rivyza_live_blocks').select('user_id,created_at,reason,blocked_by').eq('host_id',room.host_id).order('created_at',{ascending:false});
      if(error) throw error;
      const ids=(blocked||[]).map(x=>x.user_id);
      let profiles=[];
      if(ids.length){const r=await db.from('profiles').select('id,display_name,username').in('id',ids);if(r.error) throw r.error;profiles=r.data||[];}
      const byId=new Map(profiles.map(p=>[p.id,p]));
      return json({blocked:(blocked||[]).map(b=>({...b,...byId.get(b.user_id)}))});
    }
    if (params.get('mode') === 'requests') {
      const room = await getRoom(db, params.get('room'));
      if (!room || room.status !== 'live' || (room.host_id !== auth.user.id && !(await isModerator(db, room.id, auth.user.id)))) return json({ error: 'No autorizado' }, 403);
      const { data, error } = await db.from('rivyza_live_camera_requests')
        .select('user_id,status,created_at').eq('room_id', room.id).order('created_at');
      if (error) throw error;
      // Pending requests are valid only while the requester is actually in the LiveKit room.
      // LiveKit is the source of truth for presence; Supabase stores the request decision.
      const pending = (data || []).filter(item => item.status === 'pending');
      if (pending.length) {
        const connected = new Set((await roomService().listParticipants(`rivyza-${room.id}`)).map(p => p.identity));
        const absent = pending.filter(item => !connected.has(item.user_id)).map(item => item.user_id);
        if (absent.length) {
          const { error: cleanupError } = await db.from('rivyza_live_camera_requests')
            .update({ status: 'rejected' }).eq('room_id', room.id).eq('status', 'pending').in('user_id', absent);
          if (cleanupError) throw cleanupError;
        }
        return json({ requests: (data || []).filter(item => item.status !== 'pending' || connected.has(item.user_id)) });
      }
      return json({ requests: data || [] });
    }
    const { data, error } = await db.from('rivyza_live_rooms')
      .select('id,host_id,title,created_at').eq('status', 'live')
      .order('created_at', { ascending: false }).limit(50);
    if (error) throw error;
    const ids = [...new Set((data || []).map(r => r.host_id))];
    let profiles = [];
    if (ids.length) {
      const { data: rows, error: profileError } = await db.from('profiles')
        .select('id,display_name,username,avatar_url').in('id', ids);
      if (profileError) throw profileError;
      profiles = rows || [];
    }
    const byId = new Map(profiles.map(p => [p.id, p]));
    return json({ rooms: (data || []).map(r => ({
      ...r,
      host_name: byId.get(r.host_id)?.display_name || byId.get(r.host_id)?.username || 'Usuario RIVYZA',
      host_avatar: byId.get(r.host_id)?.avatar_url || null,
    })) });
  } catch (e) { return json({ error: e.message || 'Error de LIVE' }, 500); }
}

export async function POST(req) {
  try {
    if (process.env.RIVYZA_LIVE_BETA_ENABLED !== 'true') return json({ error: 'LIVE aún está en preparación' }, 503);
    const auth = await authenticate(req);
    if (!auth) return json({ error: 'Inicia sesión' }, 401);
    const input = await req.json();
    const db = adminClient();
    const uid = auth.user.id;
    if (input.action === 'start') {
      // Todos los usuarios autenticados pueden iniciar su propio LIVE.
      // Las sanciones LIVE deberán validarse aquí cuando se habilite el control disciplinario.
      // Rejoin an existing LIVE instead of violating the one-LIVE-per-host constraint.
      const { data: existing, error: existingError } = await db.from('rivyza_live_rooms')
        .select('id').eq('host_id', uid).eq('status', 'live').order('created_at', { ascending: false }).limit(1).maybeSingle();
      if (existingError) throw existingError;
      if (existing) return json({ roomId: existing.id, resumed: true });
      const { data, error } = await db.from('rivyza_live_rooms')
        .insert({ host_id: uid, title: String(input.title || 'RIVYZA LIVE').slice(0, 80) })
        .select('id').single();
      if (error) throw error;
      return json({ roomId: data.id });
    }
    if (!input.roomId || typeof input.roomId !== 'string') return json({ error: 'Sala inválida' }, 400);
    const room = await getRoom(db, input.roomId);
    if (!room || room.status !== 'live') return json({ error: 'El LIVE ya terminó' }, 404);
    const isHost = room.host_id === uid;
    const moderator = !isHost && await isModerator(db, room.id, uid);
    const canModerate = isHost || moderator;
    if (input.action === 'block_guest' || input.action === 'unblock_guest') {
      if(!canModerate) return json({error:'No autorizado'},403);
      if(!input.guestId || input.guestId===room.host_id || (input.action==='block_guest' && input.guestId===uid)) return json({error:'Usuario inválido'},400);
      if(input.action==='block_guest') {
        const {error}=await db.from('rivyza_live_blocks').upsert({host_id:room.host_id,user_id:input.guestId,blocked_by:uid,reason:String(input.reason||'Bloqueo del LIVE').slice(0,300)},{onConflict:'host_id,user_id'});
        if(error) throw error;
        const {error:requestError}=await db.from('rivyza_live_camera_requests').update({status:'rejected'}).eq('room_id',room.id).eq('user_id',input.guestId);
        if(requestError) throw requestError;
        const guest=await liveParticipant(room.id,input.guestId);
        if(guest) await roomService().removeParticipant(`rivyza-${room.id}`,input.guestId);
      } else {
        const {error}=await db.from('rivyza_live_blocks').delete().eq('host_id',room.host_id).eq('user_id',input.guestId);
        if(error) throw error;
      }
      return json({ok:true});
    }
    if (input.action === 'moderator_add'  || input.action === 'moderator_remove') {
      if (!isHost) return json({ error: 'Solo el anfitrión asigna moderadores' }, 403);
      if (!input.guestId || input.guestId === room.host_id) return json({ error: 'Usuario inválido' }, 400);
      if (input.action === 'moderator_add' ) {
        const { error } = await db.from('rivyza_live_moderators').upsert({ room_id: room.id, user_id: input.guestId, assigned_by: uid }, { onConflict: 'room_id,user_id' });
        if (error) throw error;
      } else {
        const { error } = await db.from('rivyza_live_moderators').delete().eq('room_id', room.id).eq('user_id', input.guestId);
        if (error) throw error;
      }
      return json({ ok: true });
    }
    if (['mute_guest', 'camera_off_guest', 'lower_guest', 'kick_guest'].includes(input.action)) {
      if (!canModerate) return json({ error: 'No tienes permisos de moderación' }, 403);
      if (!input.guestId || input.guestId === room.host_id || input.guestId === uid) return json({ error: 'No puedes administrar esa cámara' }, 403);
      const guest = await liveParticipant(room.id, input.guestId);
      if (input.action === 'mute_guest' || input.action === 'camera_off_guest') {
        if (!guest) return json({ error: 'Participante desconectado' }, 404);
        const kind = input.action === 'mute_guest' ? 0 : 1;
        const track = guest.tracks?.find(t => t.type === kind && !t.muted);
        if (!track) return json({ error: 'Ese dispositivo ya está apagado' }, 409);
        await roomService().mutePublishedTrack(`rivyza-${room.id}`, input.guestId, track.sid, true);
      } else {
        const { error } = await db.from('rivyza_live_camera_requests').update({ status: 'rejected' }).eq('room_id', room.id).eq('user_id', input.guestId);
        if (error) throw error;
        if (guest) await roomService().removeParticipant(`rivyza-${room.id}`, input.guestId);
        if (input.action === 'kick_guest') {
          const reason = String(input.reason || '').trim();
          if (!reason) return json({ error: 'Selecciona un motivo' }, 400);
          const { error: reportError } = await db.from('rivyza_live_expulsion_reports').insert({room_id:room.id,host_id:room.host_id,reported_user_id:input.guestId,reported_by:uid,reason,details:String(input.details || '').slice(0,1000)});
          if (reportError) throw reportError;
        }
      }
      return json({ ok:true });
    }
    if (input.action === 'stop') {
      if (room.host_id !== uid) return json({ error: 'No autorizado' }, 403);
      const { error } = await db.from('rivyza_live_rooms').update({ status: 'ended', ended_at: new Date().toISOString() }).eq('id', room.id);
      if (error) throw error;
      return json({ ok: true });
    }
    if (input.action === 'request') {
      const {data: blocked,error: blockError}=await db.from('rivyza_live_blocks').select('user_id').eq('host_id',room.host_id).eq('user_id',uid).maybeSingle();
      if(blockError) throw blockError;
      if(blocked) return json({error:'No tienes acceso a este LIVE'},403);
      if (room.host_id === uid) return json({ error: 'Ya eres el anfitrión' }, 400);
      const { error } = await db.from('rivyza_live_camera_requests')
        .upsert({ room_id: room.id, user_id: uid, status: 'pending' }, { onConflict: 'room_id,user_id' });
      if (error) throw error;
      return json({ ok: true });
    }
    if (input.action === 'cancel_request') {
      // A viewer leaving the room withdraws their own pending request.
      const { error } = await db.from('rivyza_live_camera_requests')
        .update({ status: 'rejected' }).eq('room_id', room.id).eq('user_id', uid).eq('status', 'pending');
      if (error) throw error;
      return json({ ok: true });
    }
    if (input.action === 'leave_camera') {
      if (room.host_id === uid) return json({ error: 'El anfitrión no puede bajar de cámara' }, 403);
      const { error } = await db.from('rivyza_live_camera_requests')
        .update({ status: 'rejected' }).eq('room_id', room.id).eq('user_id', uid);
      if (error) throw error;
      return json({ ok: true });
    }
    if (input.action === 'reject') {
      if (!canModerate) return json({ error: 'No autorizado' }, 403);
      const { error } = await db.from('rivyza_live_camera_requests').update({ status: 'rejected' })
        .eq('room_id', room.id).eq('user_id', input.guestId).eq('status', 'pending');
      if (error) throw error;
      return json({ ok: true });
    }
    if (input.action === 'approve') {
      if (!canModerate) return json({ error: 'No autorizado' }, 403);
      const { error } = await auth.client.rpc('rivyza_live_approve_camera', { p_room: room.id, p_guest: input.guestId });
      if (error) throw error;
      return json({ ok: true });
    }
    if (input.action === 'token') {
      const {data: blocked,error: blockError}=await db.from('rivyza_live_blocks').select('user_id').eq('host_id',room.host_id).eq('user_id',uid).maybeSingle();
      if(blockError) throw blockError;
      if(blocked) return json({error:'No tienes acceso a este LIVE'},403);
      const { data: guest, error } = await db.from('rivyza_live_camera_requests')
        .select('status').eq('room_id', room.id).eq('user_id', uid).maybeSingle();
      if (error) throw error;
      const publish = room.host_id === uid || guest?.status === 'approved';
      const { data: moderators, error: modError } = await db.from('rivyza_live_moderators').select('user_id').eq('room_id', room.id);
      if (modError) throw modError;
      const moderatorIds = (moderators || []).map(x => x.user_id);
      const mod = moderatorIds.includes(uid);
      const key = process.env.LIVEKIT_API_KEY;
      const secret = process.env.LIVEKIT_API_SECRET;
      const serverUrl = process.env.LIVEKIT_URL;
      if (!key || !secret || !serverUrl) return json({ error: 'Faltan las claves de LiveKit en Vercel' }, 503);
      const { data: publicProfile } = await db.from('profiles').select('display_name,username').eq('id', uid).maybeSingle();
      const token = new AccessToken(key, secret, {
        identity: uid, name: publicProfile?.display_name || publicProfile?.username || 'Usuario RIVYZA', ttl: '15m',
      });
      token.addGrant({ roomJoin: true, room: `rivyza-${room.id}`, canPublish: publish, canSubscribe: true, canPublishData: publish || mod });
      return json({ token: await token.toJwt(), serverUrl, publish, host: room.host_id === uid, hostId: room.host_id, moderator: mod, moderatorIds });
    }
    return json({ error: 'Acción inválida' }, 400);
  } catch (e) { return json({ error: e.message || 'No se pudo procesar LIVE' }, 500); }
}
