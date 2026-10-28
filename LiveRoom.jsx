"use client";

import { useCallback, useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { LiveKitRoom, RoomAudioRenderer, VideoTrack, useTracks, useLocalParticipant, useParticipants, useRoomContext } from '@livekit/components-react';
import { Track, RoomEvent, DisconnectReason } from 'livekit-client';
import '@livekit/components-styles';

const translations = {
  es: { options:'Opciones', microphone:'Micrófono', unmute:'Activar micrófono', camera:'Cámara', cameraOn:'Activar cámara', rearrange:'Mover cámaras', finishMove:'Terminar movimiento', end:'Terminar LIVE', confirm:'¿Quieres terminar el LIVE para todos?', yes:'Sí, terminar LIVE', no:'No', close:'Cerrar bandeja', slots:'Cámaras visibles', leaveCamera:'Bajar a escuchar', leaveLive:'Salir del LIVE', request:'Solicitar subir a cámara', guest:'Invitado', you:'Tú', pending:'Solicitud enviada. Espera la aprobación del anfitrión.', accept:'Aceptar', reject:'Rechazar', requests:'Solicitudes para subir', noRequests:'Sin solicitudes pendientes', requestError:'No se pudo cargar la solicitud', activateAudio:'Activar sonido', soundReady:'Sonido activado', moveHint:'Toca una cámara y después su destino'  },
  en: { options:'Options', microphone:'Microphone', unmute:'Unmute microphone', camera:'Camera', cameraOn:'Turn on camera', rearrange:'Rearrange cameras', finishMove:'Finish rearranging', end:'End LIVE', confirm:'Do you want to end LIVE for everyone?', yes:'Yes, end LIVE', no:'No', close:'Close panel', slots:'Visible cameras', leaveCamera:'Leave Camera', leaveLive:'Leave LIVE', request:'Request to join camera', guest:'Guest', you:'You', pending:'Request sent. Wait for host approval.', accept:'Accept', reject:'Decline', requests:'Camera requests', noRequests:'No pending requests', requestError:'Could not load request', activateAudio:'Enable sound', soundReady:'Sound enabled', moveHint:'Tap a camera and then its destination'  }
};
function getLanguage() {
  if (typeof window === 'undefined') return 'es';
  const stored = window.localStorage.getItem('rivyza_language') || window.localStorage.getItem('language') || '';
  return /^(en|english)/i.test(stored) || (!stored && navigator.language?.startsWith('en')) ? 'en' : 'es';
}
function CameraGrid({ publish, isHost, hostId, isModerator, moderatorIds, onModerate, onStop, onLeaveCamera, onLeaveLive, onError, onViewProfile, onBlocked, blockedUsers, onUnblock, onRequest, onRefreshBlocked, requests, requestsOpen, setRequestsOpen, onRequestDecision, requestNames, requestStatus, supabase, onCancelRequest, lang, user, liveRoomId }) {
  const tr = translations[lang] || translations.es;
  const tracks = useTracks([{ source: Track.Source.Camera, withPlaceholder: false }]);
  const participants = useParticipants();
  const room = useRoomContext();
  const [profiles, setProfiles] = useState({});
  const recentEntries = useRef(new Map());
  const [speakers, setSpeakers] = useState([]);
  // v3.23: Persistent chat by LIVE room, with local reading-position memory.
  const historyKey = `rivyza-live-chat-v323:${liveRoomId}:${user?.id || 'viewer'}`;
  const scrollKey = `${historyKey}:scroll`;
  const chatRef = useRef(null);
  const readingOld = useRef(false);
  const restoringChat = useRef(true);
  const [chat, setChat] = useState(() => {
    try { const rows = JSON.parse(localStorage.getItem(historyKey) || '[]'); return Array.isArray(rows) ? rows : []; }
    catch { return []; }
  });
  const [chatNotice, setChatNotice] = useState('');
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasOlder, setHasOlder] = useState(true);
  const previousHeight = useRef(null);
  const chatBusy = useRef(false);
  const appendChat = useCallback(entry => {
    setChat(items => {
      if (items.some(m => m.id === entry.id)) return items;
      return [...items, {...entry, at:entry.at || Date.now()}]
        .sort((a,b) => (a.at || 0) - (b.at || 0) || String(a.id).localeCompare(String(b.id))).slice(-5000);
    });
  }, []);
  useEffect(() => {
    try { localStorage.setItem(historyKey, JSON.stringify(chat.slice(-500))); } catch {}
  }, [chat, historyKey]);
  useEffect(() => {
    const node = chatRef.current;
    if (!node) return;
    if (previousHeight.current !== null) {
      node.scrollTop += node.scrollHeight - previousHeight.current;
      previousHeight.current = null;
      return;
    }
    if (restoringChat.current) {
      restoringChat.current = false;
      try {
        const saved = JSON.parse(localStorage.getItem(scrollKey) || 'null');
        if (saved?.atBottom === false) {
          node.scrollTop = Math.max(0, saved.top || 0);
          readingOld.current = true;
        } else node.scrollTop = node.scrollHeight;
      } catch { node.scrollTop = node.scrollHeight; }
    } else if (!readingOld.current) node.scrollTop = node.scrollHeight;
  }, [chat, scrollKey]);
  const onChatScroll = () => {
    const el = chatRef.current;
    if (!el) return;
    const bottom = el.scrollHeight - el.scrollTop - el.clientHeight <= 28;
    readingOld.current = !bottom;
    try { localStorage.setItem(scrollKey, JSON.stringify({atBottom:bottom, top:el.scrollTop})); } catch {}
  };
  const mapSaved = row => ({id:row.client_id, name:row.author_name,
    text:row.body, system:row.kind === 'event', at:new Date(row.created_at).getTime()});
  const mergeSaved = rows => setChat(items => {
    const byId = new Map(items.map(m => [m.id, m]));
    for (const row of rows) byId.set(row.client_id, mapSaved(row));
    return [...byId.values()].sort((a,b) => (a.at || 0) - (b.at || 0) || String(a.id).localeCompare(String(b.id))).slice(-5000);
  });
  const saveEntry = async (entry, kind='message') => {
    if (!user?.id || !liveRoomId) return false;
    const {error} = await supabase.from('rivyza_live_chat').insert({
      room_id:liveRoomId, client_id:entry.id, author_id:user.id,
      author_name:(entry.name || room.localParticipant.name || 'Usuario').slice(0,100),
      body:entry.text.slice(0,300),kind
    });
    if (error) { setChatNotice('El mensaje se ve localmente, pero no se guardó en Supabase. Comprueba el SQL v3.23.'); return false; }
    setChatNotice(''); return true;
  };
  // The table is the cross-device source of truth; LiveKit packets remain the low-latency path.
  useEffect(() => {
    if (!supabase || !liveRoomId || !user?.id) return;
    let alive = true;
    const refresh = async () => {
      if (chatBusy.current) return;
      chatBusy.current = true;
      try {
        const {data,error} = await supabase.from('rivyza_live_chat')
          .select('client_id,author_name,body,kind,created_at')
          .eq('room_id',liveRoomId).order('created_at',{ascending:false}).limit(500);
        if (error) throw error;
        if (alive) { mergeSaved([...(data || [])].reverse()); setHasOlder((data || []).length === 500); }
      } catch (e) {
        if (alive) setChatNotice('No se pudo recuperar el historial. Verifica el SQL v3.23 y la conexión.');
      } finally { chatBusy.current = false; }
    };
    refresh(); const timer = setInterval(refresh, 4500);
    return () => { alive = false; clearInterval(timer); };
  }, [supabase, liveRoomId, user?.id]);
  const loadOlder = async () => {
    if (loadingOlder || !chat.length) return;
    setLoadingOlder(true);
    try {
      const oldest = new Date(Math.min(...chat.map(m => m.at || Date.now()))).toISOString();
      const {data,error} = await supabase.from('rivyza_live_chat')
        .select('client_id,author_name,body,kind,created_at')
        .eq('room_id',liveRoomId).lt('created_at',oldest)
        .order('created_at',{ascending:false}).limit(250);
      if (error) throw error;
      if (chatRef.current) previousHeight.current = chatRef.current.scrollHeight;
      if (!data?.length) { previousHeight.current = null; setHasOlder(false); }
      else mergeSaved(data);
      if ((data || []).length < 250) setHasOlder(false);
    } catch(e) { previousHeight.current = null; setChatNotice('No se pudieron cargar mensajes anteriores.'); }
    finally { setLoadingOlder(false); }
  };
  const [comment, setComment] = useState('');
  const [flipping, setFlipping] = useState(false);
  const [facing, setFacing] = useState('user');
  const peopleIds = participants.map(p => p.identity).sort().join(',');
  useEffect(() => {
    let active = true;
    if (peopleIds) supabase.from('profiles').select('id,display_name,username,avatar_url').in('id', peopleIds.split(',')).then(({data}) => {
      if (active) setProfiles(Object.fromEntries((data || []).map(p => [p.id,p])));
    });
    return () => { active = false; };
  }, [peopleIds, supabase]);
  // The LIVE avatar must come exclusively from the RIVYZA profile.
  // Never use the Google/OAuth avatar or LiveKit metadata as a substitute.
  const [ownRivyzaAvatar, setOwnRivyzaAvatar] = useState('');
  useEffect(() => {
    if (!user?.id) return;
    let active = true;
    supabase.from('profiles').select('avatar_url').eq('id', user.id).maybeSingle()
      .then(({ data }) => { if (active) setOwnRivyzaAvatar(data?.avatar_url || ''); });
    return () => { active = false; };
  }, [supabase, user?.id]);
  const avatarFor = (t) =>
    profiles[t.identity]?.avatar_url ||
    (t.identity === user?.id || t.isLocal ? ownRivyzaAvatar : '') || '';

  useEffect(() => {
    const entered = p => {
      if (!isHost) return; // host records a single join/leave event for everyone
      const last = recentEntries.current.get(p.identity) || 0;
      recentEntries.current.set(p.identity, Date.now());
      if (Date.now() - last < 15000) return;
      const entry = {id:crypto.randomUUID(), name:'LIVE', text:`${p.name || 'Usuario'} entró al LIVE`, system:true};
      appendChat(entry); saveEntry(entry,'event');
    };
    const receive = (bytes, sender, kind, topic) => {
      if (topic !== 'rivyza-chat' || !sender) return;
      try {
        const m = JSON.parse(new TextDecoder().decode(bytes));
        if (typeof m.text === 'string' && m.text.trim())
          appendChat({id:m.id || crypto.randomUUID(), name:sender.name || 'Usuario', text:m.text.slice(0,300), at:m.at || Date.now()});
      } catch {}
    };
    const departed = p => {
      if (!isHost) return;
      const entry = {id:crypto.randomUUID(), name:'LIVE', text:`${p.name || 'Usuario'} salió del LIVE`, system:true};
      appendChat(entry); saveEntry(entry,'event');
    };
    room.on(RoomEvent.ParticipantConnected, entered);
    room.on(RoomEvent.ParticipantDisconnected, departed);
    room.on(RoomEvent.DataReceived, receive);
    return () => {
      room.off(RoomEvent.ParticipantConnected, entered);
      room.off(RoomEvent.ParticipantDisconnected, departed);
      room.off(RoomEvent.DataReceived, receive);
    };
  }, [room, appendChat, isHost, liveRoomId, user?.id]);
  async function sendComment(e) {
    e.preventDefault(); const text = comment.trim().slice(0,300); if (!text) return;
    const entry = {id:crypto.randomUUID(), name:room.localParticipant.name || 'Tú',text,at:Date.now()};
    try {
      appendChat(entry); setComment('');
      await Promise.all([
        saveEntry(entry),
        room.localParticipant.publishData(new TextEncoder().encode(JSON.stringify({id:entry.id,text,at:entry.at})), {reliable:true,topic:'rivyza-chat'})
      ]);
    } catch(err) { onError(err.message); }
  }
  async function flipCamera() {
    if (flipping) return;
    setFlipping(true);
    try {
      const next = facing === 'user' ? 'environment' : 'user';
      const track = room.localParticipant.getTrackPublication(Track.Source.Camera)?.track;
      if (track) { await track.restartTrack({facingMode:next}); await room.localParticipant.setCameraEnabled(true); }
      else await room.localParticipant.setCameraEnabled(true, {facingMode:next});
      setFacing(next);
    } catch(e) { onError('No se pudo voltear la cámara: ' + e.message); }
    finally { setFlipping(false); }
  }
  const [soundReady, setSoundReady] = useState(false);
  async function activateAudio() {
    try { await room.startAudio(); setSoundReady(true); }
    catch (e) { onError(e?.message || "Audio could not be enabled"); }
  }
  useEffect(() => {
    const speaking = list => setSpeakers(list.map(p=>p.identity));
    const reconnected = async () => { if (!isHost) await onLeaveCamera(); };
    room.on(RoomEvent.ActiveSpeakersChanged, speaking);
    room.on(RoomEvent.Reconnected, reconnected);
    return () => {room.off(RoomEvent.ActiveSpeakersChanged,speaking);room.off(RoomEvent.Reconnected,reconnected)};
  }, [room,isHost,onLeaveCamera]);
  const [slots, setSlots] = useState(10);
  const [target, setTarget] = useState(null);
  const [expelling, setExpelling] = useState(false);
  const [blockedOpen, setBlockedOpen] = useState(false);
  const [reason, setReason] = useState('Insultos o lenguaje ofensivo');
  const [details, setDetails] = useState('');
  const [moveTarget, setMoveTarget] = useState(null);
  const { localParticipant, isMicrophoneEnabled: mic, isCameraEnabled: cam } = useLocalParticipant();
  async function toggleMic() {
    try { await localParticipant.setMicrophoneEnabled(!localParticipant.isMicrophoneEnabled); }
    catch (e) { onError(e?.message || 'No se pudo cambiar el micrófono'); }
  }
  async function toggleCam() {
    try { await localParticipant.setCameraEnabled(!localParticipant.isCameraEnabled); }
    catch (e) { onError(e?.message || 'No se pudo encender la cámara. Comprueba los permisos del navegador.'); }
  }
  const [drawer, setDrawer] = useState(false);
  const [typing, setTyping] = useState(false);
  const [confirmStop, setConfirmStop] = useState(false);
  const [moveMode, setMoveMode] = useState(false);
  const [selected, setSelected] = useState(null);
  const [positions, setPositions] = useState({});
  // The server validates movements and stores the layout in room metadata.
  useEffect(() => {
    const receive = () => {
      try { const layout = JSON.parse(room.metadata || '{}').rivyzaLayout;
        if (layout) { setPositions(layout.positions || {}); setSlots(layout.slots || 10); }
      } catch {}
    };
    receive(); room.on(RoomEvent.RoomMetadataChanged, receive);
    return () => room.off(RoomEvent.RoomMetadataChanged, receive);
  }, [room]);
  async function broadcastLayout(nextPositions, nextSlots = slots) {
    const normalized = {};
    const used = new Set();
    // Complete the effective order so a swap cannot displace a third participant.
    const occupants = ordered.filter(Boolean).sort((a,b)=>a.identity===hostId?-1:b.identity===hostId?1:0);
    for (const p of occupants) {
      const desired = nextPositions[p.identity] ?? ordered.findIndex(x=>x?.identity===p.identity);
      if (desired >= 0 && desired < nextSlots && !used.has(desired)) {normalized[p.identity]=desired;used.add(desired);}
    }
    for (const p of occupants) {
      if (normalized[p.identity] !== undefined) continue;
      const free = Array.from({length:nextSlots},(_,i)=>i).find(i=>!used.has(i));
      if (free !== undefined) {normalized[p.identity]=free;used.add(free);}
    }
    try { await onModerate('layout', {positions:normalized, slots:nextSlots}); }
    catch(e) { onError(e.message); }
  }
  const shown = [...participants].filter(p => p.identity === hostId || p.permissions?.canPublish).sort((a,b) => (a.identity === hostId ? -1 : b.identity === hostId ? 1 : a.identity.localeCompare(b.identity))).slice(0, slots);
  const ordered = Array(slots).fill(null);
  const trackById = new Map(tracks.map(t => [t.participant.identity, t]));
  const placed = new Set();
  for (const t of shown) {
    const index = positions[t.identity] ?? (t.identity === hostId ? 0 : undefined);
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
      broadcastLayout(next); setMoveTarget(null); return;
    }
    if (t) { setTarget(t); setExpelling(false); }
  }
  async function applyModeration(kind, extra = {}) {
    if (!target) return;
    try { await onModerate(kind, {guestId:target.identity, ...extra}); setTarget(null); setExpelling(false); }
    catch(e) { onError(e.message); }
  }
  return <>
    <div className={`rivyza-live-grid rivyza-live-grid-square rivyza-live-layout-${slots} ${slots === 1 ? "rivyza-live-solo" : ""}`}>
      {ordered.map((t, i) => <div key={i}
        className={`rivyza-live-tile rivyza-live-square ${!t ? 'rivyza-live-vacant' : ''} ${selected === i ? 'rivyza-live-picked' : ''} ${speakers.includes(t?.identity) ? 'rivyza-v314-speaking' : ''}`}
        onClick={() => moveMode ? swap(i) : (t || moveTarget) ? chooseTile(t,i) : (!publish && onRequest?.())} role='button'
        tabIndex={0}
        onKeyDown={e => { if ((e.key === 'Enter' || e.key === ' ') ) { e.preventDefault(); if(moveMode) swap(i); else chooseTile(t,i); } }}>
        {t ? <>{t.isCameraEnabled && trackById.has(t.identity) ? <VideoTrack trackRef={trackById.get(t.identity)} className="rivyza-v318-video" /> : <div className="rivyza-live-avatar-fallback">{avatarFor(t) ? <><img src={avatarFor(t)} alt={t.name || 'Perfil'} onError={e=>{e.currentTarget.style.display='none';const next=e.currentTarget.nextElementSibling;if(next)next.style.display='flex';}} style={{width:'58%',height:'58%',borderRadius:'50%',objectFit:'cover'}}/><span style={{display:'none'}}>{(t.name || 'U').slice(0,1).toUpperCase()}</span></> : <span>{(t.name || 'U').slice(0,1).toUpperCase()}</span>}</div>}{!t.isMicrophoneEnabled && <span className="rivyza-v317-mic-off" role="img" aria-label="Micrófono silenciado"><svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 9v3a3 3 0 0 0 5.1 2.1"/><path d="M15 9V5a3 3 0 0 0-5.8-1"/><path d="M5 10v2a7 7 0 0 0 12 4.9"/><path d="M19 10v2c0 .7-.1 1.4-.3 2"/><path d="M12 19v3"/><path d="M8 22h8"/><path d="M3 3l18 18"/></svg></span>}<span className="rivyza-live-camera-name">{t.identity === hostId ? '👑 ' : moderatorIds?.includes(t.identity) ? '🛡️ ' : ''}{t.name || tr.guest}</span></> : <span className="rivyza-live-camera-name">+ {tr.camera} {i + 1}</span>}
      </div>)}
    </div>
    {(moveMode || moveTarget) && <p className="rivyza-live-hint">{moveTarget || selected !== null ? 'Selecciona la posición de destino' : tr.moveHint}<button onClick={()=>{setMoveTarget(null);setMoveMode(false);setSelected(null)}}>Cancelar</button></p>}
    {typeof document !== 'undefined' && document.querySelector('.rivyza-live-top') && createPortal(<div className="rivyza-live-viewer-count rivyza-live-viewer-header rivyza-v32-viewers" style={{position:"static",top:"auto",right:"auto",zIndex:"auto",display:"inline-flex",alignItems:"center",gap:"5px",marginLeft:"8px",verticalAlign:"middle",padding:"3px 8px",fontSize:"11px",lineHeight:"18px",whiteSpace:"nowrap",background:"rgba(57,43,73,.9)",borderRadius:"999px"}} aria-label="Espectadores conectados"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg><span>{participants.length}</span></div>, document.querySelector('.rivyza-live-top'))}
    <div className="rivyza-v314-chat" ref={chatRef} onScroll={onChatScroll} role="log" aria-label={lang === 'es' ? 'Historial del chat del LIVE' : 'LIVE chat history'} aria-live="off">{hasOlder && chat.length > 0 && <button type="button" className="rivyza-v323-earlier" disabled={loadingOlder} onClick={loadOlder}>{loadingOlder ? "Cargando…" : "↑ Ver mensajes anteriores"}</button>}{chat.map(m=><div key={m.id} className={m.system ? 'rivyza-v322-event' : ''}>{m.name && <strong>{m.name}: </strong>}{m.text}</div>)}</div>{chatNotice && <div className="rivyza-v323-chat-notice" role="status">{chatNotice}</div>}
    {!publish && requestStatus && <div className="rivyza-v314-request-status" role="status">{requestStatus === 'pending' ? 'Solicitud enviada' : requestStatus === 'approved' ? 'Solicitud aceptada. Conectando…' : 'Solicitud finalizada. Puedes solicitar subir de nuevo.'}{requestStatus === 'pending' && <button onClick={onCancelRequest}>Cancelar solicitud</button>}</div>}
    <div className={`rivyza-live-bottom-bar rivyza-v32-toolbar ${typing ? 'rivyza-v32-typing' : ''}`}>
      <form onSubmit={sendComment} className="rivyza-v314-comment-form"><input value={comment} onChange={e=>setComment(e.target.value)} maxLength={300} className="rivyza-v32-comment" type="text" placeholder={lang === 'es' ? 'Escribe un comentario…' : 'Write a comment…'} aria-label="Comentario" onFocus={() => setTyping(true)} onBlur={() => setTyping(false)} /><button type="submit" aria-label="Enviar comentario">➤</button></form>
      {!typing && <>
        {publish && <button type="button" className="rivyza-v32-icon" onClick={toggleCam} aria-label={cam ? 'Apagar cámara' : 'Encender cámara'} title={cam ? 'Apagar cámara' : 'Encender cámara'}>{cam ? '📹' : '📷'}</button>}
        {publish && <button type="button" className="rivyza-v32-icon" onClick={toggleMic} aria-label={mic ? 'Silenciar micrófono' : 'Activar micrófono'} title={mic ? 'Silenciar micrófono' : 'Activar micrófono'}><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={mic ? "#FFFFFF" : "#FF3B45"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{display:"block",width:"22px",height:"22px",flexShrink:0,margin:"auto"}}>
          <rect x="9" y="2" width="6" height="12" rx="3" />
          <path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3M8 22h8" />
          {!mic && <><circle cx="12" cy="12" r="10" stroke="#FF3B45" strokeWidth="1.6" /><path d="M5 5l14 14" stroke="#FF3B45" strokeWidth="2.3" /></>}
        </svg></button>}
        {!publish && <button type="button" className="rivyza-v32-icon rivyza-v32-join-request" disabled={requestStatus === 'pending'} onClick={() => onRequest?.()} aria-label={tr.request} title={tr.request}>✋</button>}
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
      {isHost && <label className="rivyza-live-slot-picker">{tr.slots}: <select value={slots} onChange={e => { const count = Number(e.target.value); broadcastLayout(positions, count); }}>{Array.from({length:10},(_,i) => <option key={i} value={i+1}>{i+1}</option>)}</select></label>}
      {(isHost || isModerator) && <button type="button" onClick={() => { setMoveMode(x => !x); setMoveTarget(null); setSelected(null); setDrawer(false); }}>
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
    {target && <div className="rivyza-live-mod-backdrop rivyza-v313-overlay" onClick={() => {setTarget(null);setExpelling(false);}}>
      <div className="rivyza-v313-sheet" role="dialog" aria-modal="true" aria-label="Opciones de participante"
        onClick={e => e.stopPropagation()}
        onTouchStart={e => { e.currentTarget.dataset.touchY = String(e.touches[0].clientY); }}
        onTouchEnd={e => { const y = Number(e.currentTarget.dataset.touchY); if (y && e.changedTouches[0].clientY - y > 95) { setTarget(null); setExpelling(false); } }}>
        <div className="rivyza-v313-handle" aria-hidden="true" />
        <div className="rivyza-v313-head">
          <div className="rivyza-v313-avatar" aria-hidden="true">👤</div>
          <div className="rivyza-v313-person"><strong>{target.name || tr.guest}</strong><span>{target.identity === hostId ? (lang === 'es' ? 'Anfitrión' : 'Host') : moderatorIds?.includes(target.identity) ? (lang === 'es' ? 'Moderador' : 'Moderator') : (lang === 'es' ? 'Participante' : 'Participant')}</span></div>
          <button className="rivyza-v313-close" type="button" onClick={() => {setTarget(null);setExpelling(false)}} aria-label="Cerrar">✕</button>
        </div>
        {!expelling ? <>
          <div className="rivyza-v313-actions">
            <button type="button" onClick={() => {onViewProfile?.(target.identity);setTarget(null);}}><span className="rivyza-v313-glyph">♙</span><span>{lang === 'es' ? 'Ver perfil' : 'View profile'}</span></button>
            {target.identity === localParticipant.identity && publish && <>
              <button onClick={flipCamera} disabled={flipping}>🔄 Voltear cámara</button>
              <button onClick={toggleCam}>{cam ? 'Apagar cámara' : 'Encender cámara'}</button>
              <button onClick={toggleMic}>{mic ? 'Silenciar micrófono' : 'Activar micrófono'}</button>
              {isHost && <button onClick={()=>{setMoveTarget(target.identity);setTarget(null)}}>⇄ Mover mi cámara</button>}
              {!isHost && <button onClick={()=>{setTarget(null);onLeaveCamera()}}>↓ Bajar a escuchar</button>}
            </>}
            {(isHost || isModerator) && target.identity !== localParticipant.identity && target.identity !== hostId && <>
              <button type="button" onClick={() => applyModeration('mute_guest')}><span className="rivyza-v313-glyph">♩̸</span><span>{lang === 'es' ? 'Silenciar' : 'Mute'}</span></button>
              <button type="button" onClick={() => applyModeration('camera_off_guest')}><span className="rivyza-v313-glyph">▣̸</span><span>{lang === 'es' ? 'Apagar cámara' : 'Turn off camera'}</span></button>
              <button type="button" onClick={() => {setMoveTarget(target.identity);setTarget(null)}}><span className="rivyza-v313-glyph">⇄</span><span>{lang === 'es' ? 'Mover' : 'Move'}</span></button>
              {isHost && <button type="button" onClick={() => applyModeration(moderatorIds?.includes(target.identity) ? 'moderator_remove' : 'moderator_add')}><span className="rivyza-v313-glyph">♢</span><span>{moderatorIds?.includes(target.identity) ? (lang === 'es' ? 'Quitar moderador' : 'Remove moderator') : (lang === 'es' ? 'Hacer moderador' : 'Make moderator')}</span></button>}
              <button type="button" onClick={() => applyModeration('lower_guest')}><span className="rivyza-v313-glyph">↓</span><span>{lang === 'es' ? 'Bajar' : 'Leave camera'}</span></button>
              <button type="button" onClick={() => {setTarget(null);setBlockedOpen(true);onRefreshBlocked?.();}}><span className="rivyza-v313-glyph">☷</span><span>{lang === 'es' ? 'Bloqueados' : 'Blocked users'}</span></button>
            </>}
          </div>
          {(isHost || isModerator) && target.identity !== localParticipant.identity && target.identity !== hostId && <div className="rivyza-v313-danger">
            <button type="button" onClick={() => setExpelling(true)}>{lang === 'es' ? 'Expulsar y reportar' : 'Remove and report'}</button>
            <button type="button" onClick={() => {if(window.confirm('¿Bloquear a esta persona del LIVE?')) applyModeration('block_guest')}}>{lang === 'es' ? 'Bloquear del LIVE' : 'Block from LIVE'}</button>
          </div>}
        </> : <div className="rivyza-v313-report">
          <label>Motivo de expulsión<select value={reason} onChange={e=>setReason(e.target.value)}>{['Insultos o lenguaje ofensivo','Acoso o amenazas','Contenido sexual inapropiado','Comportamiento violento','Spam o interrupciones','Otro motivo'].map(x=><option key={x}>{x}</option>)}</select></label>
          <textarea value={details} onChange={e=>setDetails(e.target.value)} placeholder="Detalles opcionales" rows={2}/>
          <button type="button" onClick={() => applyModeration('kick_guest',{reason,details})}>Confirmar expulsión y reporte</button>
          <button type="button" onClick={() => setExpelling(false)}>Cancelar</button>
        </div>}
      </div>
    </div>}
    <RoomAudioRenderer />
    {!soundReady && <button type="button" className="rivyza-live-enable-audio" onClick={activateAudio}>🔊 {tr.activateAudio}</button>}
  </>;
}

export default function LiveRoom({ supabase, user, onExit, onViewProfile, initialRoomId = null }) {
  const enteredRoom = useRef(null);
  const [requestStatus, setRequestStatus] = useState(null);
  const [connectionKey, setConnectionKey] = useState(0);
  const [rooms, setRooms] = useState([]);
  const [roomId, setRoomId] = useState(initialRoomId);
  const [session, setSession] = useState(null);
  const [requests, setRequests] = useState([]);
  const [requestNames, setRequestNames] = useState({});
  const [requestsOpen, setRequestsOpen] = useState(false);
  const [blockedUsers, setBlockedUsers] = useState([]);
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
    setRequestStatus(previous => next.requestStatus === 'rejected' && !previous ? null : next.requestStatus || null);
    setSession(previous => (!previous || previous.publish !== next.publish || previous.moderatorIds?.join() !== next.moderatorIds?.join()) ? next : previous);
  }, [api]);

  useEffect(() => {
    if (!roomId) return;
    let active = true;
    let ticking = false;
    const tick = async () => {
      if (ticking) return; ticking = true;
      try {
        if (!active) return;
        if (enteredRoom.current !== roomId) {
          await api('enter', {roomId});
          if (!active) return;
          enteredRoom.current = roomId;
        }
        await refreshSession(roomId);
        if (roomId && user?.id) {
          const host = session?.host;
          if (host || session?.moderator) setRequests((await api(null, { mode: 'requests', room: roomId }, 'GET')).requests || []);
        }
      } catch (e) { if (active) setError(e.message); }
      finally { ticking = false; }
    };
    tick();
    const interval = setInterval(tick, 2000);
    return () => { active = false; clearInterval(interval); };
  }, [roomId, api, refreshSession, session?.host, session?.moderator, user?.id]);

  const refreshBlocked = useCallback(async () => { if (!roomId) return; try { setBlockedUsers((await api(null, {mode:"blocked",room:roomId},"GET")).blocked || []); } catch(e) { setError(e.message); } }, [roomId,api]);
  async function unblock(guestId) { try { await api("unblock_guest",{roomId,guestId}); await refreshBlocked(); } catch(e) { setError(e.message); } }
  function openLiveProfile(id) {
    if (id) onViewProfile?.(id);
  }
  async function start() {
    if (busy) return;
    setBusy(true); setError('');
    try {
      const result = await api('start', { title: 'LIVE' });
      setRoomId(result.roomId);

    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }

  async function join(id) {
    setError(''); setSession(null); setRoomId(id);
    enteredRoom.current = null; setRequestStatus(null);
  }

  async function leave() {
    if (session?.host && roomId) {
      if (!window.confirm('¿Salir del LIVE? Pulsa Aceptar para terminarlo para todos.')) return;
      try { await api('stop', { roomId }); } catch (e) { setError(e.message); return; }
    }
    // Withdraw a pending camera request before disconnecting from this LIVE.
    if (roomId && !session?.host) {
      try { await api('leave_camera', { roomId }); }
      catch (e) { console.warn('Could not cancel camera request on exit:', e); }
    }
    enteredRoom.current = null; setRequestStatus(null); setRoomId(null); setSession(null); setRequests([]); refreshRooms();
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
      if (kind === 'request') setRequestStatus('pending');
      if (kind === 'cancel_request') setRequestStatus(null);
      if (kind === 'approve' || kind === 'reject') setRequests(r => r.filter(x => x.user_id !== payload.guestId));
      if (kind === 'moderator_add' || kind === 'moderator_remove') await refreshSession(roomId);
      if (kind === 'block_guest') await refreshBlocked();
      // Request confirmation is reflected in the hand control; no banner over the cameras.
    } catch (e) { setError(e.message); throw e; }
  }

  return <main className="rivyza-live-studio">
    <style>{`
.rivyza-live-bottom-drawer.rivyza-v32-popover{padding:12px!important;gap:7px!important;max-height:48dvh;overflow-y:auto}
.rivyza-live-bottom-drawer>button{min-height:38px!important;padding:8px 12px!important;margin:0!important;font-size:13px!important;border-radius:12px!important}
.rivyza-live-bottom-drawer>strong{font-size:15px}.rivyza-live-slot-picker{margin:0!important;padding:5px!important;font-size:13px}
.rivyza-live-bottom-drawer .rivyza-live-power-icon{width:30px!important;height:30px!important;font-size:23px!important}
.rivyza-v313-overlay{position:fixed;inset:0;z-index:1000;background:#0008;display:flex;align-items:flex-end;justify-content:center}
.rivyza-v313-sheet{width:min(100%,600px);background:#25192f;color:#fff;border:1px solid #60446e;border-radius:20px 20px 0 0;padding-bottom:calc(14px + env(safe-area-inset-bottom))!important}
.rivyza-v313-handle{width:40px;height:4px;border-radius:4px;background:#88748e;margin:0 auto 10px}
.rivyza-v313-head{display:flex;align-items:center;gap:10px;margin-bottom:12px}.rivyza-v313-avatar{font-size:26px}.rivyza-v313-person{display:flex;flex-direction:column;flex:1;min-width:0}.rivyza-v313-person strong{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.rivyza-v313-person span{font-size:11px;color:#c8b5d3}.rivyza-v313-close{background:transparent;color:white;border:0;padding:10px}
.rivyza-v313-actions{display:grid;grid-template-columns:repeat(3,minmax(0,1fr))}.rivyza-v313-actions>button{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;background:#382741;color:white;border:1px solid #5a4068;border-radius:12px}.rivyza-v313-glyph{font-size:19px}
.rivyza-v313-danger{display:flex;gap:8px;margin-top:10px}.rivyza-v313-danger button,.rivyza-v313-report button{flex:1;padding:10px;background:#452335;color:#ffb1bc;border:1px solid #7f4459;border-radius:10px;font-size:12px}.rivyza-v313-report{display:grid;gap:8px}.rivyza-v313-report select,.rivyza-v313-report textarea{display:block;width:100%;padding:8px;background:#35253f;color:white;border:1px solid #60446e;border-radius:8px}
.rivyza-v313-sheet{max-height:55dvh!important;overflow-y:auto;padding:14px!important}.rivyza-v313-actions{gap:7px!important}.rivyza-v313-actions>button{min-height:56px!important;padding:8px!important;font-size:12px!important}
.rivyza-live-avatar-fallback{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:#21172b;font-size:32px}
.rivyza-v314-speaking{box-shadow:inset 0 0 0 3px #70e3a0!important}.rivyza-v314-speaking:after{content:'';position:absolute;inset:0;border:3px solid #70e3a0;border-radius:inherit;pointer-events:none;z-index:3}

/* v3.18: render the camera track without LiveKit's full-tile mute/placeholder layer. */
.rivyza-live-tile .rivyza-v318-video{
  display:block!important;
  width:100%!important;
  height:100%!important;
  position:absolute!important;
  inset:0!important;
  object-fit:cover!important;
  background:transparent!important;
}
/* v3.17: mute is an icon, never a video-blocking overlay. */
.rivyza-live-tile .lk-participant-metadata,.rivyza-live-tile .lk-participant-name,.rivyza-live-tile .lk-participant-media-control{display:none!important}
.rivyza-v317-mic-off{position:absolute;right:8px;top:8px;bottom:auto;left:auto;z-index:12;display:flex;align-items:center;justify-content:center;width:19px;height:19px;padding:0;margin:0;border:0;border-radius:0;background:transparent!important;box-shadow:none!important;color:#ff3546;pointer-events:none;line-height:0}
.rivyza-v317-mic-off svg{display:block;width:19px;height:19px;filter:drop-shadow(0 1px 2px rgba(0,0,0,.75))}
.rivyza-v314-chat{position:fixed;bottom:calc(82px + env(safe-area-inset-bottom));left:12px;width:min(86vw,390px);z-index:35;pointer-events:auto;font-size:16px;line-height:1.3;font-weight:500;color:#fff;text-shadow:0 1px 3px #000;height:190px;max-height:25vh;overflow-y:auto;overflow-x:hidden;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;touch-action:pan-y;scrollbar-width:thin;mask-image:linear-gradient(to bottom,transparent 0%,black 14%,black 100%);-webkit-mask-image:linear-gradient(to bottom,transparent 0%,black 14%,black 100%)}
.rivyza-v314-chat>div{background:#171021aa;border-radius:8px;margin:4px 0;padding:5px 8px;overflow-wrap:anywhere}.rivyza-v314-chat .rivyza-v322-event{color:#e5cfeb;font-style:italic;background:rgba(30,20,38,.6)}
.rivyza-v323-earlier{display:block;margin:4px auto;padding:4px 8px;border:1px solid #705579;background:#241731;color:white;border-radius:12px;font-size:12px}
.rivyza-v323-chat-notice{position:fixed;bottom:calc(270px + env(safe-area-inset-bottom));left:12px;right:12px;background:#4d2539;color:white;font-size:11px;padding:6px;z-index:50;pointer-events:none;border-radius:8px}
.rivyza-v314-comment-form{display:flex;min-width:0;flex:1;align-items:center}.rivyza-v314-comment-form input{width:100%!important;min-width:0}.rivyza-v314-comment-form button{border:0;background:transparent;color:white;padding:5px}
.rivyza-v314-request-status{position:fixed;bottom:calc(190px + env(safe-area-inset-bottom));left:12px;z-index:40;font-size:12px;background:#281c35;padding:7px;border-radius:10px}.rivyza-v314-request-status button{margin-left:8px}
.rivyza-live-hint{position:fixed;top:90px;left:12px;right:12px;z-index:60;background:#281c35;padding:8px;border-radius:10px;font-size:13px}.rivyza-live-hint button{margin-left:10px}
`}</style>
    <header className="rivyza-live-top rivyza-v32-header"><button type="button" onClick={roomId ? leave : onExit}>← Volver</button><strong className="rivyza-live-header-center">RIVYZA <span>LIVE</span></strong></header>
    {error && <div className="rivyza-v32-toast" role="status"><span>{error}</span><button type="button" onClick={() => setError('')} aria-label="Cerrar aviso">✕</button></div>}
    {!roomId ? <section className="rivyza-live-lobby">
      <button type="button" className="rivyza-live-start" disabled={busy} onClick={start}>{busy ? 'Conectando…' : '🔴 Iniciar mi LIVE'}</button>
      <h2>Transmisiones en vivo</h2>
      {rooms.length === 0 && <p>Ahora mismo no hay transmisiones. ¡Sé el primero!</p>}
      {rooms.map(r => <button type="button" className="rivyza-live-room-card" key={r.id} onClick={() => join(r.id)}>
        <span className="rivyza-live-red-dot" /> {r.host_avatar && <img src={r.host_avatar} alt="" className="rivyza-live-list-avatar" />} {r.host_name || r.title} <small>Entrar</small>
      </button>)}
    </section> : <section className="rivyza-live-stage">
      {session ? <LiveKitRoom key={`${roomId}-${session.publish}-${connectionKey}`} token={session.token} serverUrl={session.serverUrl}
        onDisconnected={async reason => {
          if (reason === DisconnectReason.CLIENT_INITIATED) return;
          if (session.host) {setError('Se perdió la conexión del LIVE. Vuelve a entrar.');return;}
          if (reason === DisconnectReason.PARTICIPANT_REMOVED || reason === DisconnectReason.DUPLICATE_IDENTITY) {
            enteredRoom.current=null;setRoomId(null);setSession(null);setError('Has salido del LIVE.');return;
          }
          try { await api('leave_camera', {roomId}); await refreshSession(roomId); setConnectionKey(x=>x+1); }
          catch(e) { setError(e.message); setSession(null); }
        }} connect={true} audio={session.publish} video={session.publish && session.host} onError={e => setError(e.message)}>
        <CameraGrid publish={session.publish} isHost={session.host} hostId={session.hostId} isModerator={session.moderator} moderatorIds={session.moderatorIds} onModerate={action} onStop={stopLive} onLeaveCamera={leaveCamera} onLeaveLive={leave} onError={setError} onViewProfile={openLiveProfile} blockedUsers={blockedUsers} onUnblock={unblock} onRefreshBlocked={refreshBlocked} onRequest={()=>action("request")} requests={requests} requestsOpen={requestsOpen} setRequestsOpen={setRequestsOpen} onRequestDecision={(kind, guestId) => action(kind, {guestId})} requestNames={requestNames} requestStatus={requestStatus} supabase={supabase} onCancelRequest={()=>action('cancel_request')} lang={lang} user={user} liveRoomId={roomId} />
      </LiveKitRoom> : <p>Conectando cámaras…</p>}

    </section>}
  </main>;
}
