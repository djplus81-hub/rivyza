"use client";
import { createPortal } from "react-dom";
import {useEffect,useMemo,useState,useCallback,useRef} from "react";
import {createClient} from "@supabase/supabase-js";
import Cropper from "react-easy-crop";
import LiveRoom from "./LiveRoom";
import LivePreviewPlayer from "./LivePreviewPlayer";
import {
  Home, Radio, Plus, Bell, User, Heart, MessageCircle, Share2, Search, UserRoundPlus, UserRoundMinus,
  AtSign, Save, LogOut, Camera, X, Check, Music2, MoreHorizontal, ShieldCheck, Lock, Ban, MessageSquare, Users, Languages, Moon, RefreshCw, Link as LinkIcon, Youtube, Instagram, Facebook, Grid3X3, Mic, Square, Play, Pause, Trash2, Send
} from "lucide-react";

function createImage(url){return new Promise((resolve,reject)=>{const i=new Image();i.addEventListener("load",()=>resolve(i));i.addEventListener("error",reject);i.setAttribute("crossOrigin","anonymous");i.src=url;});}
async function getCroppedBlob(src,pixelCrop){
  const image=await createImage(src),canvas=document.createElement("canvas"),size=768;
  canvas.width=size;canvas.height=size;
  const ctx=canvas.getContext("2d");
  ctx.drawImage(image,pixelCrop.x,pixelCrop.y,pixelCrop.width,pixelCrop.height,0,0,size,size);
  return new Promise(resolve=>canvas.toBlob(blob=>resolve(blob),"image/jpeg",0.88));
}


function AmigosIcon(){
  return (
    <svg className="amigos-icon" viewBox="0 0 32 32" aria-hidden="true">
      <defs>
        <linearGradient id="amigosArc" x1="4" y1="0" x2="28" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#16d9ff"/>
          <stop offset="48%" stopColor="#a93cff"/>
          <stop offset="76%" stopColor="#ff3ca6"/>
          <stop offset="100%" stopColor="#ffd84a"/>
        </linearGradient>
      </defs>
      <path d="M7 14.2C9.4 5.8 22.6 5.8 25 14.2" fill="none" stroke="url(#amigosArc)" strokeWidth="3.2" strokeLinecap="round"/>
      <circle cx="7" cy="16" r="3.25" fill="#20d7ff"/>
      <circle cx="25" cy="16" r="3.25" fill="#ff45c5"/>
      <path d="M2.8 27c.2-4.1 2-6.2 4.2-6.2s4 2.1 4.2 6.2" fill="#20d7ff"/>
      <path d="M20.8 27c.2-4.1 2-6.2 4.2-6.2s4 2.1 4.2 6.2" fill="#ff45c5"/>
    </svg>
  );
}

function formatPostDateTime(value){
  if(!value) return "";
  const d=new Date(value);
  if(Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("es-US",{
    day:"numeric", month:"short", year:"numeric",
    hour:"numeric", minute:"2-digit", hour12:true
  });
}


const RIVYZA_EN={"Eliminar para mí":"Delete for me","Eliminar para todos":"Delete for everyone","¿Eliminar este mensaje para todos?":"Delete this message for everyone?","Solo puedes eliminar para todos tus mensajes durante los primeros 3 minutos.":"You can delete your messages for everyone only within the first 3 minutes.","No se pudo eliminar para todos.":"Could not delete for everyone.","Eliminar":"Delete","¿Eliminar este mensaje solo para ti?":"Delete this message only for you?","No se pudo eliminar el mensaje. Ejecuta el SQL de esta actualización en Supabase.":"Unable to delete the message. Run this update’s SQL in Supabase.","Seguridad y contraseña":"Security & password","Información de cuenta":"Account information","Cuenta privada":"Private account","Cuentas bloqueadas":"Blocked accounts","Estado en línea":"Online status","Quién puede enviarme mensajes":"Who can message me","Todos":"Everyone","Nadie":"Nobody","Solo personas que se siguen mutuamente.":"Only people who follow each other.","Cualquier usuario puede enviarte mensajes.":"Anyone can message you.","Nadie puede enviarte mensajes nuevos.":"Nobody can send you new messages.","Quién puede comentar":"Who can comment","Cualquiera puede comentar tus publicaciones.":"Anyone can comment on your posts.","Solo tus amigos pueden comentar.":"Only mutual followers can comment.","Nadie puede comentar tus publicaciones.":"Nobody can comment on your posts.","Menciones y etiquetas":"Mentions & tags","Publicaciones que me gustan":"Liked posts","Lista de seguidos":"Following list","Apariencia":"Appearance","Preferencias de notificaciones":"Notification preferences","Cambiar de cuenta":"Switch account","Próximamente":"Coming soon","Ver perfil":"View profile","Enlace copiado":"Link copied","Cuenta":"Account","Compartir perfil":"Share profile","Preferencias":"Preferences","Notificaciones":"Notifications","Sesión":"Session","Cerrar sesión":"Log out","¿Quieres cerrar sesión?":"Do you want to log out?","Inicio": "Home", "Amigos": "Friends", "Alertas": "Notifications", "Perfil": "Profile", "Para ti": "For You", "Conexiones": "Connections", "Todos los usuarios": "All users", "Comunidad": "Community", "Buscar conexiones": "Search connections", "Buscar usuarios": "Search users", "Siguiendo": "Following", "Seguidores": "Followers", "Te sigue": "Follows you", "Seguir": "Follow", "Enviar mensaje": "Send message", "Editar perfil": "Edit profile", "Me gusta": "Liked posts", "Privacidad": "Privacy", "Configuración y privacidad": "Settings & privacy", "Mostrar cuando estoy en línea": "Show when I am online", "Cuando esté desactivado, nadie verá tu punto verde.": "When disabled, nobody will see your green dot.", "Esta opción guarda tu preferencia. Cuando actives esta opción, tus conexiones podrán ver tu punto verde mientras estés en línea.": "Your preference is saved. When enabled, others can see your green dot while you are online.", "Actividad y seguidores": "Activity & followers", "Mensajes": "Messages", "Buscar personas para enviar un mensaje": "Find people to message", "Buscar personas": "Find people", "Ver todos ›": "See all ›", "Publicación": "Post", "Compartir": "Share", "Más": "More", "Publicar": "Post", "Publicando…": "Posting…", "Guardar": "Save", "Cancelar": "Cancel", "Eliminar": "Delete", "Volver": "Back", "Cerrar": "Close", "Foto": "Photo", "Video": "Video", "Fotos": "Photos", "Videos": "Videos", "Buscar": "Search", "Nombre": "Name", "Usuario": "User", "Usuarios registrados": "Registered users", "En línea": "Online", "Solo tú puedes ver las publicaciones a las que les has dado like.": "Only you can see the posts you have liked.", "Tus fotos y videos aparecerán aquí": "Your photos and videos will appear here", "Aún no has dado me gusta a ninguna publicación.": "You have not liked any posts yet.", "Cargando tus me gusta…": "Loading your liked posts…", "No se pudieron cargar tus me gusta.": "Could not load your liked posts.", "Idioma de la aplicación": "App language", "Idioma": "Language", "Español": "Spanish", "Inglés": "English", "Configuración": "Settings", "Continuar con Google": "Continue with Google", "Escribe un mensaje…": "Write a message…", "Enviar": "Send", "Amigos, personas que sigues y personas que te siguen.": "Friends, people you follow, and people who follow you.", "No hay resultados.": "No results.", "No hay usuarios.": "No users.", "Comentarios": "Comments", "Comentar": "Comment", "Publicaciones": "Posts", "Cambiar idioma": "Change language", "Mis me gusta": "My liked posts", "Quién puede ver mis Me gusta":"Who can see my likes", "Solo mis amigos pueden ver las publicaciones que me gustan.":"Only my friends can see posts I like.", "Cualquier usuario puede ver las publicaciones que me gustan.":"Anyone can see posts I like.", "Nadie más puede ver las publicaciones que me gustan.":"Only you can see posts you like.", "Solo yo": "Only me", "No hay conexiones.": "No connections."};

export default function HomePage(){
  const countryCodes=["AD","AE","AF","AG","AI","AL","AM","AO","AQ","AR","AS","AT","AU","AW","AX","AZ","BA","BB","BD","BE","BF","BG","BH","BI","BJ","BL","BM","BN","BO","BQ","BR","BS","BT","BV","BW","BY","BZ","CA","CC","CD","CF","CG","CH","CI","CK","CL","CM","CN","CO","CR","CU","CV","CW","CX","CY","CZ","DE","DJ","DK","DM","DO","DZ","EC","EE","EG","EH","ER","ES","ET","FI","FJ","FK","FM","FO","FR","GA","GB","GD","GE","GF","GG","GH","GI","GL","GM","GN","GP","GQ","GR","GS","GT","GU","GW","GY","HK","HM","HN","HR","HT","HU","ID","IE","IL","IM","IN","IO","IQ","IR","IS","IT","JE","JM","JO","JP","KE","KG","KH","KI","KM","KN","KP","KR","KW","KY","KZ","LA","LB","LC","LI","LK","LR","LS","LT","LU","LV","LY","MA","MC","MD","ME","MF","MG","MH","MK","ML","MM","MN","MO","MP","MQ","MR","MS","MT","MU","MV","MW","MX","MY","MZ","NA","NC","NE","NF","NG","NI","NL","NO","NP","NR","NU","NZ","OM","PA","PE","PF","PG","PH","PK","PL","PM","PN","PR","PS","PT","PW","PY","QA","RE","RO","RS","RU","RW","SA","SB","SC","SD","SE","SG","SH","SI","SJ","SK","SL","SM","SN","SO","SR","SS","ST","SV","SX","SY","SZ","TC","TD","TF","TG","TH","TJ","TK","TL","TM","TN","TO","TR","TT","TV","TW","TZ","UA","UG","UM","US","UY","UZ","VA","VC","VE","VG","VI","VN","VU","WF","WS","YE","YT","ZA","ZM","ZW"];
  const regionNames=useMemo(()=>new Intl.DisplayNames(["es"],{type:"region"}),[]);
  const flagFromCode=(code)=>{
    if(!code || code.length!==2) return "";
    return [...code.toUpperCase()]
      .map(char=>String.fromCodePoint(127397 + char.charCodeAt()))
      .join("");
  };
  const countryOptions=useMemo(()=>countryCodes
    .map(code=>({code,name:regionNames.of(code)||code,flag:flagFromCode(code)}))
    .sort((a,b)=>a.name.localeCompare(b.name,"es")),[regionNames]);

  const supabase=useMemo(()=>{
    const u=process.env.NEXT_PUBLIC_SUPABASE_URL,k=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    return u&&k?createClient(u,k,{
      auth:{
        persistSession:true,
        autoRefreshToken:true,
        detectSessionInUrl:true
      }
    }):null;
  },[]);

  // Cuenta seleccionada: cada sesión se guarda en el navegador de este dispositivo.
  // Nunca guardar contraseñas; Supabase administra los tokens y su renovación.
  const ACCOUNTS_KEY="rivyza-device-accounts-v1";
  const ACTIVE_KEY="rivyza-device-active-v1";
  const AUTH_KEY=`sb-${(process.env.NEXT_PUBLIC_SUPABASE_URL||"").split("//").pop().split(".")[0]}-auth-token`;
  const [savedAccounts,setSavedAccounts]=useState([]);
  const [accountBusy,setAccountBusy]=useState(false);
  const [accountError,setAccountError]=useState("");
  const readAccounts=()=>{try{return JSON.parse(localStorage.getItem(ACCOUNTS_KEY)||"[]").filter(a=>a&&a.id&&a.session);}catch{return [];}};
  const rememberAccount=(session)=>{
    if(!session?.user?.id||!session?.refresh_token)return;
    try{
      const existing=readAccounts();
      const u=session.user;
      const entry={id:u.id,name:u.user_metadata?.full_name||u.user_metadata?.name||u.email?.split("@")[0]||"Cuenta",email:u.email||"",avatar:u.user_metadata?.avatar_url||u.user_metadata?.picture||"",session};
      const updated=[...existing.filter(a=>a.id!==u.id),entry].slice(-5);
      localStorage.setItem(ACCOUNTS_KEY,JSON.stringify(updated));
      localStorage.setItem(ACTIVE_KEY,u.id);
      setSavedAccounts(updated);
    }catch(e){console.warn("No se pudo recordar cuenta",e);}
  };
  useEffect(()=>{
    setSavedAccounts(readAccounts());
    if(!supabase)return;
    supabase.auth.getSession().then(({data})=>{if(data?.session)rememberAccount(data.session);});
    const {data}=supabase.auth.onAuthStateChange((event,session)=>{
      if(session && ["SIGNED_IN","TOKEN_REFRESHED","USER_UPDATED","INITIAL_SESSION"].includes(event))rememberAccount(session);
    });
    return()=>data.subscription.unsubscribe();
  },[supabase]);
  async function switchSavedAccount(item){
    if(!supabase||accountBusy)return;
    setAccountBusy(true);setAccountError("");
    try{
      const {data,error}=await supabase.auth.setSession({access_token:item.session.access_token,refresh_token:item.session.refresh_token});
      if(error||data?.user?.id!==item.id)throw error||new Error("No se pudo verificar esta cuenta");
      rememberAccount(data.session);
      // Reiniciar estado de perfiles, mensajes y suscripciones de la cuenta anterior.
      window.location.reload();
    }catch(e){setAccountError("La sesión de esta cuenta venció. Agrégala nuevamente iniciando sesión.");setAccountBusy(false);}
  }
  async function addSavedAccount(){
    if(accountBusy)return;
    try{
      const {data}=await supabase.auth.getSession();
      if(data?.session)rememberAccount(data.session);
      // Salir de la sesión activa del navegador sin revocar las sesiones guardadas.
      localStorage.removeItem(AUTH_KEY);
      localStorage.removeItem(ACTIVE_KEY);
      window.location.reload();
    }catch(e){setAccountError("No se pudo abrir el inicio de sesión.");}
  }
  function removeSavedAccount(item){
    if(item.id===user?.id){setAccountError("Para quitar la cuenta activa, primero cambia a otra cuenta.");return;}
    const updated=readAccounts().filter(a=>a.id!==item.id);
    localStorage.setItem(ACCOUNTS_KEY,JSON.stringify(updated));setSavedAccounts(updated);
  }
  const [appLanguage,setAppLanguage]=useState("es");
  useEffect(()=>{try{setAppLanguage(localStorage.getItem("rivyza-language")==="en"?"en":"es");}catch(e){}},[]);
  const changeAppLanguage=(value)=>{setAppLanguage(value);try{localStorage.setItem("rivyza-language",value);}catch(e){}};
  const t=(value)=>appLanguage==="en"?(RIVYZA_EN[value]||value):value;
  useEffect(()=>{if(typeof document!=="undefined")document.documentElement.lang=appLanguage;},[appLanguage]);
  const [likedPosts,setLikedPosts]=useState([]);
  const [likedPostsLoading,setLikedPostsLoading]=useState(false);
  const [likedPostsError,setLikedPostsError]=useState("");
  const [socialNotices,setSocialNotices]=useState([]);
  const [socialMessages,setSocialMessages]=useState([]);
  const [hiddenMessageIds,setHiddenMessageIds]=useState([]);
  const [conversationCutoffs,setConversationCutoffs]=useState({});
  const [swipedConversationId,setSwipedConversationId]=useState(null);
  const [privatePeers,setPrivatePeers]=useState([]);
  const [privateUnlocked,setPrivateUnlocked]=useState(false);
  const [privatePin,setPrivatePin]=useState("");
  const [privateConfirm,setPrivateConfirm]=useState("");
  const [privateMode,setPrivateMode]=useState("unlock");
  const [privateStatus,setPrivateStatus]=useState({configured:false,locked_until:null});
  const [privateError,setPrivateError]=useState("");
  const [privateSwipeId,setPrivateSwipeId]=useState(null);
  const conversationSwipeStartRef=useRef(null);
  const [swipedMessageId,setSwipedMessageId]=useState(null);
  const swipeStartRef=useRef(null);
  const [socialPeer,setSocialPeer]=useState(null);
  // Compartir v13.19.26: estado independiente del visor y de los mensajes.
  const [sharePost,setSharePost]=useState(null);
  const [sharePeople,setSharePeople]=useState([]);
  const [shareSearch,setShareSearch]=useState("");
  const [shareSelected,setShareSelected]=useState([]);
  const [shareLoading,setShareLoading]=useState(false);
  const [shareSending,setShareSending]=useState(false);
  const [shareError,setShareError]=useState("");
  const [shareSuccess,setShareSuccess]=useState("");
  const sharePrivate=sharePost?.visibility && sharePost.visibility!=="public";
  const shareUrl=sharePost?.id && typeof window!=="undefined"?`${window.location.origin}/?post=${encodeURIComponent(sharePost.id)}`:"";

  const [socialChatReturnView,setSocialChatReturnView]=useState("alerts");
  const [socialInboxReturnView,setSocialInboxReturnView]=useState("alerts");
  const [profileReturnToChat,setProfileReturnToChat]=useState(false);
  const [settingsSheet,setSettingsSheet]=useState("");
  const [communityPrivacy,setCommunityPrivacy]=useState({followers:"everyone",following:"only_me",mentions:"everyone"});
  const [communityPrivacyError,setCommunityPrivacyError]=useState("");
  const [reportTarget,setReportTarget]=useState(null);
  const [reportReason,setReportReason]=useState("harassment");
  const [reportDetails,setReportDetails]=useState("");
  const [reportBusy,setReportBusy]=useState(false);
  const [reportFeedback,setReportFeedback]=useState("");
  const [helpQuery,setHelpQuery]=useState("");
  const [messagePrivacy,setMessagePrivacy]=useState("everyone");
  const [messagePrivacyBusy,setMessagePrivacyBusy]=useState(false);
  const [messagePrivacyError,setMessagePrivacyError]=useState("");
  const [commentPrivacy,setCommentPrivacy]=useState("everyone");
  const [likesPrivacy,setLikesPrivacy]=useState("only_me");
  const [likesPrivacyBusy,setLikesPrivacyBusy]=useState(false);
  const [likesPrivacyError,setLikesPrivacyError]=useState("");
  const [viewedLikedPosts,setViewedLikedPosts]=useState([]);
  const [viewedLikesAllowed,setViewedLikesAllowed]=useState(false);
  const [viewedLikesLoading,setViewedLikesLoading]=useState(false);
  const [viewedProfileTab,setViewedProfileTab]=useState("posts");
  const [commentPrivacyBusy,setCommentPrivacyBusy]=useState(false);
  const [commentPrivacyError,setCommentPrivacyError]=useState("");
  const [postCommentPrivacy,setPostCommentPrivacy]=useState("everyone");
  const [blockedUsers,setBlockedUsers]=useState([]);
  const [blockedProfiles,setBlockedProfiles]=useState({});
  const [blockedProfilesLoading,setBlockedProfilesLoading]=useState(false);
  const [liveBellIds,setLiveBellIds]=useState([]);
  const [discoverLiveRooms,setDiscoverLiveRooms]=useState([]);
  const [discoverLiveError,setDiscoverLiveError]=useState('');
  const [selectedLiveRoom,setSelectedLiveRoom]=useState(null);
  const [liveFriendIds,setLiveFriendIds]=useState([]);
  const [activeLivePreview,setActiveLivePreview]=useState(0);
  const [livePreviewInvite,setLivePreviewInvite]=useState(false);
  const [view,setView]=useState("home"); const [profileTab,setProfileTab]=useState("posts");
  useEffect(()=>{
    if(view!=="livePreview" || !supabase || !user?.id)return;
    let cancelled=false;
    const load=async()=>{
      const [out,incoming]=await Promise.all([
        supabase.from('follows').select('following_id').eq('follower_id',user.id),
        supabase.from('follows').select('follower_id').eq('following_id',user.id)
      ]);
      if(out.error||incoming.error)return;
      const mutual=new Set((incoming.data||[]).map(r=>r.follower_id));
      if(!cancelled)setLiveFriendIds((out.data||[]).map(r=>r.following_id).filter(id=>mutual.has(id)));
    };load();return()=>{cancelled=true};
  },[view,supabase,user?.id]);
  useEffect(()=>{
    if(view!=="livePreview" || !discoverLiveRooms.length)return;
    setLivePreviewInvite(false);
    const timeout=setTimeout(()=>setLivePreviewInvite(true),15000);
    return()=>clearTimeout(timeout);
  },[view,activeLivePreview,discoverLiveRooms.length]);
  useEffect(()=>{
    if(view!=="livePreview" || !supabase || !user?.id)return;
    let active=true;
    const refresh=async()=>{
      try{
        const {data}=await supabase.auth.getSession();
        if(!data.session)return;
        const response=await fetch('/api/live',{headers:{Authorization:`Bearer ${data.session.access_token}`},cache:'no-store'});
        const payload=await response.json();
        if(!response.ok)throw new Error(payload.error||'No se pudieron cargar los LIVE');
        if(active){setDiscoverLiveRooms(payload.rooms||[]);setDiscoverLiveError('');}
      }catch(e){if(active)setDiscoverLiveError(e.message||'No se pudieron cargar los LIVE');}
    };
    refresh();const timer=setInterval(refresh,8000);
    return()=>{active=false;clearInterval(timer);};
  },[view,supabase,user?.id]);

  const [privateAccount,setPrivateAccount]=useState(false);
  const [appearance,setAppearance]=useState("dark");
  const [settingsError,setSettingsError]=useState("");
  const [phoneCountry,setPhoneCountry]=useState("US");
  const [phoneNumber,setPhoneNumber]=useState("");
  const [phoneOtp,setPhoneOtp]=useState("");
  const [phoneStage,setPhoneStage]=useState("number");
  const [phoneBusy,setPhoneBusy]=useState(false);
  const [phoneError,setPhoneError]=useState("");
  const [passwordEmail,setPasswordEmail]=useState("");
  useEffect(()=>{try{const saved=localStorage.getItem("rivyza-appearance");setAppearance(["dark","light","auto"].includes(saved)?saved:"dark");}catch(e){}},[]);
  useEffect(()=>{if(typeof document!=="undefined")document.documentElement.dataset.rivyzaAppearance=appearance;},[appearance]);
  const changeAppearance=(next)=>{setAppearance(next);try{localStorage.setItem("rivyza-appearance",next);}catch(e){}};
  const dialingCodes={US:"1",DO:"1",PR:"1",CA:"1",MX:"52",CO:"57",ES:"34",AR:"54",BR:"55",CL:"56",PE:"51",VE:"58",EC:"593",GB:"44",FR:"33",DE:"49",IT:"39",IN:"91",PK:"92",ID:"62",PH:"63",AU:"61",JP:"81",KR:"82",NG:"234",ZA:"27",HT:"509",JM:"1",PA:"507",CR:"506",GT:"502",SV:"503",HN:"504",NI:"505",CU:"53",UY:"598",PY:"595",BO:"591"};
  const e164Phone=()=>"+"+(dialingCodes[phoneCountry]||"")+phoneNumber.replace(/\D/g,"").replace(/^0+/,"");
  async function requestPhoneOtp(){if(!supabase)return;setPhoneError("");if(!dialingCodes[phoneCountry]){setPhoneError("Selecciona un país con prefijo configurado.");return;}if(phoneNumber.replace(/\D/g,"").length<6){setPhoneError("Escribe un número válido.");return;}setPhoneBusy(true);try{const {error}=await supabase.auth.signInWithOtp({phone:e164Phone()});if(error)throw error;setPhoneStage("otp");}catch(e){setPhoneError(e.message||"No se pudo enviar el código SMS.");}finally{setPhoneBusy(false);}}
  async function verifyPhoneOtp(){setPhoneError("");setPhoneBusy(true);try{const {error}=await supabase.auth.verifyOtp({phone:e164Phone(),token:phoneOtp.trim(),type:"sms"});if(error)throw error;}catch(e){setPhoneError(e.message||"Código incorrecto.");}finally{setPhoneBusy(false);}}
  async function loadSafetySettings(){if(!supabase||!user?.id)return;const [blocks,bells,priv]=await Promise.all([supabase.from("rivyza_user_blocks").select("blocked_id").eq("blocker_id",user.id),supabase.from("rivyza_live_alerts").select("creator_id").eq("subscriber_id",user.id),supabase.from("rivyza_account_preferences").select("is_private").eq("user_id",user.id).maybeSingle()]);if(!blocks.error)setBlockedUsers((blocks.data||[]).map(x=>x.blocked_id));if(!bells.error)setLiveBellIds((bells.data||[]).map(x=>x.creator_id));if(!priv.error)setPrivateAccount(!!priv.data?.is_private);}
  async function setBlocked(target,block){if(!user?.id||!target||target===user.id)return;setSettingsError("");try{if(block){const {error}=await supabase.from("rivyza_user_blocks").insert({blocker_id:user.id,blocked_id:target});if(error)throw error;setBlockedUsers(v=>[...new Set([...v,target])]);setIsFollowingViewed(false);}else{const {error}=await supabase.from("rivyza_user_blocks").delete().eq("blocker_id",user.id).eq("blocked_id",target);if(error)throw error;setBlockedUsers(v=>v.filter(id=>id!==target));}}catch(e){setSettingsError("No se pudo actualizar el bloqueo. Revisa el SQL de esta versión. "+(e.message||""));alert("No se pudo actualizar el bloqueo. Verifica el SQL de la actualización.");}}
  async function toggleLiveBell(target){if(!user?.id||!target)return;const on=liveBellIds.includes(target);const q=supabase.from("rivyza_live_alerts");const {error}=on?await q.delete().eq("subscriber_id",user.id).eq("creator_id",target):await q.insert({subscriber_id:user.id,creator_id:target});if(error){alert("Falta configurar avisos de LIVE en Supabase.");return;}setLiveBellIds(v=>on?v.filter(id=>id!==target):[...v,target]);}
  async function togglePrivateAccount(on){const {error}=await supabase.from("rivyza_account_preferences").upsert({user_id:user.id,is_private:on},{onConflict:"user_id"});if(error){alert("Falta configurar privacidad en Supabase.");return;}setPrivateAccount(on);if(on&&onlinePreference)await saveOnlinePreference(false);}
  async function sendPasswordReset(){const email=passwordEmail.trim()||user?.email;if(!email){setSettingsError("Escribe tu correo electrónico.");return;}const {error}=await supabase.auth.resetPasswordForEmail(email,{redirectTo:window.location.origin});setSettingsError(error?error.message:"Se envió un enlace de recuperación, si el correo está registrado.");}

  const [socialDraft,setSocialDraft]=useState("");
  const [voiceStage,setVoiceStage]=useState("idle");
  const [voiceSeconds,setVoiceSeconds]=useState(0);
  const [voiceBlob,setVoiceBlob]=useState(null);
  const [voiceUrl,setVoiceUrl]=useState("");
  const [voiceSending,setVoiceSending]=useState(false);
  const [voicePreviewPlaying,setVoicePreviewPlaying]=useState(false);
  const [voicePreviewTime,setVoicePreviewTime]=useState(0);
  const [voicePreviewDuration,setVoicePreviewDuration]=useState(0);
  const voicePreviewRef=useRef(null);
  const [voicePlayingId,setVoicePlayingId]=useState(null);
  const [voiceProgress,setVoiceProgress]=useState({});
  const [voiceLevels,setVoiceLevels]=useState(Array(26).fill(5));
  const voiceAudioContextRef=useRef(null);
  const voiceAnalyserRef=useRef(null);
  const voiceRecorderRef=useRef(null);
  const voiceStreamRef=useRef(null);
  const voiceChunksRef=useRef([]);
  const voiceStartedRef=useRef(0);
  const voiceTimerRef=useRef(null);
  const voiceAudioRef=useRef(null);
  const voiceStoppingRef=useRef(false);
  const [voiceLinks,setVoiceLinks]=useState({});
  const [socialBusy,setSocialBusy]=useState(false);
  const [socialError,setSocialError]=useState("");
  const [onlinePreference,setOnlinePreference]=useState(false);
  const [onlineIds,setOnlineIds]=useState([]);
  const onlineDot=(id)=>id&&id!==user?.id&&onlineIds.includes(id)?<span className="rivyza-online-dot" title={t("En línea")} aria-label={t("En línea")}/>:null;

  const socialPollBusy=useRef(false);
  const socialThreadRef=useRef(null);
  const unreadSocial=socialNotices.filter(n=>!n.read_at).length;
  const [user,setUser]=useState(null);
  // Moderación: las acciones reales se autorizan en funciones SQL, nunca por este botón.
  const [adminOwner,setAdminOwner]=useState(false);
  const [adminPanel,setAdminPanel]=useState(false);
  const [adminTarget,setAdminTarget]=useState(null);
  const [adminStrikes,setAdminStrikes]=useState([]);
  const [adminLiveStatus,setAdminLiveStatus]=useState(null);
  const [adminSuspended,setAdminSuspended]=useState([]);
  const [adminCases,setAdminCases]=useState([]);
  const [adminReason,setAdminReason]=useState("");
  const [adminReply,setAdminReply]=useState("");
  const [adminBusy,setAdminBusy]=useState(false);
  const [adminError,setAdminError]=useState("");
  const [adminInbox,setAdminInbox]=useState(false);
  const [adminUnread,setAdminUnread]=useState(0);
  const [myInfractions,setMyInfractions]=useState([]);
  const [publicStrikeCount,setPublicStrikeCount]=useState(0);
  const [moderationLoadError,setModerationLoadError]=useState("");
  const [appealDrafts,setAppealDrafts]=useState({});
  const [adminNotice,setAdminNotice]=useState([]);
  async function adminRpc(fn,args={}){const {data,error}=await supabase.rpc(fn,args);if(error)throw error;return data;}
  async function adminRefresh(target=adminTarget){
    if(!supabase||!target?.id)return;
    const [strikes,cases]=await Promise.all([adminRpc("rivyza_admin_strikes",{p_target:target.id}),adminRpc("rivyza_admin_cases",{p_target:target.id})]);
    setAdminStrikes(strikes||[]);setAdminCases(cases||[]);
    try{setAdminLiveStatus(await adminRpc("rivyza_admin_live_status",{p_target:target.id}));}catch(e){setAdminLiveStatus(null);setAdminError("Control LIVE no disponible: ejecuta el SQL v13.19.42.");}
  }
  async function adminOpen(target){setAdminError("");setAdminTarget(target);setAdminPanel(true);setAdminInbox(false);try{await adminRefresh(target);}catch(e){setAdminError(e.message||"Error cargando moderación");}}
  async function adminDo(fn,args){setAdminBusy(true);setAdminError("");try{await adminRpc(fn,args);if(adminInbox){const cases=await adminRpc("rivyza_admin_cases",{});setAdminCases(cases||[]);}else await adminRefresh();setAdminReason("");setAdminReply("");}catch(e){setAdminError(e.message||"No se pudo completar");}finally{setAdminBusy(false);}}
  async function adminOpenInbox(){setAdminError("");setAdminTarget(null);setAdminPanel(true);setAdminInbox(true);try{const rows=await adminRpc("rivyza_admin_cases",{});setAdminCases(rows||[]);try{setAdminSuspended(await adminRpc("rivyza_admin_suspended_live"));}catch(e){setAdminSuspended([]);}}catch(e){setAdminError(e.message||"No se pudo cargar la bandeja");}}
  useEffect(()=>{if(!supabase||!user?.id){setAdminOwner(false);return;}let live=true;
    supabase.rpc("rivyza_is_owner").then(({data,error})=>{if(live)setAdminOwner(!error&&data===true);});
    return()=>{live=false;};
  },[supabase,user?.id]);
  useEffect(()=>{if(!supabase||!user?.id)return;let live=true;
    const refresh=async()=>{const [a,b,c]=await Promise.all([
      supabase.from("rivyza_moderation_notices").select("id,body,created_at,read_at,strike_id").eq("recipient_id",user.id).is("hidden_at",null).order("created_at",{ascending:false}).limit(40),
      supabase.rpc("rivyza_my_strikes"),
      adminOwner?supabase.rpc("rivyza_admin_unread_count"):Promise.resolve({data:0,error:null})
    ]);if(live){if(!a.error)setAdminNotice(a.data||[]);if(!b.error)setMyInfractions(b.data||[]);setModerationLoadError(a.error?.message||b.error?.message||"");if(!c.error)setAdminUnread(Number(c.data||0));}};
    refresh();const id=setInterval(refresh,30000);return()=>{live=false;clearInterval(id);};
  },[supabase,user?.id,adminOwner]);
  async function markModerationRead(id){
    // Actualizar lectura mediante RPC: la tabla no concede UPDATE directo al cliente.
    const {error}=await supabase.rpc("rivyza_mark_moderation_notice_read",{p_notice:id});
    if(!error)setAdminNotice(rows=>rows.map(n=>n.id===id?{...n,read_at:new Date().toISOString()}:n));
    setSettingsSheet("Estado de cuenta");setView("settings");
  }
  async function hideModerationNotice(id){
    if(!supabase||!user?.id)return;
    if(!window.confirm("¿Eliminar este aviso de tu bandeja? La infracción y su historial permanecerán."))return;
    const {data,error}=await supabase.rpc("rivyza_hide_moderation_notice",{p_notice:id});
    if(error||data!==true){alert("No se pudo eliminar el aviso. Verifica que ejecutaste el SQL v13.19.45.");return;}
    setAdminNotice(rows=>rows.filter(n=>n.id!==id));
  }
  async function readOfficialNotice(id){
    const {error}=await supabase.rpc("rivyza_mark_moderation_notice_read",{p_notice:id});
    if(!error)setAdminNotice(rows=>rows.map(n=>n.id===id?{...n,read_at:new Date().toISOString()}:n));
  }
  async function submitAppeal(id){const message=(appealDrafts[id]||"").trim();if(message.length<10){alert("Explica tu apelación (mínimo 10 caracteres).");return;}
    try{await adminRpc("rivyza_appeal_strike",{p_strike:id,p_message:message});alert("Apelación enviada. Estado: En revisión.");setAppealDrafts(v=>({...v,[id]:""}));const {data}=await supabase.rpc("rivyza_my_strikes");setMyInfractions(data||[]);}catch(e){alert(e.message||"No se pudo enviar la apelación");}}

  useEffect(()=>{
    if(settingsSheet!=="Cuentas bloqueadas"||!supabase||!user?.id)return;
    let cancelled=false;
    async function loadBlockedProfiles(){
      setBlockedProfilesLoading(true);
      const {data:blocks,error:blockError}=await supabase.from("rivyza_user_blocks").select("blocked_id").eq("blocker_id",user.id);
      if(cancelled)return;
      if(blockError){setSettingsError("No se pudo cargar la lista de cuentas bloqueadas.");setBlockedProfilesLoading(false);return;}
      const ids=(blocks||[]).map(b=>b.blocked_id).filter(Boolean);
      setBlockedUsers(ids);
      if(!ids.length){setBlockedProfiles({});setBlockedProfilesLoading(false);return;}
      const {data:people,error:peopleError}=await supabase.from("profiles").select("id,username,display_name,avatar_url").in("id",ids);
      if(cancelled)return;
      if(peopleError)setSettingsError("No se pudieron cargar algunos perfiles bloqueados.");
      setBlockedProfiles(Object.fromEntries((people||[]).map(person=>[person.id,person])));
      setBlockedProfilesLoading(false);
    }
    loadBlockedProfiles();
    return ()=>{cancelled=true;};
  },[settingsSheet,user?.id]);
  useEffect(()=>{if(user?.id)loadSafetySettings();},[user?.id]);
  const [profile,setProfile]=useState(null);
  const [profilePosts,setProfilePosts]=useState([]);
  const [selectedPost,setSelectedPost]=useState(null);
  const [postOpenedFromAlert,setPostOpenedFromAlert]=useState(false);
  const [postMenuOpen,setPostMenuOpen]=useState(false);
  const [deleteConfirmOpen,setDeleteConfirmOpen]=useState(false);
  const postSwipeStartY=useRef(null);
  const postWheelLock=useRef(false);
  const postViewerVideoRef=useRef(null);
  const [postActionMessage,setPostActionMessage]=useState("");
  const [postLikeCount,setPostLikeCount]=useState(0);
  const [postLiked,setPostLiked]=useState(false);
  const [ownLikesCount,setOwnLikesCount]=useState(0);
  const [viewedLikesCount,setViewedLikesCount]=useState(0);
  const [likersOpen,setLikersOpen]=useState(false);
  const [likersRows,setLikersRows]=useState([]);
  const [likersLoading,setLikersLoading]=useState(false);
  const [postCommentCount,setPostCommentCount]=useState(0);
  const [commentsOpen,setCommentsOpen]=useState(false);
  const [commentRows,setCommentRows]=useState([]);
  const [commentDraft,setCommentDraft]=useState("");
  const [mentionMatches,setMentionMatches]=useState([]);
  const [mentionContext,setMentionContext]=useState(null);
  const [mentionNotices,setMentionNotices]=useState([]);
  const [commentsLoading,setCommentsLoading]=useState(false);
  const [commentSending,setCommentSending]=useState(false);
  const [commentError,setCommentError]=useState("");
  const [loading,setLoading]=useState(true);
  const [viewedProfile,setViewedProfile]=useState(null);
  useEffect(()=>{if(!supabase||!viewedProfile?.id||view!=="otherProfile")return;let active=true;
    setPublicStrikeCount(0);
    supabase.rpc("rivyza_public_strike_count",{p_target:viewedProfile.id}).then(({data,error})=>{if(active&&!error)setPublicStrikeCount(Number(data||0));});
    return()=>{active=false;};
  },[supabase,view,viewedProfile?.id]);
  const [viewedProfilePosts,setViewedProfilePosts]=useState([]);
  const [peopleSearchOpen,setPeopleSearchOpen]=useState(false);
  const [peopleSearch,setPeopleSearch]=useState("");
  const [peopleResults,setPeopleResults]=useState([]);
  const [peopleSearching,setPeopleSearching]=useState(false);
  const [peopleSearchMessage,setPeopleSearchMessage]=useState("");
  const [isFollowingViewed,setIsFollowingViewed]=useState(false);
  const [followBusy,setFollowBusy]=useState(false);
  const [viewedFollowersCount,setViewedFollowersCount]=useState(0);
  const [viewedFollowingCount,setViewedFollowingCount]=useState(0);
  const [ownFollowersCount,setOwnFollowersCount]=useState(0);
  const [ownFollowingCount,setOwnFollowingCount]=useState(0);
  const [socialListOpen,setSocialListOpen]=useState(false);
  const [socialListTitle,setSocialListTitle]=useState("");
  const [connectionsRows,setConnectionsRows]=useState([]);
  const [connectionsLoading,setConnectionsLoading]=useState(false);
  const [connectionsSearch,setConnectionsSearch]=useState("");
  const [connectionsTab,setConnectionsTab]=useState("mine");
  const [communityRows,setCommunityRows]=useState([]);
  const [communityLoading,setCommunityLoading]=useState(false);
  const [socialListRows,setSocialListRows]=useState([]);
  const [socialListLoading,setSocialListLoading]=useState(false);
  const [feedTab,setFeedTab]=useState("forYou");
  const [feedPosts,setFeedPosts]=useState([]);
  const [newFeedPostsAvailable,setNewFeedPostsAvailable]=useState(false);
  const feedNewestIdRef=useRef(null);
  const feedCheckBusyRef=useRef(false);

  const [feedLoading,setFeedLoading]=useState(false);
  const [feedMessage,setFeedMessage]=useState("");
  const [feedLikeBusy,setFeedLikeBusy]=useState(null);
  const feedLikeBusyRef=useRef(null);
  const postLikeBusyRef=useRef(false);

  const [username,setUsername]=useState("");
  const [displayName,setDisplayName]=useState("");
  const [bio,setBio]=useState("");
  const [avatarUrl,setAvatarUrl]=useState("");
  const [websiteUrl,setWebsiteUrl]=useState("");
  const [youtubeUrl,setYoutubeUrl]=useState("");
  const [instagramUrl,setInstagramUrl]=useState("");
  const [facebookUrl,setFacebookUrl]=useState("");
  const [countryCode,setCountryCode]=useState("");
  const [countryName,setCountryName]=useState("");
  const [showCountry,setShowCountry]=useState(true);
  const [uploadOpen,setUploadOpen]=useState(false);
  const [uploadType,setUploadType]=useState("photo");
  const [uploadFile,setUploadFile]=useState(null);
  const [uploadPreview,setUploadPreview]=useState("");
  const [uploadCaption,setUploadCaption]=useState("");
  const [uploadVisibility,setUploadVisibility]=useState("public");
  const [uploadingPost,setUploadingPost]=useState(false);
  const [uploadMessage,setUploadMessage]=useState("");
  const [cameraMode,setCameraMode]=useState("photo");
  const [cameraPanelCollapsed,setCameraPanelCollapsed]=useState(false);
  const cameraPanelTouchStartY=useRef(null);
  const [cameraFacing,setCameraFacing]=useState("user");
  const [cameraStream,setCameraStream]=useState(null);
  const [cameraError,setCameraError]=useState("");
  const [recording,setRecording]=useState(false);
  const [recordSeconds,setRecordSeconds]=useState(0);
  const [recordLimit,setRecordLimit]=useState(60);
  const cameraVideoRef=useRef(null);
  const [cameraZoom,setCameraZoom]=useState(1);
  const [cameraZoomRange,setCameraZoomRange]=useState(null);
  const cameraZoomGestureRef=useRef(null);
  const cameraZoomTrackRef=useRef(null);
  const mediaRecorderRef=useRef(null);
  const recordedChunksRef=useRef([]);
  const recordTimerRef=useRef(null);
  const [message,setMessage]=useState("");
  const [saving,setSaving]=useState(false);

  const [cropOpen,setCropOpen]=useState(false);
  const [cropSrc,setCropSrc]=useState("");
  const [crop,setCrop]=useState({x:0,y:0});
  const [zoom,setZoom]=useState(1);
  const [croppedPixels,setCroppedPixels]=useState(null);
  const [uploadingAvatar,setUploadingAvatar]=useState(false);

  function chooseCameraMode(mode,limit=null){
    setCameraMode(mode);
    setUploadType(mode==="photo"?"photo":"video");
    if(limit)setRecordLimit(limit);
    setCameraPanelCollapsed(true);
  }

  function cameraPanelTouchStart(e){
    cameraPanelTouchStartY.current=e.touches?.[0]?.clientY ?? null;
  }

  function cameraPanelTouchEnd(e){
    const start=cameraPanelTouchStartY.current;
    const end=e.changedTouches?.[0]?.clientY;
    cameraPanelTouchStartY.current=null;
    if(start==null || end==null)return;
    const dy=end-start;
    if(dy < -35)setCameraPanelCollapsed(false);
    if(dy > 35)setCameraPanelCollapsed(true);
  }

  const loadProfile=useCallback(async(currentUser)=>{
    if(!supabase||!currentUser)return null;

    const {data,error}=await supabase
      .from("profiles")
      .select("*")
      .eq("id",currentUser.id)
      .maybeSingle();

    if(error){
      console.error("Profile load error:",error);
      return null;
    }

    if(data){
      setProfile(data);
      setUsername(data.username||"");
      setDisplayName(data.display_name||"");
      setBio(data.bio||"");
      setAvatarUrl(data.avatar_url||currentUser.user_metadata?.avatar_url||currentUser.user_metadata?.picture||"");
      setWebsiteUrl(data.website_url||"");
      setYoutubeUrl(data.youtube_url||"");
      setInstagramUrl(data.instagram_url||"");
      setFacebookUrl(data.facebook_url||"");
      setCountryCode(data.country_code||"");
      setCountryName(data.country_name||"");
      setShowCountry(data.show_country!==false);
      return data;
    }

    setProfile(null);
    setUsername("");
    setDisplayName(currentUser.user_metadata?.full_name||currentUser.user_metadata?.name||"");
    setBio("");
    setAvatarUrl(currentUser.user_metadata?.avatar_url||currentUser.user_metadata?.picture||"");
    setWebsiteUrl("");
    setYoutubeUrl("");
    setInstagramUrl("");
    setFacebookUrl("");
    setCountryCode("");
    setCountryName("");
    setShowCountry(true);
    return null;
  },[supabase]);

  // Contadores reales desde Supabase, sin depender de abrir la hoja de comentarios.
  async function getCommentCounts(postIds){
    const ids=[...new Set((postIds||[]).filter(Boolean))];
    if(!supabase||!ids.length)return {};
    const counts={};
    // Procesar por lotes para evitar solicitudes demasiado grandes.
    for(let i=0;i<ids.length;i+=80){
      const {data,error}=await supabase.from("post_comments").select("post_id").in("post_id",ids.slice(i,i+80));
      if(error){console.warn("Comment counts:",error);return null;}
      (data||[]).forEach(row=>{counts[row.post_id]=(counts[row.post_id]||0)+1;});
    }
    return counts;
  }
  function syncCommentCount(postId,count){
    setFeedPosts(rows=>rows.map(row=>row.id===postId?{...row,comment_count:count}:row));
    setProfilePosts(rows=>rows.map(row=>row.id===postId?{...row,comment_count:count}:row));
    setViewedProfilePosts(rows=>rows.map(row=>row.id===postId?{...row,comment_count:count}:row));
    setSelectedPost(row=>row?.id===postId?{...row,comment_count:count}:row);
  }
  async function openCommentAuthor(author){
    if(!author?.id)return;
    setCommentsOpen(false);
    setSelectedPost(null);
    await openUserProfile(author);
  }

  async function loadProfilePosts(){
    if(!supabase || !user?.id)return;

    const {data,error}=await supabase
      .from("posts")
      .select("*")
      .eq("user_id",user.id)
      .order("created_at",{ascending:false});

    if(error){
      console.error("Profile posts load error:",error);
      return;
    }

    const sorted=[...(data||[])].sort((a,b)=>{
      const ap=a.pinned_position ?? 99;
      const bp=b.pinned_position ?? 99;
      if(ap!==bp)return ap-bp;
      return new Date(b.created_at)-new Date(a.created_at);
    });

    const counts=await getCommentCounts(sorted.map(p=>p.id));
    setProfilePosts(sorted.map(p=>({...p,comment_count:counts===null?Number(p.comment_count||0):(counts[p.id]||0)})));
  }

  async function loadMyLikedPosts(){
    if(!supabase||!user?.id)return;
    setLikedPostsLoading(true);setLikedPostsError("");
    try{
      const {data:likes,error}=await supabase.from("post_likes").select("post_id,created_at").eq("user_id",user.id).order("created_at",{ascending:false}).limit(500);
      if(error)throw error;
      const ids=[...new Set((likes||[]).map(x=>x.post_id).filter(Boolean))];
      if(!ids.length){setLikedPosts([]);return;}
      const posts=[];
      for(let i=0;i<ids.length;i+=100){
        const {data,error:pe}=await supabase.from("posts").select("*").in("id",ids.slice(i,i+100));
        if(pe)throw pe;
        posts.push(...(data||[]));
      }
      const byId=new Map(posts.map(post=>[post.id,post]));
      // Posts may have been deleted or made private since the like was recorded.
      setLikedPosts(ids.map(id=>byId.get(id)).filter(post=>post&&(post.user_id===user.id||post.visibility==="public")));
    }catch(e){console.error("Liked posts error",e);setLikedPostsError("No se pudieron cargar tus me gusta.");}
    finally{setLikedPostsLoading(false);}
  }
  useEffect(()=>{if(view==="publicProfile"&&profileTab==="likes"&&user?.id)loadMyLikedPosts();},[view,profileTab,user?.id]);

  async function loadProfileLikeCount(profileId,{own=false}={}){
    if(!supabase || !profileId)return;
    try{
      const {data,error}=await supabase.rpc("get_profile_like_count",{target_profile_id:profileId});
      if(error)throw error;
      if(own)setOwnLikesCount(Number(data)||0);
      else setViewedLikesCount(Number(data)||0);
    }catch(e){console.warn("Profile likes todavía no configurados:",e);}
  }

  async function openPostLikers(){
    if(!selectedPost || selectedPost.user_id!==user?.id || !supabase)return;
    setLikersOpen(true);
    setLikersLoading(true);
    setLikersRows([]);
    try{
      const {data:likes,error}=await supabase.from("post_likes").select("user_id,created_at").eq("post_id",selectedPost.id).order("created_at",{ascending:false});
      if(error)throw error;
      const ids=[...new Set((likes||[]).map(x=>x.user_id))];
      if(!ids.length){setLikersRows([]);return;}
      const {data:people,error:pe}=await supabase.from("profiles").select("id,username,display_name,avatar_url").in("id",ids);
      if(pe)throw pe;
      const map=new Map((people||[]).map(x=>[x.id,x]));
      setLikersRows(ids.map(id=>map.get(id)).filter(Boolean));
    }catch(e){console.error("Likers load error:",e);setLikersRows([]);}
    finally{setLikersLoading(false);}
  }

  async function loadFollowCounts(profileId,{own=false}={}){
    if(!supabase || !profileId)return;
    const [{count:followers,error:fe},{count:following,error:fge}]=await Promise.all([
      supabase.from("follows").select("*",{count:"exact",head:true}).eq("following_id",profileId),
      supabase.from("follows").select("*",{count:"exact",head:true}).eq("follower_id",profileId)
    ]);
    if(fe||fge){ console.error("Follow count error:",fe||fge); return; }
    if(own){ setOwnFollowersCount(followers||0); setOwnFollowingCount(following||0); }
    else { setViewedFollowersCount(followers||0); setViewedFollowingCount(following||0); }
  }

  async function loadFollowingState(profileId){
    if(!supabase || !user?.id || !profileId || profileId===user.id){setIsFollowingViewed(false);return;}
    const {data,error}=await supabase.from("follows").select("follower_id")
      .eq("follower_id",user.id).eq("following_id",profileId).maybeSingle();
    if(error){console.error("Follow state error:",error);setIsFollowingViewed(false);return;}
    setIsFollowingViewed(!!data);
  }

  async function toggleFollowViewed(){
    if(viewedProfile?.id && blockedUsers.includes(viewedProfile.id)){alert("Desbloquea esta cuenta antes de seguirla.");return;}
    if(!supabase || !user?.id || !viewedProfile?.id || viewedProfile.id===user.id || followBusy)return;
    setFollowBusy(true);
    try{
      if(isFollowingViewed){
        const {error}=await supabase.from("follows").delete()
          .eq("follower_id",user.id).eq("following_id",viewedProfile.id);
        if(error)throw error;
        setIsFollowingViewed(false);
      }else{
        const {error}=await supabase.from("follows")
          .insert({follower_id:user.id,following_id:viewedProfile.id});
        if(error)throw error;
        setIsFollowingViewed(true);
      }
      await Promise.all([loadFollowCounts(viewedProfile.id),loadFollowCounts(user.id,{own:true})]);
    }catch(e){
      console.error("Follow action error:",e);
      setPostActionMessage("No se pudo actualizar. Verifica que ejecutaste el SQL v13.9.");
    }finally{setFollowBusy(false);}
  }

  async function unfollowFromList(person){
    if(!supabase || !user?.id || !person?.id)return;
    const ok=window.confirm(`¿Dejar de seguir a ${person.display_name||person.username||"este usuario"}?`);
    if(!ok)return;
    try{
      const {error}=await supabase.from("follows").delete()
        .eq("follower_id",user.id).eq("following_id",person.id);
      if(error)throw error;
      setSocialListRows(rows=>rows.filter(row=>row.id!==person.id));
      await loadFollowCounts(user.id,{own:true});
      if(viewedProfile?.id===person.id){
        setIsFollowingViewed(false);
        await loadFollowCounts(person.id);
      }
    }catch(e){
      console.error("Unfollow list error:",e);
      setPostActionMessage("No se pudo dejar de seguir a esta persona.");
    }
  }

  async function loadConnections(){
    if(!supabase || !user?.id)return;
    setConnectionsLoading(true);
    try{
      const [{data:out,error:oe},{data:incoming,error:ie}]=await Promise.all([
        supabase.from("follows").select("following_id").eq("follower_id",user.id),
        supabase.from("follows").select("follower_id").eq("following_id",user.id)
      ]);
      if(oe||ie)throw oe||ie;
      const outIds=new Set((out||[]).map(x=>x.following_id));
      const inIds=new Set((incoming||[]).map(x=>x.follower_id));
      const ids=[...new Set([...outIds,...inIds])].filter(id=>id&&id!==user.id);
      if(!ids.length){setConnectionsRows([]);return;}
      const {data,error}=await supabase.from("profiles").select("id,username,display_name,avatar_url,bio").in("id",ids);
      if(error)throw error;
      setConnectionsRows((data||[]).map(p=>({...p,i_follow:outIds.has(p.id),follows_me:inIds.has(p.id)})).sort((a,b)=>Number(b.i_follow&&b.follows_me)-Number(a.i_follow&&a.follows_me)));
    }catch(e){console.error("Connections error:",e);}
    finally{setConnectionsLoading(false);}
  }
  async function followFromConnections(person){
    if(!supabase||!user?.id||!person?.id)return;
    const {error}=await supabase.from("follows").insert({follower_id:user.id,following_id:person.id});
    if(error){console.error("Follow connection error:",error);return;}
    setConnectionsRows(rows=>rows.map(p=>p.id===person.id?{...p,i_follow:true}:p));
    setCommunityRows(rows=>rows.map(p=>p.id===person.id?{...p,i_follow:true}:p));
    loadFollowCounts(user.id,{own:true});
  }
  async function loadCommunity(){
    if(!supabase||!user?.id)return;
    setCommunityLoading(true);
    try{
      const [{data:people,error:pe},{data:out,error:oe},{data:incoming,error:ie}]=await Promise.all([
        supabase.from("profiles").select("id,username,display_name,avatar_url,bio").order("created_at",{ascending:false}).limit(500),
        supabase.from("follows").select("following_id").eq("follower_id",user.id),
        supabase.from("follows").select("follower_id").eq("following_id",user.id)
      ]);
      if(pe||oe||ie)throw pe||oe||ie;
      const outIds=new Set((out||[]).map(x=>x.following_id));
      const inIds=new Set((incoming||[]).map(x=>x.follower_id));
      setCommunityRows((people||[]).filter(p=>p.id!==user.id).map(p=>({...p,i_follow:outIds.has(p.id),follows_me:inIds.has(p.id)})));
    }catch(e){console.error("Community directory error:",e);setCommunityRows([]);}
    finally{setCommunityLoading(false);}
  }
  function openConnections(){setConnectionsSearch("");setConnectionsTab("mine");setView("connections");loadConnections();loadCommunity();}

  useEffect(()=>{
    if(!supabase||!user?.id)return;
    let alive=true;
    supabase.from("rivyza_community_preferences").select("followers,following,mentions").eq("user_id",user.id).maybeSingle().then(({data,error})=>{
      if(alive&&!error&&data)setCommunityPrivacy({followers:data.followers,following:data.following,mentions:data.mentions});
    });
    return ()=>{alive=false;};
  },[supabase,user?.id]);
  async function saveCommunityPrivacy(key,value){
    if(!supabase||!user?.id)return;
    setCommunityPrivacyError("");
    const {error}=await supabase.from("rivyza_community_preferences").upsert({user_id:user.id,[key]:value},{onConflict:"user_id"});
    if(error){setCommunityPrivacyError("No se pudo guardar. Primero ejecuta el SQL v13.19.37.");return;}
    setCommunityPrivacy(v=>({...v,[key]:value}));
  }
  function startReport(kind,id){
    if(!user?.id){alert("Inicia sesión para reportar.");return;}
    setReportTarget({kind,id});setReportReason("harassment");setReportDetails("");setReportFeedback("");setPostMenuOpen(false);
  }
  async function submitReport(){
    if(!reportTarget||!supabase||!user?.id||reportBusy)return;
    setReportBusy(true);setReportFeedback("");
    const {error}=await supabase.from("rivyza_reports").insert({reporter_id:user.id,target_type:reportTarget.kind,target_id:reportTarget.id,reason:reportReason,details:reportDetails.trim().slice(0,1000)});
    setReportBusy(false);
    if(error){setReportFeedback("No se pudo enviar. Revisa el SQL de reportes. "+error.message);return;}
    setReportTarget(null);alert("Reporte recibido. Gracias por ayudar a proteger RIVYZA.");
  }
  async function openSocialList(profileId,type){
    if(!supabase || !profileId)return;
    setSocialListOpen(true);
    setSocialListTitle(type==="followers"?"Seguidores":"Siguiendo");
    setSocialListRows([]); setSocialListLoading(true);
    try{
      // Verificar privacidad en el servidor antes de cargar perfiles.
      const {data:allowed,error:permissionError}=await supabase.rpc("rivyza_can_view_social_list",{target_user:profileId,list_kind:type});
      if(permissionError||!allowed){setSocialListRows([]);setSocialListTitle("Lista privada");return;}
      const filterColumn=type==="followers"?"following_id":"follower_id";
      const personColumn=type==="followers"?"follower_id":"following_id";
      const {data:links,error}=await supabase.from("follows").select(personColumn).eq(filterColumn,profileId);
      if(error)throw error;
      const ids=(links||[]).map(r=>r[personColumn]).filter(Boolean);
      if(!ids.length){setSocialListRows([]);return;}
      const {data:profiles,error:pe}=await supabase.from("profiles")
        .select("id,username,display_name,bio,avatar_url,website_url,youtube_url,instagram_url,facebook_url,country_code,country_name,show_country")
        .in("id",ids);
      if(pe)throw pe;

      let enriched=profiles||[];
      if(user?.id && enriched.length){
        const profileIds=enriched.map(p=>p.id);
        const [{data:iFollow},{data:followsMe}]=await Promise.all([
          supabase.from("follows").select("following_id").eq("follower_id",user.id).in("following_id",profileIds),
          supabase.from("follows").select("follower_id").eq("following_id",user.id).in("follower_id",profileIds)
        ]);
        const iFollowSet=new Set((iFollow||[]).map(r=>r.following_id));
        const followsMeSet=new Set((followsMe||[]).map(r=>r.follower_id));
        enriched=enriched.map(p=>({
          ...p,
          i_follow:iFollowSet.has(p.id),
          follows_me:followsMeSet.has(p.id)
        }));
      }
      setSocialListRows(enriched);
    }catch(e){console.error("Social list error:",e);setSocialListRows([]);}
    finally{setSocialListLoading(false);}
  }

  async function openUserProfile(targetProfile){
    if(!targetProfile?.id)return;
    if(targetProfile.id===user?.id){
      setViewedProfile(null);
      setViewedProfilePosts([]);
      setPeopleSearchOpen(false);
      setView("publicProfile");
      return;
    }
    setViewedProfile(targetProfile);
    setViewedProfilePosts([]);
    setPeopleSearchOpen(false);
    setSelectedPost(null);
    setView("otherProfile");
    setPostActionMessage("");
    loadFollowCounts(targetProfile.id);
    loadFollowingState(targetProfile.id);
    loadProfileLikeCount(targetProfile.id);

    const {data,error}=await supabase
      .from("posts")
      .select("*")
      .eq("user_id",targetProfile.id)
      .eq("visibility","public")
      .order("created_at",{ascending:false});

    if(error){
      console.error("Public profile posts load error:",error);
      return;
    }
    const sorted=[...(data||[])].sort((a,b)=>{
      const ap=a.pinned_position ?? 99;
      const bp=b.pinned_position ?? 99;
      if(ap!==bp)return ap-bp;
      return new Date(b.created_at)-new Date(a.created_at);
    });
    const counts=await getCommentCounts(sorted.map(p=>p.id));
    setViewedProfilePosts(sorted.map(p=>({...p,comment_count:counts===null?Number(p.comment_count||0):(counts[p.id]||0)})));
  }

  async function searchPeople(term=peopleSearch){
    const q=String(term||"").trim().replace(/^@/,"");
    if(!supabase || q.length<2){
      setPeopleResults([]);
      setPeopleSearchMessage(q.length ? "Escribe por lo menos 2 caracteres." : "");
      return;
    }
    setPeopleSearching(true);
    setPeopleSearchMessage("");
    try{
      const safe=q.replace(/[%_,()]/g,"");
      const {data,error}=await supabase
        .from("profiles")
        .select("id,username,display_name,bio,avatar_url,website_url,youtube_url,instagram_url,facebook_url,country_code,country_name,show_country")
        .or(`username.ilike.%${safe}%,display_name.ilike.%${safe}%`)
        .limit(20);
      if(error)throw error;
      const rows=(data||[]).filter(row=>row.id!==user?.id);
      setPeopleResults(rows);
      setPeopleSearchMessage(rows.length ? "" : "No encontramos usuarios con ese nombre.");
    }catch(e){
      console.error("People search error:",e);
      setPeopleResults([]);
      setPeopleSearchMessage("No se pudo buscar. Si es la primera vez, ejecuta el SQL v13.8 incluido.");
    }finally{
      setPeopleSearching(false);
    }
  }

  async function loadHomeFeed(tab=feedTab){
    if(!supabase || !user?.id)return;
    setFeedLoading(true);
    setFeedMessage("");
    try{
      let allowedIds=null;
      if(tab==="following"){
        const {data:links,error:followError}=await supabase
          .from("follows")
          .select("following_id")
          .eq("follower_id",user.id);
        if(followError)throw followError;
        allowedIds=(links||[]).map(row=>row.following_id).filter(Boolean);
        if(!allowedIds.length){
          setFeedPosts([]);
          setFeedMessage("Todavía no sigues a nadie. Cuando sigas personas, sus publicaciones aparecerán aquí.");
          return;
        }
      }else if(tab==="friends"){
        const [{data:iFollow,error:iFollowError},{data:followsMe,error:followsMeError}]=await Promise.all([
          supabase.from("follows").select("following_id").eq("follower_id",user.id),
          supabase.from("follows").select("follower_id").eq("following_id",user.id)
        ]);
        if(iFollowError)throw iFollowError;
        if(followsMeError)throw followsMeError;

        const followsMeSet=new Set((followsMe||[]).map(row=>row.follower_id).filter(Boolean));
        allowedIds=(iFollow||[])
          .map(row=>row.following_id)
          .filter(id=>id && followsMeSet.has(id));

        if(!allowedIds.length){
          setFeedPosts([]);
          setFeedMessage("Todavía no tienes amigos mutuos. Cuando ambos se sigan, su contenido aparecerá aquí.");
          return;
        }
      }

      let postQuery=supabase
        .from("posts")
        .select("*")
        .eq("visibility","public")
        .order("created_at",{ascending:false})
        .limit(60);

      if(allowedIds)postQuery=postQuery.in("user_id",allowedIds);

      const {data:posts,error:postsError}=await postQuery;
      if(postsError)throw postsError;
      const rows=posts||[];
      if(!rows.length){
        setFeedPosts([]);
        setFeedMessage(tab==="following"
          ?"Las personas que sigues todavía no tienen publicaciones públicas."
          :tab==="friends"
            ?"Tus amigos mutuos todavía no tienen publicaciones públicas."
            :"Todavía no hay publicaciones públicas.");
        return;
      }

      const creatorIds=[...new Set(rows.map(post=>post.user_id).filter(Boolean))];
      const postIds=rows.map(post=>post.id);
      const [{data:creators,error:creatorError},{data:likes,error:likesError}]=await Promise.all([
        supabase.from("profiles")
          .select("id,username,display_name,bio,avatar_url,website_url,youtube_url,instagram_url,facebook_url,country_code,country_name,show_country")
          .in("id",creatorIds),
        supabase.from("post_likes").select("post_id,user_id").in("post_id",postIds)
      ]);
      if(creatorError)throw creatorError;
      if(likesError)throw likesError;

      const creatorMap=new Map((creators||[]).map(person=>[person.id,person]));
      const likeCountMap=new Map();
      const likedByMe=new Set();
      (likes||[]).forEach(like=>{
        likeCountMap.set(like.post_id,(likeCountMap.get(like.post_id)||0)+1);
        if(like.user_id===user.id)likedByMe.add(like.post_id);
      });

      const commentCounts=await getCommentCounts(postIds);
      feedNewestIdRef.current=rows[0]?.id||null;
      setNewFeedPostsAvailable(false);
      setFeedPosts(rows.map(post=>({
        ...post,
        creator:creatorMap.get(post.user_id)||null,
        like_count:likeCountMap.get(post.id)||0,
        liked_by_me:likedByMe.has(post.id),
        comment_count:commentCounts===null?Number(post.comment_count||0):(commentCounts[post.id]||0)
      })));
    }catch(e){
      console.error("Home feed load error:",e);
      setFeedPosts([]);
      setFeedMessage("No se pudo cargar el feed. Intenta de nuevo.");
    }finally{
      setFeedLoading(false);
    }
  }

  function changeFeedTab(tab){
    setFeedTab(tab);
    loadHomeFeed(tab);
  }

  async function openFeedCreator(post){
    if(!post?.creator)return;
    await openUserProfile(post.creator);
  }

  async function toggleFeedLike(post){
    if(!supabase || !user?.id || !post?.id || feedLikeBusy===post.id)return;
    feedLikeBusyRef.current=post.id;
    setFeedLikeBusy(post.id);
    const wasLiked=!!post.liked_by_me;
    setFeedPosts(rows=>rows.map(row=>row.id===post.id
      ? {...row,liked_by_me:!wasLiked,like_count:Math.max(0,Number(row.like_count||0)+(wasLiked?-1:1))}
      : row));
    try{
      if(wasLiked){
        const {error}=await supabase.from("post_likes").delete()
          .eq("post_id",post.id).eq("user_id",user.id);
        if(error)throw error;
      }else{
        const {error}=await supabase.from("post_likes").insert({post_id:post.id,user_id:user.id});
        if(error)throw error;
      }
    }catch(e){
      console.error("Feed like error:",e);
      setFeedPosts(rows=>rows.map(row=>row.id===post.id
        ? {...row,liked_by_me:wasLiked,like_count:Math.max(0,Number(row.like_count||0)+(wasLiked?1:-1))}
        : row));
    }finally{
      feedLikeBusyRef.current=null;
      setFeedLikeBusy(null);
    }
  }

  useEffect(()=>{
    if(view==="home" && user?.id)loadHomeFeed(feedTab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[view,user?.id]);

  // Check for new public posts every 30 seconds without resetting the scroll position.
  // A pending refresh is applied only when the user returns to the top of the feed.
  useEffect(()=>{
    if(view!=="home" || !user?.id || !supabase)return;
    let active=true;
    const feedEl=document.querySelector(".feed-shell > .home-real-feed");
    const isBusy=()=>recording || uploadingPost || uploadOpen;
    const atTop=()=>feedEl && feedEl.scrollTop<=12;
    const refreshAtTop=()=>{
      if(!active || !newFeedPostsAvailable || !atTop() || isBusy())return;
      loadHomeFeed(feedTab);
    };
    const check=async()=>{
      if(!active || feedCheckBusyRef.current || isBusy())return;
      feedCheckBusyRef.current=true;
      try{
        const {data,error}=await supabase.from("posts")
          .select("id,created_at,user_id")
          .eq("visibility","public")
          .order("created_at",{ascending:false}).limit(1);
        if(error || !active || !data?.length || !feedNewestIdRef.current)return;
        if(data[0].id!==feedNewestIdRef.current){
          setNewFeedPostsAvailable(true);
        }
      }catch(e){console.warn("RIVYZA feed refresh check:",e);}
      finally{feedCheckBusyRef.current=false;}
    };
    refreshAtTop();
    const timer=setInterval(check,10000);
    const onScroll=()=>refreshAtTop();
    feedEl?.addEventListener("scroll",onScroll,{passive:true});
    return ()=>{active=false;clearInterval(timer);feedEl?.removeEventListener("scroll",onScroll);};
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[view,user?.id,feedTab,newFeedPostsAvailable,recording,uploadingPost,uploadOpen]);

  useEffect(()=>{
    if(view==="publicProfile" && user?.id){
      loadProfilePosts();
      loadProfileLikeCount(user.id,{own:true});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[view,user?.id]);

  async function loadComments(postId,{silent=false}={}){
    if(!supabase||!postId)return;
    if(!silent){setCommentsLoading(true);setCommentError("");}
    const {data,error}=await supabase.from("post_comments")
      .select("id,post_id,user_id,body,created_at").eq("post_id",postId)
      .order("created_at",{ascending:false}).limit(200);
    if(error){if(!silent){setCommentError("No se pudieron cargar los comentarios. Comprueba la configuración de Supabase.");setCommentsLoading(false);}return;}
    const ids=[...new Set((data||[]).map(c=>c.user_id))];
    let people=[];
    if(ids.length){const {data:rows}=await supabase.from("profiles").select("id,username,display_name,avatar_url").in("id",ids);people=rows||[];}
    const byId=Object.fromEntries(people.map(person=>[person.id,person]));
    setCommentRows((data||[]).map(c=>({...c,author:byId[c.user_id]||null})));
    setPostCommentCount((data||[]).length);
    syncCommentCount(postId,(data||[]).length);
    setCommentsLoading(false);
  }
  // Sincronización de datos entre dispositivos: no recarga la página ni mueve el feed.
  // Las referencias evitan reiniciar el temporizador cada vez que cambian los contadores.
  const liveDataRef=useRef({});
  liveDataRef.current={feedPosts,profilePosts,viewedProfilePosts,selectedPost,commentsOpen,commentSending,view,viewedProfile};
  useEffect(()=>{
    if(!supabase || !user?.id)return;
    let active=true;
    let running=false;
    const update=async()=>{
      if(!active || running || (typeof document!=="undefined" && document.hidden))return;
      running=true;
      try{
        const current=liveDataRef.current;
        const ids=[...new Set([
          ...(current.feedPosts||[]).map(p=>p.id),
          ...(current.profilePosts||[]).map(p=>p.id),
          ...(current.viewedProfilePosts||[]).map(p=>p.id),
          current.selectedPost?.id
        ].filter(Boolean))];
        if(ids.length){
          const counts=await getCommentCounts(ids);
          if(active && counts!==null){
            const apply=rows=>rows.map(p=>p.comment_count===(counts[p.id]||0)?p:{...p,comment_count:counts[p.id]||0});
            setFeedPosts(apply);
            setProfilePosts(apply);
            setViewedProfilePosts(apply);
            setSelectedPost(p=>p && p.comment_count!==(counts[p.id]||0)?{...p,comment_count:counts[p.id]||0}:p);
            if(current.selectedPost?.id)setPostCommentCount(counts[current.selectedPost.id]||0);
          }
        }
        // Sincronizar likes en las mismas publicaciones, sin recargar ni mover el feed.
        if(ids.length){
          const likeCounts={};
          const likedByMe=new Set();
          let likesOk=true;
          // Evitar consultas demasiado largas si hay muchas publicaciones visibles.
          for(let i=0;i<ids.length;i+=80){
            const batch=ids.slice(i,i+80);
            const {data,error}=await supabase.from("post_likes")
              .select("post_id,user_id").in("post_id",batch);
            if(error){likesOk=false;console.warn("RIVYZA live like sync:",error);break;}
            for(const like of data||[]){
              likeCounts[like.post_id]=(likeCounts[like.post_id]||0)+1;
              if(like.user_id===user.id)likedByMe.add(like.post_id);
            }
          }
          if(active && likesOk){
            const applyLikes=rows=>rows.map(p=>{
              if(feedLikeBusyRef.current===p.id || (postLikeBusyRef.current && current.selectedPost?.id===p.id))return p;
              const n=likeCounts[p.id]||0;
              const mine=likedByMe.has(p.id);
              return p.like_count===n && p.liked_by_me===mine?p:{...p,like_count:n,liked_by_me:mine};
            });
            setFeedPosts(applyLikes);
            setProfilePosts(applyLikes);
            setViewedProfilePosts(applyLikes);
            if(current.selectedPost?.id && !postLikeBusyRef.current){
              const id=current.selectedPost.id;
              setPostLikeCount(likeCounts[id]||0);
              setPostLiked(likedByMe.has(id));
            }
          }
        }
        if(active && current.view==="profile")await loadProfileLikeCount(user.id,{own:true});
        if(active && current.view==="viewProfile" && current.viewedProfile?.id)
          await loadProfileLikeCount(current.viewedProfile.id);
        if(active && current.commentsOpen && current.selectedPost?.id && !current.commentSending){
          await loadComments(current.selectedPost.id,{silent:true});
        }
      }catch(err){console.warn("RIVYZA live comment sync:",err);}
      finally{running=false;}
    };
    const timer=setInterval(update,10000);
    const onReturn=()=>{if(!document.hidden)update();};
    document.addEventListener("visibilitychange",onReturn);
    window.addEventListener("focus",onReturn);
    return ()=>{active=false;clearInterval(timer);document.removeEventListener("visibilitychange",onReturn);window.removeEventListener("focus",onReturn);};
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[supabase,user?.id]);

  function openComments(post){
    setSelectedPost(post);setPostMenuOpen(false);setCommentsOpen(true);
    setCommentDraft("");setCommentRows([]);setCommentError("");
    setPostCommentCount(Number(post.comment_count||0));
    setPostCommentPrivacy("everyone");
    if(supabase&&post.user_id){
      supabase.from("rivyza_comment_preferences").select("who_can_comment").eq("user_id",post.user_id).maybeSingle()
        .then(({data})=>setPostCommentPrivacy(data?.who_can_comment||"everyone"));
    }
    loadComments(post.id);
  }
  // Menciones: sugerencias en descripciones y comentarios, respetando privacidad.
  useEffect(()=>{
    if(!supabase||!user?.id||!mentionContext){setMentionMatches([]);return;}
    const source=mentionContext==="comment"?commentDraft:uploadCaption;
    const match=source.match(/(?:^|\s)@([a-zA-Z0-9_.]{1,30})$/);
    if(!match){setMentionMatches([]);return;}
    let active=true;
    const timer=setTimeout(async()=>{
      const {data,error}=await supabase.rpc("rivyza_search_mentionable",{search_term:match[1]});
      if(active)setMentionMatches(error?[]:(data||[]));
    },220);
    return()=>{active=false;clearTimeout(timer);};
  },[supabase,user?.id,mentionContext,commentDraft,uploadCaption]);
  function pickMention(person){
    if(!person?.username)return;
    const update=old=>old.replace(/(^|\s)@[a-zA-Z0-9_.]{1,30}$/,(_,prefix)=>prefix+"@"+person.username+" ");
    if(mentionContext==="comment")setCommentDraft(update);
    else setUploadCaption(update);
    setMentionMatches([]);
    setMentionContext(null);
  }
  function mentionSuggestions(context){
    return mentionContext===context&&mentionMatches.length>0?<div className="rivyza-mention-suggestions" role="listbox" aria-label="Usuarios para mencionar">{mentionMatches.map(person=><button type="button" role="option" aria-selected="false" key={person.id} onClick={()=>pickMention(person)}>@{person.username} <small>{person.display_name||""}</small></button>)}</div>:null;
  }
  function renderMentionText(value){
    return String(value||"").split(/(@[a-zA-Z0-9_.]+)/g).map((part,index)=>{
      if(!/^@[a-zA-Z0-9_.]+$/.test(part))return part;
      return <button key={index} type="button" className="rivyza-mention-link" onClick={async(e)=>{e.stopPropagation();const {data}=await supabase.from("profiles").select("id,username,display_name,avatar_url").ilike("username",part.slice(1)).limit(1).maybeSingle();if(data&&data.username.toLowerCase()===part.slice(1).toLowerCase())openUserProfile(data);}}>{part}</button>;
    });
  }
  async function sendComment(e){
    e?.preventDefault?.();
    const body=commentDraft.trim();
    if(!supabase||!user?.id||!selectedPost?.id||!body||commentSending)return;
    setCommentSending(true);setCommentError("");
    const postId=selectedPost.id;
    const {error}=await supabase.from("post_comments").insert({post_id:postId,user_id:user.id,body});
    if(error){setCommentError(error.message?.includes("mención")?error.message:"No se pudo enviar el comentario. Es posible que el autor haya restringido quién puede comentar.");}
    else{setCommentDraft("");await loadComments(postId);}
    setCommentSending(false);
  }
  async function deleteComment(id){
    if(!supabase||!user?.id||!selectedPost?.id)return;
    const isPostOwner=selectedPost.user_id===user.id;
    const request=supabase.from("post_comments").delete().eq("id",id);
    const {data,error}=await (isPostOwner?request:request.eq("user_id",user.id)).select("id");
    if(error)setCommentError("No se pudo eliminar el comentario. Verifica el permiso de moderación en Supabase.");
    else if(!data?.length)setCommentError("No se eliminó. Comprueba que ejecutaste el nuevo SQL de permisos.");
    else await loadComments(selectedPost.id);
  }
  function renderCommentsSheet(){return (
    <div className="post-menu-backdrop" onClick={()=>setCommentsOpen(false)}>
      <div className="post-menu-sheet comments-sheet rivyza-comments" onClick={e=>e.stopPropagation()}>
        <div className="rivyza-comments-heading"><strong>{t("Comentarios")}</strong><button type="button" onClick={()=>setCommentsOpen(false)} aria-label="Cerrar comentarios">×</button></div>
        <div className="rivyza-comments-list">
          {commentsLoading&&<p>Cargando comentarios…</p>}
          {!commentsLoading&&!commentRows.length&&!commentError&&<p>Sé la primera persona en comentar.</p>}
          {commentRows.map(c=><div className="rivyza-comment" key={c.id}>
            <button type="button" className="rivyza-comment-avatar rivyza-comment-profile-link rivyza-presence-anchor" onClick={()=>openCommentAuthor(c.author)} disabled={!c.author?.id} aria-label={`Ver perfil de ${c.author?.display_name||c.author?.username||"usuario"}`}>{c.author?.avatar_url?<img src={c.author.avatar_url} alt=""/>:(c.author?.display_name||c.author?.username||"U").slice(0,1).toUpperCase()}{onlineDot(c.author?.id)}</button>
            <div className="rivyza-comment-content"><button type="button" className="rivyza-comment-name rivyza-comment-profile-link" onClick={()=>openCommentAuthor(c.author)} disabled={!c.author?.id}>{c.author?.display_name||c.author?.username||"Usuario"}</button><span>{renderMentionText(c.body)}</span><small>{formatPostDate(c.created_at)}</small></div>
            {(c.user_id===user?.id||selectedPost?.user_id===user?.id)&&<button type="button" className="rivyza-comment-delete" onClick={()=>deleteComment(c.id)} aria-label="Eliminar comentario">{t("Eliminar")}</button>}
          </div>)}
        </div>
        {commentError&&<p className="rivyza-comment-error">{commentError}</p>}
        {postCommentPrivacy==="nobody"&&selectedPost?.user_id!==user?.id?<p className="rivyza-comment-error">El autor desactivó los comentarios.</p>:null}
        <form className="rivyza-comment-compose" onSubmit={sendComment}>
          <input aria-label="Escribir comentario" placeholder="Escribe un comentario…" disabled={postCommentPrivacy==="nobody"&&selectedPost?.user_id!==user?.id} value={commentDraft} maxLength={1000} onChange={e=>{setCommentDraft(e.target.value);setMentionContext("comment");}}/>
          <button type="submit" disabled={!commentDraft.trim()||commentSending||(postCommentPrivacy==="nobody"&&selectedPost?.user_id!==user?.id)}>{commentSending?"Enviando…":"Enviar"}</button>
        </form>
        {mentionSuggestions("comment")}
      </div>
    </div>
  );}

  function formatPostDate(value){
    if(!value)return "fecha no disponible";
    const d=new Date(value);
    if(Number.isNaN(d.getTime()))return "fecha no disponible";
    return new Intl.DateTimeFormat("es-US",{day:"numeric",month:"short",year:"numeric",hour:"numeric",minute:"2-digit",hour12:true})
      .format(d).replace(",", " ·").replace("a. m.","AM").replace("p. m.","PM");
  }

  async function openPost(post){
    setSelectedPost(post);
    setPostMenuOpen(false);
    setCommentsOpen(false);
    setPostActionMessage("");
    setPostLikeCount(Number(post.like_count||0));
    setPostCommentCount(Number(post.comment_count||0));
    setPostLiked(false);
    if(!supabase)return;
    getCommentCounts([post.id]).then(counts=>{if(counts!==null){const n=counts[post.id]||0;setPostCommentCount(n);syncCommentCount(post.id,n);}});
    try{
      const {data:countData}=await supabase.rpc("get_post_like_count",{target_post_id:post.id});
      if(countData!==null && countData!==undefined)setPostLikeCount(Number(countData)||0);
      if(user?.id){
        const {data:mine}=await supabase.from("post_likes").select("post_id").eq("post_id",post.id).eq("user_id",user.id).maybeSingle();
        setPostLiked(!!mine);
      }
    }catch(e){ console.warn("Likes todavía no configurados:",e); }
  }

  useEffect(()=>{
    if(!selectedPost)return;
    const previousOverflow=document.body.style.overflow;
    const previousHtmlOverflow=document.documentElement.style.overflow;
    document.body.style.overflow="hidden";
    document.documentElement.style.overflow="hidden";
    return ()=>{
      document.body.style.overflow=previousOverflow;
      document.documentElement.style.overflow=previousHtmlOverflow;
    };
  },[selectedPost]);

  useEffect(()=>{
    if(user?.id)loadFollowCounts(user.id,{own:true});
  },[user?.id]);

  useEffect(()=>{
    if(selectedPost?.media_type!=="video")return;
    const video=postViewerVideoRef.current;
    if(!video)return;
    video.currentTime=0;
    const attempt=video.play();
    if(attempt?.catch)attempt.catch(()=>{});
  },[selectedPost?.id,selectedPost?.media_type]);

  function movePost(direction){
    const activePosts=view==="otherProfile" ? viewedProfilePosts : profilePosts;
    if(!selectedPost || activePosts.length<2)return;
    const currentIndex=activePosts.findIndex(post=>post.id===selectedPost.id);
    if(currentIndex<0)return;
    const nextIndex=currentIndex+direction;
    if(nextIndex<0 || nextIndex>=activePosts.length)return;
    openPost(activePosts[nextIndex]);
  }

  function handlePostTouchStart(e){
    postSwipeStartY.current=e.touches?.[0]?.clientY??null;
  }

  function handlePostTouchEnd(e){
    if(postSwipeStartY.current===null)return;
    const endY=e.changedTouches?.[0]?.clientY;
    if(typeof endY!=="number"){postSwipeStartY.current=null;return;}
    const delta=endY-postSwipeStartY.current;
    postSwipeStartY.current=null;
    if(Math.abs(delta)<45)return;
    movePost(delta<0?1:-1);
  }

  function handlePostWheel(e){
    if(Math.abs(e.deltaY)<18 || postWheelLock.current)return;
    postWheelLock.current=true;
    movePost(e.deltaY>0?1:-1);
    window.setTimeout(()=>{postWheelLock.current=false;},420);
  }

  async function togglePostLike(){
    if(!selectedPost || !supabase || !user?.id || postLikeBusyRef.current)return;
    postLikeBusyRef.current=true;
    try{
      if(postLiked){
        const {error}=await supabase.from("post_likes").delete().eq("post_id",selectedPost.id).eq("user_id",user.id);
        if(error)throw error;
        setPostLiked(false);setPostLikeCount(v=>Math.max(0,v-1));
      }else{
        const {error}=await supabase.from("post_likes").insert({post_id:selectedPost.id,user_id:user.id});
        if(error)throw error;
        setPostLiked(true);setPostLikeCount(v=>v+1);
      }
      if(view==="publicProfile"&&profileTab==="likes")loadMyLikedPosts();
      if(selectedPost.user_id===user.id)loadProfileLikeCount(user.id,{own:true});
      else if(viewedProfile?.id===selectedPost.user_id)loadProfileLikeCount(viewedProfile.id);
    }catch(e){setPostActionMessage("Los likes necesitan activar el SQL incluido en el paquete.");}
    finally{postLikeBusyRef.current=false;}
  }

  async function openShare(post){
    if(!post?.id)return;
    setSharePost(post);setShareSearch("");setShareSelected([]);setShareError("");setShareSuccess("");setSharePeople([]);
    setPostMenuOpen(false);
    if(!supabase || !user?.id)return;
    setShareLoading(true);
    try{
      // Amigos: seguimiento mutuo. Consultamos los perfiles reales.
      const [{data:following,error:e1},{data:followers,error:e2}]=await Promise.all([
        supabase.from("follows").select("following_id").eq("follower_id",user.id),
        supabase.from("follows").select("follower_id").eq("following_id",user.id)
      ]);
      if(e1||e2)throw e1||e2;
      const incoming=new Set((followers||[]).map(x=>x.follower_id));
      const friendIds=(following||[]).map(x=>x.following_id).filter(id=>incoming.has(id) && id!==user.id && !blockedUsers.includes(id));
      if(friendIds.length){
        const {data,error}=await supabase.from("profiles").select("id,username,display_name,avatar_url").in("id",friendIds.slice(0,150));
        if(error)throw error;
        setSharePeople((data||[]).sort((a,b)=>(a.display_name||a.username||"").localeCompare(b.display_name||b.username||"")));
      }
    }catch(e){setShareError("No se pudo cargar la lista de amigos: "+(e.message||"Error"));}
    finally{setShareLoading(false);}
  }
  function toggleShareRecipient(id){setShareSelected(old=>old.includes(id)?old.filter(x=>x!==id):[...old,id]);setShareError("");}
  async function sendSharedPost(){
    if(!supabase||!user?.id||!sharePost?.id||!shareSelected.length||shareSending)return;
    setShareSending(true);setShareError("");setShareSuccess("");
    try{
      // Revalidar la relación antes de enviar, y no permitir destinatarios bloqueados.
      const [{data:out,error:outError},{data:incoming,error:inError}]=await Promise.all([
        supabase.from("follows").select("following_id").eq("follower_id",user.id).in("following_id",shareSelected),
        supabase.from("follows").select("follower_id").eq("following_id",user.id).in("follower_id",shareSelected)
      ]);
      if(outError||inError)throw outError||inError;
      const a=new Set((out||[]).map(x=>x.following_id));
      const b=new Set((incoming||[]).map(x=>x.follower_id));
      const recipients=shareSelected.filter(id=>a.has(id)&&b.has(id)&&!blockedUsers.includes(id));
      if(recipients.length!==shareSelected.length)throw new Error("Algún destinatario ya no está disponible como amigo.");
      const rows=recipients.map(id=>({sender_id:user.id,recipient_id:id,body:"Te compartió una publicación",shared_post_id:sharePost.id}));
      const {error}=await supabase.from("rivyza_messages").insert(rows);
      if(error)throw error;
      setShareSuccess(`Publicación enviada a ${recipients.length} ${recipients.length===1?"amigo":"amigos"}.`);
      setShareSelected([]);
      await loadSocial();
    }catch(e){setShareError("No se pudo enviar: "+(e.message||"Error"));}
    finally{setShareSending(false);}
  }
  async function shareOutside(){
    if(!sharePost?.id)return;
    if(sharePrivate){setShareError("Esta publicación no es pública. No se puede compartir fuera de RIVYZA.");return;}
    const url=`${window.location.origin}/?post=${encodeURIComponent(sharePost.id)}`;
    if(navigator.share){
      try{await navigator.share({title:"RIVYZA",text:"Mira esta publicación en RIVYZA",url});}
      catch(e){if(e?.name!=="AbortError")setShareError("No se pudo abrir el menú de compartir.");}
    }else{
      try{await navigator.clipboard.writeText(url);setShareSuccess("Enlace copiado. Puedes pegarlo en otra aplicación.");}
      catch{setShareError("Tu navegador no permite compartir ni copiar el enlace.");}
    }
  }
  async function copyShareLink(){
    if(!sharePost?.id)return;
    if(sharePrivate){setShareError("Esta publicación no es pública.");return;}
    try{await navigator.clipboard.writeText(`${window.location.origin}/?post=${encodeURIComponent(sharePost.id)}`);setShareSuccess("Enlace copiado.");setShareError("");}
    catch{setShareError("No se pudo copiar el enlace.");}
  }
  useEffect(()=>{
    if(!user?.id||!supabase||typeof window==="undefined")return;
    const postId=new URLSearchParams(window.location.search).get("post");
    if(!postId)return;
    let cancelled=false;
    (async()=>{
      const {data,error}=await supabase.from("posts").select("*").eq("id",postId).maybeSingle();
      if(cancelled)return;
      if(!error&&data){setView("home");openPost(data);}
      else setPostActionMessage("La publicación no está disponible o no tienes permiso para verla.");
      window.history.replaceState({},"",window.location.pathname);
    })();
    return()=>{cancelled=true;};
  },[user?.id,supabase]);

  function renderShareSheet(){
    if(!sharePost)return null;
    const people=sharePeople.filter(p=>`${p.display_name||""} ${p.username||""}`.toLocaleLowerCase().includes(shareSearch.trim().toLocaleLowerCase()));
    return createPortal(<div className="rivyza-share-backdrop" onClick={()=>{if(!shareSending)setSharePost(null);}}>
      <section className="rivyza-share-sheet" role="dialog" aria-modal="true" aria-label="Compartir publicación" onClick={e=>e.stopPropagation()}>
        <div className="rivyza-share-grip"/><header><strong>Compartir publicación</strong><button type="button" onClick={()=>setSharePost(null)} aria-label="Cerrar"><X size={22}/></button></header>
        <div className="rivyza-share-search"><Search size={19}/><input placeholder="Buscar amigos de RIVYZA" value={shareSearch} onChange={e=>setShareSearch(e.target.value)}/></div>
        <h4>ENVIAR A AMIGOS</h4>
        {shareLoading?<p className="rivyza-share-hint">Buscando amigos…</p>:people.length?<div className="rivyza-share-friends">{people.map(person=><button key={person.id} type="button" className={shareSelected.includes(person.id)?"chosen":""} onClick={()=>toggleShareRecipient(person.id)}><span className="rivyza-share-avatar">{person.avatar_url?<img src={person.avatar_url} alt=""/>:(person.display_name||person.username||"R").slice(0,1).toUpperCase()}{shareSelected.includes(person.id)&&<span className="rivyza-share-check"><Check size={13}/></span>}</span><small>{person.display_name||person.username||"Usuario"}</small></button>)}</div>:<p className="rivyza-share-hint">{shareSearch?"No hay amigos con ese nombre.":"Tus amigos (seguimiento mutuo) aparecerán aquí."}</p>}
        {shareSelected.length>0&&<button type="button" className="rivyza-share-send" disabled={shareSending} onClick={sendSharedPost}><Send size={18}/>{shareSending?"Enviando…":`Enviar a ${shareSelected.length} ${shareSelected.length===1?"amigo":"amigos"}`}</button>}
        <h4>COMPARTIR EN OTRAS APLICACIONES</h4>
        <div className="rivyza-share-external">
          <button type="button" onClick={shareOutside}><span className="rivyza-share-round"><Share2/></span><small>Más aplicaciones</small></button>
          <button type="button" onClick={copyShareLink}><span className="rivyza-share-round"><LinkIcon/></span><small>Copiar enlace</small></button>
        </div>
        <p className="rivyza-share-hint">Al tocar «Más aplicaciones», tu teléfono mostrará WhatsApp, Facebook, Mensajes y otras aplicaciones compatibles que tengas instaladas.</p>
        {sharePrivate&&<p className="rivyza-share-warning">Esta publicación no es pública. Los enlaces externos están desactivados.</p>}
        {shareError&&<p className="rivyza-share-warning" role="alert">{shareError}</p>}
        {shareSuccess&&<p className="rivyza-share-success" role="status">{shareSuccess}</p>}
      </section>
    </div>,document.body);
  }

  async function copyPostLink(){
    const url=`${window.location.origin}/?post=${selectedPost?.id||""}`;
    try{await navigator.clipboard.writeText(url);setPostActionMessage("Enlace copiado.");}
    catch{setPostActionMessage("No se pudo copiar el enlace.");}
    setPostMenuOpen(false);
  }

  async function setPostPin(position){
    if(!selectedPost || selectedPost.user_id!==user?.id)return;
    try{
      if(position){
        await supabase.from("posts").update({pinned_position:null}).eq("user_id",user.id).eq("pinned_position",position);
      }
      const {error}=await supabase.from("posts").update({pinned_position:position}).eq("id",selectedPost.id).eq("user_id",user.id);
      if(error)throw error;
      setSelectedPost(p=>({...p,pinned_position:position}));
      setPostMenuOpen(false);
      await loadProfilePosts();
      setPostActionMessage(position?`Fijada en posición ${position}.`:"Publicación desfijada.");
    }catch(e){setPostActionMessage("No se pudo cambiar el pin.");}
  }

  async function deleteSelectedPost(){
    if(!selectedPost || selectedPost.user_id!==user?.id)return;
    try{
      const {error}=await supabase.from("posts").delete().eq("id",selectedPost.id).eq("user_id",user.id);
      if(error)throw error;
      const marker="/storage/v1/object/public/media/";
      if(selectedPost.media_path?.includes(marker)){
        const path=decodeURIComponent(selectedPost.media_path.split(marker)[1]);
        await supabase.storage.from("media").remove([path]);
      }
      setSelectedPost(null);setPostMenuOpen(false);await loadProfilePosts();
    }catch(e){setPostActionMessage("No se pudo eliminar la publicación.");}
  }

  useEffect(()=>{
    if(!supabase){setLoading(false);return;}

    let alive=true;
    let initialized=false;
    let initialRouteChosen=false;

    async function routeSignedInUser(u){
      if(!u || !alive)return;
      setUser(u);
      const existingProfile=await loadProfile(u);
      if(!alive)return;
      setView(existingProfile ? "home" : "profile");
      initialRouteChosen=true;
    }

    async function initialize(){
      // getSession() restores the saved browser/device session from storage.
      const {data,error}=await supabase.auth.getSession();
      if(!alive)return;

      if(error){
        console.error("Session restore error:",error);
      }

      const session=data?.session??null;

      if(session?.user){
        await routeSignedInUser(session.user);
      }else{
        setUser(null);
        setProfile(null);
      }

      initialized=true;
      if(alive)setLoading(false);
    }

    initialize();

    const {data:l}=supabase.auth.onAuthStateChange((event,session)=>{
      if(!alive)return;

      // Initial session is already handled by getSession() above.
      if(event==="INITIAL_SESSION" && !initialized)return;

      const u=session?.user??null;

      if(!u){
        setUser(null);
        setProfile(null);
        setView("home");
        setLoading(false);
        return;
      }

      // Route only once. Later Supabase session events must preserve the current screen.
      if(!initialRouteChosen){
        routeSignedInUser(u);
      }else{
        setUser(u);
      }
      setLoading(false);
    });

    return()=>{
      alive=false;
      l.subscription.unsubscribe();
    };
  },[supabase,loadProfile]);

  useEffect(()=>{
    if(!uploadOpen || uploadFile)return;
    startCamera(cameraFacing);
    return()=>{ stopCamera(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[uploadOpen,cameraMode]);


  async function signInWithGoogle(){
    await supabase.auth.signInWithOAuth({provider:"google",options:{redirectTo:window.location.origin}});
  }

  async function signOut(){await supabase.auth.signOut();}

  function norm(v){
    return v.replace(/\s+/g,"").replace(/[^A-Za-z0-9._]/g,"").slice(0,24);
  }

  


 async function applyCameraZoom(next){
   const track=cameraZoomTrackRef.current;
   const range=cameraZoomRange;
   if(!track || !range)return;
   const value=Math.max(range.min,Math.min(range.max,Number(next)));
   try{
     await track.applyConstraints({advanced:[{zoom:value}]});
     setCameraZoom(value);
   }catch(err){console.warn("Zoom no disponible:",err);}
 }
 function zoomGestureStart(e){
   if(!cameraZoomRange)return;
   const y=e.touches?.[0]?.clientY;
   if(y!==undefined)cameraZoomGestureRef.current={y,zoom:cameraZoom};
 }
 function zoomGestureMove(e){
   const start=cameraZoomGestureRef.current;
   if(!start || !cameraZoomRange)return;
   e.preventDefault();
   const y=e.touches?.[0]?.clientY;
   if(y===undefined)return;
   const delta=(start.y-y)/240*(cameraZoomRange.max-cameraZoomRange.min);
   applyCameraZoom(start.zoom+delta);
 }

 async function stopCamera(){
   cameraZoomTrackRef.current=null;
   setCameraZoomRange(null);
   setCameraZoom(1);
   if(cameraStream){
     cameraStream.getTracks().forEach(t=>t.stop());
   }
   setCameraStream(null);
   if(recordTimerRef.current){
     clearInterval(recordTimerRef.current);
     recordTimerRef.current=null;
   }
   setRecording(false);
   setRecordSeconds(0);
 }

 async function startCamera(facing=cameraFacing){
   setCameraError("");
   try{
     await stopCamera();
     if(!navigator?.mediaDevices?.getUserMedia){
       setCameraError("La cámara no está disponible en este navegador.");
       return;
     }

     const stream=await navigator.mediaDevices.getUserMedia({
       video:{facingMode:{ideal:facing},width:{ideal:1080},height:{ideal:1920},aspectRatio:{ideal:9/16}},
       audio:cameraMode==="video"
     });

     const track=stream.getVideoTracks()[0];
     cameraZoomTrackRef.current=track || null;
     const caps=track?.getCapabilities?.();
     const range=caps?.zoom;
     if(range && Number.isFinite(range.min) && Number.isFinite(range.max) && range.max>range.min){
       setCameraZoomRange({min:range.min,max:range.max});
       const current=track.getSettings?.().zoom ?? Math.max(1,range.min);
       setCameraZoom(current);
     }else{
       setCameraZoomRange(null);
       setCameraZoom(1);
     }
     setCameraStream(stream);
     setTimeout(()=>{
       if(cameraVideoRef.current){
         cameraVideoRef.current.srcObject=stream;
         cameraVideoRef.current.play().catch(()=>{});
       }
     },0);
   }catch(err){
     console.error(err);
     setCameraError("No se pudo abrir la cámara. Revisa los permisos.");
   }
 }

 async function flipCamera(){
   const next=cameraFacing==="user"?"environment":"user";
   setCameraFacing(next);
   await startCamera(next);
 }

 async function capturePhoto(){
   const video=cameraVideoRef.current;
   if(!video || !video.videoWidth)return;

   const canvas=document.createElement("canvas");
   // Match the visible full-screen object-fit:cover preview, without stretching.
   const bounds=video.getBoundingClientRect();
   const displayW=bounds.width || 9;
   const displayH=bounds.height || 16;
   const sourceW=video.videoWidth;
   const sourceH=video.videoHeight;
   const targetRatio=displayW/displayH;
   let cropW=sourceW, cropH=sourceH;
   if(sourceW/sourceH>targetRatio) cropW=sourceH*targetRatio;
   else cropH=sourceW/targetRatio;
   const cropX=(sourceW-cropW)/2;
   const cropY=(sourceH-cropH)/2;
   canvas.width=Math.round(cropW);
   canvas.height=Math.round(cropH);
   const ctx=canvas.getContext("2d");

   if(cameraFacing==="user"){
     ctx.translate(canvas.width,0);
     ctx.scale(-1,1);
   }
   ctx.drawImage(video,cropX,cropY,cropW,cropH,0,0,canvas.width,canvas.height);

   const blob=await new Promise(resolve=>canvas.toBlob(resolve,"image/jpeg",0.92));
   if(!blob)return;

   const file=new File([blob],`rivyza-photo-${Date.now()}.jpg`,{type:"image/jpeg"});
   setUploadType("photo");
   setUploadFile(file);
   if(uploadPreview) URL.revokeObjectURL(uploadPreview);
   setUploadPreview(URL.createObjectURL(file));
   await stopCamera();
 }

 async function startRecording(){
   if(!cameraStream || recording)return;

   const preferred=[
     "video/mp4;codecs=h264,aac",
     "video/mp4",
     "video/webm;codecs=vp9,opus",
     "video/webm"
   ];
   const mime=preferred.find(t=>window.MediaRecorder && MediaRecorder.isTypeSupported?.(t)) || "";

   try{
     const rec=new MediaRecorder(cameraStream,mime?{mimeType:mime}:undefined);
     recordedChunksRef.current=[];
     mediaRecorderRef.current=rec;

     rec.ondataavailable=(e)=>{
       if(e.data?.size) recordedChunksRef.current.push(e.data);
     };

     rec.onstop=async()=>{
       const type=rec.mimeType || "video/mp4";
       const blob=new Blob(recordedChunksRef.current,{type});
       const ext=type.includes("webm")?"webm":"mp4";
       const file=new File([blob],`rivyza-video-${Date.now()}.${ext}`,{type});
       setUploadType("video");
       setUploadFile(file);
       if(uploadPreview) URL.revokeObjectURL(uploadPreview);
       setUploadPreview(URL.createObjectURL(file));
       await stopCamera();
     };

     rec.start(1000);
     setRecording(true);
     setRecordSeconds(0);

     recordTimerRef.current=setInterval(()=>{
       setRecordSeconds(s=>{
         const next=s+1;
         if(next>=recordLimit){
           try{mediaRecorderRef.current?.stop();}catch{}
         }
         return next;
       });
     },1000);
   }catch(err){
     console.error(err);
     setCameraError("Este navegador no permite grabar video aquí. Puedes elegir un video de la galería.");
   }
 }

 function stopRecording(){
   try{
     if(mediaRecorderRef.current?.state==="recording"){
       mediaRecorderRef.current.stop();
     }
   }catch{}
 }

 function resetUpload(){
   if(uploadPreview) URL.revokeObjectURL(uploadPreview);
   setUploadFile(null);
   setUploadPreview("");
   setUploadCaption("");
   setUploadVisibility("public");
   setUploadMessage("");
 }

 function chooseUploadType(type){
   resetUpload();
   setUploadType(type);
 }

 function onPickPostFile(e){
   const file=e.target.files?.[0];
   if(!file)return;

   const isPhoto=file.type.startsWith("image/");
   const isVideo=file.type.startsWith("video/");

   if(uploadType==="photo" && !isPhoto){
     setUploadMessage("Selecciona una imagen.");
     return;
   }

   if(uploadType==="video" && !isVideo){
     setUploadMessage("Selecciona un video.");
     return;
   }

   if(file.size > 50*1024*1024){
     setUploadMessage("El archivo supera el límite de 50 MB.");
     return;
   }

   setUploadFile(file);
   setUploadPreview(URL.createObjectURL(file));
   setUploadMessage("");
 }

 async function publishPost(){
   if(!user || !supabase || !uploadFile)return;

   setUploadingPost(true);
   setUploadMessage("");

   try{
     const ext=(uploadFile.name.split(".").pop()|| (uploadType==="photo"?"jpg":"mp4")).toLowerCase();
     const path=`${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

     const {error:uploadError}=await supabase.storage
       .from("media")
       .upload(path,uploadFile,{
         cacheControl:"3600",
         upsert:false,
         contentType:uploadFile.type
       });

     if(uploadError)throw uploadError;

     const {data:pub}=supabase.storage.from("media").getPublicUrl(path);
     const publicUrl=pub?.publicUrl;

     const {data:newPost,error:postError}=await supabase
       .from("posts")
       .insert({
         user_id:user.id,
         media_type:uploadType,
         media_path:publicUrl || path,
         caption:uploadCaption.trim() || null,
         visibility:uploadVisibility,
         duration_seconds:uploadType==="video" ? recordLimit : null
       })
       .select("*")
       .single();

     if(postError){
       await supabase.storage.from("media").remove([path]);
       throw postError;
     }

     setUploadMessage("Publicado.");
     if(newPost){
       setProfilePosts(prev=>{
         const next=[newPost,...prev.filter(p=>p.id!==newPost.id)];
         return next.sort((a,b)=>{
           const ap=a.pinned_position ?? 99, bp=b.pinned_position ?? 99;
           if(ap!==bp)return ap-bp;
           return new Date(b.created_at)-new Date(a.created_at);
         });
       });
     }
     resetUpload();
     setUploadOpen(false);
     setSelectedPost(null);
     setView("publicProfile");
     await loadProfilePosts();
   }catch(err){
     console.error(err);
     setUploadMessage(err?.message || "No se pudo publicar.");
   }finally{
     setUploadingPost(false);
   }
 }


 function renderUploadModal(){
   if(!uploadOpen || typeof document==="undefined") return null;

   const composer=(
     <div className="camera-composer">
       {!uploadFile ? (
         <>
           <div className="camera-stage">
             <video
               ref={cameraVideoRef}
               className={`camera-live ${cameraFacing==="user"?"mirror":""}`}
               autoPlay
               muted
               playsInline
             />

             <div className="rivyza-camera-zoom" aria-label="Zoom de cámara">
               {!cameraPanelCollapsed ? (
                 <div className="rivyza-zoom-presets">
                   {[0.5,1,2,4,8].map(level=>(
                     <button key={level} type="button"
                       disabled={!cameraZoomRange || level<cameraZoomRange.min || level>cameraZoomRange.max}
                       className={Math.abs(cameraZoom-level)<0.12?"active":""}
                       onClick={()=>applyCameraZoom(level)}>{level}×</button>
                   ))}
                 </div>
               ) : cameraZoomRange ? (
                 <div className="rivyza-zoom-swipe"
                   onTouchStart={zoomGestureStart}
                   onTouchMove={zoomGestureMove}
                   onTouchEnd={()=>{cameraZoomGestureRef.current=null;}}
                   onTouchCancel={()=>{cameraZoomGestureRef.current=null;}}
                   aria-label="Desliza hacia arriba para acercar y abajo para alejar">
                   <span>↕ {cameraZoom.toFixed(1)}×</span>
                 </div>
               ) : <span className="rivyza-zoom-unavailable">Zoom no disponible en este navegador</span>}
             </div>

             <div className="camera-topbar">
               <button className="camera-icon-btn" onClick={async()=>{await stopCamera();setUploadOpen(false);}}>
                 <X size={30}/>
               </button>
               <div className="camera-brand-pill">RIVYZA</div>
               <button className="camera-icon-btn" onClick={flipCamera}>↻</button>
             </div>
{cameraError && <div className="camera-error">{cameraError}</div>}

             <div
               className={`camera-bottom ${cameraPanelCollapsed?"collapsed":""}`}
               onTouchStart={cameraPanelTouchStart}
               onTouchEnd={cameraPanelTouchEnd}
             >
               <button
                 className="camera-panel-handle"
                 type="button"
                 aria-label={cameraPanelCollapsed?"Mostrar opciones":"Ocultar opciones"}
                 onClick={()=>setCameraPanelCollapsed(v=>!v)}
               ><span></span></button>
               <div className="camera-mode-tabs">
                  <button
                    className={cameraMode==="photo"?"active":""}
                    onClick={()=>chooseCameraMode("photo")}
                  >
                    FOTO
                  </button>
                  <button
                    className={cameraMode==="video" && recordLimit===10?"active":""}
                    onClick={()=>chooseCameraMode("video",10)}
                  >
                    10s
                  </button>
                  <button
                    className={cameraMode==="video" && recordLimit===30?"active":""}
                    onClick={()=>chooseCameraMode("video",30)}
                  >
                    30s
                  </button>
                  <button
                    className={cameraMode==="video" && recordLimit===60?"active":""}
                    onClick={()=>chooseCameraMode("video",60)}
                  >
                    60s
                  </button>
                </div>

               <div className="camera-controls-row">
                 <label className="gallery-button camera-profile-thumb" aria-label="Abrir galería">
                   {avatarUrl ? <img src={avatarUrl} alt="" /> : <span>{(displayName||username||"R").charAt(0).toUpperCase()}</span>}
                   <small>Galería</small>
                   <input
                     type="file"
                     accept={cameraMode==="photo" ? "image/jpeg,image/png,image/webp" : "video/mp4,video/quicktime,video/webm"}
                     onChange={(e)=>{setUploadType(cameraMode==="photo"?"photo":"video");onPickPostFile(e);}}
                     hidden
                   />
                 </label>

                 {cameraMode==="photo" ? (
                   <button className="shutter-button" onClick={capturePhoto}><span></span></button>
                 ) : (
                   <button
                     className={`record-button ${recording?"recording":""}`}
                     onClick={recording?stopRecording:startRecording}
                   >
                     {recording && (
                       <svg
                         className="record-progress-ring"
                         viewBox="0 0 100 100"
                         aria-hidden="true"
                         style={{"--record-duration":`${recordLimit}s`}}
                       >
                         <defs>
                           <linearGradient id="rivyzaRecordGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                             <stop offset="0%" stopColor="#ff2bd6"/>
                             <stop offset="100%" stopColor="#00a8ff"/>
                           </linearGradient>
                         </defs>
                         <circle
                           className="record-progress-track"
                           cx="50" cy="50" r="46"
                           pathLength="100"
                         />
                         <circle
                           className="record-progress-value"
                           cx="50" cy="50" r="46"
                           pathLength="100"
                         />
                       </svg>
                     )}
                     <span></span>
                   </button>
                 )}

                 <button className="camera-effects-placeholder" type="button" onClick={()=>setUploadMessage("Efectos estarán disponibles próximamente.")}>
                   <span>✦</span>
                   <small>Efectos</small>
                 </button>
               </div>

               <div className="camera-create-tabs">
                 <button className="active" type="button">POST</button>
                 <button type="button" onClick={()=>setUploadMessage("Crear estará disponible próximamente.")}>CREAR</button>
                 <button type="button" onClick={()=>{stopCamera();setUploadOpen(false);setView("liveStudio");}}>LIVE</button>
               </div>
             </div>
           </div>
         </>
       ) : (
         <div className="post-editor-screen">
           <div className="upload-header">
             <button onClick={()=>{resetUpload();setTimeout(()=>startCamera(cameraFacing),0);}}>←</button>
             <strong>Nueva publicación</strong>
             <button onClick={async()=>{resetUpload();await stopCamera();setUploadOpen(false);}}><X/></button>
           </div>

           <div className={`upload-preview editor-preview ${uploadType === "video" ? "editor-preview-video" : ""}`}>
             {uploadType==="photo"
               ? <img src={uploadPreview} alt="Vista previa"/>
               : <video src={uploadPreview} controls playsInline/>
             }
           </div>

           <label className="upload-field">
             <span>Descripción</span>
             <textarea
               value={uploadCaption}
               onChange={(e)=>{setUploadCaption(e.target.value.slice(0,220));setMentionContext("caption");}}
               placeholder="Escribe algo sobre tu publicación…"
               rows={3}
             />
             <small>{uploadCaption.length}/220</small>
             {mentionSuggestions("caption")}
           </label>

           <label className="upload-field">
             <span>{t("Privacidad")}</span>
             <select value={uploadVisibility} onChange={(e)=>setUploadVisibility(e.target.value)}>
               <option value="public">Público</option>
               <option value="followers">Solo seguidores</option>
               <option value="private">{t("Solo yo")}</option>
             </select>
           </label>

           {uploadMessage && <div className="upload-message">{uploadMessage}</div>}

           <button
             className="publish-post-btn"
             onClick={publishPost}
             disabled={!uploadFile || uploadingPost}
           >
             {uploadingPost ? "Publicando…" : "Publicar"}
           </button>
         </div>
       )}
     </div>
   );

   return createPortal(composer,document.body);
 }

 function normalizeExternalUrl(value){
   const v=(value||"").trim();
   if(!v)return null;
   if(/^https?:\/\//i.test(v))return v;
   return `https://${v}`;
 }

 async function saveProfile(e){
    e.preventDefault();
    const clean=profile?.username||norm(username);

    if(!profile && clean.length<3){
      setMessage("El @usuario debe tener por lo menos 3 caracteres.");
      return;
    }

    if(!displayName.trim()){
      setMessage("Escribe tu nombre para mostrar.");
      return;
    }

    setSaving(true);setMessage("");

    const payload={
      id:user.id,
      username:clean,
      display_name:displayName.trim(),
      bio:bio.trim().slice(0,160),
      avatar_url:avatarUrl||null,
     website_url:normalizeExternalUrl(websiteUrl),
     youtube_url:normalizeExternalUrl(youtubeUrl),
     instagram_url:normalizeExternalUrl(instagramUrl),
     facebook_url:normalizeExternalUrl(facebookUrl),
     country_code:countryCode||null,
     country_name:countryName||null,
     show_country:showCountry
    };

    const {data,error}=await supabase.from("profiles").upsert(payload,{onConflict:"id"}).select().single();

    if(error){
      setMessage(error.code==="23505"?"Ese @usuario ya está ocupado.":"No se pudo guardar el perfil.");
    }else{
      setProfile(data);
      setUsername(data.username||"");
      setCountryCode(data.country_code||"");
      setCountryName(data.country_name||"");
      setShowCountry(data.show_country!==false);
      setView("home");
    }
    setSaving(false);
  }

  function onPickPhoto(e){
    const f=e.target.files?.[0];
    if(!f)return;
    if(!["image/jpeg","image/png","image/webp"].includes(f.type)){
      setMessage("Usa JPG, PNG o WEBP.");return;
    }
    if(f.size>5*1024*1024){
      setMessage("La foto no puede pesar más de 5 MB.");return;
    }
    const r=new FileReader();
    r.onload=()=>{setCropSrc(r.result);setCrop({x:0,y:0});setZoom(1);setCropOpen(true);};
    r.readAsDataURL(f);
  }

  const onCropComplete=useCallback((_a,p)=>setCroppedPixels(p),[]);

  async function uploadAvatar(){
    if(!croppedPixels)return;
    setUploadingAvatar(true);setMessage("");
    try{
      const blob=await getCroppedBlob(cropSrc,croppedPixels);
      const path=`${user.id}/avatar.jpg`;

      const {error:upErr}=await supabase.storage.from("avatars").upload(path,blob,{
        contentType:"image/jpeg",upsert:true,cacheControl:"3600"
      });
      if(upErr)throw upErr;

      const {data:p}=supabase.storage.from("avatars").getPublicUrl(path);
      const url=`${p.publicUrl}?v=${Date.now()}`;

      const {data:updated,error:profErr}=await supabase.from("profiles").update({avatar_url:url}).eq("id",user.id).select().single();
      if(profErr)throw profErr;

      setAvatarUrl(url);
      setProfile(updated);
      setCropOpen(false);
      setMessage("Foto de perfil actualizada.");
    }catch(e){
      console.error(e);
      setMessage("No se pudo cambiar la foto.");
    }finally{
      setUploadingAvatar(false);
    }
  }

  async function loadMentionNotices(){
    if(!supabase||!user?.id)return;
    const {data,error}=await supabase.from("rivyza_mention_notifications").select("id,actor_id,post_id,source_type,created_at,read_at").eq("recipient_id",user.id).order("created_at",{ascending:false}).limit(80);
    if(error)return;
    const actors=[...new Set((data||[]).map(n=>n.actor_id))];
    const {data:profiles}=actors.length?await supabase.from("profiles").select("id,username,display_name,avatar_url").in("id",actors):{data:[]};
    const byId=Object.fromEntries((profiles||[]).map(x=>[x.id,x]));
    setMentionNotices((data||[]).map(n=>({...n,kind:"mention",actor:byId[n.actor_id]})));
  }
  async function openMentionNotice(notice){
    const {error}=await supabase.from("rivyza_mention_notifications").update({read_at:new Date().toISOString()}).eq("id",notice.id).eq("recipient_id",user.id);
    if(!error)setMentionNotices(old=>old.map(n=>n.id===notice.id?{...n,read_at:new Date().toISOString()}:n));
    const {data:post}=await supabase.from("posts").select("*").eq("id",notice.post_id).maybeSingle();
    if(!post){setSocialError("La publicación mencionada ya no está disponible.");return;}
    setPostOpenedFromAlert(true);setProfileTab("posts");setView("publicProfile");await openPost(post);
    if(notice.source_type==="comment")openComments(post);
  }
  async function loadPrivateStatus(){
    if(!supabase||!user?.id)return;
    const {data,error}=await supabase.rpc("rivyza_private_status");
    if(!error&&data){setPrivateStatus(data);setPrivateMode(data.configured?"unlock":"create");}
  }
  async function unlockPrivate(){
    setPrivateError("");
    if(!/^\d{4}$/.test(privatePin)){setPrivateError("Introduce cuatro números.");return;}
    if(privateMode==="create"){
      if(privatePin!==privateConfirm){setPrivateError("Los PIN no coinciden.");return;}
      const {error}=await supabase.rpc("rivyza_private_create_pin",{p_pin:privatePin});
      if(error){
        if(/Ya tienes un PIN configurado/i.test(error.message||"")){setPrivateMode("unlock");setPrivateConfirm("");await loadPrivateStatus();setPrivateError("Ya tienes un PIN. Introduce tus cuatro números para entrar.");return;}
        setPrivateError(error.message);return;
      }
      const {data:createdUnlock,error:createdUnlockError}=await supabase.rpc("rivyza_private_unlock",{p_pin:privatePin});
      if(createdUnlockError||!createdUnlock?.ok){setPrivateError("PIN creado, pero no se pudo desbloquear. Inténtalo de nuevo.");setPrivateMode("unlock");return;}
    }else{
      const {data,error}=await supabase.rpc("rivyza_private_unlock",{p_pin:privatePin});
      if(error||!data?.ok){setPrivateError(data?.message||error?.message||"PIN incorrecto");await loadPrivateStatus();setPrivatePin("");return;}
    }
    setPrivatePin("");setPrivateConfirm("");setPrivateUnlocked(true);await loadPrivatePeers();setView("privateInbox");
  }
  async function loadPrivatePeers(){
    const {data,error}=await supabase.rpc("rivyza_private_peers");
    if(!error)setPrivatePeers((data||[]).map(x=>x.peer_id));
  }
  async function openPrivateInbox(){
    setPrivateError("");setPrivatePin("");setPrivateConfirm("");setPrivateUnlocked(false);
    await loadPrivateStatus();setView("privateGate");
  }
  async function togglePrivatePeer(peerId,makePrivate){
    if(!window.confirm(makePrivate?"¿Mover toda esta conversación a Mensajes privados?":"¿Devolver esta conversación a Mensajes normales?"))return;
    const {error}=await supabase.rpc("rivyza_private_set_peer",{p_peer_id:peerId,p_private:makePrivate});
    if(error){setSocialError(error.message);return;}
    setPrivatePeers(old=>makePrivate?[...new Set([...old,peerId])]:old.filter(id=>id!==peerId));
    setPrivateSwipeId(null);setSwipedConversationId(null);
  }
  async function loadSocial(){
    if(!supabase || !user?.id || socialPollBusy.current)return;
    socialPollBusy.current=true;
    try{
      const [notices,messages,hidden,cleared]=await Promise.all([
        supabase.from("rivyza_notifications").select("*").eq("recipient_id",user.id).order("created_at",{ascending:false}).limit(80),
        supabase.from("rivyza_messages").select("*").or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`).order("created_at",{ascending:false}).limit(150),
        supabase.from("rivyza_hidden_messages").select("message_id").eq("user_id",user.id),
        supabase.from("rivyza_cleared_conversations").select("peer_id,cleared_at").eq("user_id",user.id)
      ]);
      if(notices.error || messages.error){setSocialError("Primero configura RIVYZA_SOCIAL_V1.sql en Supabase.");return;}
      const ids=[...new Set([...(notices.data||[]).map(n=>n.actor_id),...(messages.data||[]).flatMap(m=>[m.sender_id,m.recipient_id])])];
      const {data:people}=ids.length?await supabase.from("profiles").select("id,username,display_name,avatar_url").in("id",ids):{data:[]};
      const byId=Object.fromEntries((people||[]).map(x=>[x.id,x]));
      const postIds=[...new Set((notices.data||[]).filter(n=>(n.kind==="like"||n.kind==="comment")&&n.post_id).map(n=>n.post_id))];
      const {data:noticePosts}=postIds.length?await supabase.from("posts").select("id,media_path,media_type").in("id",postIds):{data:[]};
      const postsById=Object.fromEntries((noticePosts||[]).map(post=>[post.id,post]));
      setSocialNotices((notices.data||[]).map(n=>({...n,actor:byId[n.actor_id],relatedPost:postsById[n.post_id]||null})));
      setSocialMessages((messages.data||[]).filter(m=>!m.deleted_for_all && (!m.audio_path || !m.audio_expires_at || new Date(m.audio_expires_at)>new Date())).map(m=>({...m,sender:byId[m.sender_id],recipient:byId[m.recipient_id]})));
      if(!hidden.error)setHiddenMessageIds((hidden.data||[]).map(x=>x.message_id));
      if(!cleared.error)setConversationCutoffs(Object.fromEntries((cleared.data||[]).map(x=>[x.peer_id,x.cleared_at])));
      setSocialError("");
      await loadMentionNotices();
      await loadPrivatePeers();
    }catch(e){console.warn("RIVYZA social:",e);}finally{socialPollBusy.current=false;}
  }
  useEffect(()=>{
    if(!user?.id || !supabase)return;
    loadSocial();
    const t=setInterval(()=>{if(document.visibilityState==="visible")loadSocial();},10000);
    const focus=()=>loadSocial();
    document.addEventListener("visibilitychange",focus);
    return()=>{clearInterval(t);document.removeEventListener("visibilitychange",focus);};
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[user?.id,supabase]);
  // Mantener el chat abajo cuando se abre y cuando llegan mensajes nuevos.
  const activeThreadLastId=socialMessages.find(m=>socialPeer && ((m.sender_id===socialPeer.id && m.recipient_id===user?.id)||(m.recipient_id===socialPeer.id && m.sender_id===user?.id)))?.id;
  useEffect(()=>{
    if(view!=="messages" || !socialPeer?.id)return;
    const el=socialThreadRef.current;
    if(el)el.scrollTop=el.scrollHeight;
  },[view,socialPeer?.id,activeThreadLastId]);
  async function markSocialRead(ids){
    if(!ids?.length)return;
    const {error}=await supabase.from("rivyza_notifications").update({read_at:new Date().toISOString()}).eq("recipient_id",user.id).in("id",ids);
    if(!error)setSocialNotices(rows=>rows.map(n=>ids.includes(n.id)?{...n,read_at:new Date().toISOString()}:n));
  }
  function cleanupVoiceVisualizer(){
    voiceAnalyserRef.current=null;
    if(voiceAudioContextRef.current){voiceAudioContextRef.current.close().catch(()=>{});voiceAudioContextRef.current=null;}
  }
  function resetVoice(){
    if(voicePreviewRef.current){voicePreviewRef.current.pause();voicePreviewRef.current.currentTime=0;}
    setVoicePreviewPlaying(false);setVoicePreviewTime(0);setVoicePreviewDuration(0);
    cleanupVoiceVisualizer();
    setVoiceLevels(Array(26).fill(5));
    if(voiceTimerRef.current)clearInterval(voiceTimerRef.current);
    voiceTimerRef.current=null;
    const recorder=voiceRecorderRef.current;
    if(recorder && recorder.state!=="inactive"){recorder.onstop=null;recorder.stop();}
    voiceStreamRef.current?.getTracks().forEach(track=>track.stop());
    voiceRecorderRef.current=null;voiceStreamRef.current=null;
    if(voiceUrl)URL.revokeObjectURL(voiceUrl);
    setVoiceUrl("");setVoiceBlob(null);setVoiceSeconds(0);setVoiceStage("idle");voiceStoppingRef.current=false;
  }
  async function startVoice(){
    if(voiceStage!=="idle" || !navigator.mediaDevices?.getUserMedia || typeof MediaRecorder==="undefined"){
      setSocialError("Este navegador no permite grabar audio. Usa Safari o Chrome actualizado con HTTPS.");return;
    }
    try{
      setSocialError("");
      const stream=await navigator.mediaDevices.getUserMedia({audio:true});
      try{
        const AudioContextClass=window.AudioContext||window.webkitAudioContext;
        if(AudioContextClass){
          const ctx=new AudioContextClass();
          const analyser=ctx.createAnalyser();analyser.fftSize=256;analyser.smoothingTimeConstant=.65;
          ctx.createMediaStreamSource(stream).connect(analyser);
          voiceAudioContextRef.current=ctx;voiceAnalyserRef.current=analyser;
        }
      }catch(_e){cleanupVoiceVisualizer();}
      const formats=["audio/mp4","audio/webm;codecs=opus","audio/webm"];
      const mime=formats.find(x=>MediaRecorder.isTypeSupported(x));
      const recorder=new MediaRecorder(stream,mime?{mimeType:mime}:undefined);
      voiceStreamRef.current=stream;voiceRecorderRef.current=recorder;voiceChunksRef.current=[];voiceStoppingRef.current=false;
      recorder.ondataavailable=e=>{if(e.data?.size)voiceChunksRef.current.push(e.data);};
      recorder.onstop=()=>{
        stream.getTracks().forEach(track=>track.stop());voiceStreamRef.current=null;cleanupVoiceVisualizer();
        const blob=new Blob(voiceChunksRef.current,{type:recorder.mimeType||"audio/webm"});
        if(blob.size){setVoiceBlob(blob);setVoiceUrl(URL.createObjectURL(blob));setVoiceStage("preview");}
        else {setVoiceStage("idle");setSocialError("No se grabó audio. Inténtalo nuevamente.");}
      };
      recorder.onerror=()=>{setSocialError("Error al grabar el audio.");resetVoice();};
      recorder.start(250);voiceStartedRef.current=Date.now();setVoiceSeconds(0);setVoiceStage("recording");
      voiceTimerRef.current=setInterval(()=>{
        const analyser=voiceAnalyserRef.current;
        if(analyser){
          const samples=new Uint8Array(analyser.frequencyBinCount);analyser.getByteTimeDomainData(samples);
          const levels=Array.from({length:26},(_,i)=>{
            let peak=0;const a=Math.floor(i*samples.length/26),b=Math.floor((i+1)*samples.length/26);
            for(let j=a;j<b;j++)peak=Math.max(peak,Math.abs(samples[j]-128)/128);
            return Math.min(26,Math.max(5,Math.round(5+peak*65)));
          });setVoiceLevels(levels);
        }
        const elapsed=Math.min(60,Math.floor((Date.now()-voiceStartedRef.current)/1000));
        setVoiceSeconds(elapsed);
        if(elapsed>=60)stopVoice();
      },250);
    }catch(e){setSocialError("No se pudo usar el micrófono. Revisa los permisos del navegador.");}
  }
  function stopVoice(){
    if(voiceStoppingRef.current)return;
    const recorder=voiceRecorderRef.current;
    if(!recorder || recorder.state==="inactive")return;
    voiceStoppingRef.current=true;
    if(voiceTimerRef.current)clearInterval(voiceTimerRef.current);
    voiceTimerRef.current=null;
    cleanupVoiceVisualizer();
    setVoiceSeconds(Math.min(60,Math.max(1,Math.ceil((Date.now()-voiceStartedRef.current)/1000))));
    recorder.stop();
  }
  async function sendVoice(){
    if(!voiceBlob || !user?.id || !socialPeer?.id || voiceSending)return;
    setVoiceSending(true);setSocialError("");
    const ext=voiceBlob.type.includes("mp4")?"m4a":"webm";
    const path=`${user.id}/${crypto.randomUUID()}.${ext}`;
    try{
      if(voiceBlob.size>8*1024*1024)throw new Error("El audio supera el límite de 8 MB.");
      const {error:uploadError}=await supabase.storage.from("rivyza-voice").upload(path,voiceBlob,{contentType:voiceBlob.type||"audio/webm",upsert:false});
      if(uploadError)throw uploadError;
      const {error:insertError}=await supabase.from("rivyza_messages").insert({sender_id:user.id,recipient_id:socialPeer.id,body:"",audio_path:path,audio_duration:Math.min(60,voiceSeconds)});
      if(insertError){await supabase.storage.from("rivyza-voice").remove([path]);throw insertError;}
      resetVoice();await loadSocial();
    }catch(e){setSocialError("No se pudo enviar el audio: "+(e?.message||"Error desconocido"));}
    finally{setVoiceSending(false);}
  }
  async function playVoice(message){
    if(!message.audio_path)return;
    try{
      if(voiceAudioRef.current){voiceAudioRef.current.pause();voiceAudioRef.current=null;}
      if(voicePlayingId===message.id){setVoicePlayingId(null);return;}
      let url=voiceLinks[message.id];
      if(!url){
        const {data,error}=await supabase.storage.from("rivyza-voice").createSignedUrl(message.audio_path,120);
        if(error)throw error;
        url=data.signedUrl;
        setVoiceLinks(old=>({...old,[message.id]:url}));
      }
      const audio=new Audio(url);voiceAudioRef.current=audio;
      audio.ontimeupdate=()=>{if(Number.isFinite(audio.duration)&&audio.duration>0)setVoiceProgress(old=>({...old,[message.id]:Math.min(1,audio.currentTime/audio.duration)}));};
      audio.onended=()=>{setVoiceProgress(old=>({...old,[message.id]:0}));setVoicePlayingId(null);voiceAudioRef.current=null;};
      audio.onerror=()=>{setVoicePlayingId(null);setSocialError("No se pudo reproducir el audio.");};
      await audio.play();setVoicePlayingId(message.id);
      if(message.recipient_id===user.id && !message.audio_listened_at){
        const {error}=await supabase.rpc("rivyza_mark_voice_listened",{p_message_id:message.id});
        if(!error)setSocialMessages(old=>old.map(m=>m.id===message.id?{...m,audio_listened_at:new Date().toISOString()}:m));
      }
    }catch(e){setVoicePlayingId(null);setSocialError("No se pudo abrir el audio: "+(e?.message||"Error"));}
  }
  async function seekVoice(message,fraction){
    const value=Math.max(0,Math.min(1,fraction));
    setVoiceProgress(old=>({...old,[message.id]:value}));
    if(voicePlayingId===message.id && voiceAudioRef.current){
      const audio=voiceAudioRef.current;
      if(Number.isFinite(audio.duration)&&audio.duration>0)audio.currentTime=value*audio.duration;
      return;
    }
    // Si no está reproduciéndose, iniciar desde la posición seleccionada.
    await playVoice(message);
    const audio=voiceAudioRef.current;
    if(audio){
      const apply=()=>{if(Number.isFinite(audio.duration)&&audio.duration>0)audio.currentTime=value*audio.duration;};
      if(audio.readyState>=1)apply();else audio.addEventListener("loadedmetadata",apply,{once:true});
    }
  }
  useEffect(()=>()=>{
    if(voiceTimerRef.current)clearInterval(voiceTimerRef.current);
    cleanupVoiceVisualizer();
    voiceRecorderRef.current?.state!=="inactive"&&voiceRecorderRef.current?.stop();
    voiceStreamRef.current?.getTracks().forEach(track=>track.stop());
    voiceAudioRef.current?.pause();
  },[]);
  async function openSocialPeer(person){
    if(!person?.id || person.id===user?.id)return;
    setSocialChatReturnView(view==="alerts"?"alerts":view==="inbox"?"inbox":view==="privateInbox"?"privateInbox":view==="messages"?socialChatReturnView:view==="otherProfile"?"otherProfile":view==="publicProfile"?"publicProfile":"alerts");
    resetVoice();setVoiceLinks({});setProfileReturnToChat(false);setSocialPeer(person);setSocialDraft("");setSocialError("");setView("messages");
    await markSocialRead(socialNotices.filter(n=>n.kind==="message" && n.actor_id===person.id && !n.read_at).map(n=>n.id));
    await loadSocial();
  }
  async function clearSocialConversation(peerId){
    if(!user?.id || !peerId)return;
    if(!window.confirm(t("¿Eliminar toda esta conversación solo para ti? La otra persona conservará sus mensajes.")))return;
    const {data,error}=await supabase.rpc("rivyza_clear_conversation",{p_peer_id:peerId});
    if(error){setSocialError(t("No se pudo eliminar la conversación. Ejecuta el SQL de esta actualización en Supabase."));return;}
    const cutoff=data||new Date().toISOString();
    setConversationCutoffs(old=>({...old,[peerId]:cutoff}));
    setSwipedConversationId(null);
    // Remove old message notifications from the inbox badge for this conversation.
    const unreadIds=socialNotices.filter(n=>n.kind==="message"&&n.actor_id===peerId&&!n.read_at).map(n=>n.id);
    if(unreadIds.length)await markSocialRead(unreadIds);
  }
  function conversationSwipeProps(peerId){
    return {
      onTouchStart:e=>{conversationSwipeStartRef.current={id:peerId,x:e.touches[0].clientX,y:e.touches[0].clientY};},
      onTouchEnd:e=>{const start=conversationSwipeStartRef.current;conversationSwipeStartRef.current=null;if(!start||start.id!==peerId)return;const dx=e.changedTouches[0].clientX-start.x,dy=e.changedTouches[0].clientY-start.y;if(Math.abs(dy)>Math.abs(dx))return;if(dx< -55){setSwipedConversationId(peerId);setPrivateSwipeId(null);}else if(dx>55){setPrivateSwipeId(peerId);setSwipedConversationId(null);}}
    };
  }
  async function deleteSocialMessageForEveryone(message){
    if(!user?.id || !message?.id || message.sender_id!==user.id)return;
    if(Date.now()-new Date(message.created_at).getTime()>=180000){
      setSocialError(t("Solo puedes eliminar para todos tus mensajes durante los primeros 3 minutos."));return;
    }
    if(!window.confirm(t("¿Eliminar este mensaje para todos?")))return;
    const {error}=await supabase.rpc("rivyza_delete_message_for_everyone",{p_message_id:message.id});
    if(error){setSocialError(t("No se pudo eliminar para todos.")+" "+error.message);return;}
    setSocialMessages(old=>old.filter(m=>m.id!==message.id));
    setSwipedMessageId(null);
    await loadSocial();
  }
  async function hideSocialMessage(messageId){
    if(!user?.id || !messageId)return;
    if(!window.confirm(t("¿Eliminar este mensaje solo para ti?")))return;
    const {error}=await supabase.from("rivyza_hidden_messages").insert({user_id:user.id,message_id:messageId});
    if(error){setSocialError(t("No se pudo eliminar el mensaje. Ejecuta el SQL de esta actualización en Supabase."));return;}
    setHiddenMessageIds(ids=>[...new Set([...ids,messageId])]);
    setSwipedMessageId(null);
  }
    async function sendSocialMessage(sharedPostId=null){
    const body=socialDraft.trim();
    if(!socialPeer?.id || (!body && !sharedPostId) || socialBusy)return;
    setSocialBusy(true);
    const {error}=await supabase.from("rivyza_messages").insert({sender_id:user.id,recipient_id:socialPeer.id,body:body||(sharedPostId?"Te compartió una publicación":""),shared_post_id:sharedPostId});
    if(error)setSocialError("No se pudo enviar el mensaje: "+error.message);
    else{setSocialDraft("");await loadSocial();}
    setSocialBusy(false);
  }
  async function openSharedPostFromChat(postId){
    if(!postId||!supabase)return;
    setSocialError("");
    const {data,error}=await supabase.from("posts").select("*").eq("id",postId).maybeSingle();
    if(error||!data){setSocialError("La publicación no está disponible o no tienes permiso para verla.");return;}
    setProfileReturnToChat(true);
    setView("publicProfile");
    await openPost(data);
  }
  async function openNotificationPost(notice){
    if(!notice?.post_id || !supabase)return;
    setSocialError("");
    const {data:post,error}=await supabase.from("posts").select("*").eq("id",notice.post_id).maybeSingle();
    if(error || !post){setSocialError("Esta publicación ya no está disponible.");return;}
    // Las notificaciones de likes y comentarios pertenecen al dueño de la publicación.
    // Usamos su vista de perfil, que ya tiene el visor y el panel de comentarios.
    await markSocialRead([notice.id]);
    setPostOpenedFromAlert(true);
    setProfileTab("posts");
    setView("publicProfile");
    await openPost(post);
    if(notice.kind==="comment")openComments(post);
  }
  function closeNotificationPost(){
    setCommentsOpen(false);setSelectedPost(null);setPostMenuOpen(false);
    setPostOpenedFromAlert(false);setView("activity");
  }
  function openSocialInbox(fromView){
    setSocialInboxReturnView(fromView === "alerts" ? "alerts" : "home");
    setView("inbox");
  }
  async function openSocialAlerts(){
    setView("alerts");await loadSocial();
  }
  useEffect(()=>{
    if(!supabase||!user?.id){setMessagePrivacy("everyone");return;}
    let active=true;
    supabase.from("rivyza_message_preferences").select("who_can_message").eq("user_id",user.id).maybeSingle()
      .then(({data,error})=>{if(!active)return;if(error){setMessagePrivacyError("Configura primero el SQL de privacidad en Supabase.");return;}setMessagePrivacy(data?.who_can_message||"everyone");});
    return ()=>{active=false;};
  },[supabase,user?.id]);
  async function saveMessagePrivacy(value){
    if(!supabase||!user?.id||messagePrivacyBusy)return;
    const previous=messagePrivacy;
    setMessagePrivacy(value);setMessagePrivacyBusy(true);setMessagePrivacyError("");
    const {error}=await supabase.from("rivyza_message_preferences").upsert({user_id:user.id,who_can_message:value,updated_at:new Date().toISOString()},{onConflict:"user_id"});
    if(error){setMessagePrivacy(previous);setMessagePrivacyError("No se pudo guardar. Ejecuta el archivo SQL en Supabase antes de usar esta opción.");}
    setMessagePrivacyBusy(false);
  }
  useEffect(()=>{
    if(!supabase||!user?.id){setCommentPrivacy("everyone");return;}
    let active=true;
    supabase.from("rivyza_comment_preferences").select("who_can_comment").eq("user_id",user.id).maybeSingle()
      .then(({data,error})=>{if(!active)return;if(error){setCommentPrivacyError("Configura primero el SQL de comentarios en Supabase.");return;}setCommentPrivacy(data?.who_can_comment||"everyone");});
    return ()=>{active=false;};
  },[supabase,user?.id]);
  async function saveCommentPrivacy(value){
    if(!supabase||!user?.id||commentPrivacyBusy)return;
    const previous=commentPrivacy;
    setCommentPrivacy(value);setCommentPrivacyBusy(true);setCommentPrivacyError("");
    const {error}=await supabase.from("rivyza_comment_preferences").upsert({user_id:user.id,who_can_comment:value,updated_at:new Date().toISOString()},{onConflict:"user_id"});
    if(error){setCommentPrivacy(previous);setCommentPrivacyError("No se pudo guardar. Ejecuta el SQL de comentarios en Supabase.");}
    setCommentPrivacyBusy(false);
  }
  useEffect(()=>{
    if(!supabase||!user?.id){setLikesPrivacy("only_me");return;}
    let active=true;
    supabase.from("rivyza_likes_preferences").select("who_can_see_likes").eq("user_id",user.id).maybeSingle().then(({data,error})=>{
      if(!active)return;
      if(error){setLikesPrivacyError("Ejecuta primero el SQL de privacidad de Me gusta.");return;}
      setLikesPrivacy(data?.who_can_see_likes||"only_me");
    });
    return ()=>{active=false;};
  },[supabase,user?.id]);
  async function saveLikesPrivacy(value){
    if(!supabase||!user?.id||likesPrivacyBusy)return;
    const previous=likesPrivacy;
    setLikesPrivacy(value);setLikesPrivacyBusy(true);setLikesPrivacyError("");
    const {error}=await supabase.from("rivyza_likes_preferences").upsert({user_id:user.id,who_can_see_likes:value,updated_at:new Date().toISOString()},{onConflict:"user_id"});
    if(error){setLikesPrivacy(previous);setLikesPrivacyError("No se pudo guardar. Ejecuta el SQL de esta versión en Supabase.");}
    setLikesPrivacyBusy(false);
  }
  useEffect(()=>{
    if(view!=="otherProfile"||!viewedProfile?.id||!user?.id||!supabase)return;
    let active=true;
    setViewedLikedPosts([]);setViewedLikesAllowed(false);setViewedProfileTab("posts");setViewedLikesLoading(true);
    supabase.rpc("rivyza_visible_liked_post_ids",{target_user:viewedProfile.id}).then(async({data,error})=>{
      if(!active)return;
      if(error){setViewedLikesLoading(false);return;}
      setViewedLikesAllowed((data||[]).some(x=>x.post_id===null));
      const ids=(data||[]).map(x=>x.post_id).filter(Boolean);
      if(!ids.length){setViewedLikesLoading(false);return;}
      const posts=[];
      for(let i=0;i<ids.length;i+=100){
        const {data:rows,error:pe}=await supabase.from("posts").select("*").in("id",ids.slice(i,i+100));
        if(pe)break;
        posts.push(...(rows||[]));
      }
      if(active){const byId=new Map(posts.map(x=>[x.id,x]));setViewedLikedPosts(ids.map(id=>byId.get(id)).filter(x=>x&&x.visibility==="public"));setViewedLikesLoading(false);}
    });
    return ()=>{active=false;};
  },[view,viewedProfile?.id,user?.id,supabase]);
  async function saveOnlinePreference(value){
    const {error}=await supabase.from("rivyza_presence_preferences").upsert({user_id:user.id,show_online:value,updated_at:new Date().toISOString()});
    if(!error)setOnlinePreference(value);else setSocialError(error.message);
  }
  useEffect(()=>{
    if(!user?.id || !supabase)return;
    supabase.from("rivyza_presence_preferences").select("show_online").eq("user_id",user.id).maybeSingle().then(({data})=>setOnlinePreference(Boolean(data?.show_online)));
  },[user?.id,supabase]);
  // Presence heartbeat: only opted-in users are visible, and stale sessions expire.
  useEffect(()=>{
    if(!supabase||!user?.id)return;
    let active=true;
    const refresh=async()=>{
      const since=new Date(Date.now()-75000).toISOString();
      const {data,error}=await supabase.from("rivyza_online_sessions").select("user_id").gte("last_seen_at",since);
      if(active&&!error)setOnlineIds((data||[]).map(r=>r.user_id));
    };
    const heartbeat=async()=>{
      if(!document.hidden&&onlinePreference){
        await supabase.from("rivyza_online_sessions").upsert({user_id:user.id,last_seen_at:new Date().toISOString()});
      }else{
        await supabase.from("rivyza_online_sessions").delete().eq("user_id",user.id);
      }
      if(active)refresh();
    };
    heartbeat();
    const timer=setInterval(heartbeat,25000);
    const onVisibility=()=>heartbeat();
    document.addEventListener("visibilitychange",onVisibility);
    return ()=>{active=false;clearInterval(timer);document.removeEventListener("visibilitychange",onVisibility);};
  },[supabase,user?.id,onlinePreference]);
  function socialNav(){return <nav className="bottom-nav">
    <button onClick={()=>setView("home")}><Home/><span>{t("Inicio")}</span></button>
    <button onClick={()=>{setView("friends");changeFeedTab("friends");}}><AmigosIcon/><span>{t("Amigos")}</span></button>
    <button onClick={()=>openSocialInbox(view)}><MessageCircle/><span>{t("Mensajes")}</span></button>
    <button onClick={openSocialAlerts}><Bell/><span>{t("Alertas")}</span>{unreadSocial>0&&<b className="social-badge">{unreadSocial>99?"99+":unreadSocial}</b>}</button>
    <button onClick={()=>setView("publicProfile")}><User/><span>{t("Perfil")}</span></button>
  </nav>;}
  if(loading)return <div className="center">Cargando RIVYZA…</div>;

  if(!user){
    return <main className="auth-shell">
      <section className="auth-card">
        <div className="logo-mark">R</div>
        <h1>RIVYZA</h1>
        <p className="tagline">Vive. Conecta. Transmite.</p>
        <button className="google-btn" onClick={signInWithGoogle}>{t("Continuar con Google")}</button>
        <div className="rivyza-phone-auth"><h3>Continuar con teléfono</h3><select value={phoneCountry} onChange={e=>setPhoneCountry(e.target.value)}>{countryOptions.map(c=><option key={c.code} value={c.code}>{c.flag} {c.name} {dialingCodes[c.code]?"(+"+dialingCodes[c.code]+")":""}</option>)}</select>{phoneStage==="number"?<><input type="tel" inputMode="tel" placeholder="Número de teléfono" value={phoneNumber} onChange={e=>setPhoneNumber(e.target.value)}/><button disabled={phoneBusy} onClick={requestPhoneOtp}>Enviar código SMS</button></>:<><input inputMode="numeric" placeholder="Código de verificación" value={phoneOtp} onChange={e=>setPhoneOtp(e.target.value)}/><button disabled={phoneBusy} onClick={verifyPhoneOtp}>Verificar y continuar</button><button onClick={()=>setPhoneStage("number")}>Cambiar número</button></>}{phoneError&&<p role="alert">{phoneError}</p>}<small>Disponible en países habilitados para SMS en Supabase/Twilio.</small></div>
      </section>
    </main>;
  }

  
  if(["alerts","activity","officialNotices","inbox","privateInbox","privateGate","messages","socialSettings"].includes(view)){
    const conversations=new Map();
    [...socialMessages].filter(m=>!hiddenMessageIds.includes(m.id)).sort((a,b)=>new Date(b.created_at)-new Date(a.created_at)).forEach(m=>{const peer=m.sender_id===user.id?m.recipient:m.sender;if(peer?.id && (!conversationCutoffs[peer.id] || new Date(m.created_at)>new Date(conversationCutoffs[peer.id])) && !conversations.has(peer.id))conversations.set(peer.id,{peer,last:m});});
    // Mensajes y actividad son dos bandejas independientes.
    // Cada remitente ocupa una sola fila; el último mensaje decide su posición.
    const allConversations=[...conversations.values()].sort((a,b)=>new Date(b.last.created_at)-new Date(a.last.created_at));
    const recentConversations=allConversations.filter(x=>!privatePeers.includes(x.peer.id));
    const privateConversations=allConversations.filter(x=>privatePeers.includes(x.peer.id));
    const unreadBySender=new Map();
    socialNotices.forEach(n=>{
      if(n.kind==="message" && n.actor_id && !n.read_at){
        unreadBySender.set(n.actor_id,(unreadBySender.get(n.actor_id)||0)+1);
      }
    });
    const unreadMessages=[...unreadBySender.values()].reduce((sum,count)=>sum+count,0);
    // Solo cuenta notificaciones no leídas de conversaciones clasificadas como privadas.
    const privateUnreadCount=[...unreadBySender.entries()].reduce((total,[peerId,count])=>total+(privatePeers.includes(peerId)?count:0),0);
    const activityAlerts=socialNotices.filter(n=>n.kind!=="message").sort((a,b)=>new Date(b.created_at)-new Date(a.created_at));
    const activityUnread=activityAlerts.filter(n=>!n.read_at).length+mentionNotices.filter(n=>!n.read_at).length;
    const officialUnread=adminNotice.filter(n=>!n.read_at).length;
    async function openActivityNotice(n){
      if(n.kind==="like"||n.kind==="comment"){await openNotificationPost(n);return;}
      await markSocialRead([n.id]);
      if(n.actor){openUserProfile(n.actor);}else setSocialError("Este perfil no está disponible.");
    }
    const thread=socialMessages.filter(m=>!hiddenMessageIds.includes(m.id) && socialPeer && (!conversationCutoffs[socialPeer.id] || new Date(m.created_at)>new Date(conversationCutoffs[socialPeer.id])) && (m.sender_id===socialPeer.id&&m.recipient_id===user.id || m.recipient_id===socialPeer.id&&m.sender_id===user.id)).sort((a,b)=>new Date(a.created_at)-new Date(b.created_at));
    return <main className="social-screen">
      <header className="social-top"><button onClick={()=>setView(view==="messages"?socialChatReturnView:view==="activity"||view==="officialNotices"?"alerts":view==="inbox"?socialInboxReturnView:view==="privateInbox"||view==="privateGate"?"alerts":"publicProfile")}>←</button><h2>{view==="alerts"?"Alertas":view==="activity"?"Actividad y seguidores":view==="officialNotices"?"Notificaciones de RIVYZA":view==="inbox"?"Mensajes":view==="privateInbox"||view==="privateGate"?"Mensajes privados":view==="messages"?(socialPeer?.display_name||socialPeer?.username||"Chat"):t("Configuración y privacidad")}</h2><button onClick={()=>openSocialInbox(view)} aria-label="Mensajes"><MessageCircle size={22}/></button></header>
      {socialError&&<p className="social-error">{socialError}</p>}
      {view==="alerts"&&<div className="social-list rivyza-alerts-organized">
        

        <div className="rivyza-alerts-messages-heading"><strong>Mensajes</strong><button type="button" onClick={()=>openSocialInbox("alerts")}>Ver todos ›</button></div>
        {recentConversations.length===0?<p className="social-empty">Todavía no tienes mensajes normales.</p>:recentConversations.map(({peer,last})=><div key={"alert-message-"+peer.id} className={"rivyza-conversation-swipe"+(swipedConversationId===peer.id?" is-open":"")+(privateSwipeId===peer.id?" is-private-open":"")} {...conversationSwipeProps(peer.id)}><button type="button" className="rivyza-conversation-delete" onClick={()=>clearSocialConversation(peer.id)}>{t("Eliminar")}</button><button type="button" className="rivyza-conversation-make-private" onClick={()=>togglePrivatePeer(peer.id,true)}>Privado 🔒</button><button type="button" className={"rivyza-alerts-message-row"+(unreadBySender.has(peer.id)?" is-unread":"")} onClick={()=>{if(swipedConversationId===peer.id||privateSwipeId===peer.id){setSwipedConversationId(null);setPrivateSwipeId(null);return;}openSocialPeer(peer);}}>
          <span className="rivyza-alerts-message-avatar">{peer.avatar_url?<img src={peer.avatar_url} alt="" loading="lazy"/>:<User size={22}/>}</span>
          <span className="rivyza-alerts-message-info"><strong>{peer.display_name||peer.username||"Usuario"}</strong><small>{last.audio_path?"🎤 Mensaje de voz":last.body||"Mensaje"}</small></span>
          {unreadBySender.has(peer.id)?<b className="rivyza-message-count">{Math.min(unreadBySender.get(peer.id),99)}{unreadBySender.get(peer.id)>99?"+":""}</b>:<span className="rivyza-alerts-message-time">{formatPostDateTime(last.created_at)}</span>}
        </button></div>)}
        <button type="button" className="rivyza-activity-entry" onClick={openPrivateInbox}>
          <span className="rivyza-activity-logo"><Lock size={21}/></span>
          <span className="rivyza-activity-copy"><strong>Mensajes privados</strong><small>Acceso con PIN de 4 dígitos</small></span>{privateUnreadCount>0&&<b className="rivyza-message-count" aria-label={`${privateUnreadCount} mensajes privados sin leer`}>{privateUnreadCount>99?"99+":privateUnreadCount}</b>}<span aria-hidden="true">›</span>
        </button>
        <button type="button" className="rivyza-activity-entry" onClick={()=>setView("activity")}>
          <span className="rivyza-activity-logo"><Heart size={20}/><User size={16}/></span>
          <span className="rivyza-activity-copy"><strong>{t("Actividad y seguidores")}</strong><small>Likes, comentarios y seguidores</small></span>
          {activityUnread>0&&<b className="rivyza-message-count">{activityUnread>99?"99+":activityUnread}</b>}
          <span aria-hidden="true">›</span>
        </button>
        <button type="button" className="rivyza-activity-entry" onClick={()=>setView("officialNotices")}>
          <span className="rivyza-activity-logo">🛡️</span>
          <span className="rivyza-activity-copy"><strong>Notificaciones de RIVYZA</strong><small>Infracciones, apelaciones y avisos oficiales</small></span>
          {officialUnread>0&&<b className="rivyza-message-count">{officialUnread>99?"99+":officialUnread}</b>}
          <span aria-hidden="true">›</span>
        </button>
      </div>}
      {view==="privateGate"&&<section className="rivyza-private-gate">
        <Lock size={36}/><h3>{privateMode==="create"?"Crear PIN privado":"Introduce tu PIN"}</h3>
        <p>Protege tus conversaciones con cuatro números.</p>
        {privateStatus.locked_until&&new Date(privateStatus.locked_until)>new Date()&&<p className="social-error">Acceso bloqueado hasta {new Date(privateStatus.locked_until).toLocaleString()}.</p>}
        <input type="password" inputMode="numeric" pattern="[0-9]*" maxLength={4} placeholder="PIN de 4 números" value={privatePin} onChange={e=>setPrivatePin(e.target.value.replace(/\D/g,"").slice(0,4))}/>
        {privateMode==="create"&&<input type="password" inputMode="numeric" maxLength={4} placeholder="Confirma el PIN" value={privateConfirm} onChange={e=>setPrivateConfirm(e.target.value.replace(/\D/g,"").slice(0,4))}/>}
        {privateError&&<p className="social-error">{privateError}</p>}
        <button type="button" disabled={privatePin.length!==4||(privateMode==="create"&&privateConfirm.length!==4)||(privateStatus.locked_until&&new Date(privateStatus.locked_until)>new Date())} onClick={unlockPrivate}> {privateMode==="create"?"Crear y entrar":"Desbloquear"}</button>
        <p className="rivyza-private-hint">¿Olvidaste tu PIN? Por ahora solicita recuperación verificada al soporte de RIVYZA. No compartas tu contraseña ni tu PIN.</p>
      </section>}
      {view==="privateInbox"&&privateUnlocked&&<div className="social-list">
        {privateConversations.map(({peer,last})=><div className="rivyza-conversation-swipe" key={peer.id}>
          <button className="social-item" onClick={()=>openSocialPeer(peer)}><span className="social-icon"><Lock size={19}/></span><span><strong>{peer.display_name||peer.username||"Usuario"}</strong><small>{last.audio_path?"🎤 Mensaje de voz":last.body}</small></span></button>
          <button type="button" className="rivyza-private-restore" onClick={()=>togglePrivatePeer(peer.id,false)}>Devolver a normales</button>
        </div>)}
        {!privateConversations.length&&<p className="social-empty">Todavía no tienes conversaciones privadas.</p>}
      </div>}
      {view==="officialNotices"&&<div className="social-list rivyza-activity-list">
        {adminNotice.length===0&&<p className="social-empty">No tienes notificaciones oficiales de RIVYZA.</p>}
        {[...adminNotice].sort((a,b)=>new Date(b.created_at)-new Date(a.created_at)).map(n=><div key={"official-"+n.id} className="rivyza-official-row">
          <div className={"rivyza-activity-notice"+(!n.read_at?" is-unread":"")}>
            <span className="rivyza-notice-avatar">🛡️</span>
            <span className="rivyza-notice-copy"><strong>{n.read_at?"RIVYZA · Aviso oficial":"🔴 RIVYZA · Nuevo aviso"}</strong><span>{n.body}</span><small>{formatPostDateTime(n.created_at)}</small></span>
          </div>
          <div className="rivyza-official-actions">
            {!n.read_at&&<button type="button" onClick={()=>readOfficialNotice(n.id)}>Marcar como leído</button>}
            {n.strike_id&&<button type="button" onClick={()=>{readOfficialNotice(n.id);setSettingsSheet("Estado de cuenta");setView("settings");}}>Ver estado de cuenta</button>}
            <button type="button" onClick={()=>hideModerationNotice(n.id)}>Eliminar</button>
          </div>
        </div>)}
      </div>}
      {view==="activity"&&<div className="social-list rivyza-activity-list">
        {activityAlerts.length===0&&mentionNotices.length===0&&<p className="social-empty">Todavía no tienes actividad.</p>}
        {[...mentionNotices].sort((a,b)=>new Date(b.created_at)-new Date(a.created_at)).map(n=><button key={"mention-"+n.id} type="button" className={"rivyza-activity-notice"+(!n.read_at?" is-unread":"")} onClick={()=>openMentionNotice(n)}><span className="rivyza-notice-avatar">{n.actor?.avatar_url?<img src={n.actor.avatar_url} alt=""/>:<AtSign size={23}/>}</span><span className="rivyza-notice-copy"><strong>{n.actor?.display_name||n.actor?.username||"Usuario"}</strong><span>Te mencionó en {n.source_type==="comment"?"un comentario":"una publicación"}.</span><small>{formatPostDateTime(n.created_at)}</small></span><AtSign size={21}/></button>)}
        {activityAlerts.map(n=><button key={n.id} type="button" className={"rivyza-activity-notice"+(!n.read_at?" is-unread":"")} onClick={()=>openActivityNotice(n)}>
          <span className="rivyza-notice-avatar rivyza-presence-anchor">{n.actor?.avatar_url?<img src={n.actor.avatar_url} alt="" loading="lazy"/>:<User size={24}/>}{onlineDot(n.actor?.id)}</span>
          <span className="rivyza-notice-copy"><strong>{n.actor?.display_name||n.actor?.username||"Usuario"}</strong><span>{n.kind==="like"?"Le dio like a tu publicación.":n.kind==="comment"?"Comentó tu publicación.":n.kind==="follow"?"Comenzó a seguirte.":n.kind==="unfollow"?"Dejó de seguirte.":"Nueva actividad."}</span><small>{formatPostDateTime(n.created_at)}</small></span>
          <span className="rivyza-notice-end">{(n.kind==="like"||n.kind==="comment")&&n.relatedPost?.media_path?<span className="rivyza-notice-thumb">{n.relatedPost.media_type==="photo"?<img src={n.relatedPost.media_path} alt="Publicación" loading="lazy"/>:<video src={`${n.relatedPost.media_path}#t=0.1`} muted playsInline preload="metadata"/>}</span>:null}<span className={"rivyza-notice-type rivyza-notice-type-"+n.kind}>{n.kind==="like"?<Heart size={20}/>:n.kind==="comment"?<MessageCircle size={20}/>:n.kind==="follow"?<UserRoundPlus size={21}/>:n.kind==="unfollow"?<UserRoundMinus size={21}/>:<Bell size={20}/>}</span>{!n.read_at&&<i className="rivyza-notice-unread"/>}</span>
        </button>)}
      </div>}
      {view==="inbox"&&<div className="social-list">
        <button className="social-quick" onClick={()=>{setView("home");setPeopleSearchOpen(true);}}>+ Buscar personas para enviar un mensaje</button>
        {recentConversations.map(({peer,last})=><div className={"rivyza-conversation-swipe"+(swipedConversationId===peer.id?" is-open":"")+(privateSwipeId===peer.id?" is-private-open":"")} key={peer.id} {...conversationSwipeProps(peer.id)}><button type="button" className="rivyza-conversation-delete" onClick={()=>clearSocialConversation(peer.id)}>{t("Eliminar")}</button><button type="button" className="rivyza-conversation-make-private" onClick={()=>togglePrivatePeer(peer.id,true)}>Privado 🔒</button><button className="social-item" onClick={()=>{if(swipedConversationId===peer.id||privateSwipeId===peer.id){setSwipedConversationId(null);setPrivateSwipeId(null);return;}openSocialPeer(peer);}}><span className="social-icon rivyza-presence-anchor">{peer.avatar_url?<img className="rivyza-inbox-photo" src={peer.avatar_url} alt=""/>:<User size={21}/>} {onlineDot(peer.id)}</span><span><strong>{peer.display_name||peer.username||"Usuario"}</strong><small>{last.audio_path?"🎤 Mensaje de voz":last.body}</small></span></button></div>)}
        {recentConversations.length===0&&<p className="social-empty">Aún no tienes conversaciones. Visita el perfil de una persona y toca «Enviar mensaje».</p>}
      </div>}
      {view==="messages"&&<section className="social-chat-layout"><button type="button" className="rivyza-chat-peer rivyza-chat-peer-link" onClick={()=>{if(socialPeer?.id){setProfileReturnToChat(true);openUserProfile(socialPeer);}}} aria-label={t("Ver perfil")}><span className="rivyza-chat-peer-avatar rivyza-presence-anchor">{socialPeer?.avatar_url?<img src={socialPeer.avatar_url} alt=""/>:<User size={21}/>} {onlineDot(socialPeer?.id)}</span><strong>{socialPeer?.display_name||socialPeer?.username||"Usuario"}</strong><span className="rivyza-chat-chevron">›</span></button><div className="social-thread" ref={socialThreadRef}>
        {thread.map(m=><div key={m.id} className={"rivyza-swipe-row "+(m.sender_id===user.id?"mine":"theirs")+ (swipedMessageId===m.id?" is-open":"")}
          onTouchStart={e=>{swipeStartRef.current={id:m.id,x:e.touches[0].clientX,y:e.touches[0].clientY};}}
          onTouchEnd={e=>{const start=swipeStartRef.current;swipeStartRef.current=null;if(!start||start.id!==m.id)return;const dx=e.changedTouches[0].clientX-start.x,dy=e.changedTouches[0].clientY-start.y;if(Math.abs(dy)>Math.abs(dx))return;if(dx< -55)setSwipedMessageId(m.id);else if(dx>35)setSwipedMessageId(null);}}>
          <div className="rivyza-swipe-actions"><button type="button" onClick={()=>hideSocialMessage(m.id)}>{t("Eliminar para mí")}</button>{m.sender_id===user.id&&Date.now()-new Date(m.created_at).getTime()<180000&&<button type="button" className="rivyza-delete-everyone" onClick={()=>deleteSocialMessageForEveryone(m)}>{t("Eliminar para todos")}</button>}</div>
          <div className={"social-bubble"+(m.audio_path?" rivyza-audio-message":"")}>{m.audio_path?<div className="rivyza-voice-bubble"><button type="button" onClick={()=>playVoice(m)} aria-label={voicePlayingId===m.id?"Pausar audio":"Reproducir audio"}>{voicePlayingId===m.id?<Pause size={20}/>:<Play size={20}/>}</button><div className="rivyza-voice-seek" role="slider" tabIndex={0} aria-label="Adelantar o retroceder mensaje de voz" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round((voiceProgress[m.id]||0)*100)} onClick={e=>{const r=e.currentTarget.getBoundingClientRect();seekVoice(m,(e.clientX-r.left)/r.width);}} onKeyDown={e=>{if(e.key==="ArrowRight"||e.key==="ArrowLeft"){e.preventDefault();seekVoice(m,(voiceProgress[m.id]||0)+(e.key==="ArrowRight"?.05:-.05));}}}>
            {Array.from({length:30},(_,i)=><span key={i} className={i/30<=(voiceProgress[m.id]||0)?"played":""} style={{height:(6+Math.round(Math.abs(Math.sin((i+1)*1.71)*Math.cos((i+2)*.49))*18))+"px"}}/>)}
          </div><small>{Math.min(60,m.audio_duration||0)}s</small></div>:<p>{m.body}</p>}{m.shared_post_id&&<button type="button" className="rivyza-shared-post-open" onClick={()=>openSharedPostFromChat(m.shared_post_id)}><Share2 size={16}/> Ver publicación compartida</button>}<small>{formatPostDateTime(m.created_at)}</small></div>
        </div>)}
        {thread.length===0&&<p className="social-empty">Inicia una conversación.</p>}
      </div><div className="rivyza-voice-composer">{voiceStage==="idle"?<form className="social-compose" onSubmit={e=>{e.preventDefault();sendSocialMessage();}}><div className="rivyza-voice-input"><input value={socialDraft} onChange={e=>setSocialDraft(e.target.value)} placeholder={t("Escribe un mensaje…")} maxLength={2000}/><button type="button" className="rivyza-mic-button" onClick={startVoice} aria-label="Grabar mensaje de voz"><Mic size={22}/></button></div><button type="submit" disabled={!socialDraft.trim()||socialBusy}>{t("Enviar")}</button></form>:<div className="rivyza-record-panel"><div className="rivyza-record-wave"><span className={voiceStage==="recording"?"rivyza-record-dot":""}>{voiceStage==="recording"?"●":"🎤"}</span><span className="rivyza-record-levels" aria-label="Nivel de voz">{voiceLevels.map((height,i)=><span key={i} style={{height:(voiceStage==="recording"?height:6+Math.round(Math.abs(Math.sin(i*1.73))*17))+"px"}}/>)}</span><strong>{String(Math.floor(voiceSeconds/60)).padStart(2,"0")}:{String(voiceSeconds%60).padStart(2,"0")}</strong><small>/ 1:00</small></div>{voiceStage==="preview"&&voiceUrl&&<div className="rivyza-voice-preview-custom"><audio ref={voicePreviewRef} preload="metadata" src={voiceUrl} onLoadedMetadata={e=>setVoicePreviewDuration(Number.isFinite(e.currentTarget.duration)?e.currentTarget.duration:voiceSeconds)} onDurationChange={e=>{if(Number.isFinite(e.currentTarget.duration))setVoicePreviewDuration(e.currentTarget.duration);}} onTimeUpdate={e=>setVoicePreviewTime(e.currentTarget.currentTime)} onPlay={()=>setVoicePreviewPlaying(true)} onPause={()=>setVoicePreviewPlaying(false)} onEnded={()=>{setVoicePreviewPlaying(false);setVoicePreviewTime(0);}}/><button type="button" className="rivyza-preview-play" aria-label={voicePreviewPlaying?"Pausar audio":"Reproducir audio"} onClick={()=>{const a=voicePreviewRef.current;if(!a)return;if(a.paused){a.play().catch(()=>setVoicePreviewPlaying(false));}else a.pause();}}>{voicePreviewPlaying?<Pause size={19}/>:<Play size={19}/>}</button><span className="rivyza-preview-time">{String(Math.floor(voicePreviewTime/60)).padStart(2,"0")}:{String(Math.floor(voicePreviewTime%60)).padStart(2,"0")}</span><input type="range" min="0" max={Math.max(.1,voicePreviewDuration||voiceSeconds)} step="0.1" value={Math.min(voicePreviewTime,Math.max(.1,voicePreviewDuration||voiceSeconds))} aria-label="Adelantar o retroceder audio" onChange={e=>{const a=voicePreviewRef.current;if(a){a.currentTime=Number(e.target.value);setVoicePreviewTime(a.currentTime);}}}/><span className="rivyza-preview-time">{String(Math.floor((voicePreviewDuration||voiceSeconds)/60)).padStart(2,"0")}:{String(Math.floor((voicePreviewDuration||voiceSeconds)%60)).padStart(2,"0")}</span></div>}<div className="rivyza-record-actions"><button type="button" onClick={resetVoice} disabled={voiceSending}><Trash2 size={17}/> {t("Cancelar")}</button>{voiceStage==="recording"?<><button type="button" onClick={stopVoice}><Square size={16}/> Stop</button></>:<button type="button" onClick={sendVoice} disabled={voiceSending}><Send size={17}/> {voiceSending?"Enviando…":t("Enviar")}</button>}</div></div>}</div></section>}
      {view==="socialSettings"&&<section className="social-settings rivyza-settings-page">
        <div className="rivyza-settings-section-title">{t("Cuenta")}</div>
        <div className="rivyza-settings-group">
          {[["Seguridad y contraseña",ShieldCheck],["Información de cuenta",User]].map(([label,Icon])=><button type="button" key={label} onClick={()=>setSettingsSheet(label)}><Icon size={21}/><span>{t(label)}</span><b>›</b></button>)}
        </div>
        <div className="rivyza-settings-section-title">{t("Privacidad")}</div>
        <div className="rivyza-settings-group">
          {[["Cuenta privada",Lock],["Cuentas bloqueadas",Ban]].map(([label,Icon])=><button type="button" key={label} onClick={()=>setSettingsSheet(label)}><Icon size={21}/><span>{t(label)}</span><b>›</b></button>)}
          <div className="rivyza-settings-toggle rivyza-online-row"><span><strong>{t("Estado en línea")}</strong><small>{t("Cuando esté desactivado, nadie verá tu punto verde.")}</small></span><input type="checkbox" aria-label={t("Estado en línea")} checked={onlinePreference} onChange={e=>saveOnlinePreference(e.target.checked)}/></div>
          {[["Quién puede enviarme mensajes",MessageCircle],["Quién puede comentar",MessageSquare],["Quién puede mencionarme",AtSign],["Quién puede ver mis Me gusta",Heart],["Quién puede ver quién me sigue",Users],["Quién puede ver a quién sigo",Users]].map(([label,Icon])=><button type="button" key={label} onClick={()=>setSettingsSheet(label)}><Icon size={21}/><span>{t(label)}</span><b>›</b></button>)}
        </div>
        <div className="rivyza-settings-section-title">{t("Preferencias")}</div>
        <div className="rivyza-settings-group">
          <button type="button" onClick={()=>setSettingsSheet("language")}><Languages size={21}/><span>{t("Idioma")}</span><em>{appLanguage==="es"?"Español":"English"}</em><b>›</b></button>
          {[["Apariencia",Moon],["Preferencias de notificaciones",Bell]].map(([label,Icon])=><button type="button" key={label} onClick={e=>{e.stopPropagation();setSettingsSheet(label);}}><Icon size={21}/><span>{t(label)}</span><b>›</b></button>)}
        </div>
        {adminOwner&&<div className="rivyza-settings-group"><button type="button" onClick={adminOpenInbox}><ShieldCheck size={21}/><span>Panel de administración {adminUnread>0?`(${adminUnread} pendientes)`:""}</span><b>›</b></button></div>}
        <div className="rivyza-settings-section-title">Ayuda y comunidad</div>
        <div className="rivyza-settings-group"><button type="button" onClick={()=>setSettingsSheet("Centro de Ayuda")}><ShieldCheck size={21}/><span>Centro de Ayuda y normas</span><b>›</b></button><button type="button" onClick={()=>setSettingsSheet("Estado de cuenta")}><ShieldCheck size={21}/><span>Estado de cuenta y sanciones</span><b>›</b></button></div>
        <div className="rivyza-settings-section-title">{t("Sesión")}</div>
        <div className="rivyza-settings-group">
          <button type="button" onClick={()=>setSettingsSheet("Cambiar de cuenta")}><RefreshCw size={21}/><span>{t("Cambiar de cuenta")}</span><b>›</b></button>
          <button type="button" onClick={()=>{if(window.confirm(t("¿Quieres cerrar sesión?")))signOut();}}><LogOut size={21}/><span>{t("Cerrar sesión")}</span></button>
        </div>
        <p className="rivyza-settings-version">RIVYZA v13.19.37 (base)</p>

      {adminPanel&&<div className="rivyza-admin-overlay" role="presentation" onClick={()=>setAdminPanel(false)}><div className="rivyza-admin-card" role="dialog" aria-modal="true" aria-label="Panel de administración" onClick={e=>e.stopPropagation()}>
        <div className="rivyza-admin-head"><strong>{adminInbox?"Bandeja administrativa":`Administrar ${adminTarget?.display_name||adminTarget?.username||"usuario"}`}</strong><button type="button" onClick={()=>setAdminPanel(false)}>✕</button></div>
        {adminError&&<p role="alert" className="rivyza-admin-error">{adminError}</p>}
        {!adminInbox&&<><h3>Infracciones X ({adminStrikes.filter(x=>x.status==="active").length}/3)</h3>
          <p>Las sanciones se registran con motivo y fecha. Tres X activas restringen LIVE.</p>
          <textarea placeholder="Motivo obligatorio para poner una X (mínimo 10 caracteres)" value={adminReason} onChange={e=>setAdminReason(e.target.value)} />
          <button disabled={adminBusy||adminReason.trim().length<10||adminStrikes.filter(x=>x.status==="active").length>=3} onClick={()=>{if(window.confirm("¿Asignar una X y notificar oficialmente al usuario?"))adminDo("rivyza_admin_add_strike",{p_target:adminTarget.id,p_reason:adminReason.trim()});}}>Poner X y enviar aviso RIVYZA</button>
          <div className="rivyza-admin-actions"><button type="button" disabled={adminBusy||!adminStrikes.some(x=>x.status==="active")} onClick={()=>{const active=adminStrikes.filter(x=>x.status==="active");if(active.length===1){const reason=window.prompt("Motivo para quitar la X (mínimo 5 caracteres):");if(reason?.trim().length>=5&&window.confirm("¿Retirar esta X y avisar al usuario?"))adminDo("rivyza_admin_remove_strike",{p_strike:active[0].id,p_reason:reason.trim()});}else if(active.length>1){document.getElementById("rivyza-active-strikes")?.scrollIntoView({behavior:"smooth",block:"center"});}}}>Quitar X{adminStrikes.filter(x=>x.status==="active").length>1?" (elige cuál abajo)":""}</button></div>
          {adminStrikes.every(x=>x.status!=="active")&&<p>No hay X activas para retirar en esta cuenta.</p>}
          <div id="rivyza-active-strikes"><strong>Historial de infracciones</strong></div>
          {adminStrikes.map(x=><div className="rivyza-admin-item" key={x.id}><strong>{x.status==="active"?"❌ X activa":"X retirada"} · {x.appeal_status==="in_review"?"En revisión":x.appeal_status||"Sin apelación"}</strong><p>{x.reason}</p><small>{new Date(x.created_at).toLocaleString()}</small>{x.status==="active"&&<button disabled={adminBusy} onClick={()=>{const reason=window.prompt("Motivo para retirar esta X:");if(reason?.trim().length>=5)adminDo("rivyza_admin_remove_strike",{p_strike:x.id,p_reason:reason.trim()});}}>Quitar X</button>}</div>)}
          <div className="rivyza-admin-item"><h3>Control de LIVE</h3>
            {adminLiveStatus?<><p><strong>Estado: {adminLiveStatus.allowed?"Permitido":"Suspendido"}</strong></p>
            <p>{adminLiveStatus.manual_suspended?"Suspensión manual activa":adminLiveStatus.active_strikes>=3?"Suspensión por 3 X activas":"Sin suspensión"}</p>
            {adminLiveStatus.manual_suspended?<button type="button" disabled={adminBusy} onClick={()=>{const reason=window.prompt("Motivo para restaurar LIVE (mínimo 10 caracteres):");if(reason?.trim().length>=10&&window.confirm("¿Restaurar permiso manual de LIVE? Las 3 X activas siguen aplicando."))adminDo("rivyza_admin_set_live_suspension",{p_target:adminTarget.id,p_suspend:false,p_reason:reason.trim()});}}>Restaurar LIVE</button>
            :<button type="button" disabled={adminBusy} onClick={()=>{const reason=window.prompt("Motivo de suspensión LIVE (mínimo 10 caracteres):");if(reason?.trim().length>=10&&window.confirm("¿Suspender LIVE y notificar oficialmente a esta cuenta?"))adminDo("rivyza_admin_set_live_suspension",{p_target:adminTarget.id,p_suspend:true,p_reason:reason.trim()});}}>Suspender LIVE</button>}</>
            :<p>Consulta de estado no disponible. Ejecuta el SQL de esta versión antes de utilizar estos controles.</p>}
            <small>Esta suspensión debe verificarse también en el servidor que autoriza la entrada a LIVE y a invitados.</small></div>
          <h3>Enviar mensaje oficial</h3><textarea value={adminReply} onChange={e=>setAdminReply(e.target.value)} placeholder="Mensaje de RIVYZA para este usuario"/><button disabled={adminBusy||adminReply.trim().length<2} onClick={()=>adminDo("rivyza_admin_send_notice",{p_target:adminTarget.id,p_body:adminReply.trim()})}>Enviar como RIVYZA</button>
        </>}
        {adminInbox&&<div className="rivyza-admin-item"><h3>Usuarios suspendidos de LIVE</h3>{adminSuspended.length===0?<p>No hay suspensiones registradas o no se pudo cargar la lista.</p>:adminSuspended.map(u=><div key={u.user_id}><strong>{u.username||u.user_id}</strong> · {u.reason||"3 X activas"} · {u.manual_suspended?"Manual":"Por infracciones"}</div>)}</div>}<h3>{adminInbox?"Reportes y apelaciones":"Apelaciones de esta cuenta"}</h3>
        {adminCases.length===0&&<p>No hay casos pendientes.</p>}
        {adminCases.map(c=><div className="rivyza-admin-item" key={c.id}><strong>{c.kind==="appeal"?"Apelación":"Reporte"} · {c.status==="in_review"?"En revisión":c.status}</strong><p>{c.body}</p><small>{new Date(c.created_at).toLocaleString()}</small>{adminInbox&&<p>Usuario: {c.user_id}</p>}{c.status==="in_review"&&<div className="rivyza-admin-actions"><button disabled={adminBusy} onClick={()=>{const note=window.prompt("Respuesta oficial (motivo):");if(note?.trim().length>=5)adminDo("rivyza_admin_resolve_case",{p_case:c.id,p_approve:true,p_reply:note.trim()});}}>Aceptar apelación / quitar X</button><button disabled={adminBusy} onClick={()=>{const note=window.prompt("Motivo de la decisión:");if(note?.trim().length>=5)adminDo("rivyza_admin_resolve_case",{p_case:c.id,p_approve:false,p_reply:note.trim()});}}>Mantener X</button></div>}</div>)}
      </div></div>}

        {settingsSheet&&<div className="rivyza-sheet-overlay" onClick={()=>setSettingsSheet("")} role="presentation"><div className="rivyza-sheet-panel" role="dialog" aria-modal="true" aria-label={settingsSheet==="language"?t("Idioma"):t(settingsSheet)} onClick={e=>e.stopPropagation()}>
          <div className="rivyza-sheet-handle"/>
          <div className="rivyza-sheet-heading"><strong>{settingsSheet==="language"?t("Idioma"):t(settingsSheet)}</strong><button type="button" onClick={()=>setSettingsSheet("")} aria-label={t("Cerrar")}>×</button></div>
          {settingsSheet==="language"?<div className="rivyza-sheet-options">{[["es","Español"],["en","English"]].map(([code,label])=><button type="button" key={code} onClick={()=>{changeAppLanguage(code);setSettingsSheet("");}}>{label}<span>{appLanguage===code?"✓":""}</span></button>)}</div>  :settingsSheet==="Quién puede enviarme mensajes"?<div className="rivyza-feature-settings rivyza-message-privacy"><p>Elige quién puede enviarte mensajes privados.</p>{[["everyone","Todos","Cualquier usuario puede enviarte mensajes."],["friends","Amigos","Solo personas que se siguen mutuamente."],["nobody","Nadie","Nadie puede enviarte mensajes nuevos."]].map(([value,label,description])=><button type="button" key={value} className={"rivyza-privacy-choice"+(messagePrivacy===value?" selected":"")} disabled={messagePrivacyBusy} onClick={()=>saveMessagePrivacy(value)}><span><strong>{t(label)}</strong><small>{t(description)}</small></span><span aria-hidden="true">{messagePrivacy===value?"✓":""}</span></button>)}{messagePrivacyError&&<p role="alert" className="rivyza-privacy-error">{messagePrivacyError}</p>}</div>
          :settingsSheet==="Quién puede comentar"?<div className="rivyza-feature-settings rivyza-message-privacy"><p>Elige quién puede comentar tus fotos y videos.</p>{[["everyone","Todos","Cualquiera puede comentar tus publicaciones."],["friends","Amigos","Solo tus amigos pueden comentar."],["nobody","Nadie","Nadie puede comentar tus publicaciones."]].map(([value,label,description])=><button type="button" key={value} className={"rivyza-privacy-choice"+(commentPrivacy===value?" selected":"")} disabled={commentPrivacyBusy} onClick={()=>saveCommentPrivacy(value)}><span><strong>{t(label)}</strong><small>{t(description)}</small></span><span aria-hidden="true">{commentPrivacy===value?"✓":""}</span></button>)}{commentPrivacyError&&<p role="alert" className="rivyza-privacy-error">{commentPrivacyError}</p>}</div>
          :settingsSheet==="Quién puede ver mis Me gusta"?<div className="rivyza-feature-settings rivyza-message-privacy"><p>Elige quién puede ver la pestaña del corazón de tu perfil.</p>{[["only_me","Solo yo","Nadie más puede ver las publicaciones que me gustan."],["everyone","Todos","Cualquier usuario puede ver las publicaciones que me gustan."],["friends","Amigos","Solo mis amigos pueden ver las publicaciones que me gustan."]].map(([value,label,description])=><button type="button" key={value} className={"rivyza-privacy-choice"+(likesPrivacy===value?" selected":"")} disabled={likesPrivacyBusy} onClick={()=>saveLikesPrivacy(value)}><span><strong>{t(label)}</strong><small>{t(description)}</small></span><span aria-hidden="true">{likesPrivacy===value?"✓":""}</span></button>)}{likesPrivacyError&&<p role="alert" className="rivyza-privacy-error">{likesPrivacyError}</p>}</div>
          :["Quién puede ver quién me sigue","Quién puede ver a quién sigo","Quién puede mencionarme"].includes(settingsSheet)?<div className="rivyza-feature-settings rivyza-message-privacy"><p>Configura quién puede acceder a esta información.</p>{[...(["Quién puede mencionarme"].includes(settingsSheet)?[["everyone","Todos"],["friends","Amigos"],["nobody","Nadie"]]:[["everyone","Todos"],["friends","Amigos"],["only_me","Solo yo"]])].map(([value,label])=>{const key=settingsSheet==="Quién puede mencionarme"?"mentions":settingsSheet==="Quién puede ver quién me sigue"?"followers":"following";return <button type="button" className={"rivyza-privacy-choice"+(communityPrivacy[key]===value?" selected":"")} key={value} onClick={()=>saveCommunityPrivacy(key,value)}><span><strong>{t(label)}</strong></span><span>{communityPrivacy[key]===value?"✓":""}</span></button>})}{communityPrivacyError&&<p role="alert">{communityPrivacyError}</p>}</div>
          :settingsSheet==="Centro de Ayuda"?<div className="rivyza-feature-settings rivyza-help"><input aria-label="Buscar ayuda" placeholder="Buscar en Ayuda..." value={helpQuery} onChange={e=>setHelpQuery(e.target.value)}/>{[
            ["¿Qué es RIVYZA?","RIVYZA es una comunidad para compartir fotos, videos, mensajes y conectar con otras personas."],
            ["Privacidad","En Configuración puedes gestionar quién te envía mensajes, comenta, ve tus Me gusta y consulta tus listas de seguidores y seguidos."],
            ["Reportes","Puedes reportar contenido inapropiado desde las opciones de una publicación. Un reporte no supone automáticamente una sanción."],
            ["Normas de la comunidad","No se permiten amenazas, acoso, explotación sexual infantil, captación de menores ni contenido que ponga en peligro a otras personas. Las expresiones artísticas se evalúan según su contexto."],
            ["Advertencias: 3 X","Las advertencias se revisan por la administración. La política propuesta restringe iniciar LIVE o participar como invitado al alcanzar tres X; la duración y la automatización están pendientes de implementación."],
            ["Protección de menores","Cero tolerancia a la explotación y abuso sexual de menores. Los casos graves pueden conllevar restricciones preventivas y revisión urgente."],
            ["Apelaciones","El procedimiento de apelación y el centro de moderación aún están en desarrollo. No se asignan X automáticamente desde esta versión."],
            ["LIVE y creadores","La moderación debe tener en cuenta el contexto de música, DJ, baile, efectos visuales y actuaciones artísticas."],
            ["Moderación por IA","La moderación automática es una función planificada, no activa en esta versión. La IA no debe sancionar únicamente por palabras aisladas."],
            ["Privacidad y términos","Los textos legales completos y el canal de soporte oficial se publicarán antes del lanzamiento público."]
          ].filter(([a,b])=>(a+" "+b).toLowerCase().includes(helpQuery.toLowerCase())).map(([a,b])=><div key={a} className="rivyza-help-article"><strong>{a}</strong><p>{b}</p></div>)}</div>
          :settingsSheet==="Estado de cuenta"?<div className="rivyza-feature-settings"><h3>Estado de cuenta</h3>{moderationLoadError&&<p role="alert" className="social-error">No se pudo consultar el estado de cuenta: {moderationLoadError}</p>}<p>Infracciones activas: {myInfractions.filter(x=>x.status==="active").length} de 3. Con tres X activas se restringe LIVE.</p>{myInfractions.map(x=><div className="rivyza-admin-item" key={x.id}><strong>{x.status==="active"?"X activa":"X retirada"} · {x.appeal_status==="in_review"?"En revisión":x.appeal_status||"Sin apelación"}</strong><p>{x.reason}</p>{x.status==="active"&&!x.appeal_status&&<><textarea placeholder="Explica por qué deseas apelar" value={appealDrafts[x.id]||""} onChange={e=>setAppealDrafts(v=>({...v,[x.id]:e.target.value}))}/><button onClick={()=>submitAppeal(x.id)}>Apelar infracción</button></>}</div>)}<h3>Mensajes oficiales de RIVYZA</h3>{adminNotice.map(n=><div className="rivyza-admin-item" key={n.id}><p>{n.body}</p><small>{new Date(n.created_at).toLocaleString()}</small>{n.strike_id&&<button onClick={()=>{setSettingsSheet("Estado de cuenta");}}>Ver infracción y apelar</button>}</div>)}<p>Para sanciones graves contra menores se prevé suspensión total con revisión urgente y un proceso de apelación limitado.</p></div>
          :settingsSheet==="Cuenta privada"?<div className="rivyza-feature-settings"><label className="rivyza-feature-toggle">Cuenta privada <input type="checkbox" checked={privateAccount} onChange={e=>togglePrivateAccount(e.target.checked)}/></label><p>Oculta tu estado en línea. En los LIVE, solo el anfitrión debe poder identificarte; esta regla también requiere integración en el servicio LIVE.</p></div>
          :settingsSheet==="Cuentas bloqueadas"?<div className="rivyza-feature-settings rivyza-blocked-list">{blockedProfilesLoading?<p>Cargando cuentas bloqueadas…</p>:blockedUsers.length?blockedUsers.map(id=>{const person=blockedProfiles[id];const name=person?.display_name||person?.username||"Cuenta bloqueada";return <div className="rivyza-blocked-person" key={id}><span className="rivyza-blocked-avatar">{person?.avatar_url?<img src={person.avatar_url} alt=""/>:<User size={21}/>}</span><span className="rivyza-blocked-details"><strong>{name}</strong><small>{person?.username?"@"+person.username:"Perfil no disponible"}</small></span><button type="button" className="rivyza-blocked-unblock" onClick={()=>{if(window.confirm(`¿Desbloquear a ${name}?`))setBlocked(id,false);}}>Desbloquear</button></div>}):<p>No tienes cuentas bloqueadas.</p>}</div>
          :settingsSheet==="Información de cuenta"?<div className="rivyza-feature-settings"><div className="rivyza-account-logo">R</div><h3>RIVYZA</h3><div className="rivyza-feature-row"><span>Usuario</span><strong>@{profile?.username||"usuario"}</strong></div><div className="rivyza-feature-row"><span>Registro</span><strong>{formatPostDateTime(user?.created_at||profile?.created_at)||"Sin fecha"}</strong></div><div className="rivyza-feature-row"><span>Estado</span><strong>Activa</strong></div><div className="rivyza-feature-row"><span>Infracciones</span><div className="rivyza-strikes">{[0,1,2].map(i=><span key={i} style={{color:i<myInfractions.filter(x=>x.status==="active").length?"#ff405c":"#777"}}>×</span>)}</div></div><p>Las infracciones requieren revisión administrativa. Las X rojas reflejan infracciones activas registradas en RIVYZA.</p></div>
          :settingsSheet==="Apariencia"?<div className="rivyza-feature-settings rivyza-appearance-panel"><p className="rivyza-appearance-intro">Personaliza los colores de RIVYZA. Los videos y la cámara conservarán su fondo oscuro para que el contenido se vea correctamente.</p>{[["dark","Oscuro","Fondo oscuro"],["light","Claro","Fondo claro"],["auto","Automático","Según el teléfono"]].map(([value,label,description])=><button type="button" className={"rivyza-appearance-choice"+(appearance===value?" selected":"")} key={value} aria-pressed={appearance===value} onClick={()=>changeAppearance(value)}><span className={"rivyza-appearance-icon "+value}>{value==="dark"?<Moon size={19}/>:value==="light"?<span aria-hidden="true">☀</span>:<span aria-hidden="true">◐</span>}</span><span className="rivyza-appearance-description"><strong>{label}</strong><small>{description}</small></span><span className="rivyza-appearance-check">{appearance===value?"✓":""}</span></button>)}<p className="rivyza-appearance-saved">La selección se guarda automáticamente en este dispositivo.</p></div>
          :settingsSheet==="Seguridad y contraseña"?<div className="rivyza-feature-settings"><h3>Recuperar o cambiar contraseña</h3><p>Te enviaremos un enlace de recuperación. Si usas Google, cambia la contraseña desde Google.</p><input type="email" value={passwordEmail} onChange={e=>setPasswordEmail(e.target.value)} placeholder={user?.email||"Correo electrónico"}/><button onClick={sendPasswordReset}>Enviar enlace</button><p>La verificación en dos pasos y la gestión de dispositivos requieren configuración adicional en Supabase Auth.</p></div>
           :settingsSheet==="Cambiar de cuenta"?<div className="rivyza-feature-settings rivyza-account-switcher">
            <p className="rivyza-account-hint">Toca la foto para cambiar de cuenta.</p>
            <div className="rivyza-account-gallery">
              {savedAccounts.map(a=><div key={a.id} className="rivyza-account-tile">
                <button type="button" disabled={accountBusy} onClick={()=>a.id===user?.id?setSettingsSheet(""):switchSavedAccount(a)} className={"rivyza-account-avatar-button"+(a.id===user?.id?" active":"")} aria-label={"Cambiar a "+a.name}>
                  {a.avatar?<img src={a.avatar} alt=""/>:<User size={31}/>}
                </button>
                <span className="rivyza-account-name">{a.id===user?.id?(profile?.display_name||profile?.username||a.name):a.name}</span>
                {a.id===user?.id?<small className="rivyza-account-active">✓ Activa</small>:<button className="rivyza-account-remove" type="button" onClick={()=>{if(window.confirm("¿Quitar esta cuenta guardada del dispositivo?"))removeSavedAccount(a);}}>Quitar</button>}
              </div>)}
              <div className="rivyza-account-tile"><button type="button" className="rivyza-account-avatar-button rivyza-account-add" onClick={addSavedAccount} disabled={accountBusy||savedAccounts.length>=5} aria-label="Agregar otra cuenta"><Plus size={32}/></button><span className="rivyza-account-name">Agregar cuenta</span></div>
            </div>
            <p className="rivyza-account-hint">Hasta 5 cuentas en este dispositivo. Si una sesión caduca, tendrás que iniciar sesión de nuevo.</p>
            {accountError&&<p role="alert" className="rivyza-privacy-error">{accountError}</p>}
          </div>
          :<p className="rivyza-sheet-soon">{t("Próximamente")}</p>}
        </div></div>}
      </section>}
      {socialNav()}
    </main>;
  }
  if(view==="liveStudio"){
    return <LiveRoom key={selectedLiveRoom || "lobby"} initialRoomId={selectedLiveRoom} supabase={supabase} user={user} onExit={()=>{setSelectedLiveRoom(null);setView("livePreview");}}/>;
  }
  if(view==="livePreview"){
    return <main className="live-preview-shell">
      <header className="live-preview-header">
        <button className="live-preview-back" onClick={()=>{setView("home");changeFeedTab("forYou");}} aria-label="Volver">‹</button>
        <strong>LIVE</strong>
        <span className="live-preview-spacer"></span>
      </header>

      <div className="live-following-strip" aria-label="Amigos en vivo">
        {discoverLiveRooms.filter(room=>liveFriendIds.includes(room.host_id)).map(room=><button type="button" key={room.id} className="rivyza-live-friend" onClick={()=>{setSelectedLiveRoom(room.id);setView("liveStudio");}} aria-label={`Entrar al LIVE de ${room.host_name}`}>
          <span className="rivyza-live-friend-ring">{room.host_avatar?<img src={room.host_avatar} alt=""/>:<span>{(room.host_name||'U').slice(0,1).toUpperCase()}</span>}</span>
          <span className="rivyza-live-friend-name">{room.host_name||'Usuario'}</span>
        </button>)}
        {!discoverLiveRooms.some(room=>liveFriendIds.includes(room.host_id))&&<span className="live-following-empty">Tus amigos no están en vivo ahora</span>}
      </div>
      <section className="live-discovery-feed" aria-label="Vistas previas de LIVE" onScroll={e=>{
        const h=e.currentTarget.clientHeight||1;
        const next=Math.round(e.currentTarget.scrollTop/h);
        if(next!==activeLivePreview)setActiveLivePreview(next);
      }}>
        {discoverLiveError&&<div className="live-preview-card live-preview-empty-card"><p role="alert">{discoverLiveError}</p></div>}
        {!discoverLiveError&&discoverLiveRooms.length===0&&<div className="live-preview-card live-preview-empty-card"><div className="live-preview-empty-copy"><span className="live-preview-badge">● LIVE</span><h2>No hay transmisiones ahora</h2><p>Cuando alguien comience un LIVE, podrás verlo aquí.</p></div></div>}
        {discoverLiveRooms.map((room,index)=><div key={room.id} className="live-preview-card">
          {index===activeLivePreview&&<LivePreviewPlayer key={room.id} roomId={room.id} supabase={supabase}/>}
          <button type="button" className="rivyza-live-preview-enter" onClick={()=>{setSelectedLiveRoom(room.id);setView("liveStudio");}} aria-label={`Entrar al LIVE de ${room.host_name}`}>
            <span className="rivyza-live-preview-host">{room.host_avatar&&<img src={room.host_avatar} alt=""/>}<strong>{room.host_name||'Usuario RIVYZA'}</strong><em>● LIVE</em></span>
            <span className="rivyza-live-preview-entry">Toca para entrar al LIVE</span>
          </button>
          {index===activeLivePreview&&livePreviewInvite&&<button type="button" className="rivyza-live-preview-invite" onClick={()=>{setSelectedLiveRoom(room.id);setView("liveStudio");}}>¿Quieres entrar al LIVE de {room.host_name||'este usuario'}? Entrar</button>}
        </div>)}
      </section>
      <nav className="bottom-nav live-preview-bottom-nav">
        <button onClick={()=>{setView("home");changeFeedTab("forYou");window.scrollTo({top:0,behavior:"smooth"});}}><Home/><span>{t("Inicio")}</span></button>
        <button onClick={()=>{setView("friends");changeFeedTab("friends");}}><AmigosIcon/><span>{t("Amigos")}</span></button>
        <button className="plus-btn" onClick={()=>{setUploadOpen(true);setUploadType("photo");setCameraMode("photo");resetUpload();}}><Plus/></button>
        <button onClick={openSocialAlerts}><Bell/><span>{t("Alertas")}</span>{unreadSocial>0&&<b className="social-badge">{unreadSocial>99?"99+":unreadSocial}</b>}</button>
        <button onClick={()=>{setViewedProfile(null);setView("publicProfile");}}><User/><span>{t("Perfil")}</span></button>
      </nav>
      {renderUploadModal()}
      {renderShareSheet()}
    </main>;
  }

  if(view==="connections"){
    const matches=(connectionsTab==="mine"?connectionsRows:communityRows).filter(p=>(`${p.display_name||""} ${p.username||""}`).toLowerCase().includes(connectionsSearch.toLowerCase()));
    return <main className="feed-shell connections-screen">
      <header className="connections-header"><button type="button" onClick={()=>{setView("home");changeFeedTab("forYou");}} aria-label="Volver">←</button><h1>{t("Comunidad")}</h1><span></span></header>
      <div className="rivyza-community-tabs"><button type="button" className={connectionsTab==="mine"?"active":""} onClick={()=>setConnectionsTab("mine")}>{t("Conexiones")}</button><button type="button" className={connectionsTab==="all"?"active":""} onClick={()=>{setConnectionsTab("all");loadCommunity();}}>{t("Todos los usuarios")}</button></div>
      <div className="connections-search"><Search size={18}/><input value={connectionsSearch} onChange={e=>setConnectionsSearch(e.target.value)} placeholder={connectionsTab==="mine"?"Buscar conexiones":"Buscar usuarios registrados"} aria-label={t("Buscar usuarios")}/></div>
      <p className="connections-hint">{connectionsTab==="mine"?"Amigos, personas que sigues y personas que te siguen.":"Cuentas registradas en RIVYZA · el punto verde indica quién está en línea."}</p>
      <section className="connections-list">
        {(connectionsTab==="mine"?connectionsLoading:communityLoading)&&<p className="connections-empty">Cargando usuarios…</p>}
        {!(connectionsTab==="mine"?connectionsLoading:communityLoading)&&!matches.length&&<p className="connections-empty">No hay usuarios para mostrar.</p>}
        {matches.map(person=><div className="connections-person" key={person.id}>
          <button type="button" className="connections-identity" onClick={()=>openUserProfile(person)}>
            <span className="rivyza-presence-avatar">{person.avatar_url?<img src={person.avatar_url} alt=""/>:<span className="connections-fallback">{(person.display_name||person.username||"R").slice(0,1).toUpperCase()}</span>}{onlineDot(person.id)}</span>
            <span className="connections-names"><strong>{person.display_name||person.username||"Usuario"}</strong><small>@{person.username||"usuario"}</small></span>
          </button>
          {person.i_follow&&person.follows_me?<span className="connections-friends">{t("Amigos")}</span>:person.i_follow?<span className="connections-following">{t("Siguiendo")}</span>:<div className="connections-follow-back">{person.follows_me&&<small>{t("Te sigue")}</small>}<button type="button" onClick={()=>followFromConnections(person)}>{t("Seguir")}</button></div>}
        </div>)}
      </section>
      <nav className="bottom-nav"><button onClick={()=>{setView("home");changeFeedTab("forYou");}}><Home/><span>{t("Inicio")}</span></button><button onClick={()=>{setView("friends");changeFeedTab("friends");}}><AmigosIcon/><span>{t("Amigos")}</span></button><button className="plus-btn" onClick={()=>{setView("home");setUploadOpen(true);setUploadType("photo");setCameraMode("photo");resetUpload();}}><Plus/></button><button onClick={openSocialAlerts}><Bell/><span>{t("Alertas")}</span>{unreadSocial>0&&<b className="social-badge">{unreadSocial>99?"99+":unreadSocial}</b>}</button><button onClick={()=>{setViewedProfile(null);setView("publicProfile");}}><User/><span>{t("Perfil")}</span></button></nav>
    </main>;
  }

  if(view==="friends"){
    return <main className="feed-shell friends-feed-shell">
      <header className="friends-topbar friends-feed-topbar">
        <h1>{t("Amigos")}</h1>
        <p>Solo personas que tú sigues y que también te siguen.</p>
      </header>

      <section className="video-feed home-real-feed">
        {feedLoading && !feedPosts.length && (
          <div className="feed-empty-state">Cargando amigos…</div>
        )}

        {!feedLoading && !feedPosts.length && (
          <div className="friends-empty-state">
            <AmigosIcon/>
            <strong>{feedMessage||"Todavía no hay publicaciones de amigos."}</strong>
          </div>
        )}

        {feedPosts.map(post=>(
          <article className="video-card feed-post-card" key={post.id}>
            <div className="feed-media-wrap">
              {post.media_type==="video"
                ? <video className="feed-media" src={`${post.media_path}#t=0.1`} controls playsInline preload="metadata"/>
                : <img className="feed-media" src={post.media_path} alt={post.caption||"Publicación en RIVYZA"}/>
              }
            </div>

            <div className="creator-copy">
              <button className="creator-profile-link" onClick={()=>openFeedCreator(post)}>
                <div className="display-name">{post.creator?.display_name||post.creator?.username||"Usuario"}</div>
              </button>
              <div className="handle">@{post.creator?.username||"usuario"}</div>
              {post.caption&&<div className="caption">{renderMentionText(post.caption)}</div>}
              <div className="audio-line"><Music2 size={15}/> Sonido original · RIVYZA</div>
              <div className="post-date-time">{formatPostDateTime(post.created_at)}</div>
            </div>

            <div className="side-actions">
              <button className="avatar-action" onClick={()=>openFeedCreator(post)}>
                {post.creator?.avatar_url
                  ? <img src={post.creator.avatar_url} alt={post.creator.display_name||post.creator.username||"Usuario"}/>
                  : <div className="mini-avatar">{(post.creator?.display_name?.[0]||post.creator?.username?.[0]||"R").toUpperCase()}</div>}
                            {onlineDot(post.creator?.id||post.user_id)}
              </button>
              <button className={post.liked_by_me?"feed-liked":""} disabled={feedLikeBusy===post.id} onClick={()=>toggleFeedLike(post)}>
                <Heart fill={post.liked_by_me?"currentColor":"none"}/>
                <span>{post.like_count||0}</span>
              </button>
              <button onClick={()=>openComments(post)}><MessageCircle/><span>{Number(post.comment_count||0)}</span></button>
              <button onClick={()=>openShare(post)}><Share2/><span>{t("Compartir")}</span></button>
              <button onClick={()=>openPost(post)}><MoreHorizontal/><span>{t("Más")}</span></button>
            </div>
          </article>
        ))}
      </section>

      <nav className="bottom-nav">
        <button onClick={()=>{setView("home");changeFeedTab("forYou");window.scrollTo({top:0,behavior:"smooth"});}}><Home/><span>{t("Inicio")}</span></button>
        <button className="active"><AmigosIcon/><span>{t("Amigos")}</span></button>
        <button className="plus-btn" onClick={()=>{setUploadOpen(true);setUploadType("photo");setCameraMode("photo");resetUpload();}}><Plus/></button>
        <button onClick={openSocialAlerts}><Bell/><span>{t("Alertas")}</span>{unreadSocial>0&&<b className="social-badge">{unreadSocial>99?"99+":unreadSocial}</b>}</button>
        <button onClick={()=>{setViewedProfile(null);setView("publicProfile");}}><User/><span>{t("Perfil")}</span></button>
      </nav>
      {renderUploadModal()}
      {commentsOpen && renderCommentsSheet()}
      {renderShareSheet()}
    </main>;
  }

  if(view==="otherProfile" && viewedProfile){
    return <main className="public-profile-shell other-profile-shell">
      <header className="profile-topbar compact">
        <button className="profile-back" onClick={()=>{setSelectedPost(null);if(profileReturnToChat){setProfileReturnToChat(false);setView("messages");}else setView("home");}}>←</button>
        <div className="profile-top-title">RIVYZA</div>
        {adminOwner&&<button type="button" className="rivyza-admin-dots" aria-label="Administrar este perfil" onClick={()=>adminOpen(viewedProfile)}><MoreHorizontal size={25}/></button>}
      </header>


      {adminPanel&&<div className="rivyza-admin-overlay" role="presentation" onClick={()=>setAdminPanel(false)}><div className="rivyza-admin-card" role="dialog" aria-modal="true" aria-label="Panel de administración" onClick={e=>e.stopPropagation()}>
        <div className="rivyza-admin-head"><strong>{adminInbox?"Bandeja administrativa":`Administrar ${adminTarget?.display_name||adminTarget?.username||"usuario"}`}</strong><button type="button" onClick={()=>setAdminPanel(false)}>✕</button></div>
        {adminError&&<p role="alert" className="rivyza-admin-error">{adminError}</p>}
        {!adminInbox&&<><h3>Infracciones X ({adminStrikes.filter(x=>x.status==="active").length}/3)</h3>
          <p>Las sanciones se registran con motivo y fecha. Tres X activas restringen LIVE.</p>
          <textarea placeholder="Motivo obligatorio para poner una X (mínimo 10 caracteres)" value={adminReason} onChange={e=>setAdminReason(e.target.value)} />
          <button disabled={adminBusy||adminReason.trim().length<10||adminStrikes.filter(x=>x.status==="active").length>=3} onClick={()=>{if(window.confirm("¿Asignar una X y notificar oficialmente al usuario?"))adminDo("rivyza_admin_add_strike",{p_target:adminTarget.id,p_reason:adminReason.trim()});}}>Poner X y enviar aviso RIVYZA</button>
          <div className="rivyza-admin-actions"><button type="button" disabled={adminBusy||!adminStrikes.some(x=>x.status==="active")} onClick={()=>{const active=adminStrikes.filter(x=>x.status==="active");if(active.length===1){const reason=window.prompt("Motivo para quitar la X (mínimo 5 caracteres):");if(reason?.trim().length>=5&&window.confirm("¿Retirar esta X y avisar al usuario?"))adminDo("rivyza_admin_remove_strike",{p_strike:active[0].id,p_reason:reason.trim()});}else if(active.length>1){document.getElementById("rivyza-active-strikes")?.scrollIntoView({behavior:"smooth",block:"center"});}}}>Quitar X{adminStrikes.filter(x=>x.status==="active").length>1?" (elige cuál abajo)":""}</button></div>
          {adminStrikes.every(x=>x.status!=="active")&&<p>No hay X activas para retirar en esta cuenta.</p>}
          <div id="rivyza-active-strikes"><strong>Historial de infracciones</strong></div>
          {adminStrikes.map(x=><div className="rivyza-admin-item" key={x.id}><strong>{x.status==="active"?"❌ X activa":"X retirada"} · {x.appeal_status==="in_review"?"En revisión":x.appeal_status||"Sin apelación"}</strong><p>{x.reason}</p><small>{new Date(x.created_at).toLocaleString()}</small>{x.status==="active"&&<button disabled={adminBusy} onClick={()=>{const reason=window.prompt("Motivo para retirar esta X:");if(reason?.trim().length>=5)adminDo("rivyza_admin_remove_strike",{p_strike:x.id,p_reason:reason.trim()});}}>Quitar X</button>}</div>)}
          <div className="rivyza-admin-item"><h3>Control de LIVE</h3>
            {adminLiveStatus?<><p><strong>Estado: {adminLiveStatus.allowed?"Permitido":"Suspendido"}</strong></p>
            <p>{adminLiveStatus.manual_suspended?"Suspensión manual activa":adminLiveStatus.active_strikes>=3?"Suspensión por 3 X activas":"Sin suspensión"}</p>
            {adminLiveStatus.manual_suspended?<button type="button" disabled={adminBusy} onClick={()=>{const reason=window.prompt("Motivo para restaurar LIVE (mínimo 10 caracteres):");if(reason?.trim().length>=10&&window.confirm("¿Restaurar permiso manual de LIVE? Las 3 X activas siguen aplicando."))adminDo("rivyza_admin_set_live_suspension",{p_target:adminTarget.id,p_suspend:false,p_reason:reason.trim()});}}>Restaurar LIVE</button>
            :<button type="button" disabled={adminBusy} onClick={()=>{const reason=window.prompt("Motivo de suspensión LIVE (mínimo 10 caracteres):");if(reason?.trim().length>=10&&window.confirm("¿Suspender LIVE y notificar oficialmente a esta cuenta?"))adminDo("rivyza_admin_set_live_suspension",{p_target:adminTarget.id,p_suspend:true,p_reason:reason.trim()});}}>Suspender LIVE</button>}</>
            :<p>Consulta de estado no disponible. Ejecuta el SQL de esta versión antes de utilizar estos controles.</p>}
            <small>Esta suspensión debe verificarse también en el servidor que autoriza la entrada a LIVE y a invitados.</small></div>
          <h3>Enviar mensaje oficial</h3><textarea value={adminReply} onChange={e=>setAdminReply(e.target.value)} placeholder="Mensaje de RIVYZA para este usuario"/><button disabled={adminBusy||adminReply.trim().length<2} onClick={()=>adminDo("rivyza_admin_send_notice",{p_target:adminTarget.id,p_body:adminReply.trim()})}>Enviar como RIVYZA</button>
        </>}
        {adminInbox&&<div className="rivyza-admin-item"><h3>Usuarios suspendidos de LIVE</h3>{adminSuspended.length===0?<p>No hay suspensiones registradas o no se pudo cargar la lista.</p>:adminSuspended.map(u=><div key={u.user_id}><strong>{u.username||u.user_id}</strong> · {u.reason||"3 X activas"} · {u.manual_suspended?"Manual":"Por infracciones"}</div>)}</div>}<h3>{adminInbox?"Reportes y apelaciones":"Apelaciones de esta cuenta"}</h3>
        {adminCases.length===0&&<p>No hay casos pendientes.</p>}
        {adminCases.map(c=><div className="rivyza-admin-item" key={c.id}><strong>{c.kind==="appeal"?"Apelación":"Reporte"} · {c.status==="in_review"?"En revisión":c.status}</strong><p>{c.body}</p><small>{new Date(c.created_at).toLocaleString()}</small>{adminInbox&&<p>Usuario: {c.user_id}</p>}{c.status==="in_review"&&<div className="rivyza-admin-actions"><button disabled={adminBusy} onClick={()=>{const note=window.prompt("Respuesta oficial (motivo):");if(note?.trim().length>=5)adminDo("rivyza_admin_resolve_case",{p_case:c.id,p_approve:true,p_reply:note.trim()});}}>Aceptar apelación / quitar X</button><button disabled={adminBusy} onClick={()=>{const note=window.prompt("Motivo de la decisión:");if(note?.trim().length>=5)adminDo("rivyza_admin_resolve_case",{p_case:c.id,p_approve:false,p_reply:note.trim()});}}>Mantener X</button></div>}</div>)}
      </div></div>}

      <div className="social-profile-message"><button onClick={()=>openSocialPeer(viewedProfile)}><MessageCircle size={18}/> {t("Enviar mensaje")}</button></div>
      <section className="profile-hero compact-profile">
        <div className="profile-heading-row">
          <div className="profile-heading-copy">
            <h1>{viewedProfile.display_name||viewedProfile.username||"Usuario"}</h1>
            <div className="public-handle">@{viewedProfile.username||"usuario"}</div>{publicStrikeCount>0&&<div className="rivyza-public-strikes" title="Infracciones activas de las normas de RIVYZA">{Array.from({length:Math.min(3,publicStrikeCount)},(_,i)=><span key={i}>✖</span>)} <small>{publicStrikeCount} infracción{publicStrikeCount===1?"":"es"} activa{publicStrikeCount===1?"":"s"} de RIVYZA</small></div>}
            {viewedProfile.show_country && viewedProfile.country_code && (
              <div className="profile-country">
                <img
                  className="profile-country-flag-img"
                  src={`https://flagcdn.com/28x21/${viewedProfile.country_code.toLowerCase()}.png`}
                  srcSet={`https://flagcdn.com/56x42/${viewedProfile.country_code.toLowerCase()}.png 2x`}
                  width="28" height="21" alt="" loading="lazy"
                />
                <span className="profile-country-name">
                  {viewedProfile.country_name || regionNames.of(viewedProfile.country_code) || viewedProfile.country_code}
                </span>
              </div>
            )}
          </div>
          <div className="profile-photo-edit-wrap visitor-avatar-wrap rivyza-presence-anchor">
            {viewedProfile.avatar_url
              ? <img className="public-profile-photo" src={viewedProfile.avatar_url} alt={viewedProfile.display_name||viewedProfile.username}/>
              : <div className="public-profile-photo fallback">{(viewedProfile.display_name?.[0]||viewedProfile.username?.[0]||"R").toUpperCase()}</div>
            }
            {onlineDot(viewedProfile.id)}
          </div>
        </div>

        <div className="profile-stats compact-stats">
          <button onClick={()=>openSocialList(viewedProfile.id,"following")}><strong>{viewedFollowingCount}</strong><span>Following</span></button>
          <button onClick={()=>openSocialList(viewedProfile.id,"followers")}><strong>{viewedFollowersCount}</strong><span>Followers</span></button>
          <button><strong>{viewedLikesCount}</strong><span>Likes</span></button>
        </div>
        <div className="visitor-follow-row rivyza-visitor-actions">
          <button type="button" className={`visitor-follow-btn ${isFollowingViewed?"following":""}`}
            disabled={followBusy||blockedUsers.includes(viewedProfile.id)} onClick={toggleFollowViewed}>
            <UserRoundPlus size={17}/>{followBusy?"...":isFollowingViewed?"Siguiendo":"Seguir"}
          </button>
          <button type="button" className={`rivyza-mini-action ${liveBellIds.includes(viewedProfile.id)?"active":""}`} title="Avisarme cuando inicie LIVE" aria-label="Avisos de LIVE" onClick={()=>toggleLiveBell(viewedProfile.id)}><Bell size={19}/></button>
          <button type="button" className="rivyza-mini-action block" title="Bloquear cuenta" aria-label="Bloquear cuenta" onClick={()=>{if(window.confirm("¿Bloquear a esta persona?"))setBlocked(viewedProfile.id,true);}}><Ban size={19}/></button>
        </div>

        {viewedProfile.bio && <p className="public-bio">{viewedProfile.bio}</p>}
        <div className="profile-links-stack">
          {viewedProfile.website_url && <a href={viewedProfile.website_url} target="_blank" rel="noreferrer"><LinkIcon size={16}/><span>Website</span></a>}
          {viewedProfile.youtube_url && <a href={viewedProfile.youtube_url} target="_blank" rel="noreferrer"><Youtube size={16}/><span>YouTube</span></a>}
          {viewedProfile.instagram_url && <a href={viewedProfile.instagram_url} target="_blank" rel="noreferrer"><Instagram size={16}/><span>Instagram</span></a>}
          {viewedProfile.facebook_url && <a href={viewedProfile.facebook_url} target="_blank" rel="noreferrer"><Facebook size={16}/><span>Facebook</span></a>}
        </div>
      </section>

      <section className="profile-content-section">
        <div className="profile-content-tabs visitor-tabs">
          <button className={viewedProfileTab==="posts"?"active":""} onClick={()=>setViewedProfileTab("posts")}><Grid3X3 size={20}/></button>
          {viewedLikesAllowed&&<button className={viewedProfileTab==="likes"?"active":""} onClick={()=>setViewedProfileTab("likes")} aria-label="Me gusta"><Heart size={20}/></button>}
        </div>
        {viewedProfileTab==="likes"&&viewedLikesAllowed?<div className="posts-grid">{viewedLikesLoading?<p>Cargando Me gusta…</p>:viewedLikedPosts.length?viewedLikedPosts.map(post=><button type="button" className="profile-post-card" key={post.id} onClick={()=>openPost(post)}>{post.media_type==="photo"?<img src={post.media_path} alt={post.caption||"Publicación"}/>:<video src={`${post.media_path}#t=0.1`} muted playsInline preload="metadata"/>}</button>):<p>No hay publicaciones que mostrar.</p>}</div>:<div className="posts-grid">
          {viewedProfilePosts.length > 0 ? viewedProfilePosts.map(post=>(
            <div className="profile-post-card" key={post.id} onClick={()=>openPost(post)}>
              {post.media_type==="photo"
                ? <img src={post.media_path} alt={post.caption||"Publicación"}/>
                : <video src={`${post.media_path}#t=0.1`} muted playsInline preload="metadata"/>
              }
              {post.pinned_position && <span className="post-pin">📌</span>}
            </div>
          )) : <div className="empty-grid-card first">Este usuario todavía no tiene publicaciones públicas.</div>}
        </div>}
      </section>

      {socialListOpen && (
        <div className="social-list-overlay">
          <div className="social-list-panel">
            <header className="social-list-header">
              <button type="button" onClick={()=>setSocialListOpen(false)}>←</button>
              <strong>{socialListTitle}</strong><span></span>
            </header>
            <div className="social-list-body">
              {socialListLoading && <p className="social-list-empty">Cargando...</p>}
              {!socialListLoading && !socialListRows.length && <p className="social-list-empty">Todavía no hay usuarios aquí.</p>}
              {socialListRows.map(person=>(
                <div className="social-person-row" key={person.id}>
                  <button className="people-result social-person-open" onClick={()=>{setSocialListOpen(false);openUserProfile(person);}}>
                    <span className="rivyza-list-avatar rivyza-presence-anchor">{person.avatar_url?<img src={person.avatar_url} alt={person.display_name||person.username}/>:<span className="people-result-fallback">{(person.display_name?.[0]||person.username?.[0]||"R").toUpperCase()}</span>}{onlineDot(person.id)}</span>
                    <span className="people-result-copy">
                      <strong>{person.display_name||person.username||"Usuario"}</strong>
                      <small>@{person.username||"usuario"}</small>
                      {person.id!==user?.id && <em className={`follow-back-label ${person.follows_me?"follows-me":""}`}>{person.follows_me?"Te sigue":"No te sigue"}</em>}
                    </span>
                  </button>
                  {person.id!==user?.id && person.i_follow && (
                    <button type="button" className="list-following-btn" onClick={()=>unfollowFromList(person)}>{t("Siguiendo")}</button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {selectedPost && (
        <div className="post-detail-overlay">
          <header className="post-detail-topbar">
            <button type="button" onClick={()=>{if(postOpenedFromAlert)closeNotificationPost();else{setSelectedPost(null);setPostMenuOpen(false);}}} aria-label="Volver">←</button>
            <strong>{t("Publicación")}</strong>
            <button type="button" onClick={()=>setPostMenuOpen(v=>!v)} aria-label="Opciones"><MoreHorizontal size={25}/></button>
          </header>
          <div className="post-detail-media post-swipe-viewer" onTouchStart={handlePostTouchStart} onTouchEnd={handlePostTouchEnd} onWheel={handlePostWheel}>
            {selectedPost.media_type==="photo"
              ? <img src={selectedPost.media_path} alt={selectedPost.caption||"Publicación"}/>
              : <video key={selectedPost.id} ref={postViewerVideoRef} src={selectedPost.media_path} controls playsInline autoPlay preload="auto"/>
            }
          </div>
          <div className="post-detail-info">
            {selectedPost.caption && <p className="post-detail-caption">{renderMentionText(selectedPost.caption)}</p>}
            <div className="post-public-stamp">Publicado · {formatPostDate(selectedPost.created_at)}</div>
            <div className="post-detail-actions">
              <button type="button" className={postLiked?"liked":""} onClick={togglePostLike}><Heart size={23} fill={postLiked?"currentColor":"none"}/><span>{postLikeCount}</span></button>
              {selectedPost.user_id===user?.id && postLikeCount>0 && <button type="button" className="who-liked-btn" onClick={openPostLikers}>Ver quién dio like</button>}
              <button type="button" onClick={()=>openComments(selectedPost)}><MessageCircle size={23}/><span>{postCommentCount}</span></button>
              <button type="button" onClick={()=>openShare(selectedPost)}><Share2 size={23}/><span>{t("Compartir")}</span></button>
            </div>
            {postActionMessage && <div className="post-action-message">{postActionMessage}</div>}
          </div>
          {postMenuOpen && (
            <div className="post-menu-backdrop" onClick={()=>setPostMenuOpen(false)}>
              <div className="post-menu-sheet" onClick={e=>e.stopPropagation()}>
                <button type="button" onClick={()=>openShare(selectedPost)}><Share2 size={20}/>Compartir en RIVYZA</button>
                <button type="button" onClick={copyPostLink}><LinkIcon size={20}/>Copiar enlace</button>
                {selectedPost?.user_id!==user?.id&&<button type="button" onClick={()=>startReport("post",selectedPost.id)}><ShieldCheck size={20}/>Reportar publicación</button>}
                <button type="button" onClick={()=>setPostMenuOpen(false)}>{t("Cancelar")}</button>
              </div>
            </div>
          )}
      {reportTarget&&<div className="post-menu-backdrop" style={{zIndex:10000}} onClick={()=>setReportTarget(null)}><div className="post-menu-sheet rivyza-report-sheet" onClick={e=>e.stopPropagation()}><h3>Reportar contenido</h3><p>Elige el motivo. Tu identidad no se mostrará al usuario reportado.</p><select aria-label="Motivo del reporte" value={reportReason} onChange={e=>setReportReason(e.target.value)}>{[["harassment","Acoso o insultos"],["threats","Amenazas"],["child_safety","Explotación o riesgo sexual de menores"],["sexual","Contenido sexual inapropiado"],["violence","Violencia"],["hate","Discriminación u odio"],["spam","Spam o estafa"],["privacy","Violación de privacidad"],["other","Otro"]].map(([v,l])=><option key={v} value={v}>{l}</option>)}</select><textarea aria-label="Detalles opcionales" placeholder="Detalles (opcional)" maxLength={1000} value={reportDetails} onChange={e=>setReportDetails(e.target.value)}/>{reportFeedback&&<p role="alert">{reportFeedback}</p>}<button type="button" disabled={reportBusy} onClick={submitReport}>{reportBusy?"Enviando...":"Enviar reporte"}</button><button type="button" onClick={()=>setReportTarget(null)}>Cancelar</button></div></div>}
          {commentsOpen && renderCommentsSheet()}
        </div>
      )}

      <nav className="bottom-nav">
        <button onClick={()=>{setView("home");changeFeedTab("forYou");window.scrollTo({top:0,behavior:"smooth"});}}><Home/><span>{t("Inicio")}</span></button>
        <button onClick={()=>{setUploadOpen(false);setView("friends");changeFeedTab("friends");}}><AmigosIcon/><span>{t("Amigos")}</span></button>
        <button className="plus-btn" onClick={()=>{setUploadOpen(true);setUploadType("photo");setCameraMode("photo");resetUpload();}}><Plus/></button>
        <button onClick={openSocialAlerts}><Bell/><span>{t("Alertas")}</span>{unreadSocial>0&&<b className="social-badge">{unreadSocial>99?"99+":unreadSocial}</b>}</button>
        <button onClick={()=>{setViewedProfile(null);setView("publicProfile");}}><User/><span>{t("Perfil")}</span></button>
      </nav>
      {renderUploadModal()}
      {renderShareSheet()}
    </main>;
  }

  if(view==="publicProfile"){
    return <main className="public-profile-shell">
      <header className="profile-topbar compact">
        <button className="profile-back" onClick={()=>{setUploadOpen(false);setView("home");}}>←</button>
        <div className="profile-top-title">RIVYZA</div>
        <button className="profile-menu" onClick={()=>setView("socialSettings")} aria-label={t("Configuración")}><MoreHorizontal size={24}/></button>
      </header>

      <section className="profile-hero compact-profile">
        <div className="profile-heading-row">
          <div className="profile-heading-copy">
            <h1>{profile?.display_name||"DJ Plus"}</h1>
            <div className="public-handle">@{profile?.username||"DJPLUS"}</div>
            {profile?.show_country && profile?.country_code && (
              <div className="profile-country">
                <img
                  className="profile-country-flag-img"
                  src={`https://flagcdn.com/28x21/${profile.country_code.toLowerCase()}.png`}
                  srcSet={`https://flagcdn.com/56x42/${profile.country_code.toLowerCase()}.png 2x`}
                  width="28"
                  height="21"
                  alt=""
                  loading="lazy"
                />
                <span className="profile-country-name">
                  {profile.country_name || regionNames.of(profile.country_code) || profile.country_code}
                </span>
              </div>
            )}
          </div>

          <div className="profile-photo-edit-wrap">
            {profile?.avatar_url
              ? <img className="public-profile-photo" src={profile.avatar_url} alt={profile.display_name}/>
              : <div className="public-profile-photo fallback">{(profile?.display_name?.[0]||"R").toUpperCase()}</div>
            }
            <label className="avatar-plus">
              <Plus size={19}/>
              <input type="file" accept="image/jpeg,image/png,image/webp" onChange={onPickPhoto} hidden/>
            </label>
          </div>
        </div>

        <div className="profile-stats compact-stats">
          <button onClick={()=>openSocialList(user.id,"following")}><strong>{ownFollowingCount}</strong><span>Following</span></button>
          <button onClick={()=>openSocialList(user.id,"followers")}><strong>{ownFollowersCount}</strong><span>Followers</span></button>
          <button><strong>{ownLikesCount}</strong><span>Likes</span></button>
        </div>

        {profile?.bio && <p className="public-bio">{profile.bio}</p>}

        <div className="profile-links-stack">
          {profile?.website_url && <a href={profile.website_url} target="_blank" rel="noreferrer"><LinkIcon size={16}/><span>Website</span></a>}
          {profile?.youtube_url && <a href={profile.youtube_url} target="_blank" rel="noreferrer"><Youtube size={16}/><span>YouTube</span></a>}
          {profile?.instagram_url && <a href={profile.instagram_url} target="_blank" rel="noreferrer"><Instagram size={16}/><span>Instagram</span></a>}
          {profile?.facebook_url && <a href={profile.facebook_url} target="_blank" rel="noreferrer"><Facebook size={16}/><span>Facebook</span></a>}
        </div>

        <button className="edit-profile-main-btn" onClick={()=>setView("profile")}>{t("Editar perfil")}</button>
      </section>

      <section className="profile-content-section">
        <div className="profile-content-tabs two-tabs">
          <button className={profileTab==="posts"?"active":""} onClick={()=>setProfileTab("posts")}>
            <Grid3X3 size={20}/>
          </button>
          <button className={profileTab==="likes"?"active":""} onClick={()=>setProfileTab("likes")}>
            <Heart size={20}/>
          </button>
        </div>

        {profileTab==="posts" ? (
          <div className="posts-grid">
            {profilePosts.length > 0 ? (
              profilePosts.map((post)=>(
                <div
                  className="profile-post-card"
                  key={post.id}
                  onClick={()=>openPost(post)}
                >
                  {post.media_type==="photo" ? (
                    <img src={post.media_path} alt={post.caption||"Publicación"}/>
                  ) : (
                    <video src={`${post.media_path}#t=0.1`} muted playsInline preload="metadata"/>
                  )}

                  {post.pinned_position && (
                    <span className="post-pin">📌</span>
                  )}
                </div>
              ))
            ) : (
              <div className="empty-grid-card first">
                {t("Tus fotos y videos aparecerán aquí")}
              </div>
            )}
          </div>
        ) : (
          <section className="rivyza-liked-private">
            <div className="rivyza-liked-heading"><Heart size={19}/><strong>{t("Mis me gusta")}</strong><span>{likesPrivacy==="only_me"?"🔒 "+t("Solo yo"):likesPrivacy==="friends"?t("Amigos"):t("Todos")}</span></div>
            <p className="rivyza-liked-note">{likesPrivacy==="only_me"?t("Solo tú puedes ver las publicaciones a las que les has dado like."):likesPrivacy==="friends"?t("Solo mis amigos pueden ver las publicaciones que me gustan."):t("Cualquier usuario puede ver las publicaciones que me gustan.")}</p>
            {likedPostsLoading?<p className="rivyza-liked-note">{t("Cargando tus me gusta…")}</p>:likedPostsError?<p className="rivyza-liked-note">{t(likedPostsError)}</p>:likedPosts.length===0?<p className="rivyza-liked-note">{t("Aún no has dado me gusta a ninguna publicación.")}</p>:<div className="posts-grid">{likedPosts.map(post=><button type="button" className="profile-post-card rivyza-liked-post" key={post.id} onClick={()=>openPost(post)}>{post.media_type==="photo"?<img src={post.media_path} alt={post.caption||t("Publicación")}/>:<video src={`${post.media_path}#t=0.1`} muted playsInline preload="metadata"/>}</button>)}</div>}
          </section>
        )}
      </section>

      {selectedPost && (
        <div className="post-detail-overlay">
          <header className="post-detail-topbar">
            <button type="button" onClick={()=>{if(postOpenedFromAlert)closeNotificationPost();else{setSelectedPost(null);setPostMenuOpen(false);}}} aria-label="Volver">←</button>
            <strong>{t("Publicación")}</strong>
            <button type="button" onClick={()=>setPostMenuOpen(v=>!v)} aria-label="Opciones"><MoreHorizontal size={25}/></button>
          </header>

          <div
            className="post-detail-media post-swipe-viewer"
            onTouchStart={handlePostTouchStart}
            onTouchEnd={handlePostTouchEnd}
            onWheel={handlePostWheel}
          >
            {selectedPost.media_type==="photo" ? (
              <img src={selectedPost.media_path} alt={selectedPost.caption||"Publicación"}/>
            ) : (
              <video key={selectedPost.id} ref={postViewerVideoRef} src={selectedPost.media_path} controls playsInline autoPlay preload="auto"/>
            )}
          </div>

          <div className="post-detail-info">
            {selectedPost.caption && <p className="post-detail-caption">{renderMentionText(selectedPost.caption)}</p>}
            <div className="post-public-stamp" data-rivyza-stamp="v13.6">
              Publicado · {formatPostDate(selectedPost.created_at)}
            </div>
            <div className="post-detail-actions">
              <button type="button" className={postLiked?"liked":""} onClick={togglePostLike}><Heart size={23} fill={postLiked?"currentColor":"none"}/><span>{postLikeCount}</span></button>
              {selectedPost.user_id===user?.id && postLikeCount>0 && <button type="button" className="who-liked-btn" onClick={openPostLikers}>Ver quién dio like</button>}
              <button type="button" onClick={()=>openComments(selectedPost)}><MessageCircle size={23}/><span>{postCommentCount}</span></button>
              <button type="button" onClick={()=>openShare(selectedPost)}><Share2 size={23}/><span>{t("Compartir")}</span></button>
            </div>
            {postActionMessage && <div className="post-action-message">{postActionMessage}</div>}
          </div>

          {postMenuOpen && (
            <div className="post-menu-backdrop" onClick={()=>setPostMenuOpen(false)}>
              <div className="post-menu-sheet" onClick={e=>e.stopPropagation()}>
                <button type="button" onClick={()=>openShare(selectedPost)}><Share2 size={20}/>Compartir en RIVYZA</button>
                <button type="button" onClick={copyPostLink}><LinkIcon size={20}/>Copiar enlace</button>
                {selectedPost?.user_id!==user?.id&&<button type="button" onClick={()=>startReport("post",selectedPost.id)}><ShieldCheck size={20}/>Reportar publicación</button>}
                {selectedPost.user_id===user?.id && <>
                  <button type="button" onClick={()=>setPostPin(1)}>📌 Fijar en posición 1</button>
                  <button type="button" onClick={()=>setPostPin(2)}>📌 Fijar en posición 2</button>
                  {selectedPost.pinned_position && <button type="button" onClick={()=>setPostPin(null)}>Quitar de fijadas</button>}
                  <button type="button" className="danger" onClick={()=>{setPostMenuOpen(false);setDeleteConfirmOpen(true);}}>🗑️ Eliminar publicación</button>
                </>}
                <button type="button" onClick={()=>setPostMenuOpen(false)}>{t("Cancelar")}</button>
              </div>
            </div>
          )}

      {reportTarget&&<div className="post-menu-backdrop" style={{zIndex:10000}} onClick={()=>setReportTarget(null)}><div className="post-menu-sheet rivyza-report-sheet" onClick={e=>e.stopPropagation()}><h3>Reportar contenido</h3><p>Elige el motivo. Tu identidad no se mostrará al usuario reportado.</p><select aria-label="Motivo del reporte" value={reportReason} onChange={e=>setReportReason(e.target.value)}>{[["harassment","Acoso o insultos"],["threats","Amenazas"],["child_safety","Explotación o riesgo sexual de menores"],["sexual","Contenido sexual inapropiado"],["violence","Violencia"],["hate","Discriminación u odio"],["spam","Spam o estafa"],["privacy","Violación de privacidad"],["other","Otro"]].map(([v,l])=><option key={v} value={v}>{l}</option>)}</select><textarea aria-label="Detalles opcionales" placeholder="Detalles (opcional)" maxLength={1000} value={reportDetails} onChange={e=>setReportDetails(e.target.value)}/>{reportFeedback&&<p role="alert">{reportFeedback}</p>}<button type="button" disabled={reportBusy} onClick={submitReport}>{reportBusy?"Enviando...":"Enviar reporte"}</button><button type="button" onClick={()=>setReportTarget(null)}>Cancelar</button></div></div>}
          {deleteConfirmOpen && (
            <div className="post-menu-backdrop delete-confirm-backdrop" onClick={()=>setDeleteConfirmOpen(false)}>
              <div className="delete-confirm-card" onClick={e=>e.stopPropagation()}>
                <strong>¿Eliminar esta publicación?</strong>
                <p>Esta acción no se puede deshacer.</p>
                <div className="delete-confirm-actions">
                  <button type="button" onClick={()=>setDeleteConfirmOpen(false)}>{t("Cancelar")}</button>
                  <button type="button" className="danger" onClick={async()=>{setDeleteConfirmOpen(false);await deleteSelectedPost();}}>{t("Eliminar")}</button>
                </div>
              </div>
            </div>
          )}

          {commentsOpen && renderCommentsSheet()}
        </div>
      )}

      {socialListOpen && (
        <div className="social-list-overlay">
          <div className="social-list-panel">
            <header className="social-list-header">
              <button type="button" onClick={()=>setSocialListOpen(false)}>←</button>
              <strong>{socialListTitle}</strong><span></span>
            </header>
            <div className="social-list-body">
              {socialListLoading && <p className="social-list-empty">Cargando...</p>}
              {!socialListLoading && !socialListRows.length && <p className="social-list-empty">Todavía no hay usuarios aquí.</p>}
              {socialListRows.map(person=>(
                <div className="social-person-row" key={person.id}>
                  <button className="people-result social-person-open" onClick={()=>{setSocialListOpen(false);openUserProfile(person);}}>
                    <span className="rivyza-list-avatar rivyza-presence-anchor">{person.avatar_url?<img src={person.avatar_url} alt={person.display_name||person.username}/>:<span className="people-result-fallback">{(person.display_name?.[0]||person.username?.[0]||"R").toUpperCase()}</span>}{onlineDot(person.id)}</span>
                    <span className="people-result-copy">
                      <strong>{person.display_name||person.username||"Usuario"}</strong>
                      <small>@{person.username||"usuario"}</small>
                      {person.id!==user?.id && <em className={`follow-back-label ${person.follows_me?"follows-me":""}`}>{person.follows_me?"Te sigue":"No te sigue"}</em>}
                    </span>
                  </button>
                  {person.id!==user?.id && person.i_follow && (
                    <button type="button" className="list-following-btn" onClick={()=>unfollowFromList(person)}>{t("Siguiendo")}</button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {likersOpen && (
        <div className="social-list-overlay likers-overlay">
          <div className="social-list-panel">
            <header className="social-list-header">
              <button type="button" onClick={()=>setLikersOpen(false)}>←</button>
              <strong>Likes de esta publicación</strong><span></span>
            </header>
            <div className="social-list-body">
              {likersLoading && <p className="social-list-empty">Cargando...</p>}
              {!likersLoading && !likersRows.length && <p className="social-list-empty">Todavía nadie ha dado like.</p>}
              {likersRows.map(person=>(
                <button className="people-result liker-person" key={person.id} onClick={()=>{setLikersOpen(false);openUserProfile(person);}}>
                  <span className="rivyza-list-avatar rivyza-presence-anchor">{person.avatar_url?<img src={person.avatar_url} alt={person.display_name||person.username}/>:<span className="people-result-fallback">{(person.display_name?.[0]||person.username?.[0]||"R").toUpperCase()}</span>}{onlineDot(person.id)}</span>
                  <span className="people-result-copy"><strong>{person.display_name||person.username||"Usuario"}</strong><small>@{person.username||"usuario"}</small></span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <nav className="bottom-nav">
        <button onClick={()=>{setUploadOpen(false);setView("home");}}><Home/><span>{t("Inicio")}</span></button>
        <button onClick={()=>{setUploadOpen(false);setView("friends");changeFeedTab("friends");}}><AmigosIcon/><span>{t("Amigos")}</span></button>
        <button className="plus-btn" onClick={()=>{setUploadOpen(true);setUploadType("photo");setCameraMode("photo");resetUpload();}}><Plus/></button>
        <button onClick={openSocialAlerts}><Bell/><span>{t("Alertas")}</span>{unreadSocial>0&&<b className="social-badge">{unreadSocial>99?"99+":unreadSocial}</b>}</button>
        <button className="active"><User/><span>{t("Perfil")}</span></button>
      </nav>

      
      {renderUploadModal()}

      {cropOpen&&<div className="crop-modal">
        <div className="crop-card">
          <div className="crop-header">
            <strong>Ajusta tu foto</strong>
            <button onClick={()=>setCropOpen(false)}><X/></button>
          </div>
          <div className="crop-area">
            <Cropper
              image={cropSrc}
              crop={crop}
              zoom={zoom}
              aspect={1}
              cropShape="round"
              showGrid={false}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
            />
          </div>
          <div className="crop-controls">
            <span>Zoom</span>
            <input type="range" min={1} max={3} step={0.01} value={zoom} onChange={(e)=>setZoom(Number(e.target.value))}/>
          </div>
          <button className="save-profile-btn" onClick={uploadAvatar} disabled={uploadingAvatar}>
            <Check size={18}/>
            {uploadingAvatar?"Guardando foto…":"Usar esta foto"}
          </button>
        </div>
      </div>}
    </main>;
  }

  if(view==="profile"){
    return <main className="profile-setup-shell">
      <section className="profile-card">
        {profile&&<button className="back-home" onClick={()=>{setUploadOpen(false);setView("publicProfile");}}>← Volver</button>}
        <div className="edit-profile-mobile-banner">
          <div className="profile-brand">RIVYZA</div>
          <p className="step-label">{profile?"EDITAR PERFIL":"PRIMER PASO"}</p>
          <div className="profile-avatar-wrap">
            {avatarUrl
              ? <img className="profile-photo" src={avatarUrl} alt="Foto de perfil"/>
              : <div className="profile-photo-fallback">{(displayName?.[0]||user.email?.[0]||"R").toUpperCase()}</div>
            }

            <label className="change-photo-btn">
              <Camera size={17}/>Cambiar foto
              <input type="file" accept="image/jpeg,image/png,image/webp" onChange={onPickPhoto} hidden/>
            </label>
          </div>
        </div>

        <form onSubmit={saveProfile} className="profile-form">
          <label>
            <span>@Usuario</span>
            <div className="input-icon-wrap">
              <AtSign size={18}/>
              <input
                value={username}
                onChange={(e)=>!profile&&setUsername(norm(e.target.value))}
                disabled={!!profile}
                placeholder="ejemplo: djplus"
              />
            </div>
            {profile&&<small className="locked-note">Tu @usuario es permanente. Se mostrará respetando mayúsculas y minúsculas.</small>}
          </label>

          <label>
            <span>Nombre para mostrar</span>
            <input value={displayName} onChange={(e)=>setDisplayName(e.target.value)} placeholder="Tu nombre"/>
          </label>

          <label>
            <span>Bio</span>
            <textarea value={bio} onChange={(e)=>setBio(e.target.value)} maxLength={160} rows={4}/>
            <small>{bio.length}/160</small>
          </label>

          
        <div className="country-editor">
          <div className="links-editor-title">País que representas</div>

          <select
            value={countryCode}
            onChange={(e)=>{
              const code=e.target.value;
              setCountryCode(code);
              setCountryName(code ? (regionNames.of(code)||code) : "");
            }}
          >
            <option value="">Selecciona un país</option>
            {countryOptions.map(({code,name,flag})=>(
              <option key={code} value={code}>{flag} {name}</option>
            ))}
          </select>

          <label className="country-toggle">
            <input
              type="checkbox"
              checked={showCountry}
              onChange={(e)=>setShowCountry(e.target.checked)}
            />
            <span>Mostrar mi país en mi perfil</span>
          </label>

          <small className="country-note">La bandera solo aparecerá cuando alguien visite tu perfil.</small>
        </div>

        <div className="links-editor">
          <div className="links-editor-title">Enlaces</div>

          <label>
            <span>Website</span>
            <input
              value={websiteUrl}
              onChange={(e)=>setWebsiteUrl(e.target.value)}
              placeholder="ejemplo.com"
              inputMode="url"
            />
          </label>

          <label>
            <span>YouTube</span>
            <input
              value={youtubeUrl}
              onChange={(e)=>setYoutubeUrl(e.target.value)}
              placeholder="youtube.com/@tuusuario"
              inputMode="url"
            />
          </label>

          <label>
            <span>Instagram</span>
            <input
              value={instagramUrl}
              onChange={(e)=>setInstagramUrl(e.target.value)}
              placeholder="instagram.com/tuusuario"
              inputMode="url"
            />
          </label>

          <label>
            <span>Facebook</span>
            <input
              value={facebookUrl}
              onChange={(e)=>setFacebookUrl(e.target.value)}
              placeholder="facebook.com/tuusuario"
              inputMode="url"
            />
          </label>
        </div>

        {message&&<div className="form-message">{message}</div>}

          <button className="save-profile-btn" disabled={saving}>
            <Save size={18}/>
            {saving?"Guardando…":profile?"Guardar cambios":"Crear mi perfil"}
          </button>
        </form>

        
      </section>

      {cropOpen&&<div className="crop-modal">
        <div className="crop-card">
          <div className="crop-header">
            <strong>Ajusta tu foto</strong>
            <button onClick={()=>setCropOpen(false)}><X/></button>
          </div>

          <div className="crop-area">
            <Cropper
              image={cropSrc}
              crop={crop}
              zoom={zoom}
              aspect={1}
              cropShape="round"
              showGrid={false}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
            />
          </div>

          <div className="crop-controls">
            <span>Zoom</span>
            <input type="range" min={1} max={3} step={0.01} value={zoom} onChange={(e)=>setZoom(Number(e.target.value))}/>
          </div>

          <button className="save-profile-btn" onClick={uploadAvatar} disabled={uploadingAvatar}>
            <Check size={18}/>
            {uploadingAvatar?"Guardando foto…":"Usar esta foto"}
          </button>
        </div>
      </div>}
    </main>;
  }

  return <main className="feed-shell">
    <header className="feed-topbar">
      <div className="top-brand">RIVYZA</div>
      <div className="feed-tabs">
        <button onClick={openConnections}>{t("Conexiones")}</button>
        <button className={feedTab==="forYou"?"active-tab":""} onClick={()=>changeFeedTab("forYou")}>{t("Para ti")}</button>
        <button onClick={()=>setView("livePreview")}>LIVE</button>
      </div>
      <button className="icon-btn" onClick={()=>{setPeopleSearchOpen(true);setPeopleSearch("");setPeopleResults([]);setPeopleSearchMessage("");}} aria-label={t("Buscar usuarios")}><Search size={23}/></button>
    </header>

    <section className="video-feed home-real-feed">
      {newFeedPostsAvailable && <button type="button" className="feed-new-posts-banner" onClick={()=>{loadHomeFeed(feedTab);document.querySelector(".feed-shell > .home-real-feed")?.scrollTo({top:0,behavior:"smooth"});}}>↑ Nuevas publicaciones</button>}
      {feedLoading && !feedPosts.length && (
        <div className="feed-empty-state">Cargando publicaciones…</div>
      )}

      {!feedLoading && !feedPosts.length && (
        <div className="feed-empty-state">{feedMessage||"Todavía no hay publicaciones."}</div>
      )}

      {feedPosts.map(post=>(
        <article className="video-card feed-post-card" key={post.id}>
          <div className="feed-media-wrap">
            {post.media_type==="video"
              ? <video className="feed-media" src={`${post.media_path}#t=0.1`} controls playsInline preload="metadata"/>
              : <img className="feed-media" src={post.media_path} alt={post.caption||"Publicación en RIVYZA"}/>
            }
          </div>

          <div className="creator-copy">
            <button className="creator-profile-link" onClick={()=>openFeedCreator(post)}>
              <div className="display-name">{post.creator?.display_name||post.creator?.username||"Usuario"}</div>
            </button>
            <div className="handle">@{post.creator?.username||"usuario"}</div>
            {post.caption&&<div className="caption">{renderMentionText(post.caption)}</div>}
            <div className="audio-line"><Music2 size={15}/> Sonido original · RIVYZA</div>
              <div className="post-date-time">{formatPostDateTime(post.created_at)}</div>
          </div>

          <div className="side-actions">
            <button className="avatar-action" onClick={()=>openFeedCreator(post)}>
              {post.creator?.avatar_url
                ? <img src={post.creator.avatar_url} alt={post.creator.display_name||post.creator.username||"Usuario"}/>
                : <div className="mini-avatar">{(post.creator?.display_name?.[0]||post.creator?.username?.[0]||"R").toUpperCase()}</div>}
              {onlineDot(post.creator?.id||post.user_id)}
            </button>

            <button className={post.liked_by_me?"feed-liked":""} disabled={feedLikeBusy===post.id} onClick={()=>toggleFeedLike(post)}>
              <Heart fill={post.liked_by_me?"currentColor":"none"}/>
              <span>{post.like_count||0}</span>
            </button>
            <button onClick={()=>openComments(post)}><MessageCircle/><span>{Number(post.comment_count||0)}</span></button>
            <button onClick={()=>openShare(post)}><Share2/><span>{t("Compartir")}</span></button>
            <button onClick={()=>openPost(post)}><MoreHorizontal/><span>{t("Más")}</span></button>
          </div>
        </article>
      ))}
    </section>

    {peopleSearchOpen && (
      <div className="people-search-overlay">
        <div className="people-search-panel">
          <header className="people-search-header">
            <button type="button" onClick={()=>setPeopleSearchOpen(false)} aria-label="Cerrar">←</button>
            <strong>{t("Buscar personas")}</strong>
            <span></span>
          </header>
          <form className="people-search-form" onSubmit={e=>{e.preventDefault();searchPeople();}}>
            <Search size={19}/>
            <input
              autoFocus
              value={peopleSearch}
              onChange={e=>setPeopleSearch(e.target.value)}
              placeholder="Nombre o @usuario"
              autoCapitalize="none"
            />
            <button type="submit" disabled={peopleSearching}>{peopleSearching?"…":"Buscar"}</button>
          </form>
          <div className="people-search-results">
            {peopleSearchMessage && <p className="people-search-message">{peopleSearchMessage}</p>}
            {peopleResults.map(person=>(
              <button className="people-result" key={person.id} onClick={()=>openUserProfile(person)}>
                {person.avatar_url
                  ? <img src={person.avatar_url} alt={person.display_name||person.username}/>
                  : <span className="people-result-fallback">{(person.display_name?.[0]||person.username?.[0]||"R").toUpperCase()}</span>
                }
                <span className="people-result-copy">
                  <strong>{person.display_name||person.username||"Usuario"}</strong>
                  <small>@{person.username||"usuario"}</small>
                  {person.bio && <em>{person.bio}</em>}
                </span>
                <span className="people-result-arrow">›</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    )}

    <nav className="bottom-nav">
      <button className="active"><Home/><span>{t("Inicio")}</span></button>
      <button onClick={()=>{setUploadOpen(false);setView("friends");changeFeedTab("friends");}}><AmigosIcon/><span>{t("Amigos")}</span></button>
      <button className="plus-btn" onClick={()=>{setUploadOpen(true);setUploadType("photo");setCameraMode("photo");resetUpload();}}><Plus/></button>
      <button onClick={openSocialAlerts}><Bell/><span>{t("Alertas")}</span>{unreadSocial>0&&<b className="social-badge">{unreadSocial>99?"99+":unreadSocial}</b>}</button>
      <button onClick={()=>{setUploadOpen(false);setView("publicProfile");}}><User/><span>{t("Perfil")}</span></button>
    </nav>

    {renderUploadModal()}
    {commentsOpen && renderCommentsSheet()}
    {renderShareSheet()}
  </main>;
}
