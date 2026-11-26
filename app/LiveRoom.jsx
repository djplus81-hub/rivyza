"use client";

import useScreenWakeLock from './useScreenWakeLock';
import { useCallback, useEffect, useState, useRef } from 'react';
import { LIVE_DEEPAR_EFFECTS } from './liveDeepAREffects';
import LiveStickers from './LiveStickers';
import LiveVoiceEffects from './LiveVoiceEffects';
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
// RIVYZA: automatic high-fidelity audio for every LIVE publisher.
const LIVE_AUDIO_CAPTURE = {
  sampleRate: 48000,
  channelCount: 2,
  echoCancellation: false,
  noiseSuppression: false,
  autoGainControl: false,
};
const LIVE_AUDIO_ROOM_OPTIONS = {
  audioCaptureDefaults: LIVE_AUDIO_CAPTURE,
  publishDefaults: {
    audioPreset: { maxBitrate: 128000 },
    forceStereo: true,
    dtx: false,
    red: true,
  },
};

const liveSlotMemory = new Map();

function CameraGrid({ publish, isHost, hostId, isModerator, moderatorIds, onModerate, onStop, onLeaveCamera, onLeaveLive, onError, onViewProfile, onBlocked, blockedUsers, onUnblock, onRequest, onRefreshBlocked, requests, requestsOpen, setRequestsOpen, onRequestDecision, requestNames, requestStatus, supabase, onCancelRequest, lang, user, liveRoomId, welcomeMessage, welcomeVisit, privateVisitId, confirmStop, setConfirmStop }) {
  const tr = translations[lang] || translations.es;
  const tracks = useTracks([{ source: Track.Source.Camera, withPlaceholder: false }]);
  const participants = useParticipants();
  const room = useRoomContext();
  // Report actual capture settings without recording audio or exposing device IDs.
  useEffect(() => {
    const report = publication => {
      if (publication?.source !== Track.Source.Microphone) return;
      const settings = publication.track?.mediaStreamTrack?.getSettings?.() || {};
      console.info('[RIVYZA audio] capture', {
        sampleRate: settings.sampleRate,
        channelCount: settings.channelCount,
        echoCancellation: settings.echoCancellation,
        noiseSuppression: settings.noiseSuppression,
        autoGainControl: settings.autoGainControl,
        requestedMaxBitrate: 128000,
      });
    };
    const refresh = () => report(room.localParticipant.getTrackPublication(Track.Source.Microphone));
    room.on(RoomEvent.LocalTrackPublished, report);
    room.on(RoomEvent.Reconnected, refresh);
    refresh();
    return () => {
      room.off(RoomEvent.LocalTrackPublished, report);
      room.off(RoomEvent.Reconnected, refresh);
    };
  }, [room]);

  const [profiles, setProfiles] = useState({});
  // v3.64: Supabase is the authoritative counter for every LIVE participant.
  // LiveKit is only a fast notification channel, never the source of truth.
  const [liveLikes, setLiveLikes] = useState(0);
  const likesRef = useRef(0);
  const [floatingLikes, setFloatingLikes] = useState([]);
  const likeSerial = useRef(0);
  const lastTapAt = useRef(0);
  const pendingLikes = useRef(0);
  const likeBatchTimer = useRef(null);
  const sendingLikes = useRef(false);
  const likesFormat = value => value >= 1000000 ? `${(value / 1000000).toFixed(1).replace(/\.0$/, '')}M` : value >= 1000 ? `${(value / 1000).toFixed(1).replace(/\.0$/, '')}K` : String(value);
  const acceptLikes = useCallback(value => {
    const count = Math.max(0, Math.floor(Number(value) || 0));
    // A delayed poll or packet must never make the LIVE count go backwards.
    if (count > likesRef.current) {
      likesRef.current = count;
      setLiveLikes(count);
    }
  }, []);
  const showFloatingLikes = useCallback((amount = 1) => {
    const entries = Array.from({length: Math.min(amount, 4)}, () => ({id: ++likeSerial.current, left: 12 + Math.random() * 65}));
    setFloatingLikes(previous => [...previous.slice(-15), ...entries]);
    entries.forEach(entry => setTimeout(() => setFloatingLikes(previous => previous.filter(item => item.id !== entry.id)), 1450));
  }, []);
  const likeApi = useCallback(async (method, body) => {
    const {data:{session}} = await supabase.auth.getSession();
    if (!session?.access_token) throw new Error('Inicia sesión para dar likes');
    const response = await fetch(method === 'GET'
      ? `/api/live?mode=likes&room=${encodeURIComponent(liveRoomId)}`
      : '/api/live', {
      method,
      headers:{Authorization:`Bearer ${session.access_token}`, ...(method === 'POST' ? {'Content-Type':'application/json'} : {})},
      cache:'no-store',
      ...(method === 'POST' ? {body:JSON.stringify(body)} : {})
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Error al sincronizar likes');
    return result;
  }, [supabase, liveRoomId]);
  const notifyLikes = useCallback(count => {
    if (room.state !== 'connected') return;
    room.localParticipant.publishData(
      new TextEncoder().encode(JSON.stringify({type:'count',roomId:liveRoomId,count})),
      {reliable:true,topic:'rivyza-live-likes-v364'}
    ).catch(() => {});
  }, [room,liveRoomId]);
  const flushLikes = useCallback(async () => {
    if (sendingLikes.current || !pendingLikes.current) return;
    sendingLikes.current = true;
    const amount = pendingLikes.current;
    pendingLikes.current = 0;
    const requestId = crypto.randomUUID();
    try {
      // Retrying this requestId is safe: the SQL function deduplicates it.
      let result;
      for (let attempt = 0; attempt < 3; attempt++) {
        try { result = await likeApi('POST', {action:'like',roomId:liveRoomId,amount,requestId}); break; }
        catch (error) { if (attempt === 2) throw error; await new Promise(resolve => setTimeout(resolve, 400 * (attempt + 1))); }
      }
      acceptLikes(result.count);
      notifyLikes(result.count);
    } catch (error) {
      console.warn('LIVE likes were not saved:',error);
      onError?.('No se pudieron guardar los likes. Revisa la conexión o instala el SQL v3.64.');
    } finally {
      sendingLikes.current = false;
      if (pendingLikes.current) likeBatchTimer.current = setTimeout(() => { likeBatchTimer.current = null; flushLikes(); }, 250);
    }
  }, [likeApi, liveRoomId, acceptLikes, notifyLikes, onError]);
  useEffect(() => {
    likesRef.current = 0;
    setLiveLikes(0);
    pendingLikes.current = 0;
    return () => { if (likeBatchTimer.current) clearTimeout(likeBatchTimer.current); };
  }, [liveRoomId]);
  useEffect(() => {
    let active = true;
    let busy = false;
    const refresh = async () => {
      if (busy) return;
      busy = true;
      try {
        const result = await likeApi('GET');
        if (active) acceptLikes(result.count);
      } catch (error) { console.warn('LIVE likes refresh:', error); }
      finally { busy = false; }
    };
    const receive = (payload, sender, _kind, topic) => {
      if (topic !== 'rivyza-live-likes-v364' || !sender?.identity) return;
      try {
        const data = JSON.parse(new TextDecoder().decode(payload));
        if (data?.type === 'count' && data.roomId === liveRoomId) {
          acceptLikes(data.count);
          refresh();
        }
      } catch {}
    };
    room.on(RoomEvent.DataReceived, receive);
    room.on(RoomEvent.Reconnected, refresh);
    refresh();
    const timer = setInterval(refresh, 1800);
    return () => {
      active = false;
      clearInterval(timer);
      room.off(RoomEvent.DataReceived, receive);
      room.off(RoomEvent.Reconnected, refresh);
    };
  }, [room, liveRoomId, likeApi, acceptLikes]);
  const giveLike = useCallback(() => {
    const now = Date.now();
    if (now - lastTapAt.current < 75) return;
    lastTapAt.current = now;
    showFloatingLikes();
    pendingLikes.current += 1;
    if (!likeBatchTimer.current) {
      likeBatchTimer.current = setTimeout(() => {
        likeBatchTimer.current = null;
        flushLikes();
      }, 250);
    }
  }, [flushLikes, showFloatingLikes]);
  // v3.65: public Top 8 for all LIVE participants.
  const [likesTopOpen, setLikesTopOpen] = useState(false);
  const [likesTop, setLikesTop] = useState([]);
  const [likesTopLoading, setLikesTopLoading] = useState(false);
  const refreshLikesTop = useCallback(async () => {
    if (!liveRoomId) return;
    try {
      const {data:{session}} = await supabase.auth.getSession();
      if (!session?.access_token) return;
      const response = await fetch(`/api/live?mode=likes_top&room=${encodeURIComponent(liveRoomId)}`, {
        headers:{Authorization:`Bearer ${session.access_token}`},cache:'no-store'
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'No se pudo cargar el Top 8');
      setLikesTop(Array.isArray(result.top) ? result.top.slice(0,8) : []);
    } catch (error) { console.warn('LIVE likes Top 8:',error); onError?.('No se pudo cargar el Top 8: ' + (error?.message || 'Comprueba el SQL de likes.')); }
    finally { setLikesTopLoading(false); }
  }, [liveRoomId,supabase,onError]);
  useEffect(() => {
    if (!likesTopOpen) return;
    setLikesTopLoading(true);
    refreshLikesTop();
    const timer = setInterval(refreshLikesTop, 1800);
    return () => clearInterval(timer);
  }, [likesTopOpen,refreshLikesTop]);
  useEffect(() => { setLikesTopOpen(false); setLikesTop([]); }, [liveRoomId]);
  const [viewersOpen, setViewersOpen] = useState(false);
  const [viewerSelected, setViewerSelected] = useState(null);
  const [incomingInvite, setIncomingInvite] = useState(null);
  const [inviteStatus, setInviteStatus] = useState('');
  const inviteConfirmationTimer = useRef(null);
  const inviteConfirmationDeadline = useRef(0);
  const clearInviteConfirmation = useCallback(() => {
    clearTimeout(inviteConfirmationTimer.current);
    inviteConfirmationTimer.current = null;
    inviteConfirmationDeadline.current = 0;
    setInviteStatus('');
  }, []);
  const showInviteConfirmation = useCallback((message) => {
    clearTimeout(inviteConfirmationTimer.current);
    inviteConfirmationDeadline.current = Date.now() + 5000;
    setInviteStatus(message);
    inviteConfirmationTimer.current = setTimeout(clearInviteConfirmation, 5000);
  }, [clearInviteConfirmation]);
  useEffect(() => {
    const check = () => {
      if (inviteConfirmationDeadline.current && Date.now() >= inviteConfirmationDeadline.current) clearInviteConfirmation();
    };
    document.addEventListener('visibilitychange', check);
    window.addEventListener('focus', check);
    return () => {
      clearTimeout(inviteConfirmationTimer.current);
      document.removeEventListener('visibilitychange', check);
      window.removeEventListener('focus', check);
    };
  }, [clearInviteConfirmation]);
  const [requestTab,setRequestTab]=useState('requests');
  const [inviteSlot,setInviteSlot]=useState(null);
  useEffect(()=>{if(!requestsOpen)setInviteSlot(null)},[requestsOpen]);
  const [inviteBusy,setInviteBusy]=useState(false);
  // The authenticated server is authoritative; delivery does not depend on WebRTC data.
  useEffect(() => {
    if (publish || !user?.id || !liveRoomId) { setIncomingInvite(null); return; }
    let active = true, busy = false;
    const refresh = async () => {
      if (busy) return;
      busy = true;
      try {
        const {data:{session}} = await supabase.auth.getSession();
        if (!session?.access_token) return;
        const response = await fetch(`/api/live?mode=incoming_invite&room=${encodeURIComponent(liveRoomId)}`, {
          headers:{Authorization:`Bearer ${session.access_token}`},cache:'no-store'
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Invitation lookup failed');
        if (active) setIncomingInvite(previous => previous?.inviteId === result.invite?.inviteId ? previous : result.invite || null);
      } catch (e) { console.warn('LIVE invitation lookup:',e); }
      finally { busy = false; }
    };
    const receive = (_payload,_sender,_kind,topic) => { if (topic === 'rivyza-live-invite') refresh(); };
    room.on(RoomEvent.DataReceived,receive);
    refresh();
    const timer = setInterval(refresh,2000);
    return () => { active=false; clearInterval(timer); room.off(RoomEvent.DataReceived,receive); };
  }, [room,liveRoomId,publish,user?.id,supabase]);
  async function inviteViewer(id) {
    if (!(isHost || isModerator) || !id || id === room.localParticipant.identity) return;
    clearInviteConfirmation();
    try {
      const result = await onModerate('invite_create',{guestId:id,slot:inviteSlot});
      setViewerSelected(null);
      setRequestsOpen(false);setInviteSlot(null);
      showInviteConfirmation(lang==='es'?'Invitación enviada':'Invitation sent');
      // Optional fast notification only. The saved invitation remains deliverable.
      try {
        const data = new TextEncoder().encode(JSON.stringify({type:'camera-invite',to:id,roomId:liveRoomId,inviteId:result.inviteId}));
        room.localParticipant.publishData(data,{reliable:true,destinationIdentities:[id],topic:'rivyza-live-invite'}).catch(e=>console.warn('LIVE invite fast notification:',e));
      } catch (e) { console.warn('LIVE invite fast notification:',e); }
    } catch (e) { const message=(lang==='es'?'No se pudo enviar la invitación: ':'Could not send invitation: ')+(e.message || 'Error'); clearInviteConfirmation();setInviteStatus(message);onError?.(message); }
  }

  // Preview connections are media-only: never counted as LIVE attendees.
  const [previewIds,setPreviewIds]=useState([]);
  const previewIdsRef=useRef(new Set());
  const [presenceRevision,setPresenceRevision]=useState(0);
  // A welcome is acknowledged by the viewer, not merely by publishData resolving.
  const welcomeSent=useRef(new Set());
   const welcomeReceived=welcomeVisit;
  const welcomeLastAttempt=useRef(new Map());
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
  const realParticipants=participants.filter(p=>!p.identity.startsWith('preview-')&&!previewIds.includes(p.identity));
  // The host is not a viewer, regardless of camera or publishing status.
  const visibleViewers = realParticipants.filter(p => p.identity !== hostId && !(isHost && p.identity === room.localParticipant.identity)).sort((a,b) =>
    (profiles[a.identity]?.display_name || a.name || '').localeCompare(profiles[b.identity]?.display_name || b.name || '')
  );

  const recentEntries = useRef(new Map());
  const activityNames = useRef(new Map());
  const activityPending = useRef(new Map());
  const latestProfiles = useRef(profiles);
  latestProfiles.current = profiles;
  const validActivityName = value => {
    const name = typeof value === 'string' ? value.trim() : '';
    return name && !/^(usuario|user|guest|invitado|unknown)$/i.test(name) ? name : '';
  };
  async function resolveActivityName(id, hint) {
    const cached = activityNames.current.get(id);
    if (cached) return cached;
    for (let attempt = 0; attempt < 6; attempt++) {
      const profile = latestProfiles.current[id];
      let name = validActivityName(profile?.display_name) || validActivityName(profile?.username);
      if (!name) {
        try {
          const {data} = await supabase.from('profiles').select('display_name,username').eq('id',id).maybeSingle();
          name = validActivityName(data?.display_name) || validActivityName(data?.username);
        } catch {}
      }
      name = name || validActivityName(room.remoteParticipants.get(id)?.name) || validActivityName(hint);
      if (name) { activityNames.current.set(id,name); return name; }
      if (attempt < 5) await new Promise(resolve => setTimeout(resolve,500 * (attempt+1)));
    }
    return '';
  }
  function registerActivityJoin(id, hint) {
    if (!id || id.startsWith('preview-') || previewIdsRef.current.has(id)) return Promise.resolve('');
    if (recentEntries.current.has(id)) return Promise.resolve(recentEntries.current.get(id));
    if (activityPending.current.has(id)) return activityPending.current.get(id).promise;
    const visit = {at:Date.now(),leftAt:0,promise:null};
    activityPending.current.set(id,visit);
    visit.promise = (async () => {
      const name = await resolveActivityName(id,hint);
      if (activityPending.current.get(id) !== visit) return '';
      activityPending.current.delete(id);
      if (!name || previewIdsRef.current.has(id)) return '';
      publishActivity({id:crypto.randomUUID(),name:'LIVE',text:`${name} entró al LIVE`,system:true,at:visit.at});
      if (visit.leftAt) publishActivity({id:crypto.randomUUID(),name:'LIVE',text:`${name} salió del LIVE`,system:true,at:visit.leftAt});
      else recentEntries.current.set(id,name);
      return name;
    })();
    return visit.promise;
  }
  function registerActivityLeave(id) {
    const pending = activityPending.current.get(id);
    if (pending) { pending.leftAt = pending.leftAt || Date.now(); return; }
    const name = recentEntries.current.get(id);
    if (!name) return;
    recentEntries.current.delete(id);
    publishActivity({id:crypto.randomUUID(),name:'LIVE',text:`${name} salió del LIVE`,system:true,at:Date.now()});
  }
  useEffect(() => () => {
    activityPending.current.clear();
    activityNames.current.clear();
    recentEntries.current.clear();
  }, [liveRoomId]);
  const [speakers, setSpeakers] = useState([]);
  // v3.23: Persistent chat by LIVE room, with local reading-position memory.
  const historyKey = `rivyza-live-chat-v323:${liveRoomId}:${user?.id || 'viewer'}`;
  const scrollKey = `${historyKey}:scroll`;
  const chatRef = useRef(null);
  const gridRef = useRef(null);
  const [chatBoundary, setChatBoundary] = useState(null);
  const [chatReadingOld, setChatReadingOld] = useState(false);
  const readingOld = useRef(false);
  const restoringChat = useRef(true);
  const [chat, setChat] = useState(() => {
    try { const rows = JSON.parse(localStorage.getItem(historyKey) || '[]'); return Array.isArray(rows) ? rows.filter(m=>!m.privateWelcome) : []; }
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
    try { localStorage.setItem(historyKey, JSON.stringify(chat.filter(m=>!m.privateWelcome).slice(-500))); } catch {}
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
          setChatReadingOld(true);
        } else node.scrollTop = node.scrollHeight;
      } catch { node.scrollTop = node.scrollHeight; }
    } else if (!readingOld.current) node.scrollTop = node.scrollHeight;
  }, [chat, scrollKey]);
  // El chat puede desplazarse en TODOS los modos; solo el modo 14 recorta
  // la parte que invadiría la rejilla. Se mide la rejilla real, no valores fijos.
  const onChatScroll = () => {
    const el = chatRef.current;
    if (!el) return;
    const bottom = el.scrollHeight - el.scrollTop - el.clientHeight <= 28;
    readingOld.current = !bottom;
    setChatReadingOld(!bottom);
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
  const mapSaved = row => ({id:row.client_id, name:row.author_name, authorId:row.author_id,
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
          .select('client_id,author_id,author_name,body,kind,created_at')
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
        .select('client_id,author_id,author_name,body,kind,created_at')
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
  // Viewers announce that their chat is ready. LiveKit can connect a viewer
  // before the host's ParticipantConnected handler or the viewer's data listener
  // is ready, so this handshake is retried until the welcome is received.
  useEffect(()=>{
    if(isHost || !user?.id || !liveRoomId)return;

    const request=()=>{
      try{
        if(welcomeReceived.current || room.state!=='connected')return;
        const host=room.remoteParticipants.get(hostId);
        if(!host)return;
        room.localParticipant.publishData(
          new TextEncoder().encode(JSON.stringify({type:'welcome-ready',roomId:liveRoomId})),
          {reliable:true,topic:'rivyza-welcome-ready',destinationIdentities:[hostId]}
        ).catch(()=>{});
      }catch(e){console.warn('Welcome ready request:',e);}
    };
    room.on(RoomEvent.Connected,request);
    room.on(RoomEvent.Reconnected,request);
    room.on(RoomEvent.ParticipantConnected,request);
    request();
    const timer=setInterval(request,2500);
    return()=>{
      clearInterval(timer);
      room.off(RoomEvent.Connected,request);
      room.off(RoomEvent.Reconnected,request);
      room.off(RoomEvent.ParticipantConnected,request);
    };
  },[room,isHost,hostId,liveRoomId,user?.id]);
  useEffect(()=>{
    const receive=(payload,_sender,_kind,topic)=>{
      if(topic!=='rivyza-private-welcome' || _sender?.identity!==hostId || isHost)return;
      try{
        const data=JSON.parse(new TextDecoder().decode(payload));
        if(data.type!=='welcome'||data.roomId!==liveRoomId||!data.text)return;

        if(welcomeReceived.current)return;
        appendChat({id:crypto.randomUUID(),name:'💗 Bienvenida',text:data.text,privateWelcome:true,at:Date.now()});
        welcomeReceived.current=true;
      }catch(e){console.warn('Welcome message',e)}
    };
    room.on(RoomEvent.DataReceived,receive);
    return()=>room.off(RoomEvent.DataReceived,receive);
  },[room,liveRoomId,user?.id,appendChat,isHost,hostId,welcomeReceived]);
  // V20: Supabase Realtime fallback for LIVE presence and private welcomes.
  // Works even if LiveKit's WebRTC data-channel PC manager is closed.
  const welcomeChannelRef = useRef(null);
  useEffect(() => {
    if (!supabase || !liveRoomId || !user?.id) return;
    let active = true;
    let subscribed = false;
    const channel = supabase.channel(`rivyza-live-social-v20:${liveRoomId}`, {
      config: {broadcast: {self: false}}
    });
    welcomeChannelRef.current = channel;
    const announce = (event = 'join') => {
      if (!subscribed || !active || isHost) return;
      channel.send({type:'broadcast',event:'presence',payload:{
        roomId:liveRoomId,userId:user.id,event,visitId:privateVisitId.current,
        name:latestProfiles.current[user.id]?.display_name || latestProfiles.current[user.id]?.username || room.localParticipant.name || ''
      }}).catch(e => console.warn('LIVE presence fallback:',e));
    };
    channel.on('broadcast',{event:'presence'},async ({payload}) => {
      if (!active || !payload || payload.roomId !== liveRoomId || !payload.userId || payload.userId === user.id) return;
      const id = payload.userId;
      if (payload.event === 'join' && room.remoteParticipants.has(id) && previewIdsRef.current.delete(id)) setPreviewIds([...previewIdsRef.current]);
      if (!isHost || previewIdsRef.current.has(id) || (payload.event==='join' && !room.remoteParticipants.has(id))) return;
      if (payload.event === 'join') {
        const name = await registerActivityJoin(id,payload.name);
        const text=(welcomeMessage||'').trim();
        if(active && name && text && payload.visitId && room.remoteParticipants.has(id)) {
          const {error}=await supabase.from('rivyza_live_private_welcome').insert({room_id:liveRoomId,sender_id:user.id,recipient_id:id,visit_id:payload.visitId,body:`${text}\n¡Bienvenido/a, ${name}! ❤️`});
          if(error && error.code!=='23505') console.warn('Private welcome storage:',error);
        }
      } else if (payload.event === 'leave') {
        if (!room.remoteParticipants.has(id)) registerActivityLeave(id);
      }
    });
    channel.subscribe(status => {
      subscribed = status === 'SUBSCRIBED';
      if (subscribed) announce();
    });
    const timer = setInterval(() => {
      if (isHost || !subscribed) return;

      // Keep requesting only until the private welcome arrives; presence remains
      // tracked via the original LiveKit participant events.
      try {announce();} catch {}
    }, 3500);
    const onUnload = () => announce('leave');
    window.addEventListener('pagehide',onUnload);
    return () => {
      if (!isHost) announce('leave');
      active = false;
      clearInterval(timer);
      window.removeEventListener('pagehide',onUnload);
      if (welcomeChannelRef.current === channel) welcomeChannelRef.current = null;
      supabase.removeChannel(channel);
    };
  },[supabase,liveRoomId,user?.id,isHost,welcomeMessage,room,appendChat]);
  // Recipient-only database delivery; never place private welcomes in public chat storage.
  const [mediaRequest,setMediaRequest]=useState(null);
  const mediaSeen=useRef(new Set());
  const mediaCooldown=useRef(new Map());
  useEffect(()=>{
    if(!user?.id || !liveRoomId)return;
    let active=true,busy=false;
    const refresh=async()=>{
      if(busy || room.state!=='connected')return;
      busy=true;
      try{
        if(!isHost && !welcomeReceived.current){
          const {data,error}=await supabase.from('rivyza_live_private_welcome').select('body').eq('room_id',liveRoomId).eq('sender_id',hostId).eq('recipient_id',user.id).eq('visit_id',privateVisitId.current).maybeSingle();
          if(error)throw error;
          if(active && data?.body && !welcomeReceived.current){
            welcomeReceived.current=true;
            appendChat({id:crypto.randomUUID(),name:lang==='es'?'💗 Bienvenida':'💗 Welcome',text:data.body,privateWelcome:true,at:Date.now()});
          }
        }
      }catch(e){console.warn('Private welcome poll:',e);}
      finally{busy=false;}
    };
    refresh();const timer=setInterval(refresh,2000);
    return()=>{active=false;clearInterval(timer);};
  },[supabase,liveRoomId,user?.id,hostId,isHost,room,appendChat,lang]);
  // Authenticated database delivery; LiveKit is not required for signaling.
  useEffect(()=>{
    if(!publish || isHost || !user?.id || !liveRoomId){setMediaRequest(null);return;}
    let active=true,busy=false;
    const refresh=async()=>{
      if(busy)return;busy=true;
      try{
        const {data:{session}}=await supabase.auth.getSession();
        if(!session?.access_token)return;
        const response=await fetch(`/api/live?mode=media_requests&room=${encodeURIComponent(liveRoomId)}`,{headers:{Authorization:`Bearer ${session.access_token}`},cache:'no-store'});
        const result=await response.json();if(!response.ok)throw new Error(result.error);
        if(!active)return;
        const pending=(result.requests||[]).filter(m=>!mediaSeen.current.has(m.id) && !(m.kind==='mic'?room.localParticipant.isMicrophoneEnabled:room.localParticipant.isCameraEnabled));
        setMediaRequest(previous=>pending.find(m=>m.id===previous?.id)||pending[0]||null);
      }catch(e){console.warn('Media request lookup:',e);}finally{busy=false;}
    };
    refresh();const timer=setInterval(refresh,2000);
    return()=>{active=false;clearInterval(timer);};
  },[room,publish,isHost,liveRoomId,user?.id,supabase]);
  async function askMedia(id,kind){
    if(!(isHost||isModerator) || id===hostId || !id)return;
    const key=id+':'+kind,now=Date.now();
    if(now-(mediaCooldown.current.get(key)||0)<15000){onError?.(lang==='es'?'Espera 15 segundos antes de repetir la solicitud.':'Wait 15 seconds before requesting again.');return;}
    mediaCooldown.current.set(key,now);
    try{await onModerate('media_request_create',{guestId:id,kind});setTarget(null);}
    catch(e){mediaCooldown.current.delete(key);onError?.((lang==='es'?'No se pudo enviar la solicitud: ':'Could not send request: ')+e.message);}
  }
  async function respondMedia(accept){
    const request=mediaRequest;if(!request || mediaSeen.current.has(request.id))return;
    mediaSeen.current.add(request.id);setMediaRequest(null);
    try{
      await onModerate('media_request_resolve',{requestId:request.id,accept});
      if(accept && publish){if(request.kind==='mic')await room.localParticipant.setMicrophoneEnabled(true);else if(!room.localParticipant.isCameraEnabled)await openCameraPreview();}
    }catch(e){onError?.(e.message);}
  }
  const [comment, setComment] = useState('');
  const [chatPeople,setChatPeople]=useState({});
  const chatIds=[...new Set(chat.filter(m=>!m.system&&!m.privateWelcome&&m.authorId).map(m=>m.authorId))].sort().join(',');
  useEffect(()=>{let active=true; const ids=chatIds.split(',').filter(Boolean); (async()=>{for(let i=0;i<ids.length;i+=100){const {data}=await supabase.from('profiles').select('id,display_name,username,avatar_url').in('id',ids.slice(i,i+100));if(active&&data)setChatPeople(old=>({...old,...Object.fromEntries(data.map(p=>[p.id,p]))}));}})();return()=>{active=false};},[chatIds,supabase]);
  const [quickId,setQuickId]=useState(null);
  const [quickData,setQuickData]=useState(null);
  const [quickMenu,setQuickMenu]=useState(false);
  const [quickReport,setQuickReport]=useState(false);
  const [quickReason,setQuickReason]=useState('harassment');
  const [quickBusy,setQuickBusy]=useState(false);
  const [quickError,setQuickError]=useState('');
  const es=lang==='es';
  useEffect(()=>{let active=true;setQuickData(null);setQuickMenu(false);setQuickReport(false);setQuickError('');if(!quickId)return; (async()=>{try{const [p,a,b,f,block]=await Promise.all([supabase.from('profiles').select('id,display_name,username,avatar_url,bio').eq('id',quickId).single(),supabase.from('follows').select('*',{count:'exact',head:true}).eq('following_id',quickId),supabase.from('follows').select('*',{count:'exact',head:true}).eq('follower_id',quickId),supabase.from('follows').select('following_id').eq('follower_id',user.id).eq('following_id',quickId).maybeSingle(),supabase.from('rivyza_user_blocks').select('blocked_id').eq('blocker_id',user.id).eq('blocked_id',quickId).maybeSingle()]);if([p,a,b,f,block].some(x=>x.error))throw Error('Profile lookup failed');if(active)setQuickData({...p.data,followers:a.count,following:b.count,followed:!!f.data,blocked:!!block.data});}catch(e){if(active)setQuickError(es?'No se pudo cargar el perfil.':'Could not load profile.');}})();return()=>{active=false};},[quickId,supabase,user.id,es]);
  async function quickAction(action){if(!quickData||quickBusy||quickId===user.id)return;setQuickBusy(true);setQuickError('');try{let result;if(action==='follow'){if(quickData.blocked)return;result=quickData.followed?await supabase.from('follows').delete().eq('follower_id',user.id).eq('following_id',quickId):await supabase.from('follows').insert({follower_id:user.id,following_id:quickId});if(result.error)throw result.error;setQuickData(d=>({...d,followed:!d.followed,followers:Math.max(0,d.followers+(d.followed?-1:1))}));}else if(action==='block'){if(!window.confirm(es?'¿Cambiar bloqueo de esta cuenta?':'Change block status for this account?'))return;result=quickData.blocked?await supabase.from('rivyza_user_blocks').delete().eq('blocker_id',user.id).eq('blocked_id',quickId):await supabase.from('rivyza_user_blocks').insert({blocker_id:user.id,blocked_id:quickId});if(result.error)throw result.error;setQuickData(d=>({...d,blocked:!d.blocked}));setQuickMenu(false);}else{result=await supabase.from('rivyza_reports').insert({reporter_id:user.id,target_type:'user',target_id:quickId,reason:quickReason,details:''});if(result.error)throw result.error;setQuickReport(false);setQuickMenu(false);setQuickError(es?'Reporte recibido.':'Report received.');}}catch(e){setQuickError(e.message||'Error');}finally{setQuickBusy(false);}}
  function chatAvatar(p,name){return p?.avatar_url?<img src={p.avatar_url} alt="" onError={e=>{e.currentTarget.style.display='none';}}/>:<span>{(name||'?').slice(0,1).toUpperCase()}</span>;}

  const [flipping, setFlipping] = useState(false);
  // Mirror is a display preference synchronized with all LIVE participants.
  const [mirrorStates, setMirrorStates] = useState({});
  const mirrorStatesRef = useRef({});
  const mirrorEnabled = mirrorStates[room.localParticipant.identity] === true;
  const [mirrorBusy, setMirrorBusy] = useState(false);
  const updateMirrorState = useCallback((identity, enabled) => {
    if (!identity) return;
    mirrorStatesRef.current = {...mirrorStatesRef.current, [identity]: enabled};
    setMirrorStates(mirrorStatesRef.current);
  }, []);
  useEffect(() => {
    mirrorStatesRef.current = {};
    setMirrorStates({});
    const sendState = (destination) => room.localParticipant.publishData(
      new TextEncoder().encode(JSON.stringify({type:'mirror-state',enabled:mirrorStatesRef.current[room.localParticipant.identity] === true})),
      {reliable:true,topic:'rivyza-camera-mirror',...(destination ? {destinationIdentities:[destination]} : {})}
    );
    const receiveMirror = (payload, sender, _kind, topic) => {
      if (topic !== 'rivyza-camera-mirror' || !sender?.identity) return;
      try {
        const data = JSON.parse(new TextDecoder().decode(payload));
        if (data?.type === 'mirror-state' && typeof data.enabled === 'boolean')
          updateMirrorState(sender.identity, data.enabled);
        else if (data?.type === 'mirror-request') sendState(sender.identity).catch(() => {});
      } catch {}
    };
    const onConnected = p => { if (p?.identity) sendState(p.identity).catch(() => {}); };
    const onDisconnected = p => {
      const next = {...mirrorStatesRef.current}; delete next[p.identity];
      mirrorStatesRef.current = next; setMirrorStates(next);
    };
    const requestStates = () => room.localParticipant.publishData(
      new TextEncoder().encode(JSON.stringify({type:'mirror-request'})),
      {reliable:true,topic:'rivyza-camera-mirror'}
    ).catch(() => {});
    room.on(RoomEvent.DataReceived, receiveMirror);
    room.on(RoomEvent.ParticipantConnected, onConnected);
    room.on(RoomEvent.ParticipantDisconnected, onDisconnected);
    room.on(RoomEvent.Reconnected, requestStates);
    if (room.state === 'connected') requestStates();
    return () => {
      room.off(RoomEvent.DataReceived, receiveMirror);
      room.off(RoomEvent.ParticipantConnected, onConnected);
      room.off(RoomEvent.ParticipantDisconnected, onDisconnected);
      room.off(RoomEvent.Reconnected, requestStates);
    };
  }, [room, updateMirrorState]);
  // v3.71: Independent Supabase Broadcast path for mirror states. This is
  // intentionally separate from the LiveKit peer-connection data channel:
  // guests can update the host even when LiveKit reports "PC manager is closed".
  const mirrorChannelRef = useRef(null);
  useEffect(() => {
    if (!supabase || !liveRoomId) return;
    const channel = supabase.channel(`rivyza-mirror-v371:${liveRoomId}`, {
      config: {broadcast: {self: false}}
    });
    mirrorChannelRef.current = channel;
    const sendOwn = () => {
      const identity = room.localParticipant.identity;
      if (!identity) return;
      channel.send({type:'broadcast',event:'mirror-state',payload:{
        identity, enabled:mirrorStatesRef.current[identity] === true
      }}).catch(() => {});
    };
    channel.on('broadcast',{event:'mirror-state'},({payload}) => {
      const identity = payload?.identity;
      if (!identity || typeof payload.enabled !== 'boolean') return;
      // Only accept states from people currently connected to this LIVE.
      if (identity !== room.localParticipant.identity && !room.remoteParticipants.has(identity)) return;
      updateMirrorState(identity,payload.enabled);
    });
    channel.on('broadcast',{event:'mirror-request'},sendOwn);
    channel.subscribe(status => {
      if (status === 'SUBSCRIBED') {
        sendOwn();
        channel.send({type:'broadcast',event:'mirror-request',payload:{}}).catch(() => {});
      }
    });
    const timer = setInterval(sendOwn,2500);
    return () => {
      clearInterval(timer);
      if (mirrorChannelRef.current === channel) mirrorChannelRef.current = null;
      supabase.removeChannel(channel);
    };
  },[supabase,liveRoomId,room,updateMirrorState]);
  const broadcastMirrorFallback = useCallback(() => {
    const identity = room.localParticipant.identity;
    if (!identity || !mirrorChannelRef.current) return;
    mirrorChannelRef.current.send({type:'broadcast',event:'mirror-state',payload:{
      identity,enabled:mirrorStatesRef.current[identity] === true
    }}).catch(error => console.warn('Mirror Supabase broadcast:',error));
  },[room]);
  // Keep the mirror visible locally even when LiveKit's data channel is temporarily closed.
  const pendingMirrorRef = useRef(false);
  const sendMirrorState = useCallback(async () => {
    if (room.state !== 'connected') return false;
    const identity = room.localParticipant.identity;
    if (!identity) return false;
    try {
      await room.localParticipant.publishData(
        new TextEncoder().encode(JSON.stringify({type:'mirror-state',enabled:mirrorStatesRef.current[identity] === true})),
        {reliable:true,topic:'rivyza-camera-mirror'}
      );
      pendingMirrorRef.current = false;
      return true;
    } catch (error) {
      pendingMirrorRef.current = true;
      console.warn('Mirror Camera: synchronization deferred until LiveKit reconnects', error);
      return false;
    }
  }, [room]);
  useEffect(() => {
    const retry = () => { if (pendingMirrorRef.current) void sendMirrorState(); };
    room.on(RoomEvent.Connected, retry);
    room.on(RoomEvent.Reconnected, retry);
    return () => { room.off(RoomEvent.Connected, retry); room.off(RoomEvent.Reconnected, retry); };
  }, [room, sendMirrorState]);
  // v3.70: Periodic state reconciliation for guests/hosts whose LiveKit data
  // channel was not ready at the moment Mirror Camera was toggled.
  // Every client advertises its own state, including OFF, so a missed packet
  // does not leave other participants showing an outdated orientation.
  useEffect(() => {
    const sync = () => {
      if (room.state === 'connected' && room.localParticipant.identity) {
        void sendMirrorState();
      }
    };
    const timer = setInterval(sync, 2500);
    room.on(RoomEvent.Connected, sync);
    room.on(RoomEvent.Reconnected, sync);
    sync();
    return () => {
      clearInterval(timer);
      room.off(RoomEvent.Connected, sync);
      room.off(RoomEvent.Reconnected, sync);
    };
  }, [room, sendMirrorState]);
  async function toggleMirrorCamera() {
    if (mirrorBusy || !room.localParticipant.identity) return;
    const identity = room.localParticipant.identity;
    const enabled = mirrorStatesRef.current[identity] !== true;
    // Local effect must never depend on the data channel being open.
    updateMirrorState(identity, enabled);
    pendingMirrorRef.current = true;
    broadcastMirrorFallback();
    setMirrorBusy(true);
    try { await sendMirrorState(); }
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
        const name = await registerActivityJoin(p.identity,p.name);
        if (!name || !room.remoteParticipants.has(p.identity)) return;
        const text=(welcomeMessage||'').trim();
        if(!text || welcomeSent.current.has(p.identity))return;
        const now=Date.now();
        if(now-(welcomeLastAttempt.current.get(p.identity)||0)<2000)return;
        welcomeLastAttempt.current.set(p.identity,now);
        const data={type:'welcome',roomId:liveRoomId,text:`${text}\n¡Bienvenido/a, ${name}! ❤️`};
        try{await room.localParticipant.publishData(new TextEncoder().encode(JSON.stringify(data)),{reliable:true,topic:'rivyza-private-welcome',destinationIdentities:[p.identity]});}
        catch(e){welcomeLastAttempt.current.delete(p.identity);console.warn('Welcome delivery deferred:',e);}
      },1800);
      timers.add(timer);
    };
    const receive = (bytes, sender, kind, topic) => {
      if (topic !== 'rivyza-chat' || !sender) return;
      try {
        const m = JSON.parse(new TextDecoder().decode(bytes));
        if (typeof m.text === 'string' && m.text.trim())
          appendChat({id:m.id || crypto.randomUUID(), authorId:sender.identity, name:m.system ? 'LIVE' : (sender.name || 'Usuario'), text:m.text.slice(0,300), system:m.system === true, at:m.at || Date.now()});
      } catch {}
    };
    const departed = p => {
      welcomeLastAttempt.current.delete(p.identity);
      if (!isHost || previewIdsRef.current.has(p.identity)) return;
       registerActivityLeave(p.identity);
    };
    // Also welcome viewers already connected when the host listener becomes ready.
    // This covers the initial join and the async loading of saved welcome settings.
    if (isHost) {
      room.remoteParticipants.forEach(entered);
    }
    const welcomeReady=(bytes,sender,_kind,topic)=>{
      if(!isHost || topic!=='rivyza-welcome-ready' || !sender?.identity)return;
      try{
        const data=JSON.parse(new TextDecoder().decode(bytes));
        if(data?.type!=='welcome-ready' || data.roomId!==liveRoomId)return;
        if(!room.remoteParticipants.has(sender.identity))return;
        entered(sender);
      }catch(e){console.warn('Welcome ready packet:',e);}
    };
    room.on(RoomEvent.DataReceived,welcomeReady);
    room.on(RoomEvent.ParticipantConnected, entered);
    room.on(RoomEvent.ParticipantDisconnected, departed);
    room.on(RoomEvent.DataReceived, receive);
    return () => {
      timers.forEach(clearTimeout);
      room.off(RoomEvent.DataReceived,welcomeReady);
      room.off(RoomEvent.ParticipantConnected, entered);
      room.off(RoomEvent.ParticipantDisconnected, departed);
      room.off(RoomEvent.DataReceived, receive);
    };
  }, [room, appendChat, isHost, liveRoomId, user?.id, welcomeMessage]);
  async function sendComment(e) {
    e.preventDefault(); const text = comment.trim().slice(0,300); if (!text) return;
    // Closing the iOS keyboard must not disconnect or resize the LIVE.
    commentInputRef.current?.blur();
    setTyping(false);
    const entry = {id:crypto.randomUUID(), authorId:user.id, name:room.localParticipant.name || 'Tú',text,at:Date.now()};
    try {
      appendChat(entry); setComment('');
      // Supabase is authoritative. A closed LiveKit data channel must not block chat.
      const saved = await saveEntry(entry);
      if (!saved) return;
      if (room.state === 'connected') {
        try {
          await room.localParticipant.publishData(new TextEncoder().encode(JSON.stringify({id:entry.id,text,at:entry.at})), {reliable:true,topic:'rivyza-chat'});
        } catch (err) {
          console.warn('LIVE chat: LiveKit unavailable; message persisted in Supabase.', err);
        }
      }
    } catch(err) { onError?.('No se pudo guardar el mensaje. Revisa la conexión con Supabase.'); }
  }
  async function flipCamera() {
    if (flipping || previewBusy || deepARBusy) return;
    setFlipping(true);
    let nextStream = null;
    try {
      const state = effectSession.current;
      const publication = room.localParticipant.getTrackPublication(Track.Source.Camera);
      const track = publication?.track;
      const current = facing;
      const next = current === 'user' ? 'environment' : 'user';

      if (state?.previewSource) {
        // The LIVE publishes a canvas track, not the physical camera track.
        // Switching that canvas track via restartTrack() does NOT flip its input.
        // Acquire the replacement camera first, then feed it to the SAME video
        // element. This preserves the published LiveKit track and its effects.
        nextStream = await navigator.mediaDevices.getUserMedia({
          video: {facingMode: {ideal: next}}, audio: false
        });
        const nextTrack = nextStream.getVideoTracks()[0];
        const actual = nextTrack?.getSettings?.().facingMode;
        if (actual && actual !== next) throw new Error('Este dispositivo no cambió a la cámara solicitada.');
        const video = state.video;
        if (!video) throw new Error('No se encontró la cámara del procesador.');
        const previousStream = previewStreamRef.current;
        const previousVideoStream = video.srcObject;
        video.srcObject = nextStream;
        try {
          await video.play();
          if (video.readyState < 2 || !video.videoWidth) {
            await new Promise((resolve,reject) => {
              const timeout = setTimeout(() => {cleanup();reject(new Error('La nueva cámara no produjo imagen.'));},5000);
              const ready = () => {if(video.videoWidth && video.readyState >= 2){cleanup();resolve();}};
              const cleanup = () => {clearTimeout(timeout);video.removeEventListener('loadeddata',ready);};
              video.addEventListener('loadeddata',ready);ready();
            });
          }
          // DeepAR reads from this same video element. Re-bind it after the
          // stream change so the SDK refreshes its camera input on iOS.
          const engine = previewEngineRef.current;
          if (engine) engine.setVideoElement(video,true);
        } catch (error) {
          video.srcObject = previousVideoStream;
          await video.play().catch(() => {});
          throw error;
        }
        previewStreamRef.current = nextStream;
        setPreviewStream(nextStream);
        previousStream?.getTracks().forEach(t => t.stop());
        nextStream = null;
      } else if (state) {
        // Older canvas-filter sessions use a cloned input camera track.
        // Avoid restarting the published canvas (which cannot switch lenses).
        throw new Error('Apaga y vuelve a encender la cámara para cambiar de lente en este modo de filtro.');
      } else if (track) {
        await track.restartTrack({facingMode:{ideal:next}});
        const actual = track.mediaStreamTrack?.getSettings?.().facingMode;
        if (actual && actual !== next) throw new Error('Este dispositivo no cambió a la cámara solicitada.');
      } else {
        await room.localParticipant.setCameraEnabled(true,{facingMode:{ideal:next}});
      }
      setFacing(next);
    } catch(e) {
      onError?.('No se pudo voltear la cámara: ' + (e?.message || 'Comprueba los permisos y las cámaras disponibles.'));
    } finally {
      nextStream?.getTracks().forEach(t => t.stop());
      setFlipping(false);
    }
  }
  const [soundReady, setSoundReady] = useState(false);
  async function activateAudio() {
    try { await room.startAudio(); setSoundReady(true); }
    catch (e) { onError(e?.message || "Audio could not be enabled"); }
  }
  useEffect(() => {
    const speaking = list => setSpeakers(list.map(p=>p.identity));
    room.on(RoomEvent.ActiveSpeakersChanged, speaking);
    return () => room.off(RoomEvent.ActiveSpeakersChanged,speaking);
  }, [room]);
  const [slots, setSlots] = useState(10);
  const [, refreshCapacity] = useState(0);
  useEffect(() => {
    const refresh = () => refreshCapacity(n => n + 1);
    room.on(RoomEvent.ParticipantPermissionsChanged, refresh);
    room.on(RoomEvent.ParticipantConnected, refresh);
    room.on(RoomEvent.ParticipantDisconnected, refresh);
    const timer = setInterval(refresh, 2000);
    return () => {
      clearInterval(timer);
      room.off(RoomEvent.ParticipantPermissionsChanged, refresh);
      room.off(RoomEvent.ParticipantConnected, refresh);
      room.off(RoomEvent.ParticipantDisconnected, refresh);
    };
  }, [room]);
  const occupiedCameraIds = new Set(participants.filter(p => p.permissions?.canPublish).map(p => p.identity));
  occupiedCameraIds.add(hostId);
  if (publish) occupiedCameraIds.add(room.localParticipant.identity);
  const camerasFull = occupiedCameraIds.size >= slots;
  const fullMessage = lang === 'es' ? 'Todas las cámaras están ocupadas. Tu solicitud seguirá pendiente hasta que se libere un espacio.' : 'All camera slots are full. Your request will remain pending until a slot opens.';
  useEffect(() => {
    if (slots !== 14) { setChatBoundary(null); return; }
    const grid = gridRef.current;
    if (!grid) return;
    const update = () => setChatBoundary(Math.max(0,grid.getBoundingClientRect().bottom-(chatRef.current?.getBoundingClientRect().top ?? grid.getBoundingClientRect().bottom)));
    update();
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(update) : null;
    observer?.observe(grid);
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    return () => {observer?.disconnect();window.removeEventListener('resize', update);window.removeEventListener('orientationchange', update);};
  }, [slots]);
  const goToLatest = () => {
    const el = chatRef.current;
    if (!el) return;
    readingOld.current = false;
    setChatReadingOld(false);
    el.scrollTo({top:el.scrollHeight,behavior:'smooth'});
    try { localStorage.setItem(scrollKey,JSON.stringify({atBottom:true,top:el.scrollHeight})); } catch {}
  };

  const [target, setTarget] = useState(null);
  const [expelling, setExpelling] = useState(false);
  const [blockedOpen, setBlockedOpen] = useState(false);
  const [reason, setReason] = useState('Insultos o lenguaje ofensivo');
  const [details, setDetails] = useState('');
  const [moveTarget, setMoveTarget] = useState(null);
  // Filtros LIVE: se procesan ANTES de publicar en LiveKit, no como overlay local.
  // Etapa de prueba segura: filtros de color. DeepAR se integrará tras validar su salida WebRTC.
  const [liveEffect, setLiveEffect] = useState('original');
  const [filterIntensity, setFilterIntensity] = useState(100);
  const intensityRef = useRef(100);
  const [cameraPreviewOpen, setCameraPreviewOpen] = useState(false);
  const [previewStream, setPreviewStream] = useState(null);
  const previewVideoRef = useRef(null);
  const [previewError, setPreviewError] = useState('');
  const [previewBusy, setPreviewBusy] = useState(false);
  const [previewFilter, setPreviewFilter] = useState('original');
  const [previewIntensity, setPreviewIntensity] = useState(100);
  const [previewTab, setPreviewTab] = useState('filters');

  // Cada participante administra su propio procesador DeepAR; nunca se aplica a otras cámaras.
  const [selectedDeepAR,setSelectedDeepAR]=useState(null);
  const [previewDeepAR,setPreviewDeepAR]=useState(null);
  const [deepARBusy,setDeepARBusy]=useState(false);
  const [deepARError,setDeepARError]=useState('');
  const deepAREngineRef=useRef(null);
  const deepARHolderRef=useRef(null);
  const previewARHolderRef=useRef(null);
  const previewEngineRef=useRef(null);
  const [deepARCategory,setDeepARCategory]=useState('fun');
  const deeparCategories=[['fun','Divertidos'],['beauty','Belleza'],['face','Rostro'],['accessories','Accesorios']];
  async function shutdownDeepAR(ref){const engine=ref.current;ref.current=null;if(engine){try{await engine.shutdown();}catch(_){}}}
   // v3.72: Preserve source proportions when copying a DeepAR WebGL frame.
   // Cropping (cover) is permitted; horizontal/vertical stretching is not.
   function drawARWithoutDistortion(ctx,source,width,height){
     const sw=source.videoWidth||source.width;
     const sh=source.videoHeight||source.height;
     if(!sw||!sh)return;
     const scale=Math.max(width/sw,height/sh);
     const dw=sw*scale,dh=sh*scale;
     ctx.drawImage(source,(width-dw)/2,(height-dh)/2,dw,dh);
   }
  async function makeDeepAREngine(holder,video){
    const license=process.env.NEXT_PUBLIC_DEEPAR_LICENSE_KEY;
    if(!license)throw new Error('Falta NEXT_PUBLIC_DEEPAR_LICENSE_KEY en Vercel.');
    if(!holder||!video)throw new Error('La cámara no está lista.');
     // DeepAR's render target must have the same aspect ratio as its input.
     // The old 240x320 target could squeeze a wider camera into 3:4.
     const sourceWidth=video.videoWidth||video.srcObject?.getVideoTracks?.()[0]?.getSettings?.().width||480;
     const sourceHeight=video.videoHeight||video.srcObject?.getVideoTracks?.()[0]?.getSettings?.().height||640;
     if(holder===deepARHolderRef.current){
       const width=240;
       holder.style.width=`${width}px`;
       holder.style.height=`${Math.max(1,Math.round(width*sourceHeight/sourceWidth))}px`;
     }
    const deepar=await import('deepar');
    const engine=await deepar.initialize({licenseKey:license,previewElement:holder,additionalOptions:{cameraConfig:{disableDefaultCamera:true}}});
    engine.setVideoElement(video,true);
    return engine;
  }
  async function selectPreviewDeepAR(effect){
    if(deepARBusy||!previewStreamRef.current)return;
    setDeepARBusy(true);setDeepARError('');
    try{
      if(!effect){await shutdownDeepAR(previewEngineRef);setPreviewDeepAR(null);return;}
      if(!previewEngineRef.current)previewEngineRef.current=await makeDeepAREngine(previewARHolderRef.current,previewVideoRef.current);
      await previewEngineRef.current.switchEffect(effect.url);
      setPreviewDeepAR(effect);
    }catch(e){setDeepARError(e?.message||'No se pudo cargar el efecto DeepAR.');}
    finally{setDeepARBusy(false);}
  }
  async function selectLiveDeepAR(effect){
    if(deepARBusy||!publish||!room.localParticipant.isCameraEnabled)return;
    setDeepARBusy(true);setDeepARError('');
    try{
      if(!effect){await shutdownDeepAR(deepAREngineRef);if(effectSession.current)effectSession.current.deepAR=null;setSelectedDeepAR(null);return;}
      // El procesador Canvas existente publica el resultado por LiveKit, no un overlay local.
      if(!effectSession.current){
        const old=intensityRef.current;
        try { intensityRef.current=0; await chooseLiveEffect('vivid'); }
        finally { intensityRef.current=old; }
      }
      const state=effectSession.current;
      if(!state || state.stream?.getVideoTracks?.()[0]?.readyState!=='live')throw new Error('No se pudo iniciar el video procesado.');
      state.intensity=liveEffect==='original'?0:intensityRef.current;
      if(!deepAREngineRef.current)deepAREngineRef.current=await makeDeepAREngine(deepARHolderRef.current,state.video);
      await deepAREngineRef.current.switchEffect(effect.url);
      state.deepAR=deepAREngineRef.current;
      setSelectedDeepAR(effect);
    }catch(e){await shutdownDeepAR(deepAREngineRef);if(effectSession.current)effectSession.current.deepAR=null;setDeepARError(e?.message||'No se pudo aplicar DeepAR.');}
    finally{setDeepARBusy(false);}
  }
  useEffect(()=>()=>{shutdownDeepAR(previewEngineRef);shutdownDeepAR(deepAREngineRef);},[]);

  const previewStreamRef = useRef(null);
  const closePreview = useCallback(() => {
    shutdownDeepAR(previewEngineRef);setPreviewDeepAR(null);
    previewStreamRef.current?.getTracks().forEach(track=>track.stop());
    previewStreamRef.current=null;
    setPreviewStream(null);
    setCameraPreviewOpen(false);
    setPreviewError('');
  }, []);
  useEffect(()=>()=>{previewStreamRef.current?.getTracks().forEach(track=>track.stop());},[]);
  useEffect(()=>{
    if(previewVideoRef.current && previewStream){
      previewVideoRef.current.srcObject=previewStream;
      previewVideoRef.current.play().catch(()=>{});
    }
  },[previewStream,cameraPreviewOpen]);
  async function openCameraPreview(){
    setPreviewError('');setPreviewFilter(liveEffect);setPreviewIntensity(filterIntensity);
    setCameraPreviewOpen(true);
    try {
      const stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'user'},audio:false});
      previewStreamRef.current=stream;
      setPreviewStream(stream);
    } catch(e){setPreviewError('No se pudo abrir la vista previa. Revisa el permiso de cámara.');}
  }
  // Publish the SAME preview processor rather than restarting camera + DeepAR.
  // The preview DOM stays mounted (visually hidden) while the LIVE is active.
  async function confirmCameraPreview(){
    if(previewBusy||!previewStreamRef.current)return;
    setPreviewBusy(true);setDeepARError('');
    let outputStream=null;
    try {
      const inputVideo=previewVideoRef.current;
      if(!inputVideo || inputVideo.readyState<2)throw new Error('La vista previa todavía no tiene imagen.');
      if(typeof HTMLCanvasElement.prototype.captureStream!=='function')throw new Error('Safari no permite transmitir este video procesado.');
      const canvas=document.createElement('canvas');
      canvas.width=Math.min(480,inputVideo.videoWidth||480);
      canvas.height=Math.max(1,Math.round(canvas.width*(inputVideo.videoHeight||640)/(inputVideo.videoWidth||480)));
      const ctx=canvas.getContext('2d',{alpha:false,willReadFrequently:true});
      if(!ctx)throw new Error('No se pudo crear el procesador de cámara.');
      outputStream=canvas.captureStream(20);
      const outputTrack=outputStream.getVideoTracks()[0];
      if(!outputTrack)throw new Error('No se pudo crear el video para LIVE.');
      const state={
        stream:outputStream,video:inputVideo,frame:0,filter:previewFilter,
        intensity:previewIntensity,previewSource:true,
        original:null,inputTrack:null,publication:null
      };
      const draw=()=>{
        if(effectSession.current!==state)return;
        try {
          if(inputVideo.readyState>=2){
            ctx.drawImage(inputVideo,0,0,canvas.width,canvas.height);
            if(previewEngineRef.current){
              const arCanvas=previewEngineRef.current.getCanvas?.()||previewARHolderRef.current?.querySelector('canvas');
              if(arCanvas?.width>0&&arCanvas?.height>0){
                // Keep camera as fallback if Safari does not expose readable WebGL pixels.
                try {
                  if(!state.probe){state.probe=document.createElement('canvas');state.probe.width=16;state.probe.height=16;state.probeCtx=state.probe.getContext('2d',{willReadFrequently:true});}
                  state.probeCtx.clearRect(0,0,16,16);
                  state.probeCtx.drawImage(arCanvas,0,0,16,16);
                  const px=state.probeCtx.getImageData(0,0,16,16).data;
                  let nonblack=0;
                  for(let i=0;i<px.length;i+=4)if(px[i+3]>100&&(px[i]+px[i+1]+px[i+2])>30)nonblack++;
                  if(nonblack>8){
                    // Cache the last usable AR frame. A momentary empty WebGL
                    // frame must not flash the unfiltered camera in LIVE.
                    if(!state.lastARFrame){
                      state.lastARFrame=document.createElement('canvas');
                      state.lastARFrame.width=canvas.width;
                      state.lastARFrame.height=canvas.height;
                      state.lastARContext=state.lastARFrame.getContext('2d');
                    }
                    if(state.lastARContext)drawARWithoutDistortion(state.lastARContext,arCanvas,canvas.width,canvas.height);
                    state.lastARAt=performance.now();
                  }
                }catch(e){if(!state.warned){console.warn('DeepAR canvas capture:',e);state.warned=true;}}
              }
              // Hold only short WebGL interruptions; avoid freezing a face
              // indefinitely if DeepAR genuinely stops producing frames.
              if(state.lastARFrame && performance.now()-state.lastARAt<500)
                ctx.drawImage(state.lastARFrame,0,0,canvas.width,canvas.height);
            }
            if(state.filter!=='original'&&state.intensity>0){
              const frame=ctx.getImageData(0,0,canvas.width,canvas.height),px=frame.data;
              const blend=Math.max(0,Math.min(1,state.intensity/100));
              for(let i=0;i<px.length;i+=4){
                const r=px[i],g=px[i+1],b=px[i+2];
                let nr=r,ng=g,nb=b;
                if(state.filter==='bw'){nr=ng=nb=.2126*r+.7152*g+.0722*b;}
                else if(state.filter==='warm'){nr=Math.min(255,r*1.09+9);ng=Math.min(255,g*1.015+2);nb=b*.85;}
                else if(state.filter==='cool'){nr=r*.9;ng=Math.min(255,g*1.025+2);nb=Math.min(255,b*1.12+7);}
                else if(state.filter==='vivid'){const gray=.2126*r+.7152*g+.0722*b;nr=Math.max(0,Math.min(255,(r-gray)*1.48+gray));ng=Math.max(0,Math.min(255,(g-gray)*1.48+gray));nb=Math.max(0,Math.min(255,(b-gray)*1.48+gray));}
                px[i]=r*(1-blend)+nr*blend;px[i+1]=g*(1-blend)+ng*blend;px[i+2]=b*(1-blend)+nb*blend;
              }
              ctx.putImageData(frame,0,0);
            }
          }
        }catch(e){if(!state.drawWarned){console.warn('RIVYZA preview to LIVE:',e);state.drawWarned=true;}}
        state.frame=requestAnimationFrame(draw);
      };
      effectSession.current=state;
      draw();
      // Do not start a second getUserMedia camera through setCameraEnabled(true).
      const existing=room.localParticipant.getTrackPublication(Track.Source.Camera);
      if(existing?.track)await room.localParticipant.unpublishTrack(existing.track);
      const publication=await room.localParticipant.publishTrack(outputTrack,{source:Track.Source.Camera,name:'RIVYZA DeepAR'});
      state.publication=publication;
      intensityRef.current=previewIntensity;
      setFilterIntensity(previewIntensity);
      setLiveEffect(previewFilter);
      setSelectedDeepAR(previewDeepAR);
      setCameraPreviewOpen(false);
    }catch(e){
      if(effectSession.current?.previewSource){
        cancelAnimationFrame(effectSession.current.frame);
        effectSession.current=null;
      }
      outputStream?.getTracks().forEach(t=>t.stop());
      onError?.(e?.message||'No se pudo encender la cámara procesada.');
    }finally{setPreviewBusy(false);}
  }

  const [effectsOpen, setEffectsOpen] = useState(false);
  const [effectBusy, setEffectBusy] = useState(false);
  const effectSession = useRef(null);
  const effectOptions = [
    ['original','Sin efecto','none'],
    ['warm','Cálido','sepia(.28) saturate(1.2)'],
    ['cool','Frío','hue-rotate(13deg) saturate(1.12)'],
    ['vivid','Vivo','saturate(1.5) contrast(1.08)'],
    ['bw','Blanco y negro','grayscale(1)']
  ];
  const restoreEffect = useCallback(async () => {
    const state = effectSession.current;
    if (!state) return;
    effectSession.current = null;
    cancelAnimationFrame(state.frame);
    try {
      if (state.previewSource) {
        if(state.publication?.track)await room.localParticipant.unpublishTrack(state.publication.track);
      } else if (state.publication?.track && state.original?.readyState === 'live') {
        await state.publication.track.replaceTrack(state.original, true);
      }
    } finally {
      state.stream.getTracks().forEach(t=>t.stop());
      if(!state.previewSource){state.video.pause();state.video.srcObject=null;}
      state.inputTrack?.stop();
    }
  }, [room]);
  useEffect(() => () => {
    const state = effectSession.current;
    if (!state) return;
    effectSession.current = null;
    cancelAnimationFrame(state.frame);
    // On unmount the LiveKit room is also leaving; don't republish a stopped track.
    state.stream.getTracks().forEach(t=>t.stop());
    state.video.pause();
    state.video.srcObject = null;
      state.inputTrack?.stop();
  }, []);
  async function chooseLiveEffect(id) {
    if (effectBusy || !publish) return;
    setEffectBusy(true);
    try {
      if (id === 'original') {
        if(effectSession.current?.deepAR){
          effectSession.current.filter='original';
          effectSession.current.intensity=0;
        }else{
          await restoreEffect();
        }
        setLiveEffect('original');
        return;
      }
      if (!effectOptions.some(option=>option[0]===id)) throw new Error('Filtro desconocido');
      if (effectSession.current) {
        effectSession.current.filter = id;
        effectSession.current.intensity = intensityRef.current;
        setLiveEffect(id);
        return;
      }
      const publication = room.localParticipant.getTrackPublication(Track.Source.Camera);
      const localTrack = publication?.track;
      const original = localTrack?.mediaStreamTrack;
      if (!original || original.readyState !== 'live') throw new Error('Enciende tu cámara antes de aplicar el filtro.');
      if (typeof HTMLCanvasElement.prototype.captureStream !== 'function') throw new Error('Este navegador no permite transmitir filtros de video.');
      const video = document.createElement('video');
      video.muted = true;
      video.playsInline = true;
      const inputTrack = original.clone();
      video.srcObject = new MediaStream([inputTrack]);
      try { await video.play(); } catch(error) { inputTrack.stop(); throw error; }
      const settings = original.getSettings?.() || {};
      const canvas = document.createElement('canvas');
      canvas.width = Math.min(480, video.videoWidth || settings.width || 480);
      canvas.height = Math.max(1, Math.round(canvas.width * ((video.videoHeight || settings.height || 480) / (video.videoWidth || settings.width || 640))));
      const ctx = canvas.getContext('2d', {alpha:false});
      if (!ctx) throw new Error('No se pudo iniciar el procesador de video.');
      const stream = canvas.captureStream(20);
      const processed = stream.getVideoTracks()[0];
      if (!processed) {stream.getTracks().forEach(t=>t.stop());throw new Error('No se pudo crear la cámara procesada.');}
      const state = {publication, original, inputTrack, video, stream, frame:0, filter:id, intensity:intensityRef.current};
      effectSession.current = state;
      const draw = () => {
        if (effectSession.current !== state) return;
        if (video.readyState >= 2) {
          // Safari iOS does not reliably support CanvasRenderingContext2D.filter.
          // Process pixels explicitly so the effect is baked into the transmitted track.
          // Always draw the real camera first. DeepAR may expose a canvas
          // before its WebGL output has rendered a usable frame (notably iOS).
          ctx.drawImage(video,0,0,canvas.width,canvas.height);
          // Copy the DeepAR output into the already published LiveKit canvas.
          const arCanvas=state.deepAR?.getCanvas?.() || deepARHolderRef.current?.querySelector('canvas');
          if(state.deepAR && arCanvas?.width > 0 && arCanvas?.height > 0){
            try {
              // Do not replace the real camera with an unrendered black WebGL frame.
              // Probe a small sample before copying; if Safari blocks readback,
              // retain the camera rather than publishing black video.
              if (!state.arProbe) {
                state.arProbe=document.createElement('canvas');
                state.arProbe.width=24;state.arProbe.height=24;
                state.arProbeCtx=state.arProbe.getContext('2d',{willReadFrequently:true});
              }
              const probe=state.arProbeCtx;
              if(probe){
                probe.clearRect(0,0,24,24);
                probe.drawImage(arCanvas,0,0,24,24);
                const pixels=probe.getImageData(0,0,24,24).data;
                let visible=0;
                for(let i=0;i<pixels.length;i+=4){
                  if(pixels[i+3]>160 && pixels[i]+pixels[i+1]+pixels[i+2]>45)visible++;
                }
                if(visible>32)drawARWithoutDistortion(ctx,arCanvas,canvas.width,canvas.height);
                else if(!state.arEmptyWarned){
                  console.warn('DeepAR LIVE returned an empty/black canvas; camera fallback active.');
                  state.arEmptyWarned=true;
                }
              }
            }
            catch(error){
              if(!state.arDrawWarned){
                console.warn('DeepAR LIVE canvas copy failed:',error);
                state.arDrawWarned=true;
              }
            }
          }
          if (state.filter !== 'none' && state.filter !== 'original' && state.intensity > 0) {
            const frame = ctx.getImageData(0,0,canvas.width,canvas.height);
            const pixels = frame.data;
            for (let i=0;i<pixels.length;i+=4) {
              let r=pixels[i],g=pixels[i+1],b=pixels[i+2];
              if (state.filter === 'bw') {
                const gray=Math.round(.2126*r+.7152*g+.0722*b);
                r=g=b=gray;
              } else if (state.filter === 'warm') {
                r=Math.min(255,r*1.09+9);g=Math.min(255,g*1.015+2);b=Math.max(0,b*.85);
              } else if (state.filter === 'cool') {
                r=Math.max(0,r*.9);g=Math.min(255,g*1.025+2);b=Math.min(255,b*1.12+7);
              } else if (state.filter === 'vivid') {
                const gray=.2126*r+.7152*g+.0722*b;
                r=Math.max(0,Math.min(255,(r-gray)*1.48+gray));
                g=Math.max(0,Math.min(255,(g-gray)*1.48+gray));
                b=Math.max(0,Math.min(255,(b-gray)*1.48+gray));
              }
              const blend=Math.max(0,Math.min(1,(state.intensity??100)/100));
              pixels[i]=Math.round(pixels[i]*(1-blend)+r*blend);
              pixels[i+1]=Math.round(pixels[i+1]*(1-blend)+g*blend);
              pixels[i+2]=Math.round(pixels[i+2]*(1-blend)+b*blend);
            }
            ctx.putImageData(frame,0,0);
          }
        }
        state.frame = requestAnimationFrame(draw);
      };
      // Wait for the camera to supply a frame before replacing its LIVE track.
      if(video.readyState<2 || !video.videoWidth){
        await new Promise((resolve,reject)=>{
          const timeout=setTimeout(()=>{cleanup();reject(new Error('La cámara todavía no produce imagen.'));},4000);
          const ready=()=>{if(video.videoWidth){cleanup();resolve();}};
          const cleanup=()=>{clearTimeout(timeout);video.removeEventListener('loadeddata',ready);};
          video.addEventListener('loadeddata',ready);
          ready();
        });
      }
      draw();
      try {await localTrack.replaceTrack(processed, true);}
      catch (error) {await restoreEffect().catch(()=>{});throw error;}
      setLiveEffect(id);
    } catch (error) {
      onError?.('Filtro LIVE: '+(error?.message || 'No se pudo aplicar.'));
      setLiveEffect('original');
    } finally {setEffectBusy(false);}
  }
  const { localParticipant, isMicrophoneEnabled: mic, isCameraEnabled: cam } = useLocalParticipant();
  async function toggleMic() {
    try { await localParticipant.setMicrophoneEnabled(!localParticipant.isMicrophoneEnabled); }
    catch (e) { onError(e?.message || 'No se pudo cambiar el micrófono'); }
  }
  async function toggleCam() {
    if(!localParticipant.isCameraEnabled){await openCameraPreview();return;}
    setEffectsOpen(false);
    await shutdownDeepAR(deepAREngineRef);setSelectedDeepAR(null);
    try {
      if(effectSession.current?.previewSource){
        await restoreEffect();
        closePreview();
        setLiveEffect('original');
      }else{
        if(effectSession.current){await restoreEffect();setLiveEffect('original');}
        await localParticipant.setCameraEnabled(false);
      }
    }
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
  // v3.56: LIVE-only backgrounds. Never saved to user preferences.
  const backgroundOptions = [
    ['original','👑','RIVYZA original'], ['hearts','❤️','Corazones pequeños'],
    ['stars','⭐','Estrellas brillantes'], ['butterflies','🦋','Mariposas luminosas'],
    ['petals','🌸','Pétalos flotantes'], ['black','⚫','Negro dorado'],
    ['blue','🔵','Azul profundo'], ['purple','🟣','Rosa púrpura']
  ];
  const allowedBackgrounds = new Set(backgroundOptions.map(option => option[0]));
  const [liveBackground,setLiveBackground] = useState('original');
  const [backgroundPickerOpen,setBackgroundPickerOpen] = useState(false);

  // v3.61: apply static backgrounds directly to the LIVE stage.
  // This bypasses older !important CSS rules that were hiding theme changes.
  useEffect(() => {
    const stage = document.querySelector('.rivyza-live-stage');
    if (!stage) return;
    const themes = {
      black: [
        'linear-gradient(145deg, transparent 39%, rgba(255,192,69,.76) 39.2%, transparent 39.5%)',
        'linear-gradient(32deg, transparent 58%, rgba(231,157,38,.55) 58.2%, transparent 58.5%)',
        'radial-gradient(ellipse at 86% 25%, rgba(130,84,18,.36), transparent 42%)',
        'linear-gradient(145deg,#020204 0%,#1b1613 48%,#050406 100%)'
      ],
      blue: [
        'radial-gradient(ellipse at 92% 76%,rgba(0,136,255,.8),transparent 45%)',
        'radial-gradient(ellipse at 7% 20%,rgba(12,70,201,.65),transparent 46%)',
        'linear-gradient(145deg,transparent 46%,rgba(55,169,255,.55) 46.2%,transparent 46.5%)',
        'linear-gradient(165deg,#01040e,#071b49 58%,#020615)'
      ],
      purple: [
        'radial-gradient(ellipse at 90% 76%,rgba(255,30,153,.8),transparent 45%)',
        'radial-gradient(ellipse at 8% 18%,rgba(128,39,228,.72),transparent 46%)',
        'linear-gradient(34deg,transparent 52%,rgba(251,79,198,.55) 52.2%,transparent 52.5%)',
        'linear-gradient(150deg,#090315,#3d115b 54%,#17051e)'
      ]
    };
    const layers = themes[liveBackground];
    if (!layers) return; // The original and animated presets retain their existing styles.
    const brand = 'url("data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20280%20350%22%3E%3Cdefs%3E%3ClinearGradient%20id%3D%22g%22%20x1%3D%220%22%20y1%3D%221%22%20x2%3D%221%22%20y2%3D%220%22%3E%3Cstop%20stop-color%3D%22%231b65f4%22%2F%3E%3Cstop%20offset%3D%22.5%22%20stop-color%3D%22%237131c3%22%2F%3E%3Cstop%20offset%3D%221%22%20stop-color%3D%22%23e3269d%22%2F%3E%3C%2FlinearGradient%3E%3C%2Fdefs%3E%3Cpath%20fill%3D%22url%28%23g%29%22%20opacity%3D%22.34%22%20d%3D%22M56%2076%2039%2022l51%2025L140%205l50%2042%2051-25-17%2054-84%2013z%22%2F%3E%3Cpath%20fill%3D%22url%28%23g%29%22%20opacity%3D%22.28%22%20d%3D%22M72%20109h100c53%200%2079%2026%2079%2068%200%2033-17%2055-47%2065l54%2093h-73l-48-83h-4v83H72zm61%2054v44h35c15%200%2023-8%2023-22s-8-22-23-22z%22%2F%3E%3C%2Fsvg%3E")';
    stage.style.setProperty('background-image', [brand,...layers].join(','), 'important');
    stage.style.setProperty('background-size', ['min(58vw,240px) auto',...layers.map(()=> '100% 100%')].join(','), 'important');
    stage.style.setProperty('background-position', ['center 53%',...layers.map(()=> 'center')].join(','), 'important');
    stage.style.setProperty('background-repeat', 'no-repeat', 'important');
    return () => {
      ['background-image','background-size','background-position','background-repeat'].forEach(p=>stage.style.removeProperty(p));
    };
  }, [liveBackground]);

  const backgroundRef = useRef('original');
  const sendBackground = useCallback(async (type, value, destination) => {
    const payload = new TextEncoder().encode(JSON.stringify({type,roomId:liveRoomId,background:value}));
    await room.localParticipant.publishData(payload,{
      reliable:true,topic:'rivyza-live-background-v356',
      ...(destination ? {destinationIdentities:[destination]} : {})
    });
  },[room,liveRoomId]);
  useEffect(() => {
    backgroundRef.current='original';
    setLiveBackground('original');
  },[liveRoomId]);
  useEffect(() => {
    const receive = (payload,sender,_kind,topic) => {
      if(topic!=='rivyza-live-background-v356') return;
      let data;
      try {data=JSON.parse(new TextDecoder().decode(payload));}catch{return;}
      if(data?.roomId!==liveRoomId) return;
      if(data.type==='request' && isHost && sender?.identity) {
        sendBackground('state',backgroundRef.current,sender.identity).catch(()=>{});
      } else if(data.type==='state' && !isHost && sender?.identity===hostId && allowedBackgrounds.has(data.background)) {
        backgroundRef.current=data.background;
        setLiveBackground(data.background);
      }
    };
    const onJoined = p => {
      if(isHost && p?.identity) sendBackground('state',backgroundRef.current,p.identity).catch(()=>{});
    };
    room.on(RoomEvent.DataReceived,receive);
    room.on(RoomEvent.ParticipantConnected,onJoined);
    if(!isHost) sendBackground('request','original').catch(()=>{});
    return () => {room.off(RoomEvent.DataReceived,receive);room.off(RoomEvent.ParticipantConnected,onJoined);};
  },[room,liveRoomId,isHost,hostId,sendBackground]);
  async function chooseBackground(value) {
    if(!isHost || !allowedBackgrounds.has(value)) return;
    backgroundRef.current=value;
    setLiveBackground(value);
    setBackgroundPickerOpen(false);
    try {await sendBackground('state',value);} catch(e) {onError('No se pudo sincronizar el fondo: '+(e?.message||'Error'));}
  }
  const [drawer, setDrawer] = useState(false);
  const [voiceEffectsOpen,setVoiceEffectsOpen]=useState(false);
  const canUseVoiceEffects = Boolean(publish || isHost || localParticipant.permissions?.canPublish);
  useEffect(() => { if (!canUseVoiceEffects) setVoiceEffectsOpen(false); }, [canUseVoiceEffects]);
  async function shareLive() {
    const url = new URL(window.location.href);
    url.searchParams.set('live', liveRoomId);
    const link = url.toString();
    try {
      if (navigator.share) await navigator.share({title:'RIVYZA LIVE',text:'¡Únete a este LIVE en RIVYZA!',url:link});
      else if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(link); clearInviteConfirmation();setInviteStatus('Enlace del LIVE copiado'); }
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
    const normalized = {...stableSlotsRef.current.slots, ...positions, ...nextPositions};
    for (const id of Object.keys(normalized)) if (!Number.isInteger(normalized[id]) || normalized[id] < 0 || normalized[id] >= nextSlots) delete normalized[id];
    const used = new Set(Object.values(normalized).filter(i => Number.isInteger(i) && i >= 0 && i < nextSlots));
    // Complete the effective order so a swap cannot displace a third participant.
    const occupants = ordered.filter(Boolean).sort((a,b)=>a.identity===hostId?-1:b.identity===hostId?1:0);
    // Preserve the host reservation even when the host is temporarily offline.
    if (hostId && normalized[hostId] === undefined) normalized[hostId] = 0;
    for (const p of occupants) {
      const desired = normalized[p.identity] ?? ordered.findIndex(x=>x?.identity===p.identity);
      if (desired >= 0 && desired < nextSlots) {normalized[p.identity]=desired;used.add(desired);}
    }
    for (const p of occupants) {
      if (normalized[p.identity] !== undefined) continue;
      const free = Array.from({length:nextSlots},(_,i)=>i).find(i=>!used.has(i));
      if (free !== undefined) {normalized[p.identity]=free;used.add(free);}
    }
    try { await onModerate('layout', {positions:normalized, slots:nextSlots}); }
    catch(e) { onError(e.message); }
  }
  // Keep a participant's camera slot reserved during temporary disconnects.
  // In particular, slot 1 belongs to the host even while LiveKit cannot see them.
  // Never compact the remaining guests into an absent participant's position.
  const stableSlotsRef = useRef({roomId:liveRoomId, slots:liveSlotMemory.get(liveRoomId) || {}});
  if (stableSlotsRef.current.roomId !== liveRoomId) {
    stableSlotsRef.current = {roomId:liveRoomId, slots:liveSlotMemory.get(liveRoomId) || {}};
  }
  const shown = [...participants].filter(p => p.identity === hostId || p.permissions?.canPublish)
    .sort((a,b) => (a.identity === hostId ? -1 : b.identity === hostId ? 1 : a.identity.localeCompare(b.identity)));
  const ordered = Array(slots).fill(null);
  const trackById = new Map(tracks.map(t => [t.participant.identity, t]));
  const remembered = stableSlotsRef.current.slots;
  liveSlotMemory.set(liveRoomId, remembered);
  if (liveSlotMemory.size > 30) liveSlotMemory.delete(liveSlotMemory.keys().next().value);
  // Metadata positions take priority, including host/guest movements made by moderators.
  // Keep disconnected identities in the reservation map, not just active LiveKit participants.
  for (const [id, index] of Object.entries(positions)) {
    if (Number.isInteger(index) && index >= 0 && index < slots) {
      for (const other of Object.keys(remembered)) if (other !== id && remembered[other] === index && positions[other] !== index) delete remembered[other];
      remembered[id] = index;
    }
  }
  if (hostId && remembered[hostId] === undefined) remembered[hostId] = 0;
  const placed = new Set();
  const occupied = new Set();
  for (const t of shown) {
    const index = remembered[t.identity];
    if (Number.isInteger(index) && index >= 0 && index < slots && !occupied.has(index)) {
      ordered[index] = t;
      occupied.add(index);
      placed.add(t.identity);
    }
  }
  // Reserve every remembered slot, even when its occupant is temporarily absent.
  const reserved = new Set(Object.entries(remembered)
    .filter(([id,index]) => Number.isInteger(index) && index >= 0 && index < slots && !shown.some(p => p.identity === id))
    .map(([,index]) => index));
  for (const t of shown) {
    if (placed.has(t.identity)) continue;
    const free = ordered.findIndex((x,i) => !x && !reserved.has(i));
    if (free >= 0) {
      ordered[free] = t;
      remembered[t.identity] = free;
      occupied.add(free);
    }
  }
  function swap(index) {
    if (!(isHost || isModerator) || !moveMode) return;
    if (selected === null) { setSelected(index); return; }
    if (selected === index) { setSelected(null); return; }
    const from = ordered[selected], to = ordered[index];
    const next = { ...positions };
    if (!isHost && (from?.identity === hostId || to?.identity === hostId || selected === (remembered[hostId] ?? 0) || index === (remembered[hostId] ?? 0))) { setSelected(null); return; }
    if (from) next[from.identity] = index;
    if (to) next[to.identity] = selected;
    broadcastLayout(next);
    setSelected(null);
  }
  function openSlotInvite(i){if(!(isHost||isModerator)||reserved.has(i))return;setInviteSlot(i);setRequestTab('invite');setRequestsOpen(true);}
  function chooseTile(t, i) {
    if (moveTarget) {
      if (!isHost && t?.identity === hostId) return;
      if (!isHost && (ordered[i]?.identity === hostId || i === (remembered[hostId] ?? 0))) return;
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
    {quickId && createPortal(<div className="rv-quick-backdrop" onClick={()=>{if(!quickBusy)setQuickId(null)}}><section className="rv-quick-sheet" role="dialog" aria-modal="true" aria-label={es?'Perfil rápido':'Quick profile'} onClick={e=>e.stopPropagation()}><div className="rv-quick-handle"/><button className="rv-quick-close" onClick={()=>setQuickId(null)} disabled={quickBusy} aria-label={es?'Cerrar':'Close'}>×</button>{quickData?<><div className="rv-quick-head"><button className="rv-chat-avatar rv-quick-avatar" disabled={quickBusy} aria-label={es?'Abrir perfil':'Open profile'} onClick={()=>{setQuickId(null);onViewProfile?.(quickId)}}>{chatAvatar(quickData,quickData.display_name)}</button><div className="rv-quick-name notranslate" translate="no"><strong>{quickData.display_name||quickData.username}</strong><small>@{quickData.username}</small></div>{quickId!==user.id&&<button className="rv-quick-more" onClick={()=>setQuickMenu(v=>!v)}>•••</button>}</div><div className="rv-quick-stats"><strong>{quickData.followers} {es?'Seguidores':'Followers'}</strong><strong>{quickData.following} {es?'Seguidos':'Following'}</strong></div><div className="notranslate" translate="no">{quickData.bio}</div>{quickMenu&&<div className="rv-quick-actions"><button disabled={quickBusy} onClick={()=>setQuickReport(v=>!v)}>{es?'Reportar usuario':'Report user'}</button><button disabled={quickBusy} onClick={()=>quickAction('block')}>{quickData.blocked?(es?'Desbloquear':'Unblock'):(es?'Bloquear':'Block')}</button></div>}{quickReport&&<div className="rv-quick-actions"><select value={quickReason} onChange={e=>setQuickReason(e.target.value)}>{[['harassment','Acoso','Harassment'],['threats','Amenazas','Threats'],['spam','Spam','Spam'],['hate','Odio','Hate'],['other','Otro','Other']].map(([v,s,n])=><option key={v} value={v}>{es?s:n}</option>)}</select><button disabled={quickBusy} onClick={()=>quickAction('report')}>{es?'Enviar reporte':'Send report'}</button></div>}{quickId!==user.id&&<div className="rv-quick-footer"><button onClick={()=>{setComment(v=>(v+' @'+quickData.username+' ').trimStart());setQuickId(null)}}>@</button><button className="rv-quick-follow" disabled={quickBusy||quickData.blocked} onClick={()=>quickAction('follow')}>{quickData.followed?(es?'Siguiendo':'Following'):(es?'+ Seguir':'+ Follow')}</button></div>}</>:!quickError?<p>{es?'Cargando…':'Loading…'}</p>:null}{quickError&&<p role="status">{quickError}</p>}</section></div>,document.body)}
    <style>{`.rivyza-live-stage .rivyza-live-tile video.rivyza-camera-mirrored { transform: scaleX(-1) !important; -webkit-transform: scaleX(-1) !important; }
/* Four-camera mode: equal square tiles in two full-width rows. */
.rivyza-live-stage .rivyza-live-grid.rivyza-live-grid-square.rivyza-live-layout-4:not(.rivyza-live-solo) {
  display: grid !important;
  width: 100% !important;
  max-width: 100% !important;
  height: auto !important;
  min-height: 0 !important;
  max-height: none !important;
  grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
  grid-template-rows: repeat(2, auto) !important;
  grid-auto-flow: row !important;
  align-content: start !important;
  gap: 3px !important;
  box-sizing: border-box !important;
  flex-shrink: 0 !important;
}
.rivyza-live-stage .rivyza-live-grid.rivyza-live-grid-square.rivyza-live-layout-4 > .rivyza-live-tile.rivyza-live-square:nth-child(n) {
  position: relative !important;
  width: 100% !important;
  height: auto !important;
  min-width: 0 !important;
  min-height: 0 !important;
  max-width: none !important;
  max-height: none !important;
  aspect-ratio: 1 / 1 !important;
  grid-column: auto !important;
  grid-row: auto !important;
  justify-self: stretch !important;
  align-self: start !important;
  box-sizing: border-box !important;
  overflow: hidden !important;
}
.rivyza-live-stage .rivyza-live-grid.rivyza-live-grid-square.rivyza-live-layout-4 > .rivyza-live-tile.rivyza-live-square video {
  width: 100% !important;
  height: 100% !important;
  object-fit: cover !important;
}

/* RIVYZA 13: full-screen main camera, six overlays on each side. */
.rivyza-live-stage .rivyza-live-grid.rivyza-live-grid-square.rivyza-live-layout-13 {display:grid!important;position:relative!important;isolation:isolate; width:100%!important;max-width:none!important;height:calc(100dvh - 175px - env(safe-area-inset-top) - env(safe-area-inset-bottom))!important;max-height:100%!important;min-height:0!important; margin:0!important;padding:0!important;gap:0!important;grid-template-columns: minmax(0,19%) minmax(0,62%) minmax(0,19%)!important;grid-template-rows:repeat(6,minmax(0,1fr))!important;align-content:stretch!important;overflow:hidden!important;}
.rivyza-live-stage .rivyza-live-grid.rivyza-live-grid-square.rivyza-live-layout-13 > .rivyza-live-tile.rivyza-live-square:nth-child(n) {position:relative!important;inset:auto!important;display:block!important;width:100%!important;height:100%!important;min-width:0!important;min-height:0!important;max-width:none!important;max-height:none!important;aspect-ratio:auto!important;margin:0!important;align-self:stretch!important;justify-self:stretch!important;overflow:hidden!important;box-sizing:border-box!important;}
.rivyza-live-stage .rivyza-live-grid.rivyza-live-grid-square.rivyza-live-layout-13 > .rivyza-live-tile.rivyza-live-square:first-child {grid-column:1 / -1!important;grid-row:1 / -1!important;z-index:0!important;border-radius:0!important;}
.rivyza-live-stage .rivyza-live-grid.rivyza-live-grid-square.rivyza-live-layout-13 > .rivyza-live-tile.rivyza-live-square:not(:first-child) {z-index:2!important;width:calc(100% - 6px)!important;height:calc(100% - 10px)!important;align-self:center!important;justify-self:center!important;border:1px solid #ffffff80!important;border-radius:7px!important;background:#241a30!important;}
.rivyza-live-stage .rivyza-live-grid.rivyza-live-grid-square.rivyza-live-layout-13 > .rivyza-live-tile.rivyza-live-square video {object-fit:cover!important;}
.rivyza-live-stage .rivyza-live-grid.rivyza-live-grid-square.rivyza-live-layout-13 > .rivyza-live-tile.rivyza-live-square:not(:first-child) .rivyza-live-camera-name {font-size:10px!important;max-width:100%!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important;}
.rivyza-live-stage:has(.rivyza-live-layout-13) .rivyza-v314-chat {left:24%!important;width:52%!important;font-size:13px!important;}
.rivyza-live-stage:has(.rivyza-live-layout-13) .rivyza-v344-like-zone {right:24%!important;}
.rivyza-live-stage:has(.rivyza-live-layout-13) .rivyza-live-grid {flex-shrink:0!important;}
.rivyza-live-stage .rivyza-live-grid.rivyza-live-grid-square.rivyza-live-layout-13 > .rivyza-live-tile.rivyza-live-square:nth-child(2) {grid-column:1!important;grid-row:1!important;}
.rivyza-live-stage .rivyza-live-grid.rivyza-live-grid-square.rivyza-live-layout-13 > .rivyza-live-tile.rivyza-live-square:nth-child(3) {grid-column:1!important;grid-row:2!important;}
.rivyza-live-stage .rivyza-live-grid.rivyza-live-grid-square.rivyza-live-layout-13 > .rivyza-live-tile.rivyza-live-square:nth-child(4) {grid-column:1!important;grid-row:3!important;}
.rivyza-live-stage .rivyza-live-grid.rivyza-live-grid-square.rivyza-live-layout-13 > .rivyza-live-tile.rivyza-live-square:nth-child(5) {grid-column:1!important;grid-row:4!important;}
.rivyza-live-stage .rivyza-live-grid.rivyza-live-grid-square.rivyza-live-layout-13 > .rivyza-live-tile.rivyza-live-square:nth-child(6) {grid-column:1!important;grid-row:5!important;}
.rivyza-live-stage .rivyza-live-grid.rivyza-live-grid-square.rivyza-live-layout-13 > .rivyza-live-tile.rivyza-live-square:nth-child(7) {grid-column:1!important;grid-row:6!important;}
.rivyza-live-stage .rivyza-live-grid.rivyza-live-grid-square.rivyza-live-layout-13 > .rivyza-live-tile.rivyza-live-square:nth-child(8) {grid-column:3!important;grid-row:1!important;}
.rivyza-live-stage .rivyza-live-grid.rivyza-live-grid-square.rivyza-live-layout-13 > .rivyza-live-tile.rivyza-live-square:nth-child(9) {grid-column:3!important;grid-row:2!important;}
.rivyza-live-stage .rivyza-live-grid.rivyza-live-grid-square.rivyza-live-layout-13 > .rivyza-live-tile.rivyza-live-square:nth-child(10) {grid-column:3!important;grid-row:3!important;}
.rivyza-live-stage .rivyza-live-grid.rivyza-live-grid-square.rivyza-live-layout-13 > .rivyza-live-tile.rivyza-live-square:nth-child(11) {grid-column:3!important;grid-row:4!important;}
.rivyza-live-stage .rivyza-live-grid.rivyza-live-grid-square.rivyza-live-layout-13 > .rivyza-live-tile.rivyza-live-square:nth-child(12) {grid-column:3!important;grid-row:5!important;}
.rivyza-live-stage .rivyza-live-grid.rivyza-live-grid-square.rivyza-live-layout-13 > .rivyza-live-tile.rivyza-live-square:nth-child(13) {grid-column:3!important;grid-row:6!important;}

/* v3.50: Override legacy square-camera layout ONLY for nine slots. */
.rivyza-live-stage .rivyza-live-grid.rivyza-live-grid-square.rivyza-live-layout-9:not(.rivyza-live-solo) {
  display: grid !important;
  width: 100% !important;
  max-width: 100% !important;
  height: min(44dvh, 480px) !important;
  min-height: 0 !important;
  grid-template-columns: minmax(0, 2fr) minmax(0, 1fr) minmax(0, 1fr) !important;
  grid-template-rows: repeat(4, minmax(0, 1fr)) !important;
  grid-auto-rows: minmax(0, 1fr) !important;
  grid-auto-flow: row !important;
  align-content: stretch !important;
  justify-content: stretch !important;
  gap: 3px !important;
  overflow: hidden !important;
  box-sizing: border-box !important;
}
.rivyza-live-stage .rivyza-live-grid.rivyza-live-grid-square.rivyza-live-layout-9 > .rivyza-live-tile.rivyza-live-square {
  position: relative !important;
  display: block !important;
  width: 100% !important;
  height: 100% !important;
  min-width: 0 !important;
  min-height: 0 !important;
  max-width: none !important;
  max-height: none !important;
  aspect-ratio: auto !important;
  grid-column: auto !important;
  grid-row: auto !important;
  justify-self: stretch !important;
  align-self: stretch !important;
  overflow: hidden !important;
}
.rivyza-live-stage .rivyza-live-grid.rivyza-live-grid-square.rivyza-live-layout-9 > .rivyza-live-tile.rivyza-live-square:first-child {
  grid-column: 1 / 2 !important;
  grid-row: 1 / 5 !important;
}
.rivyza-live-stage .rivyza-live-grid.rivyza-live-grid-square.rivyza-live-layout-9 > .rivyza-live-tile.rivyza-live-square:nth-child(2) { grid-column: 2 !important; grid-row: 1 !important; }
.rivyza-live-stage .rivyza-live-grid.rivyza-live-grid-square.rivyza-live-layout-9 > .rivyza-live-tile.rivyza-live-square:nth-child(3) { grid-column: 3 !important; grid-row: 1 !important; }
.rivyza-live-stage .rivyza-live-grid.rivyza-live-grid-square.rivyza-live-layout-9 > .rivyza-live-tile.rivyza-live-square:nth-child(4) { grid-column: 2 !important; grid-row: 2 !important; }
.rivyza-live-stage .rivyza-live-grid.rivyza-live-grid-square.rivyza-live-layout-9 > .rivyza-live-tile.rivyza-live-square:nth-child(5) { grid-column: 3 !important; grid-row: 2 !important; }
.rivyza-live-stage .rivyza-live-grid.rivyza-live-grid-square.rivyza-live-layout-9 > .rivyza-live-tile.rivyza-live-square:nth-child(6) { grid-column: 2 !important; grid-row: 3 !important; }
.rivyza-live-stage .rivyza-live-grid.rivyza-live-grid-square.rivyza-live-layout-9 > .rivyza-live-tile.rivyza-live-square:nth-child(7) { grid-column: 3 !important; grid-row: 3 !important; }
.rivyza-live-stage .rivyza-live-grid.rivyza-live-grid-square.rivyza-live-layout-9 > .rivyza-live-tile.rivyza-live-square:nth-child(8) { grid-column: 2 !important; grid-row: 4 !important; }
.rivyza-live-stage .rivyza-live-grid.rivyza-live-grid-square.rivyza-live-layout-9 > .rivyza-live-tile.rivyza-live-square:nth-child(9) { grid-column: 3 !important; grid-row: 4 !important; }
.rivyza-live-stage .rivyza-live-grid.rivyza-live-grid-square.rivyza-live-layout-9 > .rivyza-live-tile.rivyza-live-square video {
  width: 100% !important;
  height: 100% !important;
  object-fit: cover !important;
}
/* RIVYZA surprise layout: choosing 9 opens 14 total camera slots.
   Existing 1–10 layouts are intentionally untouched. */
.rivyza-live-stage .rivyza-live-grid.rivyza-live-grid-square.rivyza-live-layout-14 {
  display: grid !important;
  width: 100% !important;
  max-width: 100% !important;
  height: auto !important;
  min-height: 0 !important;
  grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
  grid-template-rows: none !important;
  grid-auto-rows: max-content !important;
  align-content: start !important;
  grid-auto-flow: row !important;
  gap: 3px !important;
  overflow: hidden !important;
  box-sizing: border-box !important;
}
.rivyza-live-stage .rivyza-live-grid.rivyza-live-grid-square.rivyza-live-layout-14 > .rivyza-live-tile.rivyza-live-square {
  position: relative !important;
  display: block !important;
  width: 100% !important;
  height: auto !important;
  min-width: 0 !important;
  min-height: 0 !important;
  max-width: none !important;
  max-height: none !important;
  aspect-ratio: 1 / 1 !important;
  grid-column: auto !important;
  grid-row: auto !important;
  justify-self: stretch !important;
  align-self: start !important;
  overflow: hidden !important;
}
.rivyza-live-stage .rivyza-live-grid.rivyza-live-grid-square.rivyza-live-layout-14 > .rivyza-live-tile.rivyza-live-square:nth-child(1) {
  grid-column: 1 / 3 !important;
  grid-row: 1 !important;
}
.rivyza-live-stage .rivyza-live-grid.rivyza-live-grid-square.rivyza-live-layout-14 > .rivyza-live-tile.rivyza-live-square:nth-child(2) {
  grid-column: 3 / 5 !important;
  grid-row: 1 !important;
}
.rivyza-live-stage .rivyza-live-grid.rivyza-live-grid-square.rivyza-live-layout-14 > .rivyza-live-tile.rivyza-live-square video {
  width: 100% !important;
  height: 100% !important;
  object-fit: cover !important;
}
`}</style>
    {typeof document !== 'undefined' && document.querySelector('.rivyza-live-stage') && liveBackground !== 'original' && createPortal(
      <div className={`rivyza-v358-art rivyza-v358-art-${liveBackground}`} aria-hidden="true">
        {['hearts','stars','butterflies','petals'].includes(liveBackground) && Array.from({length:liveBackground==='stars'?95:liveBackground==='hearts'?39:liveBackground==='butterflies'?22:37},(_,i)=>{
          // Stable, non-grid low-discrepancy placement, with per-particle offsets.
          const fract=n=>n-Math.floor(n);
          const x=2+fract((i+1)*0.61803398875+0.137)*96;
          const y=2+fract((i+1)*0.75487766625+0.283)*96;
          const duration=liveBackground==='stars'?2.1+fract(i*0.317)*5.9:liveBackground==='hearts'?8+fract(i*.414)*11:liveBackground==='butterflies'?9+fract(i*.571)*12:8+fract(i*.419)*12;
          const symbol=liveBackground==='hearts'?(i%4===0?'♥':'❤'):liveBackground==='stars'?(i%7===0?'✦':i%3===0?'✧':'•'):liveBackground==='butterflies'?'🦋':(i%3===0?'🌸':'❀');
          const size=liveBackground==='hearts'?13+fract(i*.363)*16:liveBackground==='stars'?3+fract(i*.583)*12:liveBackground==='butterflies'?14+fract(i*.473)*14:10+fract(i*.391)*12;
          return <span key={i} className="rivyza-v358-particle" style={{left:`${x}%`,top:`${y}%`,fontSize:`${size}px`,animationDuration:`${duration}s`,animationDelay:`-${fract(i*.731)*duration}s`,opacity:.5+fract(i*.293)*.48}}>{symbol}</span>;
        })}
      </div>,document.querySelector('.rivyza-live-stage'))}
    <LiveStickers room={room} isHost={isHost} hostId={hostId} liveRoomId={liveRoomId} supabase={supabase} lang={lang} />
    <div ref={gridRef} className={`rivyza-live-grid rivyza-live-grid-square rivyza-live-layout-${slots} ${slots === 1 ? "rivyza-live-solo" : ""} rivyza-v356-bg-${liveBackground}`}>
      {ordered.map((t, i) => <div key={i}
        className={`rivyza-live-tile rivyza-live-square ${!t ? 'rivyza-live-vacant' : ''} ${selected === i ? 'rivyza-live-picked' : ''} ${speakers.includes(t?.identity) ? 'rivyza-v314-speaking' : ''}`}
        onClick={() => moveMode ? swap(i) : (t || moveTarget) ? chooseTile(t,i) : (isHost||isModerator) ? openSlotInvite(i) : (!publish && onRequest?.())} role='button'
        tabIndex={0}
        onKeyDown={e => { if ((e.key === 'Enter' || e.key === ' ') ) { e.preventDefault(); if(moveMode) swap(i); else if(t||moveTarget) chooseTile(t,i);else if(isHost||isModerator)openSlotInvite(i);else if(!publish)onRequest?.(); } }}>
        {t ? <>{t.isCameraEnabled && trackById.has(t.identity) ? <VideoTrack trackRef={trackById.get(t.identity)} className={`rivyza-v318-video ${mirrorStates[t.identity] === true ? "rivyza-camera-mirrored" : ""}`} style={{transform: mirrorStates[t.identity] === true ? "scaleX(-1)" : "scaleX(1)", WebkitTransform: mirrorStates[t.identity] === true ? "scaleX(-1)" : "scaleX(1)"}} /> : <div className="rivyza-live-avatar-fallback">{avatarFor(t) ? <><img src={avatarFor(t)} alt={t.name || 'Perfil'} onError={e=>{e.currentTarget.style.display='none';const next=e.currentTarget.nextElementSibling;if(next)next.style.display='flex';}} style={{width:'min(80px, 76%)',height:'auto',aspectRatio:'1 / 1',maxHeight:'76%',flexShrink:0,borderRadius:'50%',objectFit:'cover'}}/><span style={{display:'none'}}>{(t.name || 'U').slice(0,1).toUpperCase()}</span></> : <span>{(t.name || 'U').slice(0,1).toUpperCase()}</span>}</div>}{!t.isMicrophoneEnabled && <span className="rivyza-v317-mic-off" role="img" aria-label="Micrófono silenciado"><svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 9v3a3 3 0 0 0 5.1 2.1"/><path d="M15 9V5a3 3 0 0 0-5.8-1"/><path d="M5 10v2a7 7 0 0 0 12 4.9"/><path d="M19 10v2c0 .7-.1 1.4-.3 2"/><path d="M12 19v3"/><path d="M8 22h8"/><path d="M3 3l18 18"/></svg></span>}<span className="rivyza-live-camera-name">{t.identity === hostId ? '👑 ' : moderatorIds?.includes(t.identity) ? '🛡️ ' : ''}{t.name || tr.guest}</span></> : <>{(isHost||isModerator)&&!reserved.has(i)&&<span aria-hidden="true" style={{position:"absolute",inset:0,display:"grid",placeItems:"center",fontSize:32,color:"white",pointerEvents:"none"}}>+</span>}<span className="rivyza-live-camera-name">+ {tr.camera} {i + 1}</span></>}
      </div>)}
    </div>
    {!typing && !target && !viewersOpen && <div className="rivyza-v344-like-zone" role="button" tabIndex={0} aria-label="Dar Likes al LIVE" onPointerDown={e => {e.preventDefault(); giveLike();}} onKeyDown={e => {if(e.key === 'Enter' || e.key === ' ') {e.preventDefault();giveLike();}}}><span className="rivyza-v344-like-hint"><span className="rivyza-v344-like-heart" aria-hidden="true">💗</span><span>Likes</span></span></div>}
    <div className="rivyza-v344-floating" aria-hidden="true">{floatingLikes.map(item => <svg key={item.id} className="rivyza-v344-float-heart" style={{left:`${item.left}%`}} viewBox="0 0 24 24"><defs><linearGradient id={`rivyza-like-${item.id}`} x1="0" y1="1" x2="1" y2="0"><stop offset="0%" stopColor="#ff4da9"/><stop offset="100%" stopColor="#963cff"/></linearGradient></defs><path d="M12 21s-9-5.7-9-12a5 5 0 0 1 9-3 5 5 0 0 1 9 3c0 6.3-9 12-9 12Z" fill={`url(#rivyza-like-${item.id})`}/></svg>)}</div>
    {typeof document !== 'undefined' && document.querySelector('.rivyza-live-top') && createPortal(<div className="rivyza-v368-counters" aria-label="Likes y espectadores del LIVE"><button type="button" className="rivyza-v368-like-trigger" aria-label="Ver Top 8 de likes" aria-expanded={likesTopOpen} onClick={e => {e.preventDefault();e.stopPropagation();setLikesTopOpen(open => !open);}} style={{cursor:"pointer",touchAction:"manipulation",pointerEvents:"auto",position:"relative",zIndex:1000,background:"transparent",border:0,padding:"4px 6px",minHeight:32,margin:0,opacity:1,WebkitAppearance:"none"}}><svg viewBox="0 0 24 24" width="13" height="13" aria-hidden="true"><defs><linearGradient id="rivyza-like-counter-gradient" x1="0" y1="1" x2="1" y2="0"><stop offset="0%" stopColor="#ff4da9"/><stop offset="100%" stopColor="#963cff"/></linearGradient></defs><path d="M12 21s-9-5.7-9-12a5 5 0 0 1 9-3 5 5 0 0 1 9 3c0 6.3-9 12-9 12Z" fill="url(#rivyza-like-counter-gradient)"/></svg><span>{likesFormat(liveLikes)}</span></button><button type="button" onClick={() => setViewersOpen(true)} className="rivyza-v368-viewers" style={{position:"static",top:"auto",right:"auto",zIndex:"auto",display:"inline-flex",alignItems:"center",gap:"5px",marginLeft:"0px",verticalAlign:"middle",padding:"3px 5px",fontSize:"11px",lineHeight:"18px",whiteSpace:"nowrap",background:"rgba(57,43,73,.9)",borderRadius:"999px"}} aria-label="Ver personas conectadas al LIVE" aria-expanded={viewersOpen}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg><span>{visibleViewers.length}</span></button></div>, document.querySelector('.rivyza-live-top'))}
    {likesTopOpen && typeof document !== 'undefined' && createPortal(
      <div onClick={() => setLikesTopOpen(false)} role="presentation" style={{position:'fixed',inset:0,zIndex:2147483005,background:'rgba(0,0,0,.38)',display:'flex',justifyContent:'center',alignItems:'flex-start',padding:'calc(90px + env(safe-area-inset-top)) 12px 12px',boxSizing:'border-box'}}>
        <section role="dialog" aria-modal="true" aria-label="Top 8 de likes" onClick={e => e.stopPropagation()} style={{width:'100%',maxWidth:350,background:'#201629',color:'#fff',border:'1px solid #70457f',borderRadius:17,padding:'13px 14px',boxShadow:'0 12px 36px #0009',maxHeight:'min(75dvh,510px)',overflowY:'auto',boxSizing:'border-box'}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:8,marginBottom:5}}><strong style={{fontSize:15}}>💗 Top 8 de Likes</strong><span style={{fontSize:10,color:'#c8b7d3'}}>Visible para todos</span></div>
          <div style={{display:'flex',justifyContent:'space-between',fontSize:11,color:'#c8b7d3',marginBottom:10}}><span>Los que más apoyan el LIVE</span><span>{likesFormat(liveLikes)} ❤️</span></div>
          {likesTopLoading && !likesTop.length ? <p style={{fontSize:12,textAlign:'center',color:'#d6c5df'}}>Cargando likes…</p> : likesTop.length === 0 ? <p style={{fontSize:12,textAlign:'center',color:'#d6c5df'}}>Todavía no hay likes en este LIVE.</p> : likesTop.map((person,index) => (
            <div key={person.user_id} style={{display:'flex',alignItems:'center',gap:9,padding:'7px 0',borderTop:'1px solid #ffffff17'}}>
              <span style={{width:23,textAlign:'center',fontSize:13,color:index===0?'#ffd365':'#c7b7d2'}}>{index===0?'🏆':index+1}</span>
              <button type="button" onClick={() => {setLikesTopOpen(false);onViewProfile?.(person.user_id);}} style={{display:'flex',alignItems:'center',gap:8,flex:1,minWidth:0,border:0,padding:0,background:'none',color:'#fff',textAlign:'left',cursor:'pointer'}}>
                {person.avatar_url ? <img src={person.avatar_url} alt="" style={{width:30,height:30,objectFit:'cover',borderRadius:'50%'}}/> : <span style={{width:30,height:30,borderRadius:'50%',background:'#483251',display:'grid',placeItems:'center'}}>👤</span>}
                <span style={{fontSize:12,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{person.display_name || person.username || 'Usuario'}</span>
              </button>
              <span style={{fontSize:12,fontWeight:700,color:'#ff89ae',whiteSpace:'nowrap'}}>{Number(person.likes_count).toLocaleString()} ❤️</span>
            </div>
          ))}
          <div style={{fontSize:10,color:'#b7a6c2',textAlign:'center',marginTop:10}}>Toca fuera de la ventana para cerrar</div>
        </section>
      </div>,document.body)}
    {(moveMode || moveTarget) && <p className="rivyza-live-hint">{moveTarget || selected !== null ? 'Selecciona la posición de destino' : tr.moveHint}<button onClick={()=>{setMoveTarget(null);setMoveMode(false);setSelected(null)}}>Cancelar</button></p>}

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

                </div>
              </div>;
            })()}
            {!visibleViewers.length && <p style={{color:'#d4c7df'}}>{lang==='es'?'No hay participantes conectados.':'No participants connected.'}</p>}
          </div>
        </section>
      </div>, document.body)}
    {inviteStatus && <div role="status" style={{position:'fixed',left:16,right:16,bottom:'calc(90px + env(safe-area-inset-bottom))',zIndex:95,padding:'8px 12px',background:'#35213f',color:'white',borderRadius:12}} onClick={clearInviteConfirmation}>{inviteStatus}</div>}
    {incomingInvite && !publish && <div role="dialog" aria-label="Invitación al LIVE" style={{position:'fixed',inset:0,zIndex:2147483000,display:'grid',placeItems:'center',background:'#000a',padding:16}}>
      <div style={{width:'100%',maxWidth:360,background:'#261a33',color:'white',borderRadius:16,padding:20}}>
        <strong>{incomingInvite.from} {lang==='es'?'te invita a subir al LIVE':'invites you to join LIVE'}</strong>
        <p style={{fontSize:13}}>{lang==='es'?'Si aceptas, subirás directamente al LIVE si hay espacio.':'Accept to join directly if a slot is available.'}</p>
        <div style={{display:'flex',gap:10,marginTop:16}}>
          <button type="button" style={{flex:1,padding:12,borderRadius:10}} disabled={inviteBusy} onClick={async()=>{setInviteBusy(true);try{await onModerate('invite_decline',{inviteId:incomingInvite.inviteId});setIncomingInvite(null);}catch(e){onError?.(e.message);}finally{setInviteBusy(false);}}}>{lang==='es'?'Rechazar':'Decline'}</button>
          <button type="button" style={{flex:1,padding:12,borderRadius:10,background:'#8e38d0',color:'white'}} disabled={inviteBusy} onClick={async()=>{setInviteBusy(true);try{await onModerate('invite_accept',{inviteId:incomingInvite.inviteId});setIncomingInvite(null);}catch(e){onError?.(e.message);}finally{setInviteBusy(false);}}}>{lang==='es'?'Aceptar':'Accept'}</button>
        </div>
      </div>
    </div>}
    <div className="rivyza-v314-chat" style={slots===14 && chatBoundary!==null ? {clipPath:`inset(${Math.ceil(chatBoundary)}px 0 0 0)`} : undefined} ref={chatRef} onScroll={onChatScroll} role="log" aria-label={lang === 'es' ? 'Historial del chat del LIVE' : 'LIVE chat history'} aria-live="off">{hasOlder && chat.length > 0 && <button type="button" className="rivyza-v323-earlier" disabled={loadingOlder} onClick={loadOlder}>{loadingOlder ? "Cargando…" : "↑ Ver mensajes anteriores"}</button>}{chat.map(m=>{const activity=eventDetails(m);return <div key={m.id} className={activity ? `rivyza-v328-activity ${activity.entering ? 'rivyza-v328-enter' : 'rivyza-v328-exit'}` : (m.privateWelcome ? 'rivyza-private-welcome' : (m.system ? 'rivyza-v322-event' : ''))}>{activity ? <><span aria-hidden="true" className="rivyza-v328-symbol">{activity.entering ? '↳' : '↰'}</span><span className="rivyza-v328-activity-text"><strong>{activity.person}</strong> {activity.action}</span><time dateTime={new Date(m.at || Date.now()).toISOString()} className="rivyza-v328-time">{eventTime(m.at)}</time></> : m.system || m.privateWelcome ? <>{m.name && <strong>{m.name}: </strong>}{m.text}</> : <div className="rv-chat-person"><button type="button" className="rv-chat-avatar" disabled={!m.authorId} aria-label={es?'Abrir perfil rápido':'Open quick profile'} onClick={()=>setQuickId(m.authorId)}>{chatAvatar(chatPeople[m.authorId]||profiles[m.authorId],m.name)}</button><div className="rv-chat-copy"><div className="rv-chat-name notranslate" translate="no">{chatPeople[m.authorId]?.display_name||m.name}{m.authorId===hostId?' 👑':moderatorIds?.includes(m.authorId)?' 🛡️':''}</div><div translate="no" className="notranslate">{m.text}</div></div></div>}</div>})}</div>{chatReadingOld && <button type="button" onClick={goToLatest} aria-label="Ir al mensaje más reciente" style={{position:'fixed',bottom:'calc(242px + env(safe-area-inset-bottom))',left:14,zIndex:49,border:'1px solid #ffffff66',borderRadius:20,padding:'7px 12px',background:'rgba(32,19,44,.94)',color:'white',fontSize:12}}>↓ Ir al más reciente</button>}{chatNotice && <div className="rivyza-v323-chat-notice" role="status">{chatNotice}</div>}
    {publish && (cameraPreviewOpen || previewStream) && <div role="dialog" aria-modal={cameraPreviewOpen} aria-label="Preparar cámara" style={{position:'fixed',inset:0,zIndex:cameraPreviewOpen?2147483001:-1,opacity:cameraPreviewOpen?1:0,pointerEvents:cameraPreviewOpen?'auto':'none',background:'rgba(0,0,0,.94)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:14,color:'#fff'}}>
      <div style={{width:'100%',maxWidth:400,display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10}}><strong>Prepara tu cámara</strong><button type="button" onClick={closePreview} style={{background:'transparent',border:0,color:'#fff',fontSize:25}}>✕</button></div>
      <div style={{width:'100%',maxWidth:400,height:'min(49vh,460px)',background:'#15151d',borderRadius:14,overflow:'hidden',position:'relative'}}>
        {previewStream?<video ref={previewVideoRef} muted playsInline autoPlay style={{width:'100%',height:'100%',objectFit:'cover',transform:'scaleX(-1)',filter:previewFilter==='bw'?`grayscale(${previewIntensity/100})`:previewFilter==='warm'?`sepia(${.28*previewIntensity/100}) saturate(${1+.2*previewIntensity/100})`:previewFilter==='cool'?`hue-rotate(${13*previewIntensity/100}deg) saturate(${1+.12*previewIntensity/100})`:previewFilter==='vivid'?`saturate(${1+.5*previewIntensity/100}) contrast(${1+.08*previewIntensity/100})`:'none'}}/>:<div style={{padding:20,textAlign:'center'}}>Solicitando acceso a cámara…</div>}
        <div ref={previewARHolderRef} style={{position:'absolute',inset:0,pointerEvents:'none',opacity:previewDeepAR?1:0,filter:previewFilter==='bw'?`grayscale(${previewIntensity/100})`:previewFilter==='warm'?`sepia(${.28*previewIntensity/100}) saturate(${1+.2*previewIntensity/100})`:previewFilter==='cool'?`hue-rotate(${13*previewIntensity/100}deg) saturate(${1+.12*previewIntensity/100})`:previewFilter==='vivid'?`saturate(${1+.5*previewIntensity/100}) contrast(${1+.08*previewIntensity/100})`:'none'}}/>
        <span style={{position:'absolute',top:8,left:8,fontSize:11,background:'#0009',padding:6,borderRadius:8}}>PRIVADO · No estás transmitiendo</span>
      </div>
      <div style={{display:'flex',gap:8,marginTop:12}}>{[['filters','Filtros'],['beauty','Belleza'],['deepar','DeepAR']].map(([id,label])=><button key={id} type="button" onClick={()=>setPreviewTab(id)} style={{border:0,borderRadius:15,padding:'8px 13px',background:previewTab===id?'#d32f86':'#333',color:'#fff'}}>{label}</button>)}</div>
      <div style={{width:'100%',maxWidth:400,marginTop:12,minHeight:85}}>
        {previewTab==='filters'?<><div style={{display:'flex',gap:6,overflowX:'auto'}}>{effectOptions.map(([id,label])=><button type="button" key={id} onClick={()=>setPreviewFilter(id)} style={{flexShrink:0,border:'1px solid #666',borderRadius:9,padding:8,background:previewFilter===id?'#b12d92':'#222',color:'#fff'}}>{label}</button>)}</div><label style={{display:'block',marginTop:12}}>Intensidad: {previewIntensity}% <input aria-label="Intensidad del filtro" type="range" min="1" max="100" value={previewIntensity} onChange={e=>setPreviewIntensity(Number(e.target.value))} style={{width:'100%'}}/></label></>:previewTab==='deepar'?<><div style={{display:'flex',gap:6,overflowX:'auto',marginBottom:8}}>{deeparCategories.map(([id,label])=><button key={id} type="button" onClick={()=>setDeepARCategory(id)} style={{padding:7,borderRadius:10,background:deepARCategory===id?'#d32f86':'#333',color:'#fff'}}>{label}</button>)}</div><div style={{display:'flex',gap:7,overflowX:'auto'}}><button type="button" disabled={deepARBusy} onClick={()=>selectPreviewDeepAR(null)}>Sin efecto</button>{LIVE_DEEPAR_EFFECTS.filter(x=>x.category===deepARCategory).map(effect=><button key={effect.id} type="button" disabled={deepARBusy} onClick={()=>selectPreviewDeepAR(effect)} style={{flexShrink:0,padding:9,borderRadius:9,background:previewDeepAR?.id===effect.id?'#d32f86':'#333',color:'#fff'}}>{effect.label}</button>)}</div></>:<p style={{fontSize:13,color:'#ddd'}}>Los ajustes faciales independientes requieren efectos compatibles con esos parámetros.</p>}
      </div>
      {deepARError&&<p role="alert" style={{color:'#ff9db8'}}>{deepARError}</p>}
      {previewError&&<p role="alert" style={{color:'#ff9db8'}}>{previewError}</p>}
      <button type="button" disabled={!previewStream||previewBusy} onClick={confirmCameraPreview} style={{marginTop:10,width:'100%',maxWidth:400,padding:14,border:0,borderRadius:30,background:'#ef287e',color:'white',fontWeight:700,opacity:!previewStream||previewBusy?.6:1}}>{previewBusy?'Encendiendo…':'Encender cámara'}</button>
    </div>}
    {/* Keep WebGL within the visible viewport; a zero-opacity/offscreen renderer can be throttled on iOS. */}
    <div ref={deepARHolderRef} style={{position:'fixed',left:0,top:0,width:240,height:320,overflow:'hidden',opacity:0.01,pointerEvents:'none',zIndex:1}} aria-hidden="true"/>
    {publish && effectsOpen && <div role="dialog" aria-label="Filtros LIVE" style={{position:'absolute',bottom:88,left:12,right:12,maxWidth:'calc(100% - 24px)',boxSizing:'border-box',zIndex:65,background:'rgba(12,12,18,.96)',border:'1px solid #ffffff44',borderRadius:14,padding:10,color:'#fff'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:9}}><strong>EF · Filtros LIVE</strong><button type="button" onClick={()=>setEffectsOpen(false)} style={{background:'transparent',border:0,color:'#fff',fontSize:20}}>✕</button></div>
      <div style={{display:'flex',gap:7,overflowX:'auto',maxWidth:'100%',WebkitOverflowScrolling:'touch',paddingBottom:4}}>{effectOptions.map(([id,label])=><button type="button" key={id} disabled={effectBusy} onClick={()=>chooseLiveEffect(id)} style={{flex:'0 0 auto',padding:'8px 10px',borderRadius:10,border:'1px solid #ffffff55',background:liveEffect===id?'#b12d92':'#222',color:'#fff'}}>{label}</button>)}</div>
      <label style={{display:'block',marginTop:8,fontSize:13}}>Intensidad: {filterIntensity}% <input type="range" min="1" max="100" value={filterIntensity} onChange={e=>{const value=Number(e.target.value);setFilterIntensity(value);intensityRef.current=value;if(effectSession.current)effectSession.current.intensity=value;}} style={{width:'100%'}}/></label>
      <div style={{display:'flex',gap:6,overflowX:'auto',marginTop:10}}>{deeparCategories.map(([id,label])=><button key={id} type="button" onClick={()=>setDeepARCategory(id)} style={{flexShrink:0,padding:7,borderRadius:10,background:deepARCategory===id?'#d32f86':'#333',color:'#fff'}}>{label}</button>)}</div>
      <div style={{display:'flex',gap:7,overflowX:'auto',marginTop:7}}><button type="button" disabled={deepARBusy} onClick={()=>selectLiveDeepAR(null)} aria-pressed={!selectedDeepAR} style={{flexShrink:0,padding:8,borderRadius:10,border:"1px solid #666",background:!selectedDeepAR?"#d32f86":"#333",color:"#fff",opacity:deepARBusy?0.6:1}}>Sin DeepAR</button>{LIVE_DEEPAR_EFFECTS.filter(x=>x.category===deepARCategory).map(effect=><button key={effect.id} type="button" disabled={deepARBusy} onClick={()=>selectLiveDeepAR(effect)} style={{flexShrink:0,padding:8,borderRadius:10,background:selectedDeepAR?.id===effect.id?'#d32f86':'#333',color:'#fff'}}>{effect.label}</button>)}</div>
      {deepARError&&<p role="alert" style={{color:'#ff9db8'}}>{deepARError}</p>}
      <small style={{display:'block',marginTop:8,color:'#ccc'}}>El filtro se aplica al video enviado. Para voltear la cámara, selecciona «Sin efecto».</small>
    </div>}
    {!publish && requestStatus && <div className="rivyza-v314-request-status" role="status">{requestStatus === 'pending' ? (camerasFull ? fullMessage : (lang==='es'?'Solicitud enviada. Espera la aprobación.':'Request sent. Waiting for approval.')) : requestStatus === 'approved' ? 'Solicitud aceptada. Conectando…' : 'Solicitud finalizada. Puedes solicitar subir de nuevo.'}{requestStatus === 'pending' && <button onClick={onCancelRequest}>Cancelar solicitud</button>}</div>}
    <div className={`rivyza-live-bottom-bar rivyza-v32-toolbar ${typing ? 'rivyza-v32-typing' : ''}`} style={target ? {visibility:'hidden',pointerEvents:'none'} : typing ? {bottom:`calc(${keyboardLift}px + 6px)`} : undefined}>
      <form onSubmit={sendComment} className="rivyza-v314-comment-form"><input ref={commentInputRef} value={comment} onChange={e=>setComment(e.target.value)} maxLength={300} className="rivyza-v32-comment" type="text" placeholder={lang === 'es' ? 'Escribe un comentario…' : 'Write a comment…'} aria-label="Comentario" onFocus={() => setTyping(true)} onBlur={() => setTyping(false)} /><button type="submit" aria-label="Enviar comentario">➤</button></form>
      {!typing && <>

        {publish && <button type="button" className="rivyza-v32-icon" onClick={toggleCam} aria-label={cam ? 'Apagar cámara' : 'Encender cámara'} title={cam ? 'Apagar cámara' : 'Encender cámara'}>{cam ? '📹' : '📷'}</button>}
        {publish && <button type="button" className="rivyza-v32-icon" onClick={toggleMic} aria-label={mic ? 'Silenciar micrófono' : 'Activar micrófono'} title={mic ? 'Silenciar micrófono' : 'Activar micrófono'}><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={mic ? "#FFFFFF" : "#FF3B45"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{display:"block",width:"22px",height:"22px",flexShrink:0,margin:"auto"}}>
          <rect x="9" y="2" width="6" height="12" rx="3" />
          <path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3M8 22h8" />
          {!mic && <><circle cx="12" cy="12" r="10" stroke="#FF3B45" strokeWidth="1.6" /><path d="M5 5l14 14" stroke="#FF3B45" strokeWidth="2.3" /></>}
        </svg></button>}
        {!publish && !isModerator && <button type="button" className="rivyza-v32-icon rivyza-v32-join-request" disabled={requestStatus === 'pending'} onClick={() => onRequest?.()} aria-label={tr.request} title={tr.request}>✋</button>}
        {(isHost || isModerator) && <button type="button" className={`rivyza-v32-icon rivyza-v32-requests ${requests.some(r => r.status === 'pending') ? 'has-pending' : ''}`} onClick={() => { setDrawer(false); setRequestsOpen(x => !x); }} aria-label={`Solicitudes para subir: ${requests.filter(r => r.status === 'pending').length}`} aria-expanded={requestsOpen}>✋{requests.filter(r => r.status === 'pending').length > 0 && <span className="rivyza-v32-count">{requests.filter(r => r.status === 'pending').length}</span>}</button>}
        <button type="button" className="rivyza-v32-icon" disabled title="Regalos: próximamente" aria-label="Regalos próximamente">🎁</button>
        <button type="button" className="rivyza-v32-icon" onClick={() => { setRequestsOpen(false); setDrawer(x => !x); }} aria-label={tr.options} aria-expanded={drawer}>•••</button>
      </>}
    </div>
    {(isHost || isModerator) && requestsOpen && <div className="rivyza-v32-popover rivyza-v32-request-panel" role="dialog" aria-label="Solicitudes para subir">
      <div className="rivyza-v32-panel-heading"><strong>{inviteSlot!==null?`${tr.camera} ${inviteSlot+1} · ${lang==='es'?'Invitar':'Invite'}`: `✋ ${tr.requests}`} ({requests.filter(r => r.status === 'pending').length})</strong><button type="button" onClick={() => setRequestsOpen(false)} aria-label="Cerrar">✕</button></div>
      {isModerator && !publish && <button type="button" disabled={inviteBusy || camerasFull} style={{background:'#8e38d0',color:'#fff',padding:10,borderRadius:10,marginBottom:8}} onClick={async()=>{setInviteBusy(true);try{await onModerate('moderator_join');setRequestsOpen(false);}catch(e){onError?.(e.message);}finally{setInviteBusy(false);}}}>{lang==='es'?'Subir a cámara':'Join camera'}</button>}
      <div style={{display:'flex',gap:8,marginBottom:8}}>
        <button type="button" onClick={()=>setRequestTab('requests')} style={{background:requestTab==='requests'?'#8e38d0':'#49315b',color:'#fff',padding:8,borderRadius:8}} aria-pressed={requestTab==='requests'}>{lang==='es'?'Solicitudes':'Requests'} ({requests.filter(r=>r.status==='pending').length})</button>
        <button type="button" onClick={()=>setRequestTab('invite')} style={{background:requestTab==='invite'?'#8e38d0':'#49315b',color:'#fff',padding:8,borderRadius:8}} aria-pressed={requestTab==='invite'}>{lang==='es'?'Invitar':'Invite'} ({visibleViewers.filter(p=>p.identity!==hostId && p.identity!==room.localParticipant.identity && !p.permissions?.canPublish).length})</button>
      </div>
      {camerasFull && <p role="status" style={{color:'#fff',fontSize:13,margin:'6px 0'}}>{lang==='es'?'Cámaras llenas. Las solicitudes siguen pendientes.':'Camera slots full. Requests remain pending.'}</p>}
      <div className="rivyza-v32-request-scroll">
        {requestTab==='invite' ? <>{!visibleViewers.some(p=>p.identity!==hostId && p.identity!==room.localParticipant.identity && !p.permissions?.canPublish) && <p>{lang==='es'?'No hay espectadores disponibles':'No available viewers'}</p>}{visibleViewers.filter(p=>p.identity!==hostId && p.identity!==room.localParticipant.identity && !p.permissions?.canPublish).map(p=><div className="rivyza-v32-request-row" key={p.identity}>
          {avatarFor(p) && <img src={avatarFor(p)} alt="" style={{width:30,height:30,borderRadius:'50%',objectFit:'cover'}}/>}
          <span>{profiles[p.identity]?.display_name || p.name || 'Usuario'}</span><button type="button" disabled={camerasFull} onClick={()=>inviteViewer(p.identity)}>{lang==='es'?'Invitar':'Invite'}</button>
        </div>)}</> : <>
        {requests.filter(r => r.status === 'pending').length === 0 && <p>{tr.noRequests}</p>}
        {requests.filter(r => r.status === 'pending').map(r => <div className="rivyza-v32-request-row" key={r.user_id}>
          <span>👤 {requestNames[r.user_id] || (lang === 'es' ? 'Invitado' : 'Guest')}</span>
          <button type="button" disabled={camerasFull} style={camerasFull?{opacity:0.45,cursor:'not-allowed'}:undefined} onClick={() => onRequestDecision('approve', r.user_id).catch(e=>onError?.(e.message))}>✓ {tr.accept}</button>
          <button type="button" onClick={() => onRequestDecision('reject', r.user_id).catch(e=>onError?.(e.message))}>✕ {tr.reject}</button>
        </div>)}
        </>}
      </div>
    </div>}
    {drawer && <div className="rivyza-v329-drawer-backdrop" onClick={() => setDrawer(false)} aria-hidden="true" />}
    {drawer && <div className="rivyza-live-bottom-drawer rivyza-v32-popover">
      <div className="rivyza-live-drawer-handle" />
      <strong>{tr.options} LIVE</strong>
      {canUseVoiceEffects && <button type="button" onClick={()=>{setDrawer(false);setVoiceEffectsOpen(true);}}>🎙️ {lang==='en'?'Audio effects':'Efectos de audio'}</button>}
      <button type="button" onClick={openInternalShare}>👥 Compartir en RIVYZA</button>
       <button type="button" onClick={shareLive}>🔗 Compartir externamente</button>
      {isHost && <button type="button" onClick={()=>{setDrawer(false);setBackgroundPickerOpen(true);}}>🎨 Personalizar fondo</button>}
      {isHost && <label className="rivyza-live-slot-picker">{tr.slots}: <select value={slots === 14 ? 9 : slots === 13 ? 8 : slots} onChange={e => { const selectedCount = Number(e.target.value); const count = selectedCount === 9 ? 14 : selectedCount === 8 ? 13 : selectedCount; broadcastLayout(positions, count); }}>{[1,2,3,4,5,6,7,8,9,10].map(n => <option key={n} value={n}>{n}</option>)}</select></label>}
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
    <LiveVoiceEffects room={room} enabled={canUseVoiceEffects} open={voiceEffectsOpen && canUseVoiceEffects} onClose={()=>setVoiceEffectsOpen(false)} lang={lang} />
    {backgroundPickerOpen && isHost && typeof document!=='undefined' && createPortal(
      <div className="rivyza-v356-picker-overlay" onClick={()=>setBackgroundPickerOpen(false)}>
        <section className="rivyza-v356-picker" role="dialog" aria-modal="true" aria-label="Personalizar fondo" onClick={e=>e.stopPropagation()}>
          <div className="rivyza-v356-picker-title"><strong>🎨 Personalizar fondo</strong><button type="button" onClick={()=>setBackgroundPickerOpen(false)} aria-label="Cerrar">✕</button></div>
          <p>El fondo se aplica a todos durante este LIVE. Las cámaras no cambian.</p>
          <div className="rivyza-v356-picker-options">{backgroundOptions.map(([value,emoji,label])=><button type="button" key={value} className={liveBackground===value?'selected':''} onClick={()=>chooseBackground(value)}><span>{emoji}</span><span>{label}</span>{liveBackground===value && <span aria-label="Seleccionado">✓</span>}</button>)}</div>
        </section>
      </div>,document.body
    )}
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
            {target.identity === localParticipant.identity && canUseVoiceEffects && <button type="button" onClick={()=>{setTarget(null);setDrawer(false);setVoiceEffectsOpen(true);}}>🎙️ {lang==='en'?'Audio effects':'Efectos de audio'}</button>}
            {target.identity === localParticipant.identity && publish && <>
              <button onClick={flipCamera} disabled={flipping}>{flipping ? "Cambiando cámara…" : "🔄 Voltear cámara"}</button>
              <button type="button" onClick={toggleMirrorCamera} disabled={mirrorBusy} aria-pressed={mirrorEnabled}>↔️ Mirror Camera {mirrorEnabled ? 'ON' : 'OFF'}</button>
              <button onClick={toggleCam}>{cam ? 'Apagar cámara' : 'Encender cámara'}</button>
              <button onClick={toggleMic}>{mic ? 'Silenciar micrófono' : 'Activar micrófono'}</button>
              {(isHost || isModerator) && <button type="button" onClick={()=>{setMoveMode(false);setSelected(null);setMoveTarget(target.identity);setTarget(null)}}>⇄ {lang === 'es' ? 'Mover mi cámara' : 'Move my camera'}</button>}
              {!isHost && <button onClick={()=>{setTarget(null);onLeaveCamera()}}>↓ Bajar a escuchar</button>}
            </>}
            {(isHost || isModerator) && target.identity !== localParticipant.identity && target.identity !== hostId && <>
              {room.remoteParticipants.get(target.identity)?.isMicrophoneEnabled ? <button type="button" onClick={() => applyModeration('mute_guest')}><span className="rivyza-v313-glyph">♩̸</span><span>{lang === 'es' ? 'Silenciar' : 'Mute'}</span></button> : <button type="button" onClick={()=>askMedia(target.identity,'mic')}>🎙 {lang==='es'?'Solicitar activar micrófono':'Request microphone'}</button>}
              {room.remoteParticipants.get(target.identity)?.isCameraEnabled ? <button type="button" onClick={() => applyModeration('camera_off_guest')}><span className="rivyza-v313-glyph">▣̸</span><span>{lang === 'es' ? 'Apagar cámara' : 'Turn off camera'}</span></button> : <button type="button" onClick={()=>askMedia(target.identity,'camera')}>📷 {lang==='es'?'Solicitar activar cámara':'Request camera'}</button>}
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
    {mediaRequest && publish && <div role="dialog" aria-modal="true" style={{position:'fixed',inset:0,zIndex:9999,background:'#0009',display:'grid',placeItems:'center',padding:20}}><div style={{background:'#251a32',color:'white',padding:20,borderRadius:16,maxWidth:340,width:'100%',textAlign:'center'}}><strong>{mediaRequest.kind==='mic'?(lang==='es'?'Activa tu micrófono':'Enable your microphone'):(lang==='es'?'Activa tu cámara':'Enable your camera')}</strong><p>{mediaRequest.from} {lang==='es'?'te solicita que lo actives.':'asks you to enable it.'}</p><div style={{display:'flex',gap:12,justifyContent:'center'}}><button type="button" onClick={()=>respondMedia(false)}>{lang==='es'?'Ahora no':'Not now'}</button><button type="button" onClick={()=>respondMedia(true)}>{lang==='es'?'Activar':'Enable'}</button></div></div></div>}
    <RoomAudioRenderer />
    {!soundReady && <button type="button" className="rivyza-live-enable-audio" onClick={activateAudio}>🔊 {tr.activateAudio}</button>}
  </>;
}

export default function LiveRoom({ supabase, user, onExit, onViewProfile, initialRoomId = null }) {
  useScreenWakeLock(true);
  const enteredRoom = useRef(null);
  const [requestStatus, setRequestStatus] = useState(null);
  const [connectionKey, setConnectionKey] = useState(0);
  const [roomId, setRoomId] = useState(initialRoomId);
  const welcomeVisit = useRef(false);
  const privateVisitId = useRef(null);
  if (!privateVisitId.current) privateVisitId.current = crypto.randomUUID();
  useEffect(()=>{welcomeVisit.current=false; privateVisitId.current=crypto.randomUUID();},[roomId,user?.id]);
  const [session, setSession] = useState(null);
  const [confirmStop, setConfirmStop] = useState(false);
  useEffect(() => { setConfirmStop(false); }, [roomId]);
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
      const result = await api(kind, { roomId, ...payload });
      if (kind === 'invite_accept' || kind === 'moderator_join') await refreshSession(roomId);
      if (kind === 'request') setRequestStatus('pending');
      if (kind === 'cancel_request') setRequestStatus(null);
      if (kind === 'approve' || kind === 'reject') setRequests(r => r.filter(x => x.user_id !== payload.guestId));
      if (kind === 'moderator_add' || kind === 'moderator_remove') await refreshSession(roomId);
      if (kind === 'block_guest') await refreshBlocked();
      // Request confirmation is reflected in the hand control; no banner over the cameras.
      return result;
    } catch (e) { setError(e.message); throw e; }
  }

  // Keep the full LIVE canvas stable while Safari pans its visual viewport.
  useEffect(() => {
    const root = document.querySelector('.rivyza-live-studio');
    const vv = window.visualViewport;
    if (!root || !vv) return;
    let height = root.getBoundingClientRect().height;
    let editing = false;
    let frame = 0;
    const isText = el => root.contains(el) && el.matches?.('input:not([type]), input[type="text"], textarea');
    const update = () => {
      const focused = isText(document.activeElement);
      const obscured = height - vv.height > 100;
      if (!focused && !obscured) {
        editing = false;
        root.classList.remove('rz-live-keyboard');
        height = root.getBoundingClientRect().height;
      } else if (focused || editing) {
        editing = true;
        root.style.setProperty('--rz-live-height', `${height}px`);
        root.style.setProperty('--rz-live-top', `${vv.offsetTop}px`);
        root.style.setProperty('--rz-live-lift', `${Math.max(0, window.innerHeight - vv.height - vv.offsetTop)}px`);
        root.classList.add('rz-live-keyboard');
      }
    };
    const schedule = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(update); };
    const beforeFocus = e => { if (isText(e.target) && !editing) height = root.getBoundingClientRect().height; };
    root.addEventListener('pointerdown', beforeFocus, true);
    root.addEventListener('focusin', schedule);
    root.addEventListener('focusout', schedule);
    vv.addEventListener('resize', schedule);
    vv.addEventListener('scroll', schedule);
    window.addEventListener('resize', schedule);
    return () => { cancelAnimationFrame(frame); root.classList.remove('rz-live-keyboard'); root.removeEventListener('pointerdown', beforeFocus, true); root.removeEventListener('focusin', schedule); root.removeEventListener('focusout', schedule); vv.removeEventListener('resize', schedule); vv.removeEventListener('scroll', schedule); window.removeEventListener('resize', schedule); };
  }, []);
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
.rivyza-live-avatar-fallback{container-type:size}
.rivyza-live-avatar-fallback>img,.rivyza-live-avatar-fallback>span{width:min(80px,76cqw,76cqh)!important;height:min(80px,76cqw,76cqh)!important;max-width:none!important;max-height:none!important;aspect-ratio:1/1;border-radius:50%;flex-shrink:0;object-fit:cover;align-items:center;justify-content:center}
.rivyza-live-avatar-fallback>span{display:flex;background:#483251}
.rivyza-live-avatar-fallback>span[style*="display: none"]{display:none}
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
.rivyza-live-studio.rz-live-keyboard{position:fixed!important;top:var(--rz-live-top,0px)!important;bottom:auto!important;height:var(--rz-live-height)!important;min-height:var(--rz-live-height)!important;max-height:var(--rz-live-height)!important;overflow:hidden!important}
.rz-live-keyboard .rivyza-v32-toolbar{bottom:calc(var(--rz-live-lift,0px) + 6px)!important}
.rz-live-keyboard .rz-live-note-panel{bottom:calc(var(--rz-live-lift,0px) + 76px)!important}

.rivyza-live-header-center{display:flex!important;flex-wrap:nowrap;align-items:center;justify-content:center;column-gap:5px;white-space:nowrap}
.rivyza-live-header-center{pointer-events:auto!important;position:relative;z-index:101!important}
.rivyza-v366-like-trigger{pointer-events:auto!important;user-select:none;-webkit-tap-highlight-color:transparent;touch-action:manipulation}
/* v3.69: Restore readable counter sizes without moving them from the header. */
.rivyza-live-top.rivyza-v32-header{position:relative!important;isolation:isolate}
.rivyza-live-top .rivyza-v368-counters{position:absolute!important;right:8px!important;top:50%!important;left:auto!important;bottom:auto!important;transform:translateY(-50%)!important;display:flex!important;flex-direction:row!important;align-items:center!important;justify-content:flex-end!important;gap:5px!important;z-index:110!important;white-space:nowrap!important;width:auto!important;max-width:158px!important;pointer-events:auto!important}
.rivyza-live-top .rivyza-v368-counters button{position:static!important;inset:auto!important;transform:none!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;flex:none!important;gap:4px!important;width:auto!important;min-width:0!important;max-width:none!important;height:32px!important;min-height:32px!important;margin:0!important;padding:2px 3px!important;border:0!important;border-radius:7px!important;background:transparent!important;color:#fff!important;font-size:13px!important;line-height:18px!important;font-weight:600!important;box-shadow:none!important;white-space:nowrap!important;vertical-align:middle!important}
.rivyza-live-top .rivyza-v368-counters svg{display:block!important;flex:none!important;width:17px!important;height:17px!important}
.rivyza-live-top .rivyza-v368-counters span{display:inline!important;position:static!important;font-size:13px!important;line-height:18px!important;white-space:nowrap!important}
.rivyza-live-top .rivyza-v368-counters .rivyza-v368-like-trigger{cursor:pointer!important}
.rivyza-live-top .rivyza-live-header-center{position:absolute!important;left:50%!important;top:50%!important;transform:translate(-50%,-50%)!important;margin:0!important;white-space:nowrap!important}
/* v3.70: Slightly larger centered RIVYZA LIVE title; preserve counters and camera layout. */
.rivyza-live-top .rivyza-live-header-center{font-size:clamp(20px,5.5vw,25px)!important;line-height:1.15!important;letter-spacing:-.35px!important}
.rivyza-live-top .rivyza-live-header-center span{font-size:.78em!important;line-height:1.2!important}
@media(max-width:390px){.rivyza-live-top .rivyza-live-header-center{font-size:20px!important}}
@media(max-width:390px){.rivyza-live-top .rivyza-v368-counters{right:5px!important;gap:3px!important}.rivyza-live-top .rivyza-v368-counters button{font-size:12px!important;padding:2px!important}.rivyza-live-top .rivyza-v368-counters span{font-size:12px!important}}
.rivyza-v344-like-counter{display:flex;flex-basis:auto;justify-content:center;align-items:center;gap:4px;font-size:10px;font-weight:600;line-height:13px;color:#f3d6ff;white-space:nowrap}
.rivyza-v344-like-zone{position:fixed;right:19px;bottom:calc(169px + env(safe-area-inset-bottom));width:58px;height:65px;box-sizing:border-box;z-index:90;touch-action:manipulation;user-select:none;-webkit-user-select:none;display:flex;align-items:center;justify-content:center;cursor:pointer}
.rivyza-v344-like-hint{font-size:10px;line-height:12px;padding:5px 3px;color:#f4d9ff;background:#251b36e8;border:1px solid #ffffff66;border-radius:14px;pointer-events:none;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;width:58px;height:65px;box-sizing:border-box;white-space:nowrap}
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
    <style>{`/* RIVYZA v3.55: error discreto; el error sigue visible y disponible en title. */
.rivyza-live-stage .rivyza-v355-toast {
  top: calc(75px + env(safe-area-inset-top)) !important;
  left: auto !important;
  right: 10px !important;
  width: max-content !important;
  max-width: min(220px, 55vw) !important;
  min-height: 0 !important;
  max-height: 48px !important;
  padding: 5px 7px 5px 9px !important;
  border-radius: 9px !important;
  background: rgba(20, 15, 30, .88) !important;
  border: 1px solid rgba(255,255,255,.14) !important;
  box-shadow: 0 2px 10px rgba(0,0,0,.20) !important;
  font-size: 11px !important;
  line-height: 1.25 !important;
  overflow: hidden !important;
  pointer-events: auto !important;
}
.rivyza-live-stage .rivyza-v355-toast span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.rivyza-live-stage .rivyza-v355-toast button { padding: 0 2px !important; font-size: 14px !important; }
`}</style>
    <header className="rivyza-live-top rivyza-v32-header"><button type="button" onClick={roomId && session?.host ? () => setConfirmStop(true) : roomId ? leave : onExit} style={roomId && session?.host ? {color:'#ff7474',fontSize:11,fontWeight:700,padding:'4px 3px',whiteSpace:'nowrap'} : undefined}>{roomId && session?.host ? `⏻ ${translations[lang].end}` : roomId ? translations[lang].leaveLive : (lang === 'es' ? '← Volver' : '← Back')}</button><strong className="rivyza-live-header-center">RIVYZA <span>LIVE</span></strong></header>
    {error && <div className="rivyza-v32-toast rivyza-v355-toast" role="status" title={error}><span>{/^load failed$/i.test(error.trim()) ? "No se pudo cargar" : error}</span><button type="button" onClick={() => setError('')} aria-label="Cerrar aviso">✕</button></div>}
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
        }} connect={true} options={LIVE_AUDIO_ROOM_OPTIONS} audio={session.publish ? LIVE_AUDIO_CAPTURE : false} video={session.publish && session.host} onError={e => setError(e.message)}>
        <CameraGrid confirmStop={confirmStop} setConfirmStop={setConfirmStop} publish={session.publish} isHost={session.host} hostId={session.hostId} isModerator={session.moderator} moderatorIds={session.moderatorIds} onModerate={action} onStop={stopLive} onLeaveCamera={leaveCamera} onLeaveLive={leave} onError={setError} onViewProfile={onViewProfile} blockedUsers={blockedUsers} onUnblock={unblock} onRefreshBlocked={refreshBlocked} onRequest={()=>action("request")} requests={requests} requestsOpen={requestsOpen} setRequestsOpen={setRequestsOpen} onRequestDecision={(kind, guestId) => action(kind, {guestId})} requestNames={requestNames} requestStatus={requestStatus} supabase={supabase} onCancelRequest={()=>action('cancel_request')} lang={lang} user={user} liveRoomId={roomId} welcomeVisit={welcomeVisit} privateVisitId={privateVisitId} welcomeMessage={session.host && welcomeEnabled ? welcomeMessage : ""} />
      </LiveKitRoom> : <p>Conectando cámaras…</p>}

    </section>}
  </main>;
}
