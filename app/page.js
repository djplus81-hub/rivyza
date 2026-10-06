"use client";
import { createPortal } from "react-dom";
import {useEffect,useMemo,useState,useCallback,useRef} from "react";
import {createClient} from "@supabase/supabase-js";
import Cropper from "react-easy-crop";
import {
  Home, Radio, Plus, Bell, User, Heart, MessageCircle, Share2, Search,
  AtSign, Save, LogOut, Camera, X, Check, Music2, MoreHorizontal, Link as LinkIcon, Youtube, Instagram, Facebook, Grid3X3
} from "lucide-react";

function createImage(url){return new Promise((resolve,reject)=>{const i=new Image();i.addEventListener("load",()=>resolve(i));i.addEventListener("error",reject);i.setAttribute("crossOrigin","anonymous");i.src=url;});}
async function getCroppedBlob(src,pixelCrop){
  const image=await createImage(src),canvas=document.createElement("canvas"),size=768;
  canvas.width=size;canvas.height=size;
  const ctx=canvas.getContext("2d");
  ctx.drawImage(image,pixelCrop.x,pixelCrop.y,pixelCrop.width,pixelCrop.height,0,0,size,size);
  return new Promise(resolve=>canvas.toBlob(blob=>resolve(blob),"image/jpeg",0.88));
}

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

  const [user,setUser]=useState(null);
  const [profile,setProfile]=useState(null);
  const [profilePosts,setProfilePosts]=useState([]);
  const [selectedPost,setSelectedPost]=useState(null);
  const [postMenuOpen,setPostMenuOpen]=useState(false);
  const [deleteConfirmOpen,setDeleteConfirmOpen]=useState(false);
  const postSwipeStartY=useRef(null);
  const postWheelLock=useRef(false);
  const postViewerVideoRef=useRef(null);
  const [postActionMessage,setPostActionMessage]=useState("");
  const [postLikeCount,setPostLikeCount]=useState(0);
  const [postLiked,setPostLiked]=useState(false);
  const [postCommentCount,setPostCommentCount]=useState(0);
  const [commentsOpen,setCommentsOpen]=useState(false);
  const [loading,setLoading]=useState(true);
  const [view,setView]=useState("home"); const [profileTab,setProfileTab]=useState("posts");
  const [viewedProfile,setViewedProfile]=useState(null);
  const [viewedProfilePosts,setViewedProfilePosts]=useState([]);
  const [peopleSearchOpen,setPeopleSearchOpen]=useState(false);
  const [peopleSearch,setPeopleSearch]=useState("");
  const [peopleResults,setPeopleResults]=useState([]);
  const [peopleSearching,setPeopleSearching]=useState(false);
  const [peopleSearchMessage,setPeopleSearchMessage]=useState("");

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

    setProfilePosts(sorted);
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
    setViewedProfilePosts(sorted);
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

  useEffect(()=>{
    if(view==="publicProfile" && user?.id){
      loadProfilePosts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[view,user?.id]);

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
    if(!selectedPost || !supabase || !user?.id)return;
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
    }catch(e){setPostActionMessage("Los likes necesitan activar el SQL incluido en el paquete.");}
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
       video:{facingMode:{ideal:facing}},
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
   canvas.width=video.videoWidth;
   canvas.height=video.videoHeight;
   const ctx=canvas.getContext("2d");

   if(cameraFacing==="user"){
     ctx.translate(canvas.width,0);
     ctx.scale(-1,1);
   }
   ctx.drawImage(video,0,0,canvas.width,canvas.height);

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

             <div className="camera-bottom">
               <div className="camera-mode-tabs">
                  <button
                    className={cameraMode==="photo"?"active":""}
                    onClick={()=>{setCameraMode("photo");setUploadType("photo");}}
                  >
                    FOTO
                  </button>
                  <button
                    className={cameraMode==="video" && recordLimit===10?"active":""}
                    onClick={()=>{setCameraMode("video");setUploadType("video");setRecordLimit(10);}}
                  >
                    10s
                  </button>
                  <button
                    className={cameraMode==="video" && recordLimit===30?"active":""}
                    onClick={()=>{setCameraMode("video");setUploadType("video");setRecordLimit(30);}}
                  >
                    30s
                  </button>
                  <button
                    className={cameraMode==="video" && recordLimit===60?"active":""}
                    onClick={()=>{setCameraMode("video");setUploadType("video");setRecordLimit(60);}}
                  >
                    60s
                  </button>
                </div>

               <div className="camera-controls-row">
                 <label className="gallery-button">
                   <span>▧</span>
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
                     <span></span>
                   </button>
                 )}

                 <div className="camera-timer-slot">
                   {cameraMode==="video" && <strong>{recordSeconds}s</strong>}
                 </div>
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

           <div className="upload-preview editor-preview">
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
             <span>Privacidad</span>
             <select value={uploadVisibility} onChange={(e)=>setUploadVisibility(e.target.value)}>
               <option value="public">Público</option>
               <option value="followers">Solo seguidores</option>
               <option value="private">Solo yo</option>
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

  if(loading)return <div className="center">Cargando RIVYZA…</div>;

  if(!user){
    return <main className="auth-shell">
      <section className="auth-card">
        <div className="logo-mark">R</div>
        <h1>RIVYZA</h1>
        <p className="tagline">Vive. Conecta. Transmite.</p>
        <button className="google-btn" onClick={signInWithGoogle}>Continuar con Google</button>
      </section>
    </main>;
  }

  
  if(view==="otherProfile" && viewedProfile){
    return <main className="public-profile-shell other-profile-shell">
      <header className="profile-topbar compact">
        <button className="profile-back" onClick={()=>{setSelectedPost(null);setView("home");}}>←</button>
        <div className="profile-top-title">@{viewedProfile.username||"usuario"}</div>
        <button className="profile-menu" aria-label="Opciones"><MoreHorizontal size={24}/></button>
      </header>

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
          <div className="profile-photo-edit-wrap visitor-avatar-wrap">
            {viewedProfile.avatar_url
              ? <img className="public-profile-photo" src={viewedProfile.avatar_url} alt={viewedProfile.display_name||viewedProfile.username}/>
              : <div className="public-profile-photo fallback">{(viewedProfile.display_name?.[0]||viewedProfile.username?.[0]||"R").toUpperCase()}</div>
            }
          </div>
        </div>

        <div className="profile-stats compact-stats">
          <button><strong>0</strong><span>Following</span></button>
          <button><strong>0</strong><span>Followers</span></button>
          <button><strong>0</strong><span>Likes</span></button>
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
                : <video src={post.media_path} muted playsInline preload="metadata"/>
              }
              {post.pinned_position && <span className="post-pin">📌</span>}
            </div>
          )) : <div className="empty-grid-card first">Este usuario todavía no tiene publicaciones públicas.</div>}
        </div>
      </section>

      {selectedPost && (
        <div className="post-detail-overlay">
          <header className="post-detail-topbar">
            <button type="button" onClick={()=>{setSelectedPost(null);setPostMenuOpen(false);}} aria-label="Volver">←</button>
            <strong>Publicación</strong>
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
              <button type="button" onClick={()=>setCommentsOpen(true)}><MessageCircle size={23}/><span>{postCommentCount}</span></button>
              <button type="button" onClick={()=>setPostActionMessage("Compartir dentro de RIVYZA estará disponible con Mensajes.")}><Share2 size={23}/><span>Compartir</span></button>
            </div>
            {postActionMessage && <div className="post-action-message">{postActionMessage}</div>}
          </div>
          {postMenuOpen && (
            <div className="post-menu-backdrop" onClick={()=>setPostMenuOpen(false)}>
              <div className="post-menu-sheet" onClick={e=>e.stopPropagation()}>
                <button type="button" onClick={()=>setPostActionMessage("Compartir dentro de RIVYZA estará disponible con Mensajes.")}><Share2 size={20}/>Compartir en RIVYZA</button>
                <button type="button" onClick={copyPostLink}><LinkIcon size={20}/>Copiar enlace</button>
                <button type="button" onClick={()=>setPostMenuOpen(false)}>Cancelar</button>
              </div>
            </div>
          )}
          {commentsOpen && (
            <div className="post-menu-backdrop" onClick={()=>setCommentsOpen(false)}>
              <div className="post-menu-sheet comments-sheet" onClick={e=>e.stopPropagation()}>
                <strong>Comentarios</strong>
                <p>La sección para escribir y leer comentarios queda preparada para conectarla al sistema de comentarios.</p>
                <button type="button" onClick={()=>setCommentsOpen(false)}>Cerrar</button>
              </div>
            </div>
          )}
        </div>
      )}

      <nav className="bottom-nav">
        <button onClick={()=>setView("home")}><Home/><span>Inicio</span></button>
        <button><Radio/><span>Live</span></button>
        <button className="plus-btn" onClick={()=>{setUploadOpen(true);setUploadType("photo");setCameraMode("photo");resetUpload();}}><Plus/></button>
        <button><Bell/><span>Alertas</span></button>
        <button onClick={()=>{setViewedProfile(null);setView("publicProfile");}}><User/><span>Perfil</span></button>
      </nav>
      {renderUploadModal()}
    </main>;
  }

  if(view==="publicProfile"){
    return <main className="public-profile-shell">
      <header className="profile-topbar compact">
        <button className="profile-back" onClick={()=>{setUploadOpen(false);setView("home");}}>←</button>
        <div className="profile-top-title"></div>
        <button className="profile-menu"><MoreHorizontal size={24}/></button>
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
          <button><strong>0</strong><span>Following</span></button>
          <button><strong>0</strong><span>Followers</span></button>
          <button><strong>0</strong><span>Likes</span></button>
        </div>

        {profile?.bio && <p className="public-bio">{profile.bio}</p>}

        <div className="profile-links-stack">
          {profile?.website_url && <a href={profile.website_url} target="_blank" rel="noreferrer"><LinkIcon size={16}/><span>Website</span></a>}
          {profile?.youtube_url && <a href={profile.youtube_url} target="_blank" rel="noreferrer"><Youtube size={16}/><span>YouTube</span></a>}
          {profile?.instagram_url && <a href={profile.instagram_url} target="_blank" rel="noreferrer"><Instagram size={16}/><span>Instagram</span></a>}
          {profile?.facebook_url && <a href={profile.facebook_url} target="_blank" rel="noreferrer"><Facebook size={16}/><span>Facebook</span></a>}
        </div>

        <button className="edit-profile-main-btn" onClick={()=>setView("profile")}>Editar perfil</button>
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
                    <video src={post.media_path} muted playsInline preload="metadata"/>
                  )}

                  {post.pinned_position && (
                    <span className="post-pin">📌</span>
                  )}
                </div>
              ))
            ) : (
              <div className="empty-grid-card first">
                Tus fotos y videos aparecerán aquí
              </div>
            )}
          </div>
        ) : (
          <div className="likes-private-panel">
            <Heart size={38}/>
            <h3>Me gusta</h3>
            <p>Solo tú puedes ver las publicaciones a las que les has dado like.</p>
          </div>
        )}
      </section>

      {selectedPost && (
        <div className="post-detail-overlay">
          <header className="post-detail-topbar">
            <button type="button" onClick={()=>{setSelectedPost(null);setPostMenuOpen(false);}} aria-label="Volver">←</button>
            <strong>Publicación</strong>
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
              <button type="button" onClick={()=>setCommentsOpen(true)}><MessageCircle size={23}/><span>{postCommentCount}</span></button>
              <button type="button" onClick={()=>setPostActionMessage("Compartir dentro de RIVYZA estará disponible con Mensajes.")}><Share2 size={23}/><span>Compartir</span></button>
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
                <button type="button" onClick={()=>setPostMenuOpen(false)}>Cancelar</button>
              </div>
            </div>
          )}

          {deleteConfirmOpen && (
            <div className="post-menu-backdrop delete-confirm-backdrop" onClick={()=>setDeleteConfirmOpen(false)}>
              <div className="delete-confirm-card" onClick={e=>e.stopPropagation()}>
                <strong>¿Eliminar esta publicación?</strong>
                <p>Esta acción no se puede deshacer.</p>
                <div className="delete-confirm-actions">
                  <button type="button" onClick={()=>setDeleteConfirmOpen(false)}>Cancelar</button>
                  <button type="button" className="danger" onClick={async()=>{setDeleteConfirmOpen(false);await deleteSelectedPost();}}>Eliminar</button>
                </div>
              </div>
            </div>
          )}

          {commentsOpen && (
            <div className="post-menu-backdrop" onClick={()=>setCommentsOpen(false)}>
              <div className="post-menu-sheet comments-sheet" onClick={e=>e.stopPropagation()}>
                <strong>Comentarios</strong>
                <p>La sección para escribir y leer comentarios queda preparada para conectarla al sistema de comentarios.</p>
                <button type="button" onClick={()=>setCommentsOpen(false)}>Cerrar</button>
              </div>
            </div>
          )}
        </div>
      )}

      <nav className="bottom-nav">
        <button onClick={()=>{setUploadOpen(false);setView("home");}}><Home/><span>Inicio</span></button>
        <button><Radio/><span>Live</span></button>
        <button className="plus-btn" onClick={()=>{setUploadOpen(true);setUploadType("photo");setCameraMode("photo");resetUpload();}}><Plus/></button>
        <button><Bell/><span>Alertas</span></button>
        <button className="active"><User/><span>Perfil</span></button>
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
        {profile&&<button className="back-home" onClick={()=>{setUploadOpen(false);setView("home");}}>← Volver</button>}
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

        <button className="logout-link" onClick={signOut}><LogOut size={16}/>Cerrar sesión</button>
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
        <button>Siguiendo</button>
        <button className="active-tab">Para ti</button>
        <button>LIVE</button>
      </div>
      <button className="icon-btn" onClick={()=>{setPeopleSearchOpen(true);setPeopleSearch("");setPeopleResults([]);setPeopleSearchMessage("");}} aria-label="Buscar usuarios"><Search size={23}/></button>
    </header>

    <section className="video-feed">
      <div className="video-card">
        <div className="video-placeholder">
          
          <span className="video-hint">Tu feed de videos aparecerá aquí</span>
        </div>

        <div className="creator-copy">
          <button className="creator-profile-link" onClick={()=>setView("publicProfile")}><div className="display-name">{profile?.display_name||"DJ Plus"}</div></button>
          <div className="handle">@{profile?.username||"djplus"}</div>
          {profile?.bio&&<div className="caption">{profile.bio}</div>}
          <div className="audio-line"><Music2 size={15}/> Sonido original · RIVYZA</div>
        </div>

        <div className="side-actions">
          <button className="avatar-action" onClick={()=>setView("publicProfile")}>
            {profile?.avatar_url
              ? <img src={profile.avatar_url} alt={profile.display_name}/>
              : <div className="mini-avatar">{(profile?.display_name?.[0]||"R").toUpperCase()}</div>}
          </button>

          <button><Heart/><span>125K</span></button>
          <button><MessageCircle/><span>3.2K</span></button>
          <button><Share2/><span>Compartir</span></button>
          <button><MoreHorizontal/><span>Más</span></button>
        </div>
      </div>
    </section>

    {peopleSearchOpen && (
      <div className="people-search-overlay">
        <div className="people-search-panel">
          <header className="people-search-header">
            <button type="button" onClick={()=>setPeopleSearchOpen(false)} aria-label="Cerrar">←</button>
            <strong>Buscar personas</strong>
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
      <button className="active"><Home/><span>Inicio</span></button>
      <button><Radio/><span>Live</span></button>
      <button className="plus-btn" onClick={()=>{setUploadOpen(true);setUploadType("photo");setCameraMode("photo");resetUpload();}}><Plus/></button>
      <button><Bell/><span>Alertas</span></button>
      <button onClick={()=>{setUploadOpen(false);setView("publicProfile");}}><User/><span>Perfil</span></button>
    </nav>

    {renderUploadModal()}
  </main>;
}
