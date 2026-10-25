"use client";

import { useCallback, useEffect, useState } from 'react';
import { LiveKitRoom, RoomAudioRenderer, ParticipantTile, useTracks, useLocalParticipant } from '@livekit/components-react';
import { Track } from 'livekit-client';
import '@livekit/components-styles';

function CameraGrid({ publish, isHost, onStop }) {
  const tracks = useTracks([{ source: Track.Source.Camera, withPlaceholder: false }]);
  const { localParticipant } = useLocalParticipant();
  const [mic, setMic] = useState(true);
  const [cam, setCam] = useState(true);
  const [drawer, setDrawer] = useState(false);
  const [confirmStop, setConfirmStop] = useState(false);
  const [moveMode, setMoveMode] = useState(false);
  const [selected, setSelected] = useState(null);
  const [positions, setPositions] = useState({});
  const shown = tracks.slice(0, 10);
  const ordered = Array(10).fill(null);
  const placed = new Set();
  for (const t of shown) {
    const index = positions[t.participant.identity];
    if (Number.isInteger(index) && index >= 0 && index < 10 && !ordered[index]) {
      ordered[index] = t; placed.add(t.participant.identity);
    }
  }
  for (const t of shown) {
    if (placed.has(t.participant.identity)) continue;
    const free = ordered.findIndex(x => !x);
    if (free >= 0) ordered[free] = t;
  }
  function swap(index) {
    if (!isHost || !moveMode) return;
    if (selected === null) { setSelected(index); return; }
    if (selected === index) { setSelected(null); return; }
    const from = ordered[selected], to = ordered[index];
    setPositions(prev => {
      const next = { ...prev };
      if (from) next[from.participant.identity] = index;
      if (to) next[to.participant.identity] = selected;
      return next;
    });
    setSelected(null);
  }
  return <>
    <div className="rivyza-live-grid rivyza-live-grid-square">
      {ordered.map((t, i) => <div key={i}
        className={`rivyza-live-tile rivyza-live-square ${!t ? 'rivyza-live-vacant' : ''} ${selected === i ? 'rivyza-live-picked' : ''}`}
        onClick={() => swap(i)} role={isHost && moveMode ? 'button' : undefined}
        tabIndex={isHost && moveMode ? 0 : undefined}
        onKeyDown={e => { if ((e.key === 'Enter' || e.key === ' ') && isHost && moveMode) { e.preventDefault(); swap(i); } }}>
        {t ? <><ParticipantTile trackRef={t}/><span className="rivyza-live-camera-name">{t.participant.isLocal ? 'Tú' : (t.participant.name || 'Invitado')}{isHost && t.participant.isLocal ? ' 👑' : ''}</span></> : <span className="rivyza-live-camera-name">+ Cámara {i + 1}</span>}
      </div>)}
    </div>
    {isHost && moveMode && <p className="rivyza-live-hint">{selected === null ? 'Toca una cámara y después la posición de destino' : 'Selecciona la posición de destino'}</p>}
    <div className="rivyza-live-bottom-bar">
      {publish && <>
        <button type="button" onClick={async () => { await localParticipant.setMicrophoneEnabled(!mic); setMic(!mic); }}>{mic ? '🎙️ Micrófono' : '🔇 Activar micro'}</button>
        <button type="button" onClick={async () => { await localParticipant.setCameraEnabled(!cam); setCam(!cam); }}>{cam ? '📷 Cámara' : '📷 Activar cámara'}</button>
      </>}
      {isHost && <button type="button" onClick={() => setDrawer(x => !x)}>☰ Opciones</button>}
    </div>
    {isHost && drawer && <div className="rivyza-live-bottom-drawer">
      <div className="rivyza-live-drawer-handle" />
      <strong>Opciones del LIVE</strong>
      <button type="button" onClick={() => { setMoveMode(x => !x); setSelected(null); }}>
        ↔️ {moveMode ? 'Terminar movimiento' : 'Mover cámaras'}
      </button>
      <button type="button" className="rivyza-live-power-row" onClick={() => setConfirmStop(true)}>
        <span className="rivyza-live-power-icon">⏻</span> Terminar LIVE
      </button>
      <button type="button" onClick={() => setDrawer(false)}>Cerrar bandeja</button>
    </div>}
    {confirmStop && <div className="rivyza-live-confirm-overlay" role="dialog" aria-modal="true" aria-label="Confirmar fin del LIVE">
      <div className="rivyza-live-confirm-box"><strong>¿Quieres terminar el LIVE para todos?</strong>
        <div><button type="button" onClick={() => setConfirmStop(false)}>No</button>
        <button type="button" className="rivyza-live-confirm-yes" onClick={() => { setConfirmStop(false); onStop(); }}>Sí, terminar LIVE</button></div>
      </div>
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
      if (!window.confirm('¿Salir del LIVE? Pulsa Aceptar para terminarlo para todos.')) return;
      try { await api('stop', { roomId }); } catch (e) { setError(e.message); return; }
    }
    setRoomId(null); setSession(null); setRequests([]); refreshRooms();
  }

  async function stopLive() {
    if (!roomId || !session?.host) return;
    try {
      await api('stop', { roomId });
      setRoomId(null); setSession(null); setRequests([]); setError('');
      refreshRooms();
    } catch (e) { setError(e.message); }
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
        <CameraGrid publish={session.publish} isHost={session.host} onStop={stopLive} />
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
