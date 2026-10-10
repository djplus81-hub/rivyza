"use client";
import { createPortal } from "react-dom";
import {useEffect,useMemo,useState,useCallback,useRef} from "react";
import {createClient} from "@supabase/supabase-js";
import Cropper from "react-easy-crop";
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


const RIVYZA_EN={"Eliminar para mí":"Delete for me","Eliminar para todos":"Delete for everyone","¿Eliminar este mensaje para todos?":"Delete this message for everyone?","Solo puedes eliminar para todos tus mensajes durante los primeros 3 minutos.":"You can delete your messages for everyone only within the first 3 minutes.","No se pudo eliminar para todos.":"Could not delete for everyone.","Eliminar":"Delete","¿Eliminar este mensaje solo para ti?":"Delete this message only for you?","No se pudo eliminar el mensaje. Ejecuta el SQL de esta actualización en Supabase.":"Unable to delete the message. Run this update’s SQL in Supabase.","Seguridad y contraseña":"Security & password","Información de cuenta":"Account information","Cuenta privada":"Private account","Cuentas bloqueadas":"Blocked accounts","Estado en línea":"Online status","Quién puede enviarme mensajes":"Who can message me","Quién puede comentar":"Who can comment","Menciones y etiquetas":"Mentions & tags","Publicaciones que me gustan":"Liked posts","Lista de seguidos":"Following list","Apariencia":"Appearance","Preferencias de notificaciones":"Notification preferences","Cambiar de cuenta":"Switch account","Próximamente":"Coming soon","Ver perfil":"View profile","Enlace copiado":"Link copied","Cuenta":"Account","Compartir perfil":"Share profile","Preferencias":"Preferences","Notificaciones":"Notifications","Sesión":"Session","Cerrar sesión":"Log out","¿Quieres cerrar sesión?":"Do you want to log out?","Inicio": "Home", "Amigos": "Friends", "Alertas": "Notifications", "Perfil": "Profile", "Para ti": "For You", "Conexiones": "Connections", "Todos los usuarios": "All users", "Comunidad": "Community", "Buscar conexiones": "Search connections", "Buscar usuarios": "Search users", "Siguiendo": "Following", "Seguidores": "Followers", "Te sigue": "Follows you", "Seguir": "Follow", "Enviar mensaje": "Send message", "Editar perfil": "Edit profile", "Me gusta": "Liked posts", "Privacidad": "Privacy", "Configuración y privacidad": "Settings & privacy", "Mostrar cuando estoy en línea": "Show when I am online", "Cuando esté desactivado, nadie verá tu punto verde.": "When disabled, nobody will see your green dot.", "Esta opción guarda tu preferencia. Cuando actives esta opción, tus conexiones podrán ver tu punto verde mientras estés en línea.": "Your preference is saved. When enabled, others can see your green dot while you are online.", "Actividad y seguidores": "Activity & followers", "Mensajes": "Messages", "Buscar personas para enviar un mensaje": "Find people to message", "Buscar personas": "Find people", "Ver todos ›": "See all ›", "Publicación": "Post", "Compartir": "Share", "Más": "More", "Publicar": "Post", "Publicando…": "Posting…", "Guardar": "Save", "Cancelar": "Cancel", "Eliminar": "Delete", "Volver": "Back", "Cerrar": "Close", "Foto": "Photo", "Video": "Video", "Fotos": "Photos", "Videos": "Videos", "Buscar": "Search", "Nombre": "Name", "Usuario": "User", "Usuarios registrados": "Registered users", "En línea": "Online", "Solo tú puedes ver las publicaciones a las que les has dado like.": "Only you can see the posts you have liked.", "Tus fotos y videos aparecerán aquí": "Your photos and videos will appear here", "Aún no has dado me gusta a ninguna publicación.": "You have not liked any posts yet.", "Cargando tus me gusta…": "Loading your liked posts…", "No se pudieron cargar tus me gusta.": "Could not load your liked posts.", "Idioma de la aplicación": "App language", "Idioma": "Language", "Español": "Spanish", "Inglés": "English", "Configuración": "Settings", "Continuar con Google": "Continue with Google", "Escribe un mensaje…": "Write a message…", "Enviar": "Send", "Amigos, personas que sigues y personas que te siguen.": "Friends, people you follow, and people who follow you.", "No hay resultados.": "No results.", "No hay usuarios.": "No users.", "Comentarios": "Comments", "Comentar": "Comment", "Publicaciones": "Posts", "Cambiar idioma": "Change language", "Mis me gusta": "My liked posts", "Solo yo": "Only me", "No hay conexiones.": "No connections."};

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
  const conversationSwipeStartRef=useRef(null);
  const [swipedMessageId,setSwipedMessageId]=useState(null);
  const swipeStartRef=useRef(null);
  const [socialPeer,setSocialPeer]=useState(null);
  const [socialChatReturnView,setSocialChatReturnView]=useState("alerts");
  const [profileReturnToChat,setProfileReturnToChat]=useState(false);
  const [settingsSheet,setSettingsSheet]=useState("");
  const [socialDraft,setSocialDraft]=useState("");
  const [voiceStage,setVoiceStage]=useState("idle");
  const [voiceSeconds,setVoiceSeconds]=useState(0);
  const [voiceBlob,setVoiceBlob]=useState(null);
  const [voiceUrl,setVoiceUrl]=useState("");
  const [voiceSending,setVoiceSending]=useState(false);
  const [voicePlayingId,setVoicePlayingId]=useState(null);
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
  const [commentsLoading,setCommentsLoading]=useState(false);
  const [commentSending,setCommentSending]=useState(false);
  const [commentError,setCommentError]=useState("");
  const [loading,setLoading]=useState(true);
  const [view,setView]=useState("home"); const [profileTab,setProfileTab]=useState("posts");
  const [viewedProfile,setViewedProfile]=useState(null);
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

  async function openSocialList(profileId,type){
    if(!supabase || !profileId)return;
    setSocialListOpen(true);
    setSocialListTitle(type==="followers"?"Seguidores":"Siguiendo");
    setSocialListRows([]); setSocialListLoading(true);
    try{
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
    loadComments(post.id);
  }
  async function sendComment(e){
    e?.preventDefault?.();
    const body=commentDraft.trim();
    if(!supabase||!user?.id||!selectedPost?.id||!body||commentSending)return;
    setCommentSending(true);setCommentError("");
    const postId=selectedPost.id;
    const {error}=await supabase.from("post_comments").insert({post_id:postId,user_id:user.id,body});
    if(error){setCommentError("No se pudo enviar. Verifica que la tabla post_comments esté creada.");}
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
            <div className="rivyza-comment-content"><button type="button" className="rivyza-comment-name rivyza-comment-profile-link" onClick={()=>openCommentAuthor(c.author)} disabled={!c.author?.id}>{c.author?.display_name||c.author?.username||"Usuario"}</button><span>{c.body}</span><small>{formatPostDate(c.created_at)}</small></div>
            {(c.user_id===user?.id||selectedPost?.user_id===user?.id)&&<button type="button" className="rivyza-comment-delete" onClick={()=>deleteComment(c.id)} aria-label="Eliminar comentario">{t("Eliminar")}</button>}
          </div>)}
        </div>
        {commentError&&<p className="rivyza-comment-error">{commentError}</p>}
        <form className="rivyza-comment-compose" onSubmit={sendComment}>
          <input aria-label="Escribir comentario" placeholder="Escribe un comentario…" value={commentDraft} maxLength={1000} onChange={e=>setCommentDraft(e.target.value)}/>
          <button type="submit" disabled={!commentDraft.trim()||commentSending}>{commentSending?"Enviando…":"Enviar"}</button>
        </form>
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

  


 async function stopCamera(){
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
                 <button type="button" onClick={()=>setUploadMessage("LIVE estará disponible próximamente.")}>LIVE</button>
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
               onChange={(e)=>setUploadCaption(e.target.value.slice(0,220))}
               placeholder="Escribe algo sobre tu publicación…"
               rows={3}
             />
             <small>{uploadCaption.length}/220</small>
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
  function resetVoice(){
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
      const formats=["audio/mp4","audio/webm;codecs=opus","audio/webm"];
      const mime=formats.find(x=>MediaRecorder.isTypeSupported(x));
      const recorder=new MediaRecorder(stream,mime?{mimeType:mime}:undefined);
      voiceStreamRef.current=stream;voiceRecorderRef.current=recorder;voiceChunksRef.current=[];voiceStoppingRef.current=false;
      recorder.ondataavailable=e=>{if(e.data?.size)voiceChunksRef.current.push(e.data);};
      recorder.onstop=()=>{
        stream.getTracks().forEach(track=>track.stop());voiceStreamRef.current=null;
        const blob=new Blob(voiceChunksRef.current,{type:recorder.mimeType||"audio/webm"});
        if(blob.size){setVoiceBlob(blob);setVoiceUrl(URL.createObjectURL(blob));setVoiceStage("preview");}
        else {setVoiceStage("idle");setSocialError("No se grabó audio. Inténtalo nuevamente.");}
      };
      recorder.onerror=()=>{setSocialError("Error al grabar el audio.");resetVoice();};
      recorder.start(250);voiceStartedRef.current=Date.now();setVoiceSeconds(0);setVoiceStage("recording");
      voiceTimerRef.current=setInterval(()=>{
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
      audio.onended=()=>{setVoicePlayingId(null);voiceAudioRef.current=null;};
      audio.onerror=()=>{setVoicePlayingId(null);setSocialError("No se pudo reproducir el audio.");};
      await audio.play();setVoicePlayingId(message.id);
      if(message.recipient_id===user.id && !message.audio_listened_at){
        const {error}=await supabase.rpc("rivyza_mark_voice_listened",{p_message_id:message.id});
        if(!error)setSocialMessages(old=>old.map(m=>m.id===message.id?{...m,audio_listened_at:new Date().toISOString()}:m));
      }
    }catch(e){setVoicePlayingId(null);setSocialError("No se pudo abrir el audio: "+(e?.message||"Error"));}
  }
  useEffect(()=>()=>{
    if(voiceTimerRef.current)clearInterval(voiceTimerRef.current);
    voiceRecorderRef.current?.state!=="inactive"&&voiceRecorderRef.current?.stop();
    voiceStreamRef.current?.getTracks().forEach(track=>track.stop());
    voiceAudioRef.current?.pause();
  },[]);
  async function openSocialPeer(person){
    if(!person?.id || person.id===user?.id)return;
    setSocialChatReturnView(view==="alerts"?"alerts":view==="inbox"?"inbox":view==="messages"?socialChatReturnView:view==="otherProfile"?"otherProfile":view==="publicProfile"?"publicProfile":"alerts");
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
      onTouchEnd:e=>{const start=conversationSwipeStartRef.current;conversationSwipeStartRef.current=null;if(!start||start.id!==peerId)return;const dx=e.changedTouches[0].clientX-start.x,dy=e.changedTouches[0].clientY-start.y;if(Math.abs(dy)>Math.abs(dx))return;if(dx< -55)setSwipedConversationId(peerId);else if(dx>35)setSwipedConversationId(null);}
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
    setPostOpenedFromAlert(false);setView("alerts");
  }
  async function openSocialAlerts(){
    setView("alerts");await loadSocial();
  }
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
    <button onClick={()=>setView("inbox")}><MessageCircle/><span>{t("Mensajes")}</span></button>
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
      </section>
    </main>;
  }

  
  if(["alerts","activity","inbox","messages","socialSettings"].includes(view)){
    const conversations=new Map();
    socialMessages.filter(m=>!hiddenMessageIds.includes(m.id)).forEach(m=>{const peer=m.sender_id===user.id?m.recipient:m.sender;if(peer?.id && (!conversationCutoffs[peer.id] || new Date(m.created_at)>new Date(conversationCutoffs[peer.id])) && !conversations.has(peer.id))conversations.set(peer.id,{peer,last:m});});
    // Mensajes y actividad son dos bandejas independientes.
    // Cada remitente ocupa una sola fila; el último mensaje decide su posición.
    const recentConversations=[...conversations.values()].sort((a,b)=>new Date(b.last.created_at)-new Date(a.last.created_at));
    const unreadBySender=new Map();
    socialNotices.forEach(n=>{
      if(n.kind==="message" && n.actor_id && !n.read_at){
        unreadBySender.set(n.actor_id,(unreadBySender.get(n.actor_id)||0)+1);
      }
    });
    const unreadMessages=[...unreadBySender.values()].reduce((sum,count)=>sum+count,0);
    const activityAlerts=socialNotices.filter(n=>n.kind!=="message");
    const activityUnread=activityAlerts.filter(n=>!n.read_at).length;
    async function openActivityNotice(n){
      if(n.kind==="like"||n.kind==="comment"){await openNotificationPost(n);return;}
      await markSocialRead([n.id]);
      if(n.actor){openUserProfile(n.actor);}else setSocialError("Este perfil no está disponible.");
    }
    const thread=socialMessages.filter(m=>!hiddenMessageIds.includes(m.id) && socialPeer && (!conversationCutoffs[socialPeer.id] || new Date(m.created_at)>new Date(conversationCutoffs[socialPeer.id])) && (m.sender_id===socialPeer.id&&m.recipient_id===user.id || m.recipient_id===socialPeer.id&&m.sender_id===user.id)).sort((a,b)=>new Date(a.created_at)-new Date(b.created_at));
    return <main className="social-screen">
      <header className="social-top"><button onClick={()=>setView(view==="messages"?socialChatReturnView:view==="activity"?"alerts":"publicProfile")}>←</button><h2>{view==="alerts"?"Alertas":view==="activity"?"Actividad y seguidores":view==="inbox"?"Mensajes":view==="messages"?(socialPeer?.display_name||socialPeer?.username||"Chat"):t("Configuración y privacidad")}</h2><button onClick={()=>setView("inbox")} aria-label="Mensajes"><MessageCircle size={22}/></button></header>
      {socialError&&<p className="social-error">{socialError}</p>}
      {view==="alerts"&&<div className="social-list rivyza-alerts-organized">
        <section className="rivyza-alert-messages" aria-label="Mensajes privados">
          <div className="rivyza-alert-section-heading"><span><MessageCircle size={20}/> <strong>{t("Mensajes")}</strong></span>{unreadMessages>0&&<b className="rivyza-message-count">{unreadMessages>99?"99+":unreadMessages} nuevos</b>}<button type="button" onClick={()=>setView("inbox")}>{t("Ver todos ›")}</button></div>
          {recentConversations.length===0?<button className="rivyza-alert-empty-chat" onClick={()=>setView("inbox")}>Todavía no tienes mensajes. Abrir bandeja ›</button>:recentConversations.map(({peer,last})=><div className={"rivyza-conversation-swipe"+(swipedConversationId===peer.id?" is-open":"")} key={peer.id} {...conversationSwipeProps(peer.id)}><button type="button" className="rivyza-conversation-delete" onClick={()=>clearSocialConversation(peer.id)}>{t("Eliminar")}</button><button className="rivyza-alert-conversation" onClick={()=>{if(swipedConversationId===peer.id){setSwipedConversationId(null);return;}openSocialPeer(peer);}}>
            <span className="rivyza-alert-avatar rivyza-presence-anchor">{peer.avatar_url?<img src={peer.avatar_url} alt=""/>:<span>{(peer.display_name||peer.username||"U").slice(0,1).toUpperCase()}</span>}{onlineDot(peer.id)}</span>
            <span className="rivyza-alert-chat-copy"><strong>{peer.display_name||peer.username||"Usuario"}</strong><small>{last.sender_id===user.id?"Tú: ":""}{last.body}</small></span>
            <span className="rivyza-alert-chat-meta"><small>{formatPostDateTime(last.created_at)}</small>{unreadBySender.get(peer.id)>0&&<b>{unreadBySender.get(peer.id)>99?"99+":unreadBySender.get(peer.id)}</b>}</span>
          </button></div>)}
        </section>
        <button type="button" className="rivyza-activity-entry" onClick={()=>setView("activity")}>
          <span className="rivyza-activity-logo"><Heart size={20}/><User size={16}/></span>
          <span className="rivyza-activity-copy"><strong>{t("Actividad y seguidores")}</strong><small>Likes, comentarios y seguidores</small></span>
          {activityUnread>0&&<b className="rivyza-message-count">{activityUnread>99?"99+":activityUnread}</b>}
          <span aria-hidden="true">›</span>
        </button>
      </div>}
      {view==="activity"&&<div className="social-list rivyza-activity-list">
        {activityAlerts.length===0&&<p className="social-empty">Todavía no tienes actividad.</p>}
        {activityAlerts.map(n=><button key={n.id} type="button" className={"rivyza-activity-notice"+(!n.read_at?" is-unread":"")} onClick={()=>openActivityNotice(n)}>
          <span className="rivyza-notice-avatar rivyza-presence-anchor">{n.actor?.avatar_url?<img src={n.actor.avatar_url} alt="" loading="lazy"/>:<User size={24}/>}{onlineDot(n.actor?.id)}</span>
          <span className="rivyza-notice-copy"><strong>{n.actor?.display_name||n.actor?.username||"Usuario"}</strong><span>{n.kind==="like"?"Le dio like a tu publicación.":n.kind==="comment"?"Comentó tu publicación.":n.kind==="follow"?"Comenzó a seguirte.":n.kind==="unfollow"?"Dejó de seguirte.":"Nueva actividad."}</span><small>{formatPostDateTime(n.created_at)}</small></span>
          <span className="rivyza-notice-end">{(n.kind==="like"||n.kind==="comment")&&n.relatedPost?.media_path?<span className="rivyza-notice-thumb">{n.relatedPost.media_type==="photo"?<img src={n.relatedPost.media_path} alt="Publicación" loading="lazy"/>:<video src={`${n.relatedPost.media_path}#t=0.1`} muted playsInline preload="metadata"/>}</span>:null}<span className={"rivyza-notice-type rivyza-notice-type-"+n.kind}>{n.kind==="like"?<Heart size={20}/>:n.kind==="comment"?<MessageCircle size={20}/>:n.kind==="follow"?<UserRoundPlus size={21}/>:n.kind==="unfollow"?<UserRoundMinus size={21}/>:<Bell size={20}/>}</span>{!n.read_at&&<i className="rivyza-notice-unread"/>}</span>
        </button>)}
      </div>}
      {view==="inbox"&&<div className="social-list">
        <button className="social-quick" onClick={()=>{setView("home");setPeopleSearchOpen(true);}}>+ Buscar personas para enviar un mensaje</button>
        {recentConversations.map(({peer,last})=><div className={"rivyza-conversation-swipe"+(swipedConversationId===peer.id?" is-open":"")} key={peer.id} {...conversationSwipeProps(peer.id)}><button type="button" className="rivyza-conversation-delete" onClick={()=>clearSocialConversation(peer.id)}>{t("Eliminar")}</button><button className="social-item" onClick={()=>{if(swipedConversationId===peer.id){setSwipedConversationId(null);return;}openSocialPeer(peer);}}><span className="social-icon rivyza-presence-anchor">{peer.avatar_url?<img className="rivyza-inbox-photo" src={peer.avatar_url} alt=""/>:<User size={21}/>} {onlineDot(peer.id)}</span><span><strong>{peer.display_name||peer.username||"Usuario"}</strong><small>{last.audio_path?"🎤 Mensaje de voz":last.body}</small></span></button></div>)}
        {conversations.size===0&&<p className="social-empty">Aún no tienes conversaciones. Visita el perfil de una persona y toca «Enviar mensaje».</p>}
      </div>}
      {view==="messages"&&<section className="social-chat-layout"><button type="button" className="rivyza-chat-peer rivyza-chat-peer-link" onClick={()=>{if(socialPeer?.id){setProfileReturnToChat(true);openUserProfile(socialPeer);}}} aria-label={t("Ver perfil")}><span className="rivyza-chat-peer-avatar rivyza-presence-anchor">{socialPeer?.avatar_url?<img src={socialPeer.avatar_url} alt=""/>:<User size={21}/>} {onlineDot(socialPeer?.id)}</span><strong>{socialPeer?.display_name||socialPeer?.username||"Usuario"}</strong><span className="rivyza-chat-chevron">›</span></button><div className="social-thread" ref={socialThreadRef}>
        {thread.map(m=><div key={m.id} className={"rivyza-swipe-row "+(m.sender_id===user.id?"mine":"theirs")+ (swipedMessageId===m.id?" is-open":"")}
          onTouchStart={e=>{swipeStartRef.current={id:m.id,x:e.touches[0].clientX,y:e.touches[0].clientY};}}
          onTouchEnd={e=>{const start=swipeStartRef.current;swipeStartRef.current=null;if(!start||start.id!==m.id)return;const dx=e.changedTouches[0].clientX-start.x,dy=e.changedTouches[0].clientY-start.y;if(Math.abs(dy)>Math.abs(dx))return;if(dx< -55)setSwipedMessageId(m.id);else if(dx>35)setSwipedMessageId(null);}}>
          <div className="rivyza-swipe-actions"><button type="button" onClick={()=>hideSocialMessage(m.id)}>{t("Eliminar para mí")}</button>{m.sender_id===user.id&&Date.now()-new Date(m.created_at).getTime()<180000&&<button type="button" className="rivyza-delete-everyone" onClick={()=>deleteSocialMessageForEveryone(m)}>{t("Eliminar para todos")}</button>}</div>
          <div className="social-bubble">{m.audio_path?<div className="rivyza-voice-bubble"><button type="button" onClick={()=>playVoice(m)} aria-label={voicePlayingId===m.id?"Pausar audio":"Reproducir audio"}>{voicePlayingId===m.id?<Pause size={20}/>:<Play size={20}/>}</button><span className="rivyza-voice-wave">▂▅▃▇▂▄▆▃▅▂▇▄▃▆▂▅▃▇</span><small>{Math.min(60,m.audio_duration||0)}s</small></div>:<p>{m.body}</p>}{m.shared_post_id&&<small>Publicación compartida</small>}<small>{formatPostDateTime(m.created_at)}</small></div>
        </div>)}
        {thread.length===0&&<p className="social-empty">Inicia una conversación.</p>}
      </div><div className="rivyza-voice-composer">{voiceStage==="idle"?<form className="social-compose" onSubmit={e=>{e.preventDefault();sendSocialMessage();}}><div className="rivyza-voice-input"><input value={socialDraft} onChange={e=>setSocialDraft(e.target.value)} placeholder={t("Escribe un mensaje…")} maxLength={2000}/><button type="button" className="rivyza-mic-button" onClick={startVoice} aria-label="Grabar mensaje de voz"><Mic size={22}/></button></div><button type="submit" disabled={!socialDraft.trim()||socialBusy}>{t("Enviar")}</button></form>:<div className="rivyza-record-panel"><div className="rivyza-record-wave"><span className={voiceStage==="recording"?"rivyza-record-dot":""}>{voiceStage==="recording"?"●":"🎤"}</span><span className="rivyza-voice-wave">▂▅▃▇▂▄▆▃▅▂▇▄▃▆▂▅▃▇</span><strong>{String(Math.floor(voiceSeconds/60)).padStart(2,"0")}:{String(voiceSeconds%60).padStart(2,"0")}</strong><small>/ 1:00</small></div>{voiceStage==="preview"&&voiceUrl&&<audio controls preload="metadata" src={voiceUrl} className="rivyza-voice-preview"/>}<div className="rivyza-record-actions"><button type="button" onClick={resetVoice} disabled={voiceSending}><Trash2 size={17}/> {t("Cancelar")}</button>{voiceStage==="recording"?<><button type="button" onClick={stopVoice}><Square size={16}/> Stop</button></>:<button type="button" onClick={sendVoice} disabled={voiceSending}><Send size={17}/> {voiceSending?"Enviando…":t("Enviar")}</button>}</div></div>}</div></section>}
      {view==="socialSettings"&&<section className="social-settings rivyza-settings-page">
        <div className="rivyza-settings-section-title">{t("Cuenta")}</div>
        <div className="rivyza-settings-group">
          {[["Seguridad y contraseña",ShieldCheck],["Información de cuenta",User]].map(([label,Icon])=><button type="button" key={label} onClick={()=>setSettingsSheet(label)}><Icon size={21}/><span>{t(label)}</span><b>›</b></button>)}
        </div>
        <div className="rivyza-settings-section-title">{t("Privacidad")}</div>
        <div className="rivyza-settings-group">
          {[["Cuenta privada",Lock],["Cuentas bloqueadas",Ban]].map(([label,Icon])=><button type="button" key={label} onClick={()=>setSettingsSheet(label)}><Icon size={21}/><span>{t(label)}</span><b>›</b></button>)}
          <label className="rivyza-settings-toggle"><span><strong>{t("Estado en línea")}</strong><small>{t("Cuando esté desactivado, nadie verá tu punto verde.")}</small></span><input type="checkbox" checked={onlinePreference} onChange={e=>saveOnlinePreference(e.target.checked)}/></label>
          {[["Quién puede enviarme mensajes",MessageCircle],["Quién puede comentar",MessageSquare],["Menciones y etiquetas",AtSign],["Publicaciones que me gustan",Heart],["Lista de seguidos",Users]].map(([label,Icon])=><button type="button" key={label} onClick={()=>setSettingsSheet(label)}><Icon size={21}/><span>{t(label)}</span><b>›</b></button>)}
        </div>
        <div className="rivyza-settings-section-title">{t("Preferencias")}</div>
        <div className="rivyza-settings-group">
          <button type="button" onClick={()=>setSettingsSheet("language")}><Languages size={21}/><span>{t("Idioma")}</span><em>{appLanguage==="es"?"Español":"English"}</em><b>›</b></button>
          {[["Apariencia",Moon],["Preferencias de notificaciones",Bell]].map(([label,Icon])=><button type="button" key={label} onClick={()=>setSettingsSheet(label)}><Icon size={21}/><span>{t(label)}</span><b>›</b></button>)}
        </div>
        <div className="rivyza-settings-section-title">{t("Sesión")}</div>
        <div className="rivyza-settings-group">
          <button type="button" onClick={()=>setSettingsSheet("Cambiar de cuenta")}><RefreshCw size={21}/><span>{t("Cambiar de cuenta")}</span><b>›</b></button>
          <button type="button" onClick={()=>{if(window.confirm(t("¿Quieres cerrar sesión?")))signOut();}}><LogOut size={21}/><span>{t("Cerrar sesión")}</span></button>
        </div>
        <p className="rivyza-settings-version">RIVYZA v13.19.9</p>
        {settingsSheet&&<div className="rivyza-sheet-overlay" onClick={()=>setSettingsSheet("")} role="presentation"><div className="rivyza-sheet-panel" role="dialog" aria-modal="true" aria-label={settingsSheet==="language"?t("Idioma"):t(settingsSheet)} onClick={e=>e.stopPropagation()}>
          <div className="rivyza-sheet-handle"/>
          <div className="rivyza-sheet-heading"><strong>{settingsSheet==="language"?t("Idioma"):t(settingsSheet)}</strong><button type="button" onClick={()=>setSettingsSheet("")} aria-label={t("Cerrar")}>×</button></div>
          {settingsSheet==="language"?<div className="rivyza-sheet-options">{[["es","Español"],["en","English"]].map(([code,label])=><button type="button" key={code} onClick={()=>{changeAppLanguage(code);setSettingsSheet("");}}>{label}<span>{appLanguage===code?"✓":""}</span></button>)}</div>:<p className="rivyza-sheet-soon">{t("Próximamente")}</p>}
        </div></div>}
      </section>}
      {socialNav()}
    </main>;
  }
  if(view==="livePreview"){
    return <main className="live-preview-shell">
      <header className="live-preview-header">
        <button className="live-preview-back" onClick={()=>{setView("home");changeFeedTab("forYou");}} aria-label="Volver">‹</button>
        <strong>LIVE</strong>
        <span className="live-preview-spacer"></span>
      </header>

      <div className="live-following-strip" aria-label="Personas que sigues en vivo">
        <div className="live-following-empty">
          <span className="live-dot"></span>
          <span>Aquí aparecerán las personas que sigues cuando estén EN VIVO</span>
        </div>
      </div>

      <section className="live-discovery-feed">
        <article className="live-preview-card live-preview-empty-card">
          <div className="live-preview-empty-copy">
            <span className="live-preview-badge">EN VIVO</span>
            <h2>RIVYZA LIVE</h2>
            <p>Cuando haya transmisiones activas, podrás deslizar hacia arriba o hacia abajo para recorrerlas.</p>
            <small>Los LIVE más recientes aparecerán primero.</small>
          </div>
        </article>
      </section>

      <nav className="bottom-nav live-preview-bottom-nav">
        <button onClick={()=>{setView("home");changeFeedTab("forYou");window.scrollTo({top:0,behavior:"smooth"});}}><Home/><span>{t("Inicio")}</span></button>
        <button onClick={()=>{setView("friends");changeFeedTab("friends");}}><AmigosIcon/><span>{t("Amigos")}</span></button>
        <button className="plus-btn" onClick={()=>{setUploadOpen(true);setUploadType("photo");setCameraMode("photo");resetUpload();}}><Plus/></button>
        <button onClick={openSocialAlerts}><Bell/><span>{t("Alertas")}</span>{unreadSocial>0&&<b className="social-badge">{unreadSocial>99?"99+":unreadSocial}</b>}</button>
        <button onClick={()=>{setViewedProfile(null);setView("publicProfile");}}><User/><span>{t("Perfil")}</span></button>
      </nav>
      {renderUploadModal()}
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
              {post.caption&&<div className="caption">{post.caption}</div>}
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
              <button onClick={()=>openPost(post)}><Share2/><span>{t("Compartir")}</span></button>
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
    </main>;
  }

  if(view==="otherProfile" && viewedProfile){
    return <main className="public-profile-shell other-profile-shell">
      <header className="profile-topbar compact">
        <button className="profile-back" onClick={()=>{setSelectedPost(null);if(profileReturnToChat){setProfileReturnToChat(false);setView("messages");}else setView("home");}}>←</button>
        <div className="profile-top-title">RIVYZA</div>
        <button className="profile-menu" aria-label="Opciones"><MoreHorizontal size={24}/></button>
      </header>

      <div className="social-profile-message"><button onClick={()=>openSocialPeer(viewedProfile)}><MessageCircle size={18}/> {t("Enviar mensaje")}</button></div>
      <section className="profile-hero compact-profile">
        <div className="profile-heading-row">
          <div className="profile-heading-copy">
            <h1>{viewedProfile.display_name||viewedProfile.username||"Usuario"}</h1>
            <div className="public-handle">@{viewedProfile.username||"usuario"}</div>
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
        <div className="visitor-follow-row">
          <button type="button" className={`visitor-follow-btn ${isFollowingViewed?"following":""}`}
            disabled={followBusy} onClick={toggleFollowViewed}>
            {followBusy?"...":isFollowingViewed?"Siguiendo":"Seguir"}
          </button>
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
          <button className="active"><Grid3X3 size={20}/></button>
        </div>
        <div className="posts-grid">
          {viewedProfilePosts.length > 0 ? viewedProfilePosts.map(post=>(
            <div className="profile-post-card" key={post.id} onClick={()=>openPost(post)}>
              {post.media_type==="photo"
                ? <img src={post.media_path} alt={post.caption||"Publicación"}/>
                : <video src={`${post.media_path}#t=0.1`} muted playsInline preload="metadata"/>
              }
              {post.pinned_position && <span className="post-pin">📌</span>}
            </div>
          )) : <div className="empty-grid-card first">Este usuario todavía no tiene publicaciones públicas.</div>}
        </div>
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
            <button type="button" onClick={()=>{setSelectedPost(null);setPostMenuOpen(false);}} aria-label="Volver">←</button>
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
            {selectedPost.caption && <p className="post-detail-caption">{selectedPost.caption}</p>}
            <div className="post-public-stamp">Publicado · {formatPostDate(selectedPost.created_at)}</div>
            <div className="post-detail-actions">
              <button type="button" className={postLiked?"liked":""} onClick={togglePostLike}><Heart size={23} fill={postLiked?"currentColor":"none"}/><span>{postLikeCount}</span></button>
              {selectedPost.user_id===user?.id && postLikeCount>0 && <button type="button" className="who-liked-btn" onClick={openPostLikers}>Ver quién dio like</button>}
              <button type="button" onClick={()=>openComments(selectedPost)}><MessageCircle size={23}/><span>{postCommentCount}</span></button>
              <button type="button" onClick={()=>setPostActionMessage("Compartir dentro de RIVYZA estará disponible con Mensajes.")}><Share2 size={23}/><span>{t("Compartir")}</span></button>
            </div>
            {postActionMessage && <div className="post-action-message">{postActionMessage}</div>}
          </div>
          {postMenuOpen && (
            <div className="post-menu-backdrop" onClick={()=>setPostMenuOpen(false)}>
              <div className="post-menu-sheet" onClick={e=>e.stopPropagation()}>
                <button type="button" onClick={()=>setPostActionMessage("Compartir dentro de RIVYZA estará disponible con Mensajes.")}><Share2 size={20}/>Compartir en RIVYZA</button>
                <button type="button" onClick={copyPostLink}><LinkIcon size={20}/>Copiar enlace</button>
                <button type="button" onClick={()=>setPostMenuOpen(false)}>{t("Cancelar")}</button>
              </div>
            </div>
          )}
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
            <div className="rivyza-liked-heading"><Heart size={19}/><strong>{t("Mis me gusta")}</strong><span>🔒 {t("Solo yo")}</span></div>
            <p className="rivyza-liked-note">{t("Solo tú puedes ver las publicaciones a las que les has dado like.")}</p>
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
            {selectedPost.caption && <p className="post-detail-caption">{selectedPost.caption}</p>}
            <div className="post-public-stamp" data-rivyza-stamp="v13.6">
              Publicado · {formatPostDate(selectedPost.created_at)}
            </div>
            <div className="post-detail-actions">
              <button type="button" className={postLiked?"liked":""} onClick={togglePostLike}><Heart size={23} fill={postLiked?"currentColor":"none"}/><span>{postLikeCount}</span></button>
              {selectedPost.user_id===user?.id && postLikeCount>0 && <button type="button" className="who-liked-btn" onClick={openPostLikers}>Ver quién dio like</button>}
              <button type="button" onClick={()=>openComments(selectedPost)}><MessageCircle size={23}/><span>{postCommentCount}</span></button>
              <button type="button" onClick={()=>setPostActionMessage("Compartir dentro de RIVYZA estará disponible con Mensajes.")}><Share2 size={23}/><span>{t("Compartir")}</span></button>
            </div>
            {postActionMessage && <div className="post-action-message">{postActionMessage}</div>}
          </div>

          {postMenuOpen && (
            <div className="post-menu-backdrop" onClick={()=>setPostMenuOpen(false)}>
              <div className="post-menu-sheet" onClick={e=>e.stopPropagation()}>
                <button type="button" onClick={()=>setPostActionMessage("Compartir dentro de RIVYZA estará disponible con Mensajes.")}><Share2 size={20}/>Compartir en RIVYZA</button>
                <button type="button" onClick={copyPostLink}><LinkIcon size={20}/>Copiar enlace</button>
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
            {post.caption&&<div className="caption">{post.caption}</div>}
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
            <button onClick={()=>openPost(post)}><Share2/><span>{t("Compartir")}</span></button>
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
  </main>;
}
