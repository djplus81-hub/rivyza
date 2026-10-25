import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { AccessToken } from 'livekit-server-sdk';

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
    if (params.get('mode') === 'requests') {
      const room = await getRoom(db, params.get('room'));
      if (!room || room.host_id !== auth.user.id || room.status !== 'live') return json({ error: 'No autorizado' }, 403);
      const { data, error } = await db.from('rivyza_live_camera_requests')
        .select('user_id,status,created_at').eq('room_id', room.id).order('created_at');
      if (error) throw error;
      return json({ requests: data });
    }
    const { data, error } = await db.from('rivyza_live_rooms')
      .select('id,host_id,title,created_at').eq('status', 'live')
      .order('created_at', { ascending: false }).limit(50);
    if (error) throw error;
    return json({ rooms: data });
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
      // Pruebas restringidas al administrador mientras se conecta la moderación
      // completa de 3 X / suspensión manual al servidor de LiveKit.
      const { data: owner, error: ownerError } = await auth.client.rpc('rivyza_is_owner');
      if (ownerError || owner !== true) return json({ error: 'Por ahora solo el administrador puede iniciar LIVE de prueba' }, 403);
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
    if (input.action === 'stop') {
      if (room.host_id !== uid) return json({ error: 'No autorizado' }, 403);
      const { error } = await db.from('rivyza_live_rooms').update({ status: 'ended', ended_at: new Date().toISOString() }).eq('id', room.id);
      if (error) throw error;
      return json({ ok: true });
    }
    if (input.action === 'request') {
      if (room.host_id === uid) return json({ error: 'Ya eres el anfitrión' }, 400);
      const { error } = await db.from('rivyza_live_camera_requests')
        .upsert({ room_id: room.id, user_id: uid, status: 'pending' }, { onConflict: 'room_id,user_id' });
      if (error) throw error;
      return json({ ok: true });
    }
    if (input.action === 'leave_camera') {
      if (room.host_id === uid) return json({ error: 'El anfitrión no puede bajar de cámara' }, 403);
      const { error } = await db.from('rivyza_live_camera_requests')
        .update({ status: 'left' }).eq('room_id', room.id).eq('user_id', uid);
      if (error) throw error;
      return json({ ok: true });
    }
    if (input.action === 'approve') {
      if (room.host_id !== uid) return json({ error: 'No autorizado' }, 403);
      const { error } = await auth.client.rpc('rivyza_live_approve_camera', { p_room: room.id, p_guest: input.guestId });
      if (error) throw error;
      return json({ ok: true });
    }
    if (input.action === 'token') {
      const { data: guest, error } = await db.from('rivyza_live_camera_requests')
        .select('status').eq('room_id', room.id).eq('user_id', uid).maybeSingle();
      if (error) throw error;
      const publish = room.host_id === uid || guest?.status === 'approved';
      const key = process.env.LIVEKIT_API_KEY;
      const secret = process.env.LIVEKIT_API_SECRET;
      const serverUrl = process.env.LIVEKIT_URL;
      if (!key || !secret || !serverUrl) return json({ error: 'Faltan las claves de LiveKit en Vercel' }, 503);
      const token = new AccessToken(key, secret, {
        identity: uid, name: auth.user.user_metadata?.full_name || auth.user.email?.split('@')[0] || 'RIVYZA', ttl: '15m',
      });
      token.addGrant({ roomJoin: true, room: `rivyza-${room.id}`, canPublish: publish, canSubscribe: true, canPublishData: publish });
      return json({ token: await token.toJwt(), serverUrl, publish, host: room.host_id === uid });
    }
    return json({ error: 'Acción inválida' }, 400);
  } catch (e) { return json({ error: e.message || 'No se pudo procesar LIVE' }, 500); }
}
