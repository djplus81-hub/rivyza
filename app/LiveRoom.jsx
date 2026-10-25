"use client";

import { useCallback, useEffect, useState } from 'react';
import { LiveKitRoom, RoomAudioRenderer, ParticipantTile, useTracks, useLocalParticipant } from '@livekit/components-react';
import { Track } from 'livekit-client';
import '@livekit/components-styles';

function CameraGrid({ publish, isHost }) {
  const tracks = useTracks([{ source: Track.Source.Camera, withPlaceholder: false }]);
  const { localParticipant } = useLocalParticipant();
  const [mic, setMic] = useState(true);
  const [cam, setCam] = useState(true);
  const shown = tracks.slice(0, 10);
  return <>
    <div className="rivyza-live-grid">
      {shown.map(t => <div className="rivyza-live-tile" key={t.participant.identity}>
        <ParticipantTile trackRef={t} />
        <span>{t.participant.name || (t.participant.isLocal ? 'Tú' : 'Invitado')}</span>
      </div>)}
      {Array.from({ length: 10 - shown.length }, (_, i) => <div className="rivyza-live-tile rivyza-live-vacant" key={`empty-${i}`}>
        <span>+ Cámara {shown.length + i + 1}</span>
      </div>)}
    </div>
    {publish && <div className="rivyza-live-controls">
      <button type="button" onClick={async () => { await localParticipant.setMicrophoneEnabled(!mic); setMic(!mic); }}>{mic ? '🎙️ Silenciar' : '🎙️ Activar micrófono'}</button>
      <button type="button" onClick={async () => { await localParticipant.setCameraEnabled(!cam); setCam(!cam); }}>{cam ? '📷 Apagar cámara' : '📷 Encender cámara'}</button>
      {isHost && <span>Anfitrión</span>}
    </div>}
    <RoomAudioRenderer />
  </>;
}

export default function LiveRoom({ supabase, user, onExit }) {
  const [rooms, setRooms] = useState([]);
  const [roomId, setRoomId] = useState(null);
  const [session, setSession] = useState(null);
  const [requests, setRequests] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const api = useCallback(async (action, extra = {}, method = 'POST') => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw new Error('Vuelve a iniciar sesión');
    const query = method === 'GET' ? `?${new URLSearchParams(extra)}` : '';
    const res = await fetch(`/api/live${query}`, {
      method, headers: { Authorization: `Bearer ${data.session.access_token}`, 'Content-Type': 'application/json' },
      ...(method === 'POST' ? { body: JSON.stringify({ action, ...extra }) } : {}),
    });
    const body = await res.json();
    if (!res.ok) throw new Error(body.error || 'No se pudo conectar al LIVE');
    return body;
  }, [supabase]);

  const refreshRooms = useCallback(async () => {
    try { setRooms((await api(null, {}, 'GET')).rooms || []); }
    catch (e) { setError(e.message); }
  }, [api]);

  useEffect(() => {
    if (roomId) return;
    refreshRooms();
    const interval = setInterval(refreshRooms, 8000);
    return () => clearInterval(interval);
  }, [roomId, refreshRooms]);

  const refreshSession = useCallback(async (id) => {
    const next = await api('token', { roomId: id });
    setSession(previous => (!previous || previous.publish !== next.publish) ? next : previous);
  }, [api]);

  useEffect(() => {
    if (!roomId) return;
    let active = true;
    const tick = async () => {
      try {
        if (!active) return;
        await refreshSession(roomId);
        if (roomId && user?.id) {
          const host = session?.host;
          if (host) setRequests((await api(null, { mode: 'requests', room: roomId }, 'GET')).requests || []);
        }
      } catch (e) { if (active) setError(e.message); }
    };
    tick();
    const interval = setInterval(tick, 5000);
    return () => { active = false; clearInterval(interval); };
  }, [roomId, api, refreshSession, session?.host, user?.id]);

  async function start() {
    if (busy) return;
    setBusy(true); setError('');
    try {
      const result = await api('start', { title: 'RIVYZA LIVE' });
      setRoomId(result.roomId);
      await refreshSession(result.roomId);
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }

  async function join(id) {
    setError(''); setSession(null); setRoomId(id);
    try { await refreshSession(id); }
    catch (e) { setError(e.message); }
  }

  async function leave() {
    if (session?.host && roomId) {
      if (!window.confirm('¿Terminar el LIVE para todos?')) return;
      try { await api('stop', { roomId }); } catch (e) { setError(e.message); return; }
    }
    setRoomId(null); setSession(null); setRequests([]); refreshRooms();
  }

  async function action(kind, payload) {
    try {
      await api(kind, { roomId, ...payload });
      if (kind === 'approve') setRequests(r => r.map(x => x.user_id === payload.guestId ? { ...x, status: 'approved' } : x));
      if (kind === 'request') setError('Solicitud enviada. Espera la aprobación del anfitrión.');
    } catch (e) { setError(e.message); }
  }

  return <main className="rivyza-live-studio">
    <header className="rivyza-live-top"><button type="button" onClick={roomId ? leave : onExit}>← Volver</button><strong>RIVYZA <span>LIVE</span></strong><small>Hasta 10 cámaras</small></header>
    {error && <p className="rivyza-live-message" role="alert">{error}</p>}
    {!roomId ? <section className="rivyza-live-lobby">
      <button type="button" className="rivyza-live-start" disabled={busy} onClick={start}>{busy ? 'Conectando…' : '🔴 Iniciar mi LIVE'}</button>
      <h2>Transmisiones en vivo</h2>
      {rooms.length === 0 && <p>Ahora mismo no hay transmisiones. ¡Sé el primero!</p>}
      {rooms.map(r => <button type="button" className="rivyza-live-room-card" key={r.id} onClick={() => join(r.id)}>
        <span className="rivyza-live-red-dot" /> {r.title} <small>Entrar</small>
      </button>)}
    </section> : <section className="rivyza-live-stage">
      {session ? <LiveKitRoom key={`${roomId}-${session.publish}`} token={session.token} serverUrl={session.serverUrl}
        connect={true} audio={session.publish} video={session.publish} onError={e => setError(e.message)}>
        <CameraGrid publish={session.publish} isHost={session.host} />
      </LiveKitRoom> : <p>Conectando cámaras…</p>}
      {session && !session.publish && <button type="button" className="rivyza-live-join-camera" onClick={() => action('request')}>✋ Solicitar subir a cámara</button>}
      {session?.host && <aside className="rivyza-live-request-list">
        <h3>Solicitudes de invitados</h3>
        {requests.filter(r => r.status === 'pending').length === 0 && <small>No hay solicitudes pendientes.</small>}
        {requests.filter(r => r.status === 'pending').map(r => <div key={r.user_id}>
          <span>Usuario {r.user_id.slice(0, 8)}</span>
          <button type="button" onClick={() => action('approve', { guestId: r.user_id })}>Aceptar cámara</button>
        </div>)}
        <small>{requests.filter(r => r.status === 'approved').length} de 9 invitados aprobados</small>
      </aside>}
    </section>}
  </main>;
}
