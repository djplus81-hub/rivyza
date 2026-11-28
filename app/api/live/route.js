import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { AccessToken, RoomServiceClient, IngressClient } from 'livekit-server-sdk';
import { cleanupAbsentHosts } from './cleanup-hosts';

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

async function isModerator(db, hostId, uid) {
  const { data, error } = await db.from('rivyza_live_permanent_moderators').select('user_id').eq('host_id', hostId).eq('user_id', uid).maybeSingle();
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
function effectivePositions(metadata, members, hostId, slots) {
  const ids = [...new Set([hostId,...members.filter(p=>p.permission?.canPublish).map(p=>p.identity)])].sort((a,b)=>a===hostId?-1:b===hostId?1:a.localeCompare(b));
  const result={}, used=new Set();
  for(const [id,n] of Object.entries(metadata.rivyzaLayout?.positions||{})){if(Number.isInteger(n)&&n>=0&&n<slots&&!used.has(n)){result[id]=n;used.add(n);}}
  for(const id of ids){if(result[id]!==undefined)continue;const n=metadata.rivyzaLayout?.positions?.[id] ?? (id===hostId?0:undefined);if(Number.isInteger(n)&&n>=0&&n<slots&&!used.has(n)){result[id]=n;used.add(n);}}
  for(const id of ids){if(result[id]!==undefined)continue;const n=Array.from({length:slots},(_,i)=>i).find(i=>!used.has(i));if(n!==undefined){result[id]=n;used.add(n);}}
  return result;
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
    if (params.get('mode') === 'layout') {
      const room = await getRoom(db, params.get('room'));
      if (!room || room.status !== 'live') return json({error:'El LIVE ya terminó'},404);
      const {data:blocked,error} = await db.from('rivyza_live_blocks').select('user_id').eq('host_id',room.host_id).eq('user_id',auth.user.id).maybeSingle();
      if(error) throw error;
      if(blocked) return json({error:'No autorizado'},403);
      const [info] = await roomService().listRooms([`rivyza-${room.id}`]);
      if(!info) return json({error:'Sala no disponible'},409);
      const metadata = JSON.parse(info.metadata || '{}');
      const saved = metadata.rivyzaLayout || {slots:10,positions:{}};
      const members = await roomService().listParticipants(`rivyza-${room.id}`);
      return json({layout:{...saved,positions:effectivePositions(metadata,members,room.host_id,saved.slots)}});
    }
    if (params.get('mode') === 'likes_top') {
      const room = await getRoom(db, params.get('room'));
      if (!room || room.status !== 'live') return json({error:'El LIVE ya terminó'},404);
      const {data:blocked,error:blockError} = await db.from('rivyza_live_blocks').select('user_id').eq('host_id',room.host_id).eq('user_id',auth.user.id).maybeSingle();
      if (blockError) throw blockError;
      if (blocked) return json({error:'No tienes acceso a este LIVE'},403);
      const {data:leaders,error} = await db.from('rivyza_live_like_users')
        .select('user_id,likes_count').eq('room_id',room.id)
        .order('likes_count',{ascending:false}).order('user_id',{ascending:true}).limit(8);
      if (error) throw error;
      const ids=(leaders||[]).map(p=>p.user_id);
      let profiles=[];
      if (ids.length) {
        const result=await db.from('profiles').select('id,display_name,username,avatar_url').in('id',ids);
        if (result.error) throw result.error;
        profiles=result.data||[];
      }
      const byId=new Map(profiles.map(p=>[p.id,p]));
      return json({top:(leaders||[]).map(p=>({...p,...byId.get(p.user_id)}))});
    }
    if (params.get('mode') === 'likes') {
      const room = await getRoom(db, params.get('room'));
      if (!room || room.status !== 'live') return json({error:'El LIVE ya terminó'},404);
      const {data:blocked,error:blockError} = await db.from('rivyza_live_blocks').select('user_id').eq('host_id',room.host_id).eq('user_id',auth.user.id).maybeSingle();
      if (blockError) throw blockError;
      if (blocked) return json({error:'No tienes acceso a este LIVE'},403);
      const {data,error} = await db.from('rivyza_live_like_totals').select('likes_count').eq('room_id',room.id).maybeSingle();
      if (error) throw error;
      return json({count:Number(data?.likes_count || 0)});
    }
    if (params.get('mode') === 'status') {
      await cleanupAbsentHosts(db);
      const room = await getRoom(db, params.get('room'));
      return json({ live: room?.status === 'live' });
    }
    if (params.get('mode') === 'blocked') {
      const room = await getRoom(db, params.get('room'));
      if (!room || (room.host_id !== auth.user.id && !(await isModerator(db,room.host_id,auth.user.id)))) return json({error:'No autorizado'},403);
      const {data: blocked,error} = await db.from('rivyza_live_blocks').select('user_id,created_at,reason,blocked_by').eq('host_id',room.host_id).order('created_at',{ascending:false});
      if(error) throw error;
      const ids=(blocked||[]).map(x=>x.user_id);
      let profiles=[];
      if(ids.length){const r=await db.from('profiles').select('id,display_name,username').in('id',ids);if(r.error) throw r.error;profiles=r.data||[];}
      const byId=new Map(profiles.map(p=>[p.id,p]));
      return json({blocked:(blocked||[]).map(b=>({...b,...byId.get(b.user_id)}))});
    }
    if (params.get('mode') === 'media_requests') {
      const room=await getRoom(db,params.get('room'));const uid=auth.user.id;
      if(!room || room.status!=='live')return json({requests:[]});
      const {data:rows,error}=await db.from('rivyza_live_media_requests').select('id,kind,sender_id,participant_sid').eq('room_id',room.id).eq('guest_id',uid).eq('used',false).gt('expires_at',new Date().toISOString()).order('created_at');
      if(error)throw error;if(!rows?.length)return json({requests:[]});
      const guest=await liveParticipant(room.id,uid);if(!guest?.permission?.canPublish)return json({requests:[]});
      const requests=[];
      for(const row of rows){
        if(row.participant_sid!==guest.sid || (row.sender_id!==room.host_id && !(await isModerator(db,room.host_id,row.sender_id))))continue;
        const {data:profile,error:pe}=await db.from('profiles').select('display_name,username').eq('id',row.sender_id).maybeSingle();if(pe)throw pe;
        requests.push({id:row.id,kind:row.kind,from:profile?.display_name||profile?.username||'RIVYZA'});
      }
      return json({requests});
    }
    if (params.get('mode') === 'incoming_invite') {
      const room = await getRoom(db, params.get('room'));
      if (!room || room.status !== 'live') return json({error:'El LIVE ya terminó'},404);
      const uid = auth.user.id;
      const {data:blocked,error:blockError} = await db.from('rivyza_live_blocks').select('user_id').eq('host_id',room.host_id).eq('user_id',uid).maybeSingle();
      if (blockError) throw blockError;
      if (blocked) return json({error:'No tienes acceso a este LIVE'},403);
      const {data:inv,error} = await db.from('rivyza_live_invites').select('id,inviter_id,participant_sid').eq('room_id',room.id).eq('guest_id',uid).eq('used',false).gt('expires_at',new Date().toISOString()).maybeSingle();
      if (error) throw error;
      if (!inv || (inv.inviter_id !== room.host_id && !(await isModerator(db,room.host_id,inv.inviter_id)))) return json({invite:null});
      const guest = await liveParticipant(room.id,uid);
      if (!guest || guest.sid !== inv.participant_sid || guest.permission?.canPublish) return json({invite:null});
      const {data:profile,error:profileError} = await db.from('profiles').select('display_name,username').eq('id',inv.inviter_id).maybeSingle();
      if (profileError) throw profileError;
      return json({invite:{inviteId:inv.id,fromId:inv.inviter_id,from:profile?.display_name || profile?.username || 'RIVYZA'}});
    }
    if (params.get('mode') === 'requests') {
      const room = await getRoom(db, params.get('room'));
      if (!room || room.status !== 'live' || (room.host_id !== auth.user.id && !(await isModerator(db, room.host_id, auth.user.id)))) return json({ error: 'No autorizado' }, 403);
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
    await cleanupAbsentHosts(db);
    const { data, error } = await db.from('rivyza_live_rooms')
      .select('id,host_id,title,created_at').eq('status', 'live')
      .order('created_at', { ascending: false }).limit(50);
    if (error) throw error;
    const {data:obs,error:oe}=await db.from('rivyza_obs_test_sessions').select('host_id,room_name,orientation').eq('enabled',true);
    if(oe)console.warn('OBS discovery unavailable',oe.code);
    const activeObs=(await Promise.all((obs||[]).map(async s=>{
      const members=await roomService().listParticipants(s.room_name).catch(()=>[]);
      return members.some(p=>p.identity===`obs-${s.host_id}`&&p.tracks?.length)?{id:`obs-${s.host_id}`,host_id:s.host_id,title:'RIVYZA Studio OBS',obs:true,orientation:s.orientation}:null;
    }))).filter(Boolean);
    const combined=[...(data||[]),...activeObs.filter(s=>!(data||[]).some(r=>r.host_id===s.host_id))];
    const {data:blocked,error:be}=await db.from('rivyza_live_blocks').select('host_id').eq('user_id',auth.user.id);if(be)throw be;
    const visible=combined.filter(r=>!(blocked||[]).some(b=>b.host_id===r.host_id));
    const ids = [...new Set(visible.map(r => r.host_id))];
    let profiles = [];
    if (ids.length) {
      const { data: rows, error: profileError } = await db.from('profiles')
        .select('id,display_name,username,avatar_url').in('id', ids);
      if (profileError) throw profileError;
      profiles = rows || [];
    }
    const byId = new Map(profiles.map(p => [p.id, p]));
    return json({ rooms: visible.map(r => ({
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
      await cleanupAbsentHosts(db);
      // OBS enabled is a reservation, not proof of an active RTMP signal.
      const {data:obs,error:obsError}=await db.from('rivyza_obs_test_sessions')
        .select('enabled,ingress_id,room_name').eq('host_id',uid).maybeSingle();
      if(obsError) throw obsError;
      if(obs?.enabled){
        if(!obs.ingress_id) return json({error:'OBS está preparando la conexión. Intenta nuevamente.'},409);
        try {
          const endpoint=process.env.LIVEKIT_URL.replace(/^wss:/,'https:').replace(/^ws:/,'http:');
          const ingress=new IngressClient(endpoint,process.env.LIVEKIT_API_KEY,process.env.LIVEKIT_API_SECRET);
          const entries=await ingress.listIngress({ingressId:obs.ingress_id});
          const entry=entries.find(item=>item.ingressId===obs.ingress_id);
          const status=entry?.state?.status;
          // Only confirmed inactive or completed ingress can release the reservation.
          // Buffering, publishing and unknown states must not be treated as stopped.
          if(entry && ![0,4,'ENDPOINT_INACTIVE','ENDPOINT_COMPLETE'].includes(status))
            return json({error:'Termina OBS primero o espera a que se desconecte la señal.'},409);
          const svc=roomService();
          const rooms=await svc.listRooms([obs.room_name]);
          if(rooms.some(r=>r.name===obs.room_name)){
            const members=await svc.listParticipants(obs.room_name);
            if(members.some(p=>p.identity===`obs-${uid}`)) return json({error:'Termina OBS primero o espera a que se desconecte la señal.'},409);
          }
        } catch(e) {
          console.warn('OBS state verification failed',e?.name);
          return json({error:'No se pudo verificar OBS. Intenta nuevamente.'},503);
        }
        const {data:released,error:releaseError}=await db.from('rivyza_obs_test_sessions')
          .update({enabled:false}).eq('host_id',uid).eq('enabled',true)
          .eq('ingress_id',obs.ingress_id).select('host_id').maybeSingle();
        if(releaseError) throw releaseError;
        if(!released) return json({error:'El estado de OBS cambió. Intenta nuevamente.'},409);
      }
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
    const moderator = !isHost && await isModerator(db, room.host_id, uid);
    const canModerate = isHost || moderator;
    if (input.action === 'media_request_create') {
      if(!canModerate)return json({error:'No autorizado'},403);
      if(!input.guestId || input.guestId===uid || input.guestId===room.host_id || !['mic','camera'].includes(input.kind))return json({error:'Solicitud inválida'},400);
      const members=await roomService().listParticipants(`rivyza-${room.id}`);
      const guest=members.find(p=>p.identity===input.guestId);
      if(!members.some(p=>p.identity===uid) || !guest?.permission?.canPublish)return json({error:'Participante no disponible'},409);
      const {data:blocked,error:be}=await db.from('rivyza_live_blocks').select('user_id').eq('host_id',room.host_id).in('user_id',[uid,input.guestId]);if(be)throw be;if(blocked?.length)return json({error:'No autorizado'},403);
      const {error}=await db.from('rivyza_live_media_requests').upsert({id:crypto.randomUUID(),room_id:room.id,guest_id:input.guestId,sender_id:uid,kind:input.kind,participant_sid:guest.sid,created_at:new Date().toISOString(),expires_at:new Date(Date.now()+60000).toISOString(),used:false},{onConflict:'room_id,guest_id,kind'});
      if(error)throw error;return json({ok:true});
    }
    if(input.action==='media_request_resolve'){
      const {data:row,error}=await db.from('rivyza_live_media_requests').select('*').eq('id',input.requestId).eq('room_id',room.id).eq('guest_id',uid).eq('used',false).gt('expires_at',new Date().toISOString()).maybeSingle();if(error)throw error;if(!row)return json({error:'Solicitud vencida'},409);
      if(input.accept){const guest=await liveParticipant(room.id,uid);if(!guest?.permission?.canPublish || guest.sid!==row.participant_sid || (row.sender_id!==room.host_id && !(await isModerator(db,room.host_id,row.sender_id))))return json({error:'Solicitud no disponible'},409);}
      const {data:claimed,error:ce}=await db.from('rivyza_live_media_requests').update({used:true}).eq('id',row.id).eq('used',false).select('id').maybeSingle();if(ce)throw ce;if(!claimed)return json({error:'Solicitud utilizada'},409);return json({ok:true});
    }
    if (input.action === 'like') {
      const {data:blocked,error:blockError} = await db.from('rivyza_live_blocks').select('user_id').eq('host_id',room.host_id).eq('user_id',uid).maybeSingle();
      if (blockError) throw blockError;
      if (blocked) return json({error:'No tienes acceso a este LIVE'},403);
      const amount = Number(input.amount);
      if (!Number.isInteger(amount) || amount < 1 || amount > 30) return json({error:'Cantidad de likes inválida'},400);
      if (typeof input.requestId !== 'string' || !/^[0-9a-f-]{36}$/i.test(input.requestId)) return json({error:'Solicitud inválida'},400);
      const {data,error} = await db.rpc('rivyza_live_add_likes',{
        p_room:room.id,p_user:uid,p_request:input.requestId,p_amount:amount
      });
      if (error) throw error;
      return json({count:Number(data || 0)});
    }
    if (input.action === 'layout') {
      if (!canModerate) return json({error:'No autorizado'},403);
      const svc = roomService();
      const [info] = await svc.listRooms([`rivyza-${room.id}`]);
      let metadata = {}; try { metadata = JSON.parse(info?.metadata || '{}'); } catch {}
      const previous = metadata.rivyzaLayout || {slots:10,positions:{}};
      const slots = input.slots;
      const positions = input.positions;
      if (!Number.isInteger(slots) || slots < 1 || slots > 14 || !positions || typeof positions !== 'object' || Array.isArray(positions)) return json({error:'Distribución inválida'},400);
      const members = await svc.listParticipants(`rivyza-${room.id}`);
      const ids = new Set(members.filter(p=>p.identity===room.host_id || p.permission?.canPublish).map(p=>p.identity));
      // Include host even during a brief connection gap.
      ids.add(room.host_id);
      const clean = Object.fromEntries(Object.entries(positions).filter(([id])=>ids.has(id)||Object.hasOwn(previous.positions||{},id)));
      if (Object.values(clean).some(n=>!Number.isInteger(n)||n<0||n>=slots) || new Set(Object.values(clean)).size !== Object.values(clean).length) return json({error:'Posiciones inválidas'},400);
      if (!isHost && (slots !== previous.slots || (clean[room.host_id] ?? 0) !== (previous.positions[room.host_id] ?? 0))) return json({error:'Solo el dueño puede mover su cámara o cambiar la cantidad'},403);
      const layout={slots,positions:clean};
      await svc.updateRoomMetadata(`rivyza-${room.id}`, JSON.stringify({...metadata,rivyzaLayout:layout}));
      return json({ok:true,layout});
    }
    if (input.action === 'enter') {
      if (!isHost) {
        const {error} = await db.from('rivyza_live_camera_requests').update({status:'rejected'}).eq('room_id',room.id).eq('user_id',uid);
        if(error) throw error;
        const connected = await liveParticipant(room.id,uid);
        if(connected) await roomService().updateParticipant(`rivyza-${room.id}`,uid,undefined,{canPublish:false,canSubscribe:true,canPublishData:true});
      }
      return json({ok:true});
    }
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
        const { error } = await db.from('rivyza_live_permanent_moderators').upsert({ host_id: room.host_id, user_id: input.guestId, assigned_by: uid }, { onConflict: 'host_id,user_id' });
        if (error) throw error;
      } else {
        const { error } = await db.from('rivyza_live_permanent_moderators').delete().eq('host_id', room.host_id).eq('user_id', input.guestId);
        if (error) throw error;
      }
      return json({ ok: true });
    }
    if (['mute_guest', 'camera_off_guest', 'lower_guest', 'kick_guest'].includes(input.action)) {
      if (!canModerate) return json({ error: 'No tienes permisos de moderación' }, 403);
      if (!input.guestId || input.guestId === room.host_id || input.guestId === uid) return json({ error: 'No puedes administrar esa cámara' }, 403);
      if(input.action === 'kick_guest' && !String(input.reason || '').trim()) return json({error:'Selecciona un motivo'},400);
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
        if (guest) {
          if (input.action === 'lower_guest') await roomService().updateParticipant(`rivyza-${room.id}`, input.guestId, undefined, {canPublish:false,canSubscribe:true,canPublishData:true});
          else await roomService().removeParticipant(`rivyza-${room.id}`, input.guestId);
        }
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
      try { await roomService().deleteRoom(`rivyza-${room.id}`); }
      catch (e) { console.error('Could not delete ended LiveKit room', room.id, e); }
      return json({ ok: true });
    }
    if (input.action === 'moderator_join') {
      if (!moderator || isHost) return json({error:'No autorizado'},403);
      const {data:blocked,error:blockError}=await db.from('rivyza_live_blocks').select('user_id').eq('host_id',room.host_id).eq('user_id',uid).maybeSingle();
      if(blockError) throw blockError;
      if(blocked) return json({error:'No tienes acceso a este LIVE'},403);
      const svc=roomService();
      const members=await svc.listParticipants(`rivyza-${room.id}`);
      const guest=members.find(p=>p.identity===uid);
      if(!guest) return json({error:'Participante desconectado'},409);
      if(guest.permission?.canPublish) return json({ok:true});
      const [info]=await svc.listRooms([`rivyza-${room.id}`]);
      let metadata={};try{metadata=JSON.parse(info?.metadata||'{}');}catch{}
      const occupied=new Set(members.filter(p=>p.permission?.canPublish).map(p=>p.identity));occupied.add(room.host_id);
      if(occupied.size >= (metadata.rivyzaLayout?.slots||10)) return json({error:'No hay cámaras disponibles'},409);
      const {error:requestError}=await db.from('rivyza_live_camera_requests').upsert({room_id:room.id,user_id:uid,status:'pending'},{onConflict:'room_id,user_id'});
      if(requestError) throw requestError;
      const {error}=await db.rpc('rivyza_live_approve_camera_server',{p_room:room.id,p_guest:uid});
      if(error) {await db.from('rivyza_live_camera_requests').update({status:'rejected'}).eq('room_id',room.id).eq('user_id',uid).eq('status','pending');throw error;}
      return json({ok:true});
    }
    if (['invite_create','invite_accept','invite_decline'].includes(input.action)) {
      const target = input.action === 'invite_create' ? input.guestId : uid;
      if (!target || target === room.host_id) return json({error:'Usuario inválido'},400);
      const {data:blocked,error:blockError}=await db.from('rivyza_live_blocks').select('user_id').eq('host_id',room.host_id).eq('user_id',target).maybeSingle();
      if(blockError) throw blockError;
      if(blocked) return json({error:'No tienes acceso a este LIVE'},403);
      if(input.action==='invite_create') {
        if(!canModerate || target===uid) return json({error:'No autorizado'},403);
        const guest=await liveParticipant(room.id,target);
        if(!guest || guest.permission?.canPublish) return json({error:'Espectador no disponible'},409);
        const slot = input.slot ?? null;
        if(slot!==null){const svc=roomService();const [info]=await svc.listRooms([`rivyza-${room.id}`]);let meta={};try{meta=JSON.parse(info?.metadata||'{}')}catch{}const count=meta.rivyzaLayout?.slots||10;const members=await svc.listParticipants(`rivyza-${room.id}`);if(!Number.isInteger(slot)||slot<0||slot>=count||Object.values(effectivePositions(meta,members,room.host_id,count)).includes(slot))return json({error:'Cámara no disponible'},409);}
        const {data,error}=await db.from('rivyza_live_invites').upsert({room_id:room.id,guest_id:target,inviter_id:uid,participant_sid:guest.sid,slot_index:slot,id:crypto.randomUUID(),expires_at:new Date(Date.now()+120000).toISOString(),used:false},{onConflict:'room_id,guest_id'}).select('id').single();
        if(error) throw error;
        return json({inviteId:data.id});
      }
      const {data:inv,error:invError}=await db.from('rivyza_live_invites').select('*').eq('id',input.inviteId).eq('room_id',room.id).eq('guest_id',uid).eq('used',false).gt('expires_at',new Date().toISOString()).maybeSingle();
      if(invError) throw invError;
      if(!inv) return json({error:'Invitación vencida o utilizada'},409);
      if(input.action==='invite_accept') {
        if(inv.inviter_id!==room.host_id && !(await isModerator(db,room.host_id,inv.inviter_id))) return json({error:'Invitación no autorizada'},403);
        const guest=await liveParticipant(room.id,uid);
        if(!guest || guest.sid!==inv.participant_sid || guest.permission?.canPublish) return json({error:'Invitación ya no disponible'},409);
        const svc=roomService();
        const [info]=await svc.listRooms([`rivyza-${room.id}`]);
        let metadata={};try{metadata=JSON.parse(info?.metadata||'{}');}catch{}
        const slots=metadata.rivyzaLayout?.slots||10;
        const members=await svc.listParticipants(`rivyza-${room.id}`);
        const occupied=new Set(members.filter(p=>p.permission?.canPublish).map(p=>p.identity));occupied.add(room.host_id);
        if(occupied.size>=slots) return json({error:'No hay cámaras disponibles'},409);
        if(inv.slot_index!=null && (inv.slot_index>=slots || Object.values(effectivePositions(metadata,members,room.host_id,slots)).includes(inv.slot_index))) return json({error:'La cámara seleccionada ya no está disponible'},409);
      }
      const {data:claimed,error:claimError}=await db.from('rivyza_live_invites').update({used:true}).eq('id',inv.id).eq('used',false).select('id').maybeSingle();
      if(claimError) throw claimError;
      if(!claimed) return json({error:'Invitación utilizada'},409);
      if(input.action==='invite_decline') return json({ok:true});
      const {error:requestError}=await db.from('rivyza_live_camera_requests').upsert({room_id:room.id,user_id:uid,status:'pending'},{onConflict:'room_id,user_id'});
      if(requestError) throw requestError;
      const {error}=await db.rpc('rivyza_live_approve_camera_server',{p_room:room.id,p_guest:uid});
      if(error) {
        await db.from('rivyza_live_camera_requests').update({status:'rejected'}).eq('room_id',room.id).eq('user_id',uid).eq('status','pending');
        throw error;
      }
      if(inv.slot_index!=null){
        const svc=roomService();const [info]=await svc.listRooms([`rivyza-${room.id}`]);let meta={};try{meta=JSON.parse(info?.metadata||'{}')}catch{}
        const slots=meta.rivyzaLayout?.slots||10;const members=await svc.listParticipants(`rivyza-${room.id}`);const positions=effectivePositions(meta,members.filter(p=>p.identity!==uid),room.host_id,slots);
        if(inv.slot_index<slots&&!Object.values(positions).includes(inv.slot_index)){positions[uid]=inv.slot_index;await svc.updateRoomMetadata(`rivyza-${room.id}`,JSON.stringify({...meta,rivyzaLayout:{slots,positions}}));}
      }
      return json({ok:true});
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
      if (!input.guestId) return json({ error: 'Usuario inválido' }, 400);
      const connected = await liveParticipant(room.id, input.guestId);
      if (!connected) return json({ error: 'La persona ya no está en el LIVE' }, 409);
      const {data:pending,error:pendingError} = await db.from('rivyza_live_camera_requests').select('status').eq('room_id',room.id).eq('user_id',input.guestId).maybeSingle();
      if(pendingError) throw pendingError;
      if(pending?.status !== 'pending') return json({error:'La solicitud ya no está pendiente'},409);
      // Count camera permissions and connected approvals awaiting token refresh.
      // A full room must not consume or reject a pending request.
      const svc = roomService();
      const [info] = await svc.listRooms([`rivyza-${room.id}`]);
      let metadata = {}; try { metadata = JSON.parse(info?.metadata || '{}'); } catch {}
      const members = await svc.listParticipants(`rivyza-${room.id}`);
      const memberIds = new Set(members.map(p => p.identity));
      const occupied = new Set(members.filter(p => p.permission?.canPublish).map(p => p.identity));
      occupied.add(room.host_id);
      const {data:approved,error:approvedError} = await db.from('rivyza_live_camera_requests').select('user_id').eq('room_id',room.id).eq('status','approved');
      if (approvedError) throw approvedError;
      for (const row of approved || []) if (memberIds.has(row.user_id)) occupied.add(row.user_id);
      if (occupied.size >= (metadata.rivyzaLayout?.slots || 10)) return json({error:'Todas las cámaras están ocupadas. La solicitud sigue pendiente.'},409);
      // Authorization is verified above. The service-role-only RPC serializes approvals.
      const { error } = await db.rpc('rivyza_live_approve_camera_server', { p_room: room.id, p_guest: input.guestId });
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
      const preview = input.preview === true;
      const publish = !preview && (room.host_id === uid || guest?.status === 'approved');
      const { data: moderators, error: modError } = await db.from('rivyza_live_permanent_moderators').select('user_id').eq('host_id', room.host_id);
      if (modError) throw modError;
      const moderatorIds = (moderators || []).map(x => x.user_id);
      const mod = moderatorIds.includes(uid);
      const key = process.env.LIVEKIT_API_KEY;
      const secret = process.env.LIVEKIT_API_SECRET;
      const serverUrl = process.env.LIVEKIT_URL;
      if (!key || !secret || !serverUrl) return json({ error: 'Faltan las claves de LiveKit en Vercel' }, 503);
      const { data: publicProfile } = await db.from('profiles').select('display_name,username').eq('id', uid).maybeSingle();
      const token = new AccessToken(key, secret, {
        identity: preview ? `preview-${uid}-${crypto.randomUUID()}` : uid, name: publicProfile?.display_name || publicProfile?.username || 'Usuario RIVYZA', ttl: '15m',
      });
      token.addGrant({ roomJoin: true, room: `rivyza-${room.id}`, canPublish: publish, canSubscribe: true, canPublishData: !preview, hidden: preview });
      return json({ token: await token.toJwt(), serverUrl, publish, host: room.host_id === uid, hostId: room.host_id, moderator: mod, moderatorIds, requestStatus:guest?.status || null });
    }
    return json({ error: 'Acción inválida' }, 400);
  } catch (e) { return json({ error: e.message || 'No se pudo procesar LIVE' }, 500); }
}
