"use client";

import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { LiveKitRoom, RoomAudioRenderer, ParticipantTile, useTracks, useLocalParticipant, useParticipants, useRoomContext } from '@livekit/components-react';
import { Track, RoomEvent } from 'livekit-client';
import '@livekit/components-styles';

const translations = {
  es: { options:'Opciones', microphone:'Micrófono', unmute:'Activar micrófono', camera:'Cámara', cameraOn:'Activar cámara', rearrange:'Mover cámaras', finishMove:'Terminar movimiento', end:'Terminar LIVE', confirm:'¿Quieres terminar el LIVE para todos?', yes:'Sí, terminar LIVE', no:'No', close:'Cerrar bandeja', slots:'Cámaras visibles', leaveCamera:'Bajar', leaveLive:'Salir del LIVE', request:'Solicitar subir a cámara', guest:'Invitado', you:'Tú', pending:'Solicitud enviada. Espera la aprobación del anfitrión.', accept:'Aceptar', reject:'Rechazar', requests:'Solicitudes para subir', noRequests:'Sin solicitudes pendientes', requestError:'No se pudo cargar la solicitud', activateAudio:'Activar sonido', soundReady:'Sonido activado', moveHint:'Toca una cámara y después su destino'  },
  en: { options:'Options', microphone:'Microphone', unmute:'Unmute microphone', camera:'Camera', cameraOn:'Turn on camera', rearrange:'Rearrange cameras', finishMove:'Finish rearranging', end:'End LIVE', confirm:'Do you want to end LIVE for everyone?', yes:'Yes, end LIVE', no:'No', close:'Close panel', slots:'Visible cameras', leaveCamera:'Leave Camera', leaveLive:'Leave LIVE', request:'Request to join camera', guest:'Guest', you:'You', pending:'Request sent. Wait for host approval.', accept:'Accept', reject:'Decline', requests:'Camera requests', noRequests:'No pending requests', requestError:'Could not load request', activateAudio:'Enable sound', soundReady:'Sound enabled', moveHint:'Tap a camera and then its destination'  }
};
function getLanguage() {
  if (typeof window === 'undefined') return 'es';
  const stored = window.localStorage.getItem('rivyza_language') || window.localStorage.getItem('language') || '';
  return /^(en|english)/i.test(stored) || (!stored && navigator.language?.startsWith('en')) ? 'en' : 'es';
}
function CameraGrid({ publish, isHost, hostId, isModerator, moderatorIds, onModerate, onStop, onLeaveCamera, onLeaveLive, onError, onViewProfile, onBlocked, blockedUsers, onUnblock, onRequest, onRefreshBlocked, requests, requestsOpen, setRequestsOpen, onRequestDecision, requestNames, lang }) {
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
  const [target, setTarget] = useState(null);
  const [expelling, setExpelling] = useState(false);
  const [blockedOpen, setBlockedOpen] = useState(false);
  const [reason, setReason] = useState('Insultos o lenguaje ofensivo');
  const [details, setDetails] = useState('');
  const [moveTarget, setMoveTarget] = useState(null);
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
  const [typing, setTyping] = useState(false);
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
        if (!(participant.identity === hostId || moderatorIds?.includes(participant.identity)) || message.type !== 'rivyza-camera-layout' || !message.positions || typeof message.positions !== 'object') return;
        setPositions(message.positions);
        if (Number.isInteger(message.slots) && message.slots >= 1 && message.slots <= 10) setSlots(message.slots);
      } catch { /* Ignore other app data messages */ }
    };
    room.on(RoomEvent.DataReceived, receive);
    return () => room.off(RoomEvent.DataReceived, receive);
  }, [room, localParticipant]);
  async function broadcastLayout(nextPositions, nextSlots = slots) {
    if (!(isHost || isModerator) || !room?.localParticipant) return;
    try {
      const payload = new TextEncoder().encode(JSON.stringify({type:'rivyza-camera-layout', positions:nextPositions, slots:nextSlots}));
      await room.localParticipant.publishData(payload, {reliable:true});
    } catch (e) { onError(e?.message || 'Layout could not be shared'); }
  }
  const shown = [...participants].filter(p => p.identity === hostId || p.permissions?.canPublish).sort((a,b) => (a.identity === hostId ? -1 : b.identity === hostId ? 1 : a.identity.localeCompare(b.identity))).slice(0, slots);
  const ordered = Array(slots).fill(null);
  const trackById = new Map(tracks.map(t => [t.participant.identity, t]));
  const placed = new Set();
  for (const t of shown) {
    const index = t.identity === hostId ? 0 : positions[t.identity];
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
    if (!(isHost || isModerator) || !moveMode) return;
    if (selected === null) { setSelected(index); return; }
    if (selected === index) { setSelected(null); return; }
    const from = ordered[selected], to = ordered[index];
    const next = { ...positions };
    if (!isHost && (from?.identity === hostId || to?.identity === hostId)) { setSelected(null); return; }
    if (from) next[from.identity] = index;
    if (to) next[to.identity] = selected;
    setPositions(next);
    broadcastLayout(next);
    setSelected(null);
  }
  function chooseTile(t, i) {
    if (moveTarget) {
      if (!isHost && t?.identity === hostId) return;
      if (!isHost && ordered[i]?.identity === hostId) return;
      const fromIndex = ordered.findIndex(p => p?.identity === moveTarget);
      if (fromIndex < 0) { setMoveTarget(null); return; }
      const from = ordered[fromIndex], to = ordered[i];
      const next = {...positions, [from.identity]: i};
      if (to) next[to.identity] = fromIndex;
      setPositions(next); broadcastLayout(next); setMoveTarget(null); return;
    }
    if (t && (!isHost || t.identity !== hostId)) { setTarget(t); setExpelling(false); }
  }
  async function applyModeration(kind, extra = {}) {
    if (!target) return;
    try { await onModerate(kind, {guestId:target.identity, ...extra}); setTarget(null); setExpelling(false); }
    catch(e) { onError(e.message); }
  }
  return <>
    <div className={`rivyza-live-grid rivyza-live-grid-square rivyza-live-layout-${slots} ${slots === 1 ? "rivyza-live-solo" : ""}`}>
      {ordered.map((t, i) => <div key={i}
        className={`rivyza-live-tile rivyza-live-square ${!t ? 'rivyza-live-vacant' : ''} ${selected === i ? 'rivyza-live-picked' : ''}`}
        onClick={() => moveMode ? swap(i) : t ? chooseTile(t,i) : (!publish && onRequest?.())} role='button'
        tabIndex={isHost && moveMode ? 0 : undefined}
        onKeyDown={e => { if ((e.key === 'Enter' || e.key === ' ') && isHost && moveMode) { e.preventDefault(); swap(i); } }}>
        {t ? <>{trackById.has(t.identity) ? <ParticipantTile trackRef={trackById.get(t.identity)}/> : <div className="rivyza-live-avatar-fallback"><span>👤</span></div>}<span className="rivyza-live-camera-name">{t.identity === hostId ? '👑 ' : moderatorIds?.includes(t.identity) ? '🛡️ ' : ''}{t.name || tr.guest}</span></> : <span className="rivyza-live-camera-name">+ {tr.camera} {i + 1}</span>}
      </div>)}
    </div>
    {isHost && moveMode && <p className="rivyza-live-hint">{selected === null ? tr.moveHint : 'Selecciona la posición de destino'}</p>}
    {typeof document !== 'undefined' && document.querySelector('.rivyza-live-top') && createPortal(<div className="rivyza-live-viewer-count rivyza-live-viewer-header rivyza-v32-viewers" style={{position:"static",top:"auto",right:"auto",zIndex:"auto",display:"inline-flex",alignItems:"center",gap:"5px",marginLeft:"8px",verticalAlign:"middle",padding:"3px 8px",fontSize:"11px",lineHeight:"18px",whiteSpace:"nowrap",background:"rgba(57,43,73,.9)",borderRadius:"999px"}} aria-label="Espectadores conectados"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg><span>{participants.length}</span></div>, document.querySelector('.rivyza-live-top'))}
    <div className={`rivyza-live-bottom-bar rivyza-v32-toolbar ${typing ? 'rivyza-v32-typing' : ''}`}>
      <input className="rivyza-v32-comment" type="text" placeholder={lang === 'es' ? 'Escribe un comentario…' : 'Write a comment…'} aria-label="Comentario (próximamente)" onFocus={() => setTyping(true)} onBlur={() => setTyping(false)} />
      {!typing && <>
        {publish && <button type="button" className="rivyza-v32-icon" onClick={toggleCam} aria-label={cam ? 'Apagar cámara' : 'Encender cámara'} title={cam ? 'Apagar cámara' : 'Encender cámara'}>{cam ? '📹' : '📷'}</button>}
        {publish && <button type="button" className="rivyza-v32-icon" onClick={toggleMic} aria-label={mic ? 'Silenciar micrófono' : 'Activar micrófono'} title={mic ? 'Silenciar micrófono' : 'Activar micrófono'}>{mic ? '🎙️' : '🔇'}</button>}
        {!publish && <button type="button" className="rivyza-v32-icon rivyza-v32-join-request" onClick={() => onRequest?.()} aria-label={tr.request} title={tr.request}>✋</button>}
        {(isHost || isModerator) && <button type="button" className={`rivyza-v32-icon rivyza-v32-requests ${requests.some(r => r.status === 'pending') ? 'has-pending' : ''}`} onClick={() => { setDrawer(false); setRequestsOpen(x => !x); }} aria-label={`Solicitudes para subir: ${requests.filter(r => r.status === 'pending').length}`} aria-expanded={requestsOpen}>✋{requests.filter(r => r.status === 'pending').length > 0 && <span className="rivyza-v32-count">{requests.filter(r => r.status === 'pending').length}</span>}</button>}
        <button type="button" className="rivyza-v32-icon" disabled title="Regalos: próximamente" aria-label="Regalos próximamente">🎁</button>
        <button type="button" className="rivyza-v32-icon" onClick={() => { setRequestsOpen(false); setDrawer(x => !x); }} aria-label={tr.options} aria-expanded={drawer}>•••</button>
      </>}
    </div>
    {(isHost || isModerator) && requestsOpen && <div className="rivyza-v32-popover rivyza-v32-request-panel" role="dialog" aria-label="Solicitudes para subir">
      <div className="rivyza-v32-panel-heading"><strong>✋ {tr.requests} ({requests.filter(r => r.status === 'pending').length})</strong><button type="button" onClick={() => setRequestsOpen(false)} aria-label="Cerrar">✕</button></div>
      <div className="rivyza-v32-request-scroll">
        {requests.filter(r => r.status === 'pending').length === 0 && <p>{tr.noRequests}</p>}
        {requests.filter(r => r.status === 'pending').map(r => <div className="rivyza-v32-request-row" key={r.user_id}>
          <span>👤 {requestNames[r.user_id] || (lang === 'es' ? 'Invitado' : 'Guest')}</span>
          <button type="button" onClick={() => onRequestDecision('approve', r.user_id)}>✓ {tr.accept}</button>
          <button type="button" onClick={() => onRequestDecision('reject', r.user_id)}>✕ {tr.reject}</button>
        </div>)}
      </div>
    </div>}
    {drawer && <div className="rivyza-live-bottom-drawer rivyza-v32-popover">
      <div className="rivyza-live-drawer-handle" />
      <strong>{tr.options} LIVE</strong>
      {isHost && <label className="rivyza-live-slot-picker">{tr.slots}: <select value={slots} onChange={e => { const count = Number(e.target.value); setSlots(count); broadcastLayout(positions, count); }}>{Array.from({length:10},(_,i) => <option key={i} value={i+1}>{i+1}</option>)}</select></label>}
      {(isHost || isModerator) && <button type="button" onClick={() => { setMoveMode(x => !x); setSelected(null); }}>
        ↔️ {moveMode ? tr.finishMove : tr.rearrange}
      </button>}
      {(isHost || isModerator) && <button type="button" onClick={() => { setDrawer(false); setBlockedOpen(true); onRefreshBlocked?.(); }}>🚫 Usuarios bloqueados</button>}
      {isHost && <button type="button" className="rivyza-live-power-row" onClick={() => setConfirmStop(true)}>
        <span className="rivyza-live-power-icon">⏻</span> {tr.end}
      </button>}
      {!isHost && publish && <button type="button" onClick={() => { setDrawer(false); onLeaveCamera(); }}>⬇️ {tr.leaveCamera}</button>}
      {!isHost && <button type="button" onClick={() => { setDrawer(false); onLeaveLive(); }}>🚪 {tr.leaveLive}</button>}
      <button type="button" onClick={() => setDrawer(false)}>{tr.close}</button>
    </div>}
    {blockedOpen && <div className="rivyza-live-mod-backdrop" onClick={() => setBlockedOpen(false)}><div className="rivyza-live-mod-menu" role="dialog" aria-modal="true" onClick={e=>e.stopPropagation()}><strong>Usuarios bloqueados</strong><button type="button" onClick={()=>setBlockedOpen(false)}>Cerrar</button>{blockedUsers.length === 0 ? <p>No hay usuarios bloqueados.</p> : blockedUsers.map(b=><div key={b.user_id} className="rivyza-live-block-row"><span>{b.display_name || b.username || b.user_id.slice(0,8)}</span><button type="button" onClick={()=>onUnblock(b.user_id)}>Desbloquear</button></div>)}</div></div>}
    {confirmStop && <div className="rivyza-live-confirm-overlay" role="dialog" aria-modal="true" aria-label="Confirmar fin del LIVE">
      <div className="rivyza-live-confirm-box"><strong>{tr.confirm}</strong>
        <div><button type="button" onClick={() => setConfirmStop(false)}>{tr.no}</button>
        <button type="button" className="rivyza-live-confirm-yes" onClick={() => { setConfirmStop(false); onStop(); }}>{tr.yes}</button></div>
      </div>
    </div>}
    {target && <div className="rivyza-live-mod-backdrop" onClick={() => setTarget(null)}>
      <div className="rivyza-live-mod-menu" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
        <button className="rivyza-live-mod-x" type="button" onClick={() => {setTarget(null);setExpelling(false)}} aria-label="Cerrar">✕</button>
        <strong>{target.name || tr.guest}</strong>
        {!expelling ? <>
          {!isHost && <button type="button" onClick={() => { onViewProfile?.(target.identity); setTarget(null); }}>👤 Ver perfil</button>}
          {(isHost || isModerator) && <>
          {isHost && <button type="button" onClick={() => applyModeration(moderatorIds?.includes(target.identity) ? 'moderator_remove' : 'moderator_add')}>{moderatorIds?.includes(target.identity) ? 'Quitar moderador' : '🛡️ Agregar como moderador'}</button>}
          <button type="button" onClick={() => applyModeration('mute_guest')}>🔇 Silenciar micrófono</button>
          <button type="button" onClick={() => applyModeration('camera_off_guest')}>📷 Apagar cámara</button>
          <button type="button" onClick={() => {setMoveTarget(target.identity);setTarget(null)}}>↔️ Mover de posición</button>
          <button type="button" onClick={() => applyModeration('lower_guest')}>⬇️ Bajar de cámara</button>
          <button type="button" onClick={() => setExpelling(true)}>🚫 Expulsar del LIVE y reportar</button>
          <button type="button" onClick={() => applyModeration('block_guest')}>⛔ Bloquear del LIVE</button>
          <button type="button" onClick={() => { setTarget(null); setBlockedOpen(true); onRefreshBlocked?.(); }}>📋 Usuarios bloqueados</button>
          </>}
        </> : <>
          <label>Motivo de expulsión<select value={reason} onChange={e=>setReason(e.target.value)}>{['Insultos o lenguaje ofensivo','Acoso o amenazas','Contenido sexual inapropiado','Comportamiento violento','Spam o interrupciones','Otro motivo'].map(x=><option key={x}>{x}</option>)}</select></label>
          <textarea value={details} onChange={e=>setDetails(e.target.value)} placeholder="Detalles opcionales" rows={2}/>
          <button type="button" onClick={() => applyModeration('kick_guest',{reason,details})}>Confirmar expulsión y reporte</button>
          <button type="button" onClick={() => setExpelling(false)}>Cancelar</button>
        </>}
      </div>
    </div>}
    <RoomAudioRenderer />
    {!soundReady && <button type="button" className="rivyza-live-enable-audio" onClick={activateAudio}>🔊 {tr.activateAudio}</button>}
  </>;
}

export default function LiveRoom({ supabase, user, onExit, initialRoomId = null }) {
  const [rooms, setRooms] = useState([]);
  const [roomId, setRoomId] = useState(initialRoomId);
  const [session, setSession] = useState(null);
  const [requests, setRequests] = useState([]);
  const [requestNames, setRequestNames] = useState({});
  const [requestsOpen, setRequestsOpen] = useState(false);
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [profileId, setProfileId] = useState(null);
  const [profileDetails, setProfileDetails] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [lang, setLang] = useState("es");
  useEffect(() => { setLang(getLanguage()); }, []);
  // Resolve requesters to their public RIVYZA profile names without changing LIVE permissions.
  const pendingRequesterIds = [...new Set(requests.filter(r => r.status === 'pending').map(r => r.user_id).filter(Boolean))].sort().join(',');
  useEffect(() => {
    if (!pendingRequesterIds) return;
    let active = true;
    const ids = pendingRequesterIds.split(',');
    (async () => {
      const { data, error: profileError } = await supabase.from('profiles')
        .select('id,display_name,username').in('id', ids);
      if (!active || profileError) return;
      setRequestNames(previous => {
        const next = { ...previous };
        for (const profile of data || []) {
          const displayName = (profile.display_name || '').trim();
          const username = (profile.username || '').trim();
          next[profile.id] = displayName || (username ? `@${username}` : 'Invitado');
        }
        return next;
      });
    })();
    return () => { active = false; };
  }, [pendingRequesterIds, supabase]);

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
          if (host || session?.moderator) setRequests((await api(null, { mode: 'requests', room: roomId }, 'GET')).requests || []);
        }
      } catch (e) { if (active) setError(e.message); }
    };
    tick();
    const interval = setInterval(tick, 2000);
    return () => { active = false; clearInterval(interval); };
  }, [roomId, api, refreshSession, session?.host, session?.moderator, user?.id]);

  const refreshBlocked = useCallback(async () => { if (!roomId) return; try { setBlockedUsers((await api(null, {mode:"blocked",room:roomId},"GET")).blocked || []); } catch(e) { setError(e.message); } }, [roomId,api]);
  async function unblock(guestId) { try { await api("unblock_guest",{roomId,guestId}); await refreshBlocked(); } catch(e) { setError(e.message); } }
  async function openLiveProfile(id) {
    setProfileId(id); setProfileDetails(null);
    const {data, error} = await supabase.from('profiles')
      .select('id,display_name,username,avatar_url,bio').eq('id',id).maybeSingle();
    if(error) setError(error.message);
    else setProfileDetails(data);
  }
  async function start() {
    if (busy) return;
    setBusy(true); setError('');
    try {
      const result = await api('start', { title: 'LIVE' });
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
    // Withdraw a pending camera request before disconnecting from this LIVE.
    if (roomId && !session?.host) {
      try { await api('cancel_request', { roomId }); }
      catch (e) { console.warn('Could not cancel camera request on exit:', e); }
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
      if (kind === 'moderator_add' || kind === 'moderator_remove') await refreshSession(roomId);
      if (kind === 'block_guest') await refreshBlocked();
      // Request confirmation is reflected in the hand control; no banner over the cameras.
    } catch (e) { setError(e.message); throw e; }
  }

  return <main className="rivyza-live-studio">
    <header className="rivyza-live-top rivyza-v32-header"><button type="button" onClick={roomId ? leave : onExit}>← Volver</button><strong className="rivyza-live-header-center">RIVYZA <span>LIVE</span></strong></header>
    {profileId && <div className="rivyza-live-profile-overlay"><button type="button" onClick={()=>setProfileId(null)}>← Volver al LIVE</button><div className="rivyza-live-profile-content">
      {profileDetails ? <>
        {profileDetails.avatar_url && <img src={profileDetails.avatar_url} alt="" style={{width:90,height:90,borderRadius:'50%',objectFit:'cover'}}/>}
        <h2>{profileDetails.display_name || profileDetails.username || 'Usuario'}</h2>
        <p>@{profileDetails.username || 'usuario'}</p>
        <p>{profileDetails.bio || ''}</p>
      </> : <p>Cargando perfil…</p>}
      </div></div>}
    {error && <div className="rivyza-v32-toast" role="status"><span>{error}</span><button type="button" onClick={() => setError('')} aria-label="Cerrar aviso">✕</button></div>}
    {!roomId ? <section className="rivyza-live-lobby">
      <button type="button" className="rivyza-live-start" disabled={busy} onClick={start}>{busy ? 'Conectando…' : '🔴 Iniciar mi LIVE'}</button>
      <h2>Transmisiones en vivo</h2>
      {rooms.length === 0 && <p>Ahora mismo no hay transmisiones. ¡Sé el primero!</p>}
      {rooms.map(r => <button type="button" className="rivyza-live-room-card" key={r.id} onClick={() => join(r.id)}>
        <span className="rivyza-live-red-dot" /> {r.host_avatar && <img src={r.host_avatar} alt="" className="rivyza-live-list-avatar" />} {r.host_name || r.title} <small>Entrar</small>
      </button>)}
    </section> : <section className="rivyza-live-stage">
      {session ? <LiveKitRoom key={`${roomId}-${session.publish}`} token={session.token} serverUrl={session.serverUrl}
        connect={true} audio={session.publish} video={session.publish && session.host} onError={e => setError(e.message)}>
        <CameraGrid publish={session.publish} isHost={session.host} hostId={session.hostId} isModerator={session.moderator} moderatorIds={session.moderatorIds} onModerate={action} onStop={stopLive} onLeaveCamera={leaveCamera} onLeaveLive={leave} onError={setError} onViewProfile={openLiveProfile} blockedUsers={blockedUsers} onUnblock={unblock} onRefreshBlocked={refreshBlocked} onRequest={()=>action("request")} requests={requests} requestsOpen={requestsOpen} setRequestsOpen={setRequestsOpen} onRequestDecision={(kind, guestId) => action(kind, {guestId})} requestNames={requestNames} lang={lang} />
      </LiveKitRoom> : <p>Conectando cámaras…</p>}

    </section>}
  </main>;
}
