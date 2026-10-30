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
function CameraGrid({ publish, isHost, hostId, isModerator, moderatorIds, onModerate, onStop, onLeaveCamera, onLeaveLive, onError, onViewProfile, onBlocked, blockedUsers, onUnblock, onRequest, onRefreshBlocked, requests, requestsOpen, setRequestsOpen, onRequestDecision, requestNames, requestStatus, supabase, onCancelRequest, lang, user, liveRoomId, welcomeMessage }) {
  const tr = translations[lang] || translations.es;
  const tracks = useTracks([{ source: Track.Source.Camera, withPlaceholder: false }]);
  const participants = useParticipants();
  const room = useRoomContext();
  const [profiles, setProfiles] = useState({});
  // v3.44: LIVE likes use LiveKit data messages; no camera gestures are intercepted.
  const [liveLikes, setLiveLikes] = useState(0);
  const likesRef = useRef(0);
  const [floatingLikes, setFloatingLikes] = useState([]);
  const likeSerial = useRef(0);
  const lastTapAt = useRef(0);
  const likesFormat = value => value >= 1000000 ? `${(value / 1000000).toFixed(1).replace(/\.0$/, '')}M` : value >= 1000 ? `${(value / 1000).toFixed(1).replace(/\.0$/, '')}K` : String(value);
  const setLikesCount = useCallback(value => {
    const count = Math.max(0, Math.floor(Number(value) || 0));
    likesRef.current = count;
    setLiveLikes(count);
  }, []);
  const sendLikeData = useCallback(async data => {
    try {
      await room.localParticipant.publishData(new TextEncoder().encode(JSON.stringify(data)), {
        reliable: true, topic: 'rivyza-live-likes-v344'
      });
    } catch (e) { console.warn('LIVE like delivery failed', e); }
  }, [room]);
  const showFloatingLikes = useCallback((amount = 1) => {
    const entries = Array.from({length: Math.min(amount, 4)}, () => ({id: ++likeSerial.current, left: 12 + Math.random() * 65}));
    setFloatingLikes(previous => [...previous.slice(-15), ...entries]);
    entries.forEach(entry => setTimeout(() => setFloatingLikes(previous => previous.filter(item => item.id !== entry.id)), 1450));
  }, []);
  useEffect(() => {
    const receiveLikes = (payload, sender, _kind, topic) => {
      if (topic !== 'rivyza-live-likes-v344') return;
      let data;
      try { data = JSON.parse(new TextDecoder().decode(payload)); } catch { return; }
      if (data?.roomId !== liveRoomId) return;
      if (data.type === 'like' && isHost && sender?.identity) {
        const next = likesRef.current + 1;
        setLikesCount(next);
        sendLikeData({type:'count', roomId:liveRoomId, count:next, from:room.localParticipant.identity});
      } else if (data.type === 'count' && sender?.identity === hostId && !isHost) {
        setLikesCount(data.count);
      } else if (data.type === 'sync' && isHost && sender?.identity) {
        sendLikeData({type:'count', roomId:liveRoomId, count:likesRef.current, from:room.localParticipant.identity});
      }
      if (data.type === 'like' && sender?.identity !== room.localParticipant.identity) showFloatingLikes();
    };
    room.on(RoomEvent.DataReceived, receiveLikes);
    if (!isHost) sendLikeData({type:'sync', roomId:liveRoomId});
    return () => room.off(RoomEvent.DataReceived, receiveLikes);
  }, [room, liveRoomId, hostId, isHost, sendLikeData, setLikesCount, showFloatingLikes]);
  const giveLike = useCallback(() => {
    const now = Date.now();
    if (now - lastTapAt.current < 90) return;
    lastTapAt.current = now;
    showFloatingLikes();
    if (isHost) {
      const next = likesRef.current + 1;
      setLikesCount(next);
      sendLikeData({type:'count', roomId:liveRoomId, count:next, from:room.localParticipant.identity});
      sendLikeData({type:'like', roomId:liveRoomId});
    } else {
      sendLikeData({type:'like', roomId:liveRoomId});
    }
  }, [isHost, liveRoomId, sendLikeData, setLikesCount, showFloatingLikes]);
  const [viewersOpen, setViewersOpen] = useState(false);
  const [viewerSelected, setViewerSelected] = useState(null);
  const [incomingInvite, setIncomingInvite] = useState(null);
  const [inviteStatus, setInviteStatus] = useState('');
  // Invitations travel to the connected viewer through LiveKit. Accepting
  // submits the EXISTING camera request; it does not bypass moderation.
  useEffect(() => {
    const receiveInvite = (payload, participant, _kind, topic) => {
      if (topic !== 'rivyza-live-invite' || !participant || participant.identity === room.localParticipant.identity) return;
      try {
        const data = JSON.parse(new TextDecoder().decode(payload));
        if (data?.type !== 'camera-invite' || data.roomId !== liveRoomId ||
            data.to !== room.localParticipant.identity || publish) return;
        setIncomingInvite({from: participant.name || 'Anfitrión', fromId: participant.identity});
      } catch (e) { console.warn('Invalid LIVE invite',e); }
    };
    room.on(RoomEvent.DataReceived,receiveInvite);
    return () => room.off(RoomEvent.DataReceived,receiveInvite);
  }, [room,liveRoomId,publish]);
  async function inviteViewer(id) {
    if (!(isHost || isModerator) || !id || id === room.localParticipant.identity) return;
    setInviteStatus('');
    try {
      const data = new TextEncoder().encode(JSON.stringify({type:'camera-invite',to:id,roomId:liveRoomId}));
      await room.localParticipant.publishData(data, {
        reliable:true, destinationIdentities:[id], topic:'rivyza-live-invite'
      });
      setViewerSelected(null);
      setInviteStatus(lang==='es'?'Invitación enviada':'Invitation sent');
    } catch (e) { setInviteStatus(lang==='es'?'No se pudo enviar la invitación.':'Could not send invitation.');onError?.(e.message); }
  }

  // Preview connections are media-only: never counted as LIVE attendees.
  const [previewIds,setPreviewIds]=useState([]);
  const previewIdsRef=useRef(new Set());
  const [presenceRevision,setPresenceRevision]=useState(0);
  const welcomeSent=useRef(new Set());
  const markPreview=useCallback(id=>{
    if(!id)return;
    previewIdsRef.current.add(id);
    setPreviewIds([...previewIdsRef.current]);
  },[]);
  useEffect(()=>{
    const receive=(payload,sender,_kind,topic)=>{
      if(topic!=='rivyza-preview-presence'||!sender?.identity)return;
      markPreview(sender.identity);
    };
    const disconnect=p=>{
      previewIdsRef.current.delete(p.identity);
      setPreviewIds([...previewIdsRef.current]);
    };
    room.on(RoomEvent.DataReceived,receive);
    room.on(RoomEvent.ParticipantDisconnected,disconnect);
    return()=>{room.off(RoomEvent.DataReceived,receive);room.off(RoomEvent.ParticipantDisconnected,disconnect)};
  },[room,markPreview]);
  const realParticipants=participants.filter(p=>!previewIds.includes(p.identity));
  const visibleViewers = [...realParticipants].sort((a,b) =>
    Number(b.identity === hostId) - Number(a.identity === hostId) ||
    (profiles[a.identity]?.display_name || a.name || '').localeCompare(profiles[b.identity]?.display_name || b.name || '')
  );

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
  // LIVE activity is stored as regular chat events so it remains in history.
  const eventDetails = (entry) => {
    if (!entry.system) return null;
    const body = String(entry.text || '');
    const entering = body.endsWith(' entró al LIVE');
    const leaving = body.endsWith(' salió del LIVE');
    if (!entering && !leaving) return null;
    return { entering, person: body.slice(0, -(entering ? ' entró al LIVE' : ' salió del LIVE').length),
      action: entering ? (lang === 'es' ? 'entró al LIVE' : 'joined LIVE') : (lang === 'es' ? 'salió del LIVE' : 'left LIVE') };
  };
  const eventTime = (at) => {
    const d = new Date(at || Date.now());
    return Number.isFinite(d.getTime()) ? d.toLocaleTimeString(lang === 'es' ? 'es-US' : 'en-US', {hour:'numeric',minute:'2-digit',hour12:true}) : '';
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
  useEffect(()=>{
    const receive=(payload,_sender,_kind,topic)=>{
      if(topic!=='rivyza-private-welcome')return;
      try{
        const data=JSON.parse(new TextDecoder().decode(payload));
        if(data.type!=='welcome'||data.roomId!==liveRoomId||!data.text)return;
        const key=`rivyza-welcome-seen:${liveRoomId}:${user?.id}`;
        if(sessionStorage.getItem(key))return;
        sessionStorage.setItem(key,'1');
        appendChat({id:`private-welcome-${liveRoomId}-${user?.id}`,name:'💗 Bienvenida',text:data.text,privateWelcome:true,at:Date.now()});
      }catch(e){console.warn('Welcome message',e)}
    };
    room.on(RoomEvent.DataReceived,receive);
    return()=>room.off(RoomEvent.DataReceived,receive);
  },[room,liveRoomId,user?.id,appendChat]);
  const [comment, setComment] = useState('');
  const [flipping, setFlipping] = useState(false);
  // v3.30: use LiveKit data messages instead of restricted participant metadata.
  const [mirrorStates, setMirrorStates] = useState({});
  const mirrorEnabled = mirrorStates[room.localParticipant.identity] === true;
  const [mirrorBusy, setMirrorBusy] = useState(false);
  useEffect(() => {
    const receiveMirror = (payload, sender, _kind, topic) => {
      if (topic !== 'rivyza-camera-mirror' || !sender?.identity) return;
      try {
        const data = JSON.parse(new TextDecoder().decode(payload));
        if (data?.type === 'mirror-state' && typeof data.enabled === 'boolean') {
          setMirrorStates(prev => ({...prev, [sender.identity]: data.enabled}));
        }
      } catch {}
    };
    const onConnected = p => {
      // Share our current setting with anyone joining later.
      room.localParticipant.publishData(
        new TextEncoder().encode(JSON.stringify({type:'mirror-state',enabled:mirrorEnabled})),
        {reliable:true,topic:'rivyza-camera-mirror',destinationIdentities:[p.identity]}
      ).catch(() => {});
    };
    const onDisconnected = p => setMirrorStates(prev => {
      const next = {...prev}; delete next[p.identity]; return next;
    });
    room.on(RoomEvent.DataReceived, receiveMirror);
    room.on(RoomEvent.ParticipantConnected, onConnected);
    room.on(RoomEvent.ParticipantDisconnected, onDisconnected);
    return () => {
      room.off(RoomEvent.DataReceived, receiveMirror);
      room.off(RoomEvent.ParticipantConnected, onConnected);
      room.off(RoomEvent.ParticipantDisconnected, onDisconnected);
    };
  }, [room, mirrorEnabled]);
  async function toggleMirrorCamera() {
    if (mirrorBusy) return;
    const enabled = !mirrorEnabled;
    setMirrorBusy(true);
    try {
      await room.localParticipant.publishData(
        new TextEncoder().encode(JSON.stringify({type:'mirror-state',enabled})),
        {reliable:true,topic:'rivyza-camera-mirror'}
      );
      setMirrorStates(prev => ({...prev, [room.localParticipant.identity]: enabled}));
    } catch (e) { onError('No se pudo cambiar Mirror Camera: ' + (e?.message || 'Error')); }
    finally { setMirrorBusy(false); }
  }

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

  const publishActivity = (entry) => {
    appendChat(entry);
    // LiveKit delivers the event immediately; Supabase persists it for reconnects.
    try {
      room.localParticipant.publishData(
        new TextEncoder().encode(JSON.stringify({id:entry.id,text:entry.text,at:entry.at,system:true})),
        {reliable:true,topic:'rivyza-chat'}
      ).catch(e => console.warn('LIVE activity broadcast',e));
    } catch(e) { console.warn('LIVE activity broadcast',e); }
    saveEntry(entry,'event');
  };
  useEffect(() => {
    const timers = new Set();
    const entered = p => {
      if (!isHost) return;
      // Allow the preview-only player to identify itself before counting/logging.
      const timer = setTimeout(async()=>{
        if(previewIdsRef.current.has(p.identity) || !room.remoteParticipants.has(p.identity))return;
        const last=recentEntries.current.get(p.identity)||0;
        recentEntries.current.set(p.identity,Date.now());
        if(Date.now()-last>=15000){
          publishActivity({id:crypto.randomUUID(),name:'LIVE',text:`${profiles[p.identity]?.display_name || p.name || 'Usuario'} entró al LIVE`,system:true,at:Date.now()});
        }
        const text=(welcomeMessage||'').trim();
        if(!text || welcomeSent.current.has(p.identity))return;
        welcomeSent.current.add(p.identity);
        const name=profiles[p.identity]?.display_name || p.name || 'Usuario';
        const data={type:'welcome',roomId:liveRoomId,text:`${text}\n¡Bienvenido/a, ${name}! ❤️`};
        try{await room.localParticipant.publishData(new TextEncoder().encode(JSON.stringify(data)),{reliable:true,topic:'rivyza-private-welcome',destinationIdentities:[p.identity]});}
        catch(e){welcomeSent.current.delete(p.identity);}
      },1800);
      timers.add(timer);
    };
    const receive = (bytes, sender, kind, topic) => {
      if (topic !== 'rivyza-chat' || !sender) return;
      try {
        const m = JSON.parse(new TextDecoder().decode(bytes));
        if (typeof m.text === 'string' && m.text.trim())
          appendChat({id:m.id || crypto.randomUUID(), name:m.system ? 'LIVE' : (sender.name || 'Usuario'), text:m.text.slice(0,300), system:m.system === true, at:m.at || Date.now()});
      } catch {}
    };
    const departed = p => {
      if (!isHost || previewIdsRef.current.has(p.identity)) return;
      // A connection only qualifies as a departure after being admitted as an attendee.
      if(!recentEntries.current.has(p.identity))return;
      publishActivity({id:crypto.randomUUID(),name:'LIVE',text:`${profiles[p.identity]?.display_name || p.name || 'Usuario'} salió del LIVE`,system:true,at:Date.now()});
    };
    // Also welcome viewers already connected when the host listener becomes ready.
    // This covers the initial join and the async loading of saved welcome settings.
    if (isHost && (welcomeMessage || "").trim()) {
      room.remoteParticipants.forEach(entered);
    }
    room.on(RoomEvent.ParticipantConnected, entered);
    room.on(RoomEvent.ParticipantDisconnected, departed);
    room.on(RoomEvent.DataReceived, receive);
    return () => {
      timers.forEach(clearTimeout);
      room.off(RoomEvent.ParticipantConnected, entered);
      room.off(RoomEvent.ParticipantDisconnected, departed);
      room.off(RoomEvent.DataReceived, receive);
    };
  }, [room, appendChat, isHost, liveRoomId, user?.id, profiles, welcomeMessage]);
  async function sendComment(e) {
    e.preventDefault(); const text = comment.trim().slice(0,300); if (!text) return;
    // Closing the iOS keyboard must not disconnect or resize the LIVE.
    commentInputRef.current?.blur();
    setTyping(false);
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
  // v3.35: invitations inside RIVYZA use existing follows, profiles and messages.
  const [internalShareOpen,setInternalShareOpen]=useState(false);
  const [internalPeople,setInternalPeople]=useState([]);
  const [internalSearch,setInternalSearch]=useState('');
  const [internalSelected,setInternalSelected]=useState([]);
  const [internalBusy,setInternalBusy]=useState(false);
  const [internalError,setInternalError]=useState('');
  const [internalFollowing,setInternalFollowing]=useState([]);
  async function openInternalShare(){
    setDrawer(false);setInternalShareOpen(true);setInternalSearch('');setInternalSelected([]);setInternalError('');
    setInternalBusy(true);
    try {
      const {data:links,error}=await supabase.from('follows').select('following_id').eq('follower_id',user.id);
      if(error)throw error;
      const ids=[...new Set((links||[]).map(x=>x.following_id).filter(id=>id&&id!==user.id))];
      setInternalFollowing(ids);
      if(!ids.length){setInternalPeople([]);return;}
      const {data:people,error:pe}=await supabase.from('profiles').select('id,username,display_name,avatar_url').in('id',ids.slice(0,500));
      if(pe)throw pe;
      setInternalPeople((people||[]).sort((a,b)=>(a.display_name||a.username||'').localeCompare(b.display_name||b.username||'')));
    }catch(e){setInternalError(e.message||'No se pudieron cargar los usuarios.');}
    finally{setInternalBusy(false);}
  }
  useEffect(()=>{
    if(!internalShareOpen||!internalSearch.trim()||!supabase)return;
    let active=true;const timer=setTimeout(async()=>{
      const q=internalSearch.trim().replace(/^@/,'').replace(/[%,()]/g,'').slice(0,60);
      if(!q)return;
      const {data,error}=await supabase.from('profiles').select('id,username,display_name,avatar_url')
        .or(`username.ilike.%${q}%,display_name.ilike.%${q}%`).limit(40);
      if(active){if(error)setInternalError(error.message);else setInternalPeople((data||[]).filter(p=>p.id!==user.id));}
    },300);
    return()=>{active=false;clearTimeout(timer)};
  },[internalShareOpen,internalSearch,supabase,user?.id]);
  async function sendInternalInvites(){
    if(!internalSelected.length||internalBusy)return;
    setInternalBusy(true);setInternalError('');
    try{
      const link=`${window.location.origin}/?live=${encodeURIComponent(liveRoomId)}`;
      // Always identify the actual room owner, even when a moderator shares it.
      if (!hostId) throw new Error('No se pudo identificar al dueño del LIVE.');
      const {data:owner,error:ownerError}=await supabase.from('profiles')
        .select('display_name,username').eq('id',hostId).maybeSingle();
      if(ownerError)throw ownerError;
      const ownerName=(owner?.display_name||owner?.username||'').trim();
      if(!ownerName)throw new Error('No se pudo obtener el nombre del dueño del LIVE.');
      const rows=internalSelected.map(id=>({sender_id:user.id,recipient_id:id,
        body:`🎥 Invitación a RIVYZA LIVE\n👑 ${ownerName} te invita a su LIVE.\nEntra como espectador para ver y escuchar la transmisión.\n${link}`}));
      const {error}=await supabase.from('rivyza_messages').insert(rows);
      if(error)throw error;
      setInternalShareOpen(false);setInviteStatus('');
    }catch(e){setInternalError('No se pudo enviar: '+(e.message||'Error'));}
    finally{setInternalBusy(false);}
  }
  const [drawer, setDrawer] = useState(false);
  async function shareLive() {
    const url = new URL(window.location.href);
    url.searchParams.set('live', liveRoomId);
    const link = url.toString();
    try {
      if (navigator.share) await navigator.share({title:'RIVYZA LIVE',text:'¡Únete a este LIVE en RIVYZA!',url:link});
      else if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(link); setInviteStatus('Enlace del LIVE copiado'); }
      else window.prompt('Copia el enlace del LIVE', link);
      setDrawer(false);
    } catch (e) { if (e?.name !== 'AbortError') onError('No se pudo compartir el LIVE: ' + (e?.message || 'Error')); }
  }
  const [typing, setTyping] = useState(false);
  const commentInputRef = useRef(null);
  const [keyboardLift, setKeyboardLift] = useState(0);
  // Keep the LIVE tiles in their normal position; lift only the typing bar.
  useEffect(() => {
    if (!typing) { setKeyboardLift(0); return; }
    const viewport = window.visualViewport;
    if (!viewport) return;
    const adjust = () => {
      const hidden = Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop);
      setKeyboardLift(hidden > 90 ? Math.round(hidden) : 0);
    };
    adjust();
    viewport.addEventListener('resize', adjust);
    viewport.addEventListener('scroll', adjust);
    return () => {
      viewport.removeEventListener('resize', adjust);
      viewport.removeEventListener('scroll', adjust);
    };
  }, [typing]);
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
    <style>{`.rivyza-live-grid-square .rivyza-live-square video.rivyza-camera-mirrored { transform: scaleX(-1) !important; -webkit-transform: scaleX(-1) !important; }
/* v3.49: Nine cameras fill the available stage width: 50% spotlight + 8 guests. */
.rivyza-live-grid.rivyza-live-layout-9 {
  display: grid !important;
  width: 100% !important;
  max-width: none !important;
  min-width: 0 !important;
  margin-left: 0 !important;
  margin-right: 0 !important;
  box-sizing: border-box !important;
  grid-template-columns: minmax(0, 50%) minmax(0, 25%) minmax(0, 25%) !important;
  grid-template-rows: repeat(4, minmax(0, 1fr)) !important;
  grid-auto-flow: row !important;
  gap: 3px !important;
  overflow: hidden !important;
  align-content: stretch !important;
  justify-content: stretch !important;
}
.rivyza-live-grid.rivyza-live-layout-9 > .rivyza-live-tile {
  position: relative !important;
  width: 100% !important;
  height: 100% !important;
  min-width: 0 !important;
  min-height: 0 !important;
  max-width: none !important;
  max-height: none !important;
  aspect-ratio: auto !important;
  grid-column: auto !important;
  grid-row: auto !important;
  overflow: hidden !important;
}
.rivyza-live-grid.rivyza-live-layout-9 > .rivyza-live-tile:first-child {
  grid-column: 1 !important;
  grid-row: 1 / 5 !important;
}
.rivyza-live-grid.rivyza-live-layout-9 > .rivyza-live-tile:nth-child(2) {grid-column:2 !important;grid-row:1 !important}
.rivyza-live-grid.rivyza-live-layout-9 > .rivyza-live-tile:nth-child(3) {grid-column:3 !important;grid-row:1 !important}
.rivyza-live-grid.rivyza-live-layout-9 > .rivyza-live-tile:nth-child(4) {grid-column:2 !important;grid-row:2 !important}
.rivyza-live-grid.rivyza-live-layout-9 > .rivyza-live-tile:nth-child(5) {grid-column:3 !important;grid-row:2 !important}
.rivyza-live-grid.rivyza-live-layout-9 > .rivyza-live-tile:nth-child(6) {grid-column:2 !important;grid-row:3 !important}
.rivyza-live-grid.rivyza-live-layout-9 > .rivyza-live-tile:nth-child(7) {grid-column:3 !important;grid-row:3 !important}
.rivyza-live-grid.rivyza-live-layout-9 > .rivyza-live-tile:nth-child(8) {grid-column:2 !important;grid-row:4 !important}
.rivyza-live-grid.rivyza-live-layout-9 > .rivyza-live-tile:nth-child(9) {grid-column:3 !important;grid-row:4 !important}
.rivyza-live-grid.rivyza-live-layout-9 > .rivyza-live-tile video {
  width:100% !important;height:100% !important;object-fit:cover !important;
}
`}</style>
    <div className={`rivyza-live-grid rivyza-live-grid-square rivyza-live-layout-${slots} ${slots === 1 ? "rivyza-live-solo" : ""}`}>
      {ordered.map((t, i) => <div key={i}
        className={`rivyza-live-tile rivyza-live-square ${!t ? 'rivyza-live-vacant' : ''} ${selected === i ? 'rivyza-live-picked' : ''} ${speakers.includes(t?.identity) ? 'rivyza-v314-speaking' : ''}`}
        onClick={() => moveMode ? swap(i) : (t || moveTarget) ? chooseTile(t,i) : (!publish && onRequest?.())} role='button'
        tabIndex={0}
        onKeyDown={e => { if ((e.key === 'Enter' || e.key === ' ') ) { e.preventDefault(); if(moveMode) swap(i); else chooseTile(t,i); } }}>
        {t ? <>{t.isCameraEnabled && trackById.has(t.identity) ? <VideoTrack trackRef={trackById.get(t.identity)} className={`rivyza-v318-video ${mirrorStates[t.identity] === true ? "rivyza-camera-mirrored" : ""}`} /> : <div className="rivyza-live-avatar-fallback">{avatarFor(t) ? <><img src={avatarFor(t)} alt={t.name || 'Perfil'} onError={e=>{e.currentTarget.style.display='none';const next=e.currentTarget.nextElementSibling;if(next)next.style.display='flex';}} style={{width:'58%',height:'58%',borderRadius:'50%',objectFit:'cover'}}/><span style={{display:'none'}}>{(t.name || 'U').slice(0,1).toUpperCase()}</span></> : <span>{(t.name || 'U').slice(0,1).toUpperCase()}</span>}</div>}{!t.isMicrophoneEnabled && <span className="rivyza-v317-mic-off" role="img" aria-label="Micrófono silenciado"><svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 9v3a3 3 0 0 0 5.1 2.1"/><path d="M15 9V5a3 3 0 0 0-5.8-1"/><path d="M5 10v2a7 7 0 0 0 12 4.9"/><path d="M19 10v2c0 .7-.1 1.4-.3 2"/><path d="M12 19v3"/><path d="M8 22h8"/><path d="M3 3l18 18"/></svg></span>}<span className="rivyza-live-camera-name">{t.identity === hostId ? '👑 ' : moderatorIds?.includes(t.identity) ? '🛡️ ' : ''}{t.name || tr.guest}</span></> : <span className="rivyza-live-camera-name">+ {tr.camera} {i + 1}</span>}
      </div>)}
    </div>
    {!typing && !target && !viewersOpen && <div className="rivyza-v344-like-zone" role="button" tabIndex={0} aria-label="Dar Likes al LIVE" onPointerDown={e => {e.preventDefault(); giveLike();}} onKeyDown={e => {if(e.key === 'Enter' || e.key === ' ') {e.preventDefault();giveLike();}}}><span className="rivyza-v344-like-hint"><span className="rivyza-v344-like-heart" aria-hidden="true">💗</span><span>Likes</span></span></div>}
    <div className="rivyza-v344-floating" aria-hidden="true">{floatingLikes.map(item => <svg key={item.id} className="rivyza-v344-float-heart" style={{left:`${item.left}%`}} viewBox="0 0 24 24"><defs><linearGradient id={`rivyza-like-${item.id}`} x1="0" y1="1" x2="1" y2="0"><stop offset="0%" stopColor="#ff4da9"/><stop offset="100%" stopColor="#963cff"/></linearGradient></defs><path d="M12 21s-9-5.7-9-12a5 5 0 0 1 9-3 5 5 0 0 1 9 3c0 6.3-9 12-9 12Z" fill={`url(#rivyza-like-${item.id})`}/></svg>)}</div>
    {typeof document !== 'undefined' && document.querySelector('.rivyza-live-header-center') && createPortal(<div className="rivyza-v344-like-counter"><svg viewBox="0 0 24 24" width="13" height="13" aria-hidden="true"><defs><linearGradient id="rivyza-like-counter-gradient" x1="0" y1="1" x2="1" y2="0"><stop offset="0%" stopColor="#ff4da9"/><stop offset="100%" stopColor="#963cff"/></linearGradient></defs><path d="M12 21s-9-5.7-9-12a5 5 0 0 1 9-3 5 5 0 0 1 9 3c0 6.3-9 12-9 12Z" fill="url(#rivyza-like-counter-gradient)"/></svg><span>{likesFormat(liveLikes)} Likes</span></div>, document.querySelector('.rivyza-live-header-center'))}
    {(moveMode || moveTarget) && <p className="rivyza-live-hint">{moveTarget || selected !== null ? 'Selecciona la posición de destino' : tr.moveHint}<button onClick={()=>{setMoveTarget(null);setMoveMode(false);setSelected(null)}}>Cancelar</button></p>}
    {typeof document !== 'undefined' && document.querySelector('.rivyza-live-top') && createPortal(<button type="button" onClick={() => setViewersOpen(true)} className="rivyza-live-viewer-count rivyza-live-viewer-header rivyza-v32-viewers" style={{position:"static",top:"auto",right:"auto",zIndex:"auto",display:"inline-flex",alignItems:"center",gap:"5px",marginLeft:"8px",verticalAlign:"middle",padding:"3px 8px",fontSize:"11px",lineHeight:"18px",whiteSpace:"nowrap",background:"rgba(57,43,73,.9)",borderRadius:"999px"}} aria-label="Ver personas conectadas al LIVE" aria-expanded={viewersOpen}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg><span>{realParticipants.length}</span></button>, document.querySelector('.rivyza-live-top'))}

    {viewersOpen && typeof document !== 'undefined' && createPortal(
      <div role="presentation" onClick={() => {setViewersOpen(false);setViewerSelected(null);}}
        style={{position:'fixed',inset:0,zIndex:2147483000,background:'rgba(0,0,0,.70)',display:'flex',alignItems:'flex-end',justifyContent:'center'}}>
        <section role="dialog" aria-modal="true" aria-label="Personas en la sala" onClick={e=>e.stopPropagation()}
          style={{background:'#201829',color:'#fff',borderRadius:'18px 18px 0 0',width:'100%',maxWidth:520,maxHeight:'min(66dvh,550px)',display:'flex',flexDirection:'column',padding:'16px 16px calc(18px + env(safe-area-inset-bottom))',boxSizing:'border-box'}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
            <strong>{lang==='es'?'Personas en la sala':'People in the room'} ({visibleViewers.length})</strong>
            <button type="button" aria-label="Cerrar" onClick={()=>setViewersOpen(false)} style={{background:'none',border:0,color:'#fff',fontSize:24,padding:'2px 10px'}}>×</button>
          </div>
          <div style={{overflowY:'auto',overscrollBehavior:'contain',WebkitOverflowScrolling:'touch'}}>
            {visibleViewers.map(p=>{
              const profile=profiles[p.identity];
              const name=profile?.display_name || profile?.username || p.name || 'Usuario';
              const avatar=avatarFor(p);
              return <button key={p.identity} type="button" onClick={() => {setViewerSelected(p.identity);setInviteStatus('');}}
                style={{display:'flex',alignItems:'center',gap:12,width:'100%',padding:'10px 4px',background:'none',border:0,borderBottom:'1px solid #ffffff18',color:'#fff',textAlign:'left',cursor:'pointer'}}>
                {avatar ? <img src={avatar} alt="" style={{width:43,height:43,borderRadius:'50%',objectFit:'cover'}}/> : <span style={{width:43,height:43,borderRadius:'50%',display:'grid',placeItems:'center',background:'#49365c'}}>{name.slice(0,1).toUpperCase()}</span>}
                <span style={{flex:1,minWidth:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{name}{p.identity===hostId ? ' 👑' : ''}</span>
                <span style={{fontSize:12,color:'#d6b6fa'}}>{lang==='es'?'Opciones ›':'Options ›'}</span>
              </button>;
            })}
            {viewerSelected && (() => {
              const person = participants.find(p => p.identity === viewerSelected);
              if (!person) return null;
              const name=profiles[person.identity]?.display_name || person.name || 'Usuario';
              return <div role="group" aria-label={name} style={{padding:'12px 5px',borderTop:'1px solid #ffffff30'}}>
                <strong style={{display:'block',marginBottom:9}}>{name}</strong>
                <div style={{display:'flex',gap:8}}>
                  <button type="button" onClick={()=>{setViewerSelected(null);setViewersOpen(false);onViewProfile?.(person.identity);}}
                    style={{flex:1,padding:12,borderRadius:10,border:'1px solid #6c527e',background:'#49315b',color:'#fff'}}>👤 {lang==='es'?'Ver perfil':'View profile'}</button>
                  {(isHost || isModerator) && person.identity!==room.localParticipant.identity && person.identity!==hostId &&
                    <button type="button" onClick={()=>inviteViewer(person.identity)}
                      style={{flex:1,padding:12,borderRadius:10,border:'1px solid #6c527e',background:'#7131aa',color:'#fff'}}>✋ {lang==='es'?'Invitar al LIVE':'Invite to LIVE'}</button>}
                </div>
              </div>;
            })()}
            {!visibleViewers.length && <p style={{color:'#d4c7df'}}>{lang==='es'?'No hay participantes conectados.':'No participants connected.'}</p>}
          </div>
        </section>
      </div>, document.body)}
    {inviteStatus && <div role="status" style={{position:'fixed',left:16,right:16,bottom:'calc(90px + env(safe-area-inset-bottom))',zIndex:95,padding:'8px 12px',background:'#35213f',color:'white',borderRadius:12}} onClick={()=>setInviteStatus('')}>{inviteStatus}</div>}
    {incomingInvite && !publish && <div role="dialog" aria-label="Invitación al LIVE" style={{position:'fixed',inset:0,zIndex:2147483000,display:'grid',placeItems:'center',background:'#000a',padding:16}}>
      <div style={{width:'100%',maxWidth:360,background:'#261a33',color:'white',borderRadius:16,padding:20}}>
        <strong>{incomingInvite.from} {lang==='es'?'te invita a subir al LIVE':'invites you to join LIVE'}</strong>
        <p style={{fontSize:13}}>{lang==='es'?'Si aceptas, enviarás una solicitud para subir. El anfitrión o moderador deberá aprobarla.':'Accepting sends a camera request for host or moderator approval.'}</p>
        <div style={{display:'flex',gap:10,marginTop:16}}>
          <button type="button" style={{flex:1,padding:12,borderRadius:10}} onClick={()=>setIncomingInvite(null)}>{lang==='es'?'Rechazar':'Decline'}</button>
          <button type="button" style={{flex:1,padding:12,borderRadius:10,background:'#8e38d0',color:'white'}} onClick={()=>{setIncomingInvite(null);onRequest?.();}}>{lang==='es'?'Aceptar':'Accept'}</button>
        </div>
      </div>
    </div>}
    <div className="rivyza-v314-chat" ref={chatRef} onScroll={onChatScroll} role="log" aria-label={lang === 'es' ? 'Historial del chat del LIVE' : 'LIVE chat history'} aria-live="off">{hasOlder && chat.length > 0 && <button type="button" className="rivyza-v323-earlier" disabled={loadingOlder} onClick={loadOlder}>{loadingOlder ? "Cargando…" : "↑ Ver mensajes anteriores"}</button>}{chat.map(m=>{const activity=eventDetails(m);return <div key={m.id} className={activity ? `rivyza-v328-activity ${activity.entering ? 'rivyza-v328-enter' : 'rivyza-v328-exit'}` : (m.privateWelcome ? 'rivyza-private-welcome' : (m.system ? 'rivyza-v322-event' : ''))}>{activity ? <><span aria-hidden="true" className="rivyza-v328-symbol">{activity.entering ? '↳' : '↰'}</span><span className="rivyza-v328-activity-text"><strong>{activity.person}</strong> {activity.action}</span><time dateTime={new Date(m.at || Date.now()).toISOString()} className="rivyza-v328-time">{eventTime(m.at)}</time></> : <>{m.name && <strong>{m.name}: </strong>}{m.text}</>}</div>})}</div>{chatNotice && <div className="rivyza-v323-chat-notice" role="status">{chatNotice}</div>}
    {!publish && requestStatus && <div className="rivyza-v314-request-status" role="status">{requestStatus === 'pending' ? 'Solicitud enviada' : requestStatus === 'approved' ? 'Solicitud aceptada. Conectando…' : 'Solicitud finalizada. Puedes solicitar subir de nuevo.'}{requestStatus === 'pending' && <button onClick={onCancelRequest}>Cancelar solicitud</button>}</div>}
    <div className={`rivyza-live-bottom-bar rivyza-v32-toolbar ${typing ? 'rivyza-v32-typing' : ''}`} style={target ? {visibility:'hidden',pointerEvents:'none'} : typing ? {bottom:`calc(${keyboardLift}px + 6px)`} : undefined}>
      <form onSubmit={sendComment} className="rivyza-v314-comment-form"><input ref={commentInputRef} value={comment} onChange={e=>setComment(e.target.value)} maxLength={300} className="rivyza-v32-comment" type="text" placeholder={lang === 'es' ? 'Escribe un comentario…' : 'Write a comment…'} aria-label="Comentario" onFocus={() => setTyping(true)} onBlur={() => setTyping(false)} /><button type="submit" aria-label="Enviar comentario">➤</button></form>
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
    {drawer && <div className="rivyza-v329-drawer-backdrop" onClick={() => setDrawer(false)} aria-hidden="true" />}
    {drawer && <div className="rivyza-live-bottom-drawer rivyza-v32-popover">
      <div className="rivyza-live-drawer-handle" />
      <strong>{tr.options} LIVE</strong>
      <button type="button" onClick={openInternalShare}>👥 Compartir en RIVYZA</button>
       <button type="button" onClick={shareLive}>🔗 Compartir externamente</button>
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
    {internalShareOpen && typeof document!=='undefined' && createPortal(
      <div onClick={()=>setInternalShareOpen(false)} style={{position:'fixed',inset:0,zIndex:2147483001,background:'#000b',display:'flex',alignItems:'flex-end',justifyContent:'center'}}>
        <section role="dialog" aria-modal="true" aria-label="Compartir en RIVYZA" onClick={e=>e.stopPropagation()} style={{background:'#24182e',color:'#fff',width:'100%',maxWidth:520,maxHeight:'75dvh',borderRadius:'18px 18px 0 0',padding:'16px 16px calc(18px + env(safe-area-inset-bottom))',display:'flex',flexDirection:'column',gap:12}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}><strong>👥 Compartir en RIVYZA</strong><button type="button" onClick={()=>setInternalShareOpen(false)} aria-label="Cerrar">✕</button></div>
          <input type="search" value={internalSearch} onChange={e=>setInternalSearch(e.target.value)} placeholder="Buscar por nombre o @usuario" style={{padding:12,borderRadius:10,color:'#fff',background:'#392846',border:'1px solid #705581',fontSize:16}}/>
          <small style={{color:'#d8c5e4'}}>{internalSearch?'Resultados de búsqueda':'Personas que sigues'}</small>
          <div style={{overflowY:'auto',minHeight:80,flex:1}}>
            {internalPeople.map(p=><button key={p.id} type="button" onClick={()=>setInternalSelected(prev=>prev.includes(p.id)?prev.filter(id=>id!==p.id):[...prev,p.id])} style={{display:'flex',alignItems:'center',gap:10,width:'100%',padding:9,border:0,borderBottom:'1px solid #ffffff20',background:'transparent',color:'#fff',textAlign:'left'}}>
              {p.avatar_url?<img src={p.avatar_url} alt="" style={{width:38,height:38,borderRadius:'50%',objectFit:'cover'}}/>:<span style={{width:38,height:38,borderRadius:'50%',background:'#604475',display:'grid',placeItems:'center'}}>👤</span>}
              <span style={{flex:1,minWidth:0}}><strong style={{display:'block',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{p.display_name||p.username||'Usuario'}</strong><small>@{p.username||''}</small></span>
              <span aria-label={internalSelected.includes(p.id)?'Seleccionado':'Sin seleccionar'}>{internalSelected.includes(p.id)?'☑':'□'}</span>
            </button>)}
            {!internalPeople.length&&!internalBusy&&<p style={{color:'#d8c5e4'}}>{internalSearch?'No hay resultados.':'Todavía no sigues a nadie.'}</p>}
          </div>
          {internalError&&<p role="alert" style={{color:'#ffabb9',fontSize:12}}>{internalError}</p>}
          <button type="button" disabled={!internalSelected.length||internalBusy} onClick={sendInternalInvites} style={{padding:13,borderRadius:12,background:'#9734ce',color:'#fff',border:0,opacity:(!internalSelected.length||internalBusy)?0.5:1}}>{internalBusy?'Cargando…':`Enviar invitación (${internalSelected.length})`}</button>
        </section>
      </div>,document.body)}
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
              <button type="button" onClick={toggleMirrorCamera} disabled={mirrorBusy} aria-pressed={mirrorEnabled}>↔️ Mirror Camera {mirrorEnabled ? 'ON' : 'OFF'}</button>
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
  const [roomId, setRoomId] = useState(initialRoomId);
  const [session, setSession] = useState(null);
  const [requests, setRequests] = useState([]);
  const [requestNames, setRequestNames] = useState({});
  const [requestsOpen, setRequestsOpen] = useState(false);
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [welcomeMessage,setWelcomeMessage]=useState('');
  const [welcomeEnabled,setWelcomeEnabled]=useState(true);
  useEffect(()=>{
    if(!user?.id)return;
    try{
      const data=JSON.parse(localStorage.getItem(`rivyza-welcome-config:${user.id}`)||'{}');
      setWelcomeMessage(data.text||'');setWelcomeEnabled(data.enabled!==false);
    }catch{}
  },[user?.id]);
  const saveWelcome=(text,enabled)=>{
    setWelcomeMessage(text);setWelcomeEnabled(enabled);
    try{localStorage.setItem(`rivyza-welcome-config:${user.id}`,JSON.stringify({text,enabled}));}catch{}
  };
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
  async function start() {
    if (busy) return;
    setBusy(true); setError('');
    try {
      const result = await api('start', { title: 'LIVE' });
      setRoomId(result.roomId);

    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }

  const exitToHome = useCallback(() => {
    enteredRoom.current = null;
    setRequestStatus(null);
    setRoomId(null);
    setSession(null);
    setRequests([]);
    setError('');
    onExit?.();
  }, [onExit]);
  // Verify room status even if LiveKit's disconnect callback never arrives.
  useEffect(() => {
    if (!roomId || !session || session.host) return;
    let active = true;
    const check = async () => {
      try {
        const result = await api(null, {mode:'status',room:roomId}, 'GET');
        if (active && result.live === false) exitToHome();
      } catch (e) { console.warn('LIVE status check', e); }
    };
    const timer = setInterval(check, 5000);
    return () => { active = false; clearInterval(timer); };
  }, [roomId, session?.host, api, exitToHome]);
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
    exitToHome();
  }

  async function leaveCamera() {
    try { await api('leave_camera', { roomId }); await refreshSession(roomId); }
    catch (e) { setError(e.message); }
  }
  async function stopLive() {
    if (!roomId || !session?.host) return;
    try {
      await api('stop', { roomId });
      exitToHome();
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

/* v3.25: participant options must be fully visible and above LIVE controls. */
.rivyza-v313-overlay{z-index:2000!important;align-items:flex-end!important;padding:0!important}
.rivyza-v313-sheet{box-sizing:border-box!important;max-height:min(72dvh,620px)!important;width:100%!important;max-width:600px!important;overflow-y:auto!important;overscroll-behavior:contain!important;-webkit-overflow-scrolling:touch!important;padding:10px 12px calc(12px + env(safe-area-inset-bottom))!important;border-radius:17px 17px 0 0!important}
.rivyza-v313-head{gap:7px!important;margin-bottom:8px!important}
.rivyza-v313-avatar{font-size:21px!important}
.rivyza-v313-handle{margin-bottom:7px!important}
.rivyza-v313-actions{grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:6px!important}
.rivyza-v313-actions>button{box-sizing:border-box!important;min-height:46px!important;padding:5px 3px!important;font-size:11px!important;line-height:1.15!important;gap:2px!important;overflow-wrap:anywhere!important}
.rivyza-v313-glyph{font-size:16px!important}
.rivyza-v313-danger{margin-top:6px!important}
@media(max-height:650px){.rivyza-v313-sheet{max-height:78dvh!important}.rivyza-v313-actions>button{min-height:40px!important}}

.rivyza-v313-sheet{overflow-y:auto}.rivyza-v313-actions{gap:7px!important}
.rivyza-live-avatar-fallback{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:#21172b;font-size:32px}
.rivyza-v314-speaking{box-shadow:inset 0 0 0 3px #70e3a0!important}.rivyza-v314-speaking:after{content:'';position:absolute;inset:0;border:3px solid #70e3a0;border-radius:inherit;pointer-events:none;z-index:3}

/* v3.31: Apply the mirror transform directly to the LiveKit video element (including Safari). */

.rivyza-v329-drawer-backdrop {position:fixed;inset:0;z-index:1100;background:transparent}
.rivyza-live-bottom-drawer.rivyza-v32-popover {z-index:1101!important}
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
.rivyza-v314-chat{position:fixed;bottom:calc(70px + env(safe-area-inset-bottom));left:12px;width:min(86vw,390px);z-index:35;pointer-events:auto;font-size:16px;line-height:1.3;font-weight:500;color:#fff;text-shadow:0 1px 3px #000;height:165px;max-height:24vh;overflow-y:auto;overflow-x:hidden;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;touch-action:pan-y;scrollbar-width:thin;mask-image:linear-gradient(to bottom,transparent 0%,black 14%,black 100%);-webkit-mask-image:linear-gradient(to bottom,transparent 0%,black 14%,black 100%)}
.rivyza-v314-chat>div{background:#171021aa;border-radius:8px;margin:4px 0;padding:5px 8px;overflow-wrap:anywhere}.rivyza-v314-chat .rivyza-v322-event{color:#e5cfeb;font-style:italic;background:rgba(30,20,38,.6)}
/* v3.28: subtle join/leave activity in the existing chat, with local time. */
.rivyza-v314-chat .rivyza-v328-activity{display:flex;align-items:center;gap:6px;padding:5px 7px;border-radius:7px;font-size:13px;line-height:1.3;font-weight:500;font-style:normal;text-shadow:0 1px 2px #0009;background:rgba(19,19,25,.43);}
.rivyza-v328-enter{color:#89f0b7;}
.rivyza-v328-exit{color:#c5becb;}
.rivyza-v328-symbol{font-size:16px;font-weight:800;flex:none;line-height:1;}
.rivyza-v328-activity-text{flex:1;min-width:0;overflow-wrap:anywhere;}
.rivyza-v328-time{flex:none;color:#c7bed0;font-size:11px;font-weight:500;white-space:nowrap;font-variant-numeric:tabular-nums;}
.rivyza-v323-earlier{display:block;margin:4px auto;padding:4px 8px;border:1px solid #705579;background:#241731;color:white;border-radius:12px;font-size:12px}
.rivyza-v323-chat-notice{position:fixed;bottom:calc(270px + env(safe-area-inset-bottom));left:12px;right:12px;background:#4d2539;color:white;font-size:11px;padding:6px;z-index:50;pointer-events:none;border-radius:8px}

.rivyza-v314-chat .rivyza-private-welcome{white-space:pre-line;background:rgba(96,44,105,.85);border-left:3px solid #ff58b8;color:#fff}
/* v3.24: compact LIVE chat and iOS keyboard overlay (no camera layout changes). */
.rivyza-live-stage{min-height:0}
.rivyza-live-header-center{display:flex!important;flex-wrap:wrap;align-items:center;justify-content:center;column-gap:5px;row-gap:0}
.rivyza-v344-like-counter{display:flex;flex-basis:100%;justify-content:center;align-items:center;gap:4px;font-size:10px;font-weight:600;line-height:13px;color:#f3d6ff;white-space:nowrap}
.rivyza-v344-like-zone{position:fixed;right:12px;bottom:calc(145px + env(safe-area-inset-bottom));width:clamp(100px,30vw,160px);height:100px;z-index:35;touch-action:manipulation;user-select:none;-webkit-user-select:none;display:flex;align-items:flex-end;justify-content:flex-end;cursor:pointer}
.rivyza-v344-like-hint{font-size:10px;line-height:12px;padding:4px 5px;color:#f4d9ff;background:#3d204e99;border:1px solid #9a4bc888;border-radius:15px;pointer-events:none;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;min-width:35px;box-sizing:border-box;white-space:nowrap}
.rivyza-v344-like-heart{font-size:14px;line-height:15px;display:block}
.rivyza-v344-floating{position:fixed;right:8px;bottom:calc(235px + env(safe-area-inset-bottom));width:130px;height:180px;z-index:36;pointer-events:none;overflow:visible}
.rivyza-v344-float-heart{position:absolute;bottom:0;width:24px;height:24px;animation:rivyza-v344-rise 1.4s ease-out forwards}
@keyframes rivyza-v344-rise{0%{opacity:1;transform:translateY(0) scale(.75) rotate(-10deg)}65%{opacity:.9}100%{opacity:0;transform:translateY(-160px) scale(1.35) rotate(18deg)}}
.rivyza-v32-toolbar{position:fixed!important;left:12px!important;right:12px!important;z-index:70!important}
.rivyza-v32-toolbar.rivyza-v32-typing{transform:none!important;transition:none!important;max-width:calc(100vw - 24px)!important}
.rivyza-v314-comment-form{min-height:50px}
.rivyza-v314-comment-form .rivyza-v32-comment{min-height:48px!important;height:48px!important;padding:10px 14px!important;font-size:16px!important;border-radius:24px!important}
.rivyza-v314-comment-form button[type=submit]{min-height:48px;min-width:35px;font-size:21px}
.rivyza-v314-comment-form{display:flex;min-width:0;flex:1;align-items:center}.rivyza-v314-comment-form input{width:100%!important;min-width:0}.rivyza-v314-comment-form button{border:0;background:transparent;color:white;padding:5px}
.rivyza-v314-request-status{position:fixed;bottom:calc(190px + env(safe-area-inset-bottom));left:12px;z-index:40;font-size:12px;background:#281c35;padding:7px;border-radius:10px}.rivyza-v314-request-status button{margin-left:8px}
.rivyza-live-hint{position:fixed;top:90px;left:12px;right:12px;z-index:60;background:#281c35;padding:8px;border-radius:10px;font-size:13px}.rivyza-live-hint button{margin-left:10px}
`}</style>
    <header className="rivyza-live-top rivyza-v32-header"><button type="button" onClick={roomId ? leave : onExit}>← Volver</button><strong className="rivyza-live-header-center">RIVYZA <span>LIVE</span></strong></header>
    {error && <div className="rivyza-v32-toast" role="status"><span>{error}</span><button type="button" onClick={() => setError('')} aria-label="Cerrar aviso">✕</button></div>}
    {!roomId ? <section className="rivyza-live-lobby">
      <div style={{padding:'14px',margin:'8px 0 14px',background:'#21172b',borderRadius:14,color:'#fff'}}>
        <label htmlFor="rivyza-welcome-text" style={{display:'block',fontWeight:700,marginBottom:8}}>💗 Mensaje de bienvenida privado</label>
        <textarea id="rivyza-welcome-text" value={welcomeMessage} maxLength={250} rows={3} onChange={e=>saveWelcome(e.target.value,welcomeEnabled)} placeholder="Bienvenido a mi LIVE. Gracias por estar aquí. Disfruta de la música. 🎶" style={{width:'100%',boxSizing:'border-box',padding:10,borderRadius:9,background:'#120e18',color:'white',border:'1px solid #73557c',fontSize:16}} />
        <label style={{display:'flex',alignItems:'center',gap:8,marginTop:9,fontSize:13}}><input type="checkbox" checked={welcomeEnabled} onChange={e=>saveWelcome(welcomeMessage,e.target.checked)}/> Activar bienvenida privada para cada espectador</label>
        <small style={{display:'block',opacity:.75,marginTop:6}}>Se agregará automáticamente el nombre del espectador al final. Solo él verá el mensaje en su chat.</small>
      </div>
      <button type="button" className="rivyza-live-start" disabled={busy} onClick={start}>{busy ? 'Conectando…' : '🔴 Iniciar mi LIVE'}</button>
    </section> : <section className="rivyza-live-stage">
      {session ? <LiveKitRoom key={`${roomId}-${session.publish}-${connectionKey}`} token={session.token} serverUrl={session.serverUrl}
        onDisconnected={async reason => {
          if (reason === DisconnectReason.CLIENT_INITIATED) return;
          if (reason === DisconnectReason.PARTICIPANT_REMOVED || reason === DisconnectReason.ROOM_DELETED) {
            exitToHome(); return;
          }
          if (session.host) { setError('Se perdió la conexión. Tienes 3 minutos para volver a entrar.'); return; }
          if (reason === DisconnectReason.DUPLICATE_IDENTITY) { exitToHome(); return; }
          try {
            const status = await api(null, {mode:'status',room:roomId}, 'GET');
            if (status.live === false) { exitToHome(); return; }
            await refreshSession(roomId); setConnectionKey(x=>x+1);
          } catch(e) { setError(e.message); setSession(null); }
        }} connect={true} audio={session.publish} video={session.publish && session.host} onError={e => setError(e.message)}>
        <CameraGrid publish={session.publish} isHost={session.host} hostId={session.hostId} isModerator={session.moderator} moderatorIds={session.moderatorIds} onModerate={action} onStop={stopLive} onLeaveCamera={leaveCamera} onLeaveLive={leave} onError={setError} onViewProfile={onViewProfile} blockedUsers={blockedUsers} onUnblock={unblock} onRefreshBlocked={refreshBlocked} onRequest={()=>action("request")} requests={requests} requestsOpen={requestsOpen} setRequestsOpen={setRequestsOpen} onRequestDecision={(kind, guestId) => action(kind, {guestId})} requestNames={requestNames} requestStatus={requestStatus} supabase={supabase} onCancelRequest={()=>action('cancel_request')} lang={lang} user={user} liveRoomId={roomId} welcomeMessage={session.host && welcomeEnabled ? welcomeMessage : ""} />
      </LiveKitRoom> : <p>Conectando cámaras…</p>}

    </section>}
  </main>;
}
