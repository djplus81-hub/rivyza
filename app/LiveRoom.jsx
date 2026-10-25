"use client";

import { useCallback, useEffect, useState } from 'react';
import { LiveKitRoom, RoomAudioRenderer, ParticipantTile, useTracks, useLocalParticipant, useParticipants, useRoomContext } from '@livekit/components-react';
import { Track, RoomEvent } from 'livekit-client';
import '@livekit/components-styles';

const translations = {
  es: { options:'Opciones', microphone:'Micrófono', unmute:'Activar micrófono', camera:'Cámara', cameraOn:'Activar cámara', rearrange:'Mover cámaras', finishMove:'Terminar movimiento', end:'Terminar LIVE', confirm:'¿Quieres terminar el LIVE para todos?', yes:'Sí, terminar LIVE', no:'No', close:'Cerrar bandeja', slots:'Cámaras visibles', leaveCamera:'Bajar de cámara', leaveLive:'Desconectar del LIVE', request:'Solicitar subir a cámara', guest:'Invitado', you:'Tú', pending:'Solicitud enviada. Espera la aprobación del anfitrión.', accept:'Aceptar', reject:'Rechazar', requests:'Solicitudes para subir', noRequests:'Sin solicitudes pendientes', requestError:'No se pudo cargar la solicitud', activateAudio:'Activar sonido', soundReady:'Sonido activado', moveHint:'Toca una cámara y después su destino'  },
  en: { options:'Options', microphone:'Microphone', unmute:'Unmute microphone', camera:'Camera', cameraOn:'Turn on camera', rearrange:'Rearrange cameras', finishMove:'Finish rearranging', end:'End LIVE', confirm:'Do you want to end LIVE for everyone?', yes:'Yes, end LIVE', no:'No', close:'Close panel', slots:'Visible cameras', leaveCamera:'Leave camera', leaveLive:'Leave LIVE', request:'Request to join camera', guest:'Guest', you:'You', pending:'Request sent. Wait for host approval.', accept:'Accept', reject:'Decline', requests:'Camera requests', noRequests:'No pending requests', requestError:'Could not load request', activateAudio:'Enable sound', soundReady:'Sound enabled', moveHint:'Tap a camera and then its destination'  }
};
function getLanguage() {
  if (typeof window === 'undefined') return 'es';
  const stored = window.localStorage.getItem('rivyza_language') || window.localStorage.getItem('language') || '';
  return /^(en|english)/i.test(stored) || (!stored && navigator.language?.startsWith('en')) ? 'en' : 'es';
}
function CameraGrid({ publish, isHost, onStop, onLeaveCamera, onLeaveLive, onError, lang }) {
  const tr = translations[lang] || translations.es;
  const tracks = useTracks([{ source: Track.Source.Camera, withPlaceholder: false }]);
  const participants = useParticipants();
  const room = useRoomContext();
  const [soundReady, setSoundReady] = useState(false);
  async function activateAudio() {
    try { await room.startAudio(); setSoundReady(true); }
    catch (e) { onError(e?.message || "Audio could not be enabled"); }
  }
  const [slots, setSlots] = useState(10);
  const { localParticipant } = useLocalParticipant();
  const [mic, setMic] = useState(true);
  const [cam, setCam] = useState(isHost);
  useEffect(() => {
    if (!localParticipant || !publish) return;
    setMic(localParticipant.isMicrophoneEnabled);
    setCam(localParticipant.isCameraEnabled);
  }, [localParticipant, publish]);
  async function toggleMic() {
    try { await localParticipant.setMicrophoneEnabled(!localParticipant.isMicrophoneEnabled); setMic(localParticipant.isMicrophoneEnabled); }
    catch (e) { onError(e?.message || 'No se pudo cambiar el micrófono'); }
  }
  async function toggleCam() {
    try { await localParticipant.setCameraEnabled(!localParticipant.isCameraEnabled); setCam(localParticipant.isCameraEnabled); }
    catch (e) { onError(e?.message || 'No se pudo encender la cámara. Comprueba los permisos del navegador.'); }
  }
  const [drawer, setDrawer] = useState(false);
  const [confirmStop, setConfirmStop] = useState(false);
  const [moveMode, setMoveMode] = useState(false);
  const [selected, setSelected] = useState(null);
  const [positions, setPositions] = useState({});
  // Host broadcasts camera layout to all participants using LiveKit data packets.
  useEffect(() => {
    if (!room) return;
    const receive = (payload, participant) => {
      if (!participant || participant.identity === localParticipant?.identity) return;
      try {
        const message = JSON.parse(new TextDecoder().decode(payload));
        if (message.type !== 'rivyza-camera-layout' || !message.positions || typeof message.positions !== 'object') return;
        setPositions(message.positions);
        if (Number.isInteger(message.slots) && message.slots >= 1 && message.slots <= 10) setSlots(message.slots);
      } catch { /* Ignore other app data messages */ }
    };
    room.on(RoomEvent.DataReceived, receive);
    return () => room.off(RoomEvent.DataReceived, receive);
  }, [room, localParticipant]);
  async function broadcastLayout(nextPositions, nextSlots = slots) {
    if (!isHost || !room?.localParticipant) return;
    try {
      const payload = new TextEncoder().encode(JSON.stringify({type:'rivyza-camera-layout', positions:nextPositions, slots:nextSlots}));
      await room.localParticipant.publishData(payload, {reliable:true});
    } catch (e) { onError(e?.message || 'Layout could not be shared'); }
  }
  const shown = participants.slice(0, slots);
  const ordered = Array(slots).fill(null);
  const trackById = new Map(tracks.map(t => [t.participant.identity, t]));
  const placed = new Set();
  for (const t of shown) {
    const index = positions[t.identity];
    if (Number.isInteger(index) && index >= 0 && index < slots && !ordered[index]) {
      ordered[index] = t; placed.add(t.identity);
    }
  }
  for (const t of shown) {
    if (placed.has(t.identity)) continue;
    const free = ordered.findIndex(x => !x);
    if (free >= 0) ordered[free] = t;
  }
  function swap(index) {
    if (!isHost || !moveMode) return;
    if (selected === null) { setSelected(index); return; }
    if (selected === index) { setSelected(null); return; }
    const from = ordered[selected], to = ordered[index];
    const next = { ...positions };
    if (from) next[from.identity] = index;
    if (to) next[to.identity] = selected;
    setPositions(next);
    broadcastLayout(next);
    setSelected(null);
  }
  return <>
    <div className={`rivyza-live-grid rivyza-live-grid-square ${slots === 1 ? "rivyza-live-solo" : ""}`}>
      {ordered.map((t, i) => <div key={i}
        className={`rivyza-live-tile rivyza-live-square ${!t ? 'rivyza-live-vacant' : ''} ${selected === i ? 'rivyza-live-picked' : ''}`}
        onClick={() => swap(i)} role={isHost && moveMode ? 'button' : undefined}
        tabIndex={isHost && moveMode ? 0 : undefined}
        onKeyDown={e => { if ((e.key === 'Enter' || e.key === ' ') && isHost && moveMode) { e.preventDefault(); swap(i); } }}>
        {t ? <>{trackById.has(t.identity) ? <ParticipantTile trackRef={trackById.get(t.identity)}/> : <div className="rivyza-live-avatar-fallback"><span>👤</span></div>}<span className="rivyza-live-camera-name">{t.isLocal ? tr.you : (t.name || tr.guest)}{isHost && t.isLocal ? ' 👑' : ''}</span></> : <span className="rivyza-live-camera-name">+ {tr.camera} {i + 1}</span>}
      </div>)}
    </div>
    {isHost && moveMode && <p className="rivyza-live-hint">{selected === null ? tr.moveHint : 'Selecciona la posición de destino'}</p>}
    <div className="rivyza-live-bottom-bar">
      {publish && <>
        <button type="button" onClick={toggleMic}>{mic ? `🎙️ ${tr.microphone}` : `🔇 ${tr.unmute}`}</button>
        <button type="button" onClick={toggleCam}>{cam ? `📷 ${tr.camera}` : `📷 ${tr.cameraOn}`}</button>
      </>}
      {isHost && <button type="button" onClick={() => setDrawer(x => !x)}>☰ {tr.options}</button>}
    </div>
    {!isHost && publish && <div className="rivyza-live-guest-exit"><button type="button" onClick={onLeaveCamera}>{tr.leaveCamera}</button><button type="button" onClick={onLeaveLive}>{tr.leaveLive}</button></div>}
    {isHost && drawer && <div className="rivyza-live-bottom-drawer">
      <div className="rivyza-live-drawer-handle" />
      <strong>{tr.options} LIVE</strong>
      {isHost && <label className="rivyza-live-slot-picker">{tr.slots}: <select value={slots} onChange={e => { const count = Number(e.target.value); setSlots(count); broadcastLayout(positions, count); }}>{Array.from({length:10},(_,i) => <option key={i} value={i+1}>{i+1}</option>)}</select></label>}
      <button type="button" onClick={() => { setMoveMode(x => !x); setSelected(null); }}>
        ↔️ {moveMode ? tr.finishMove : tr.rearrange}
      </button>
      <button type="button" className="rivyza-live-power-row" onClick={() => setConfirmStop(true)}>
        <span className="rivyza-live-power-icon">⏻</span> {tr.end}
      </button>
      <button type="button" onClick={() => setDrawer(false)}>{tr.close}</button>
    </div>}
    {confirmStop && <div className="rivyza-live-confirm-overlay" role="dialog" aria-modal="true" aria-label="Confirmar fin del LIVE">
      <div className="rivyza-live-confirm-box"><strong>{tr.confirm}</strong>
        <div><button type="button" onClick={() => setConfirmStop(false)}>{tr.no}</button>
        <button type="button" className="rivyza-live-confirm-yes" onClick={() => { setConfirmStop(false); onStop(); }}>{tr.yes}</button></div>
      </div>
    </div>}
    <RoomAudioRenderer />
    {!soundReady && <button type="button" className="rivyza-live-enable-audio" onClick={activateAudio}>🔊 {tr.activateAudio}</button>}
  </>;
}

export default function LiveRoom({ supabase, user, onExit }) {
  const [rooms, setRooms] = useState([]);
  const [roomId, setRoomId] = useState(null);
  const [session, setSession] = useState(null);
  const [requests, setRequests] = useState([]);
  const [requestsOpen, setRequestsOpen] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [lang, setLang] = useState("es");
  useEffect(() => { setLang(getLanguage()); }, []);

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

  async function leaveCamera() {
    try { await api('leave_camera', { roomId }); await refreshSession(roomId); }
    catch (e) { setError(e.message); }
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
      if (kind === 'approve' || kind === 'reject') setRequests(r => r.filter(x => x.user_id !== payload.guestId));
      if (kind === 'request') setError(translations[lang].pending);
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
        connect={true} audio={session.publish} video={session.publish && session.host} onError={e => setError(e.message)}>
        <CameraGrid publish={session.publish} isHost={session.host} onStop={stopLive} onLeaveCamera={leaveCamera} onLeaveLive={leave} onError={setError} lang={lang} />
      </LiveKitRoom> : <p>Conectando cámaras…</p>}
      {session && !session.publish && <button type="button" className="rivyza-live-join-camera" onClick={() => action('request')}>✋ {translations[lang].request}</button>}
      {session?.host && <aside className="rivyza-live-request-list">
        <button type="button" className="rivyza-live-request-toggle" onClick={() => setRequestsOpen(x => !x)}>✋ {translations[lang].requests} ({requests.filter(r => r.status === 'pending').length}) {requestsOpen ? '▾' : '▴'}</button>
        {requestsOpen && <div className="rivyza-live-request-body">
        {requests.filter(r => r.status === 'pending').length === 0 && <small>{translations[lang].noRequests}</small>}
        {requests.filter(r => r.status === 'pending').map(r => <div key={r.user_id}>
          <span>Usuario {r.user_id.slice(0, 8)}</span>
          <span className="rivyza-live-request-actions"><button type="button" onClick={() => action('approve', { guestId: r.user_id })}>✓ {translations[lang].accept}</button><button type="button" onClick={() => action('reject', { guestId: r.user_id })}>✕ {translations[lang].reject}</button></span>
        </div>)}
        </div>}
      </aside>}
    </section>}
  </main>;
}
