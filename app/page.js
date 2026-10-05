"use client";
import {useEffect,useMemo,useState,useCallback} from "react";
import {createClient} from "@supabase/supabase-js";
import Cropper from "react-easy-crop";
import {Home,Radio,Plus,Bell,User,Heart,MessageCircle,Share2,Search,AtSign,Save,LogOut,Camera,X,Check} from "lucide-react";

function createImage(url){return new Promise((resolve,reject)=>{const i=new Image();i.addEventListener("load",()=>resolve(i));i.addEventListener("error",reject);i.setAttribute("crossOrigin","anonymous");i.src=url;});}
async function getCroppedBlob(src,pixelCrop){
 const image=await createImage(src), canvas=document.createElement("canvas"), size=768;
 canvas.width=size; canvas.height=size;
 const ctx=canvas.getContext("2d");
 ctx.drawImage(image,pixelCrop.x,pixelCrop.y,pixelCrop.width,pixelCrop.height,0,0,size,size);
 return new Promise(resolve=>canvas.toBlob(blob=>resolve(blob),"image/jpeg",0.88));
}

export default function HomePage(){
 const supabase=useMemo(()=>{const u=process.env.NEXT_PUBLIC_SUPABASE_URL,k=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;return u&&k?createClient(u,k):null;},[]);
 const [user,setUser]=useState(null),[profile,setProfile]=useState(null),[loading,setLoading]=useState(true),[view,setView]=useState("home");
 const [username,setUsername]=useState(""),[displayName,setDisplayName]=useState(""),[bio,setBio]=useState(""),[avatarUrl,setAvatarUrl]=useState("");
 const [message,setMessage]=useState(""),[saving,setSaving]=useState(false);
 const [cropOpen,setCropOpen]=useState(false),[cropSrc,setCropSrc]=useState(""),[crop,setCrop]=useState({x:0,y:0}),[zoom,setZoom]=useState(1),[croppedPixels,setCroppedPixels]=useState(null),[uploadingAvatar,setUploadingAvatar]=useState(false);

 const loadProfile=useCallback(async(currentUser)=>{
   if(!supabase||!currentUser)return;
   const {data}=await supabase.from("profiles").select("id,username,display_name,bio,avatar_url").eq("id",currentUser.id).maybeSingle();
   if(data){
     setProfile(data); setUsername(data.username||""); setDisplayName(data.display_name||""); setBio(data.bio||"");
     setAvatarUrl(data.avatar_url||currentUser.user_metadata?.avatar_url||currentUser.user_metadata?.picture||"");
     setView("home");
   } else {
     setDisplayName(currentUser.user_metadata?.full_name||currentUser.user_metadata?.name||"");
     setAvatarUrl(currentUser.user_metadata?.avatar_url||currentUser.user_metadata?.picture||"");
     setView("profile");
   }
 },[supabase]);

 useEffect(()=>{
   if(!supabase){setLoading(false);return;}
   supabase.auth.getUser().then(async({data})=>{const u=data?.user??null;setUser(u);setLoading(false);if(u)await loadProfile(u);});
   const {data:l}=supabase.auth.onAuthStateChange(async(_e,s)=>{const u=s?.user??null;setUser(u);if(u)await loadProfile(u);else setProfile(null);});
   return()=>l.subscription.unsubscribe();
 },[supabase,loadProfile]);

 async function signInWithGoogle(){await supabase.auth.signInWithOAuth({provider:"google",options:{redirectTo:window.location.origin}});}
 async function signOut(){await supabase.auth.signOut();}
 function norm(v){return v.toLowerCase().replace(/\s+/g,"").replace(/[^a-z0-9._]/g,"").slice(0,24);}

 async function saveProfile(e){
   e.preventDefault();
   const clean=profile?.username || norm(username);
   if(!profile && clean.length<3){setMessage("El @usuario debe tener por lo menos 3 caracteres.");return;}
   if(!displayName.trim()){setMessage("Escribe tu nombre para mostrar.");return;}
   setSaving(true); setMessage("");

   const payload={
     id:user.id,
     username:clean,
     display_name:displayName.trim(),
     bio:bio.trim().slice(0,160),
     avatar_url:avatarUrl||null
   };

   const {data,error}=await supabase.from("profiles").upsert(payload,{onConflict:"id"}).select().single();
   if(error){
     setMessage(error.code==="23505"?"Ese @usuario ya está ocupado.":"No se pudo guardar el perfil.");
   }else{
     setProfile(data); setUsername(data.username||""); setMessage("Perfil guardado.");
     setView("home");
   }
   setSaving(false);
 }

 function onPickPhoto(e){
   const f=e.target.files?.[0]; if(!f)return;
   if(!["image/jpeg","image/png","image/webp"].includes(f.type)){setMessage("Usa JPG, PNG o WEBP.");return;}
   if(f.size>5*1024*1024){setMessage("La foto no puede pesar más de 5 MB.");return;}
   const r=new FileReader(); r.onload=()=>{setCropSrc(r.result);setCrop({x:0,y:0});setZoom(1);setCropOpen(true);}; r.readAsDataURL(f);
 }
 const onCropComplete=useCallback((_a,p)=>setCroppedPixels(p),[]);
 async function uploadAvatar(){
   if(!croppedPixels)return;
   setUploadingAvatar(true); setMessage("");
   try{
     const blob=await getCroppedBlob(cropSrc,croppedPixels), path=`${user.id}/avatar.jpg`;
     const {error:upErr}=await supabase.storage.from("avatars").upload(path,blob,{contentType:"image/jpeg",upsert:true,cacheControl:"3600"});
     if(upErr)throw upErr;
     const {data:p}=supabase.storage.from("avatars").getPublicUrl(path);
     const url=`${p.publicUrl}?v=${Date.now()}`;
     const {data:updated,error:profErr}=await supabase.from("profiles").update({avatar_url:url}).eq("id",user.id).select().single();
     if(profErr)throw profErr;
     setAvatarUrl(url); setProfile(updated); setCropOpen(false); setMessage("Foto de perfil actualizada.");
   }catch(e){console.error(e);setMessage("No se pudo cambiar la foto.");}
   finally{setUploadingAvatar(false);}
 }

 if(loading)return <div className="center">Cargando RIVYZA…</div>;
 if(!user)return <main className="auth-shell"><section className="auth-card"><div className="logo-mark">R</div><h1>RIVYZA</h1><p className="tagline">Vive. Conecta. Transmite.</p><button className="google-btn" onClick={signInWithGoogle}>Continuar con Google</button></section></main>;

 if(view==="profile"){
   return <main className="profile-setup-shell">
    <section className="profile-card">
      <button className="back-home" onClick={()=>profile&&setView("home")}>← Volver</button>
      <div className="profile-brand">RIVYZA</div>
      <p className="step-label">{profile?"EDITAR PERFIL":"PRIMER PASO"}</p>
      <h2>{profile?"Editar perfil":"Crea tu perfil"}</h2>

      <div className="profile-avatar-wrap">
        {avatarUrl?<img className="profile-photo" src={avatarUrl} alt="Foto de perfil"/>:<div className="profile-photo-fallback">{(displayName?.[0]||user.email?.[0]||"R").toUpperCase()}</div>}
        <label className="change-photo-btn"><Camera size={17}/>Cambiar foto<input type="file" accept="image/jpeg,image/png,image/webp" onChange={onPickPhoto} hidden/></label>
      </div>

      <form onSubmit={saveProfile} className="profile-form">
        <label><span>@Usuario</span>
          <div className="input-icon-wrap"><AtSign size={18}/>
            <input value={username} onChange={(e)=>!profile&&setUsername(norm(e.target.value))} disabled={!!profile} placeholder="ejemplo: djplus"/>
          </div>
          {profile && <small className="locked-note">Tu @usuario es permanente.</small>}
        </label>

        <label><span>Nombre para mostrar</span><input value={displayName} onChange={(e)=>setDisplayName(e.target.value)} placeholder="Tu nombre"/></label>
        <label><span>Bio</span><textarea value={bio} onChange={(e)=>setBio(e.target.value)} maxLength={160} rows={4}/><small>{bio.length}/160</small></label>
        {message&&<div className="form-message">{message}</div>}
        <button className="save-profile-btn" disabled={saving}><Save size={18}/>{saving?"Guardando…":profile?"Guardar cambios":"Crear mi perfil"}</button>
      </form>
      <button className="logout-link" onClick={signOut}><LogOut size={16}/>Cerrar sesión</button>
    </section>

    {cropOpen&&<div className="crop-modal"><div className="crop-card">
      <div className="crop-header"><strong>Ajusta tu foto</strong><button onClick={()=>setCropOpen(false)}><X/></button></div>
      <div className="crop-area"><Cropper image={cropSrc} crop={crop} zoom={zoom} aspect={1} cropShape="round" showGrid={false} onCropChange={setCrop} onZoomChange={setZoom} onCropComplete={onCropComplete}/></div>
      <div className="crop-controls"><span>Zoom</span><input type="range" min={1} max={3} step={0.01} value={zoom} onChange={(e)=>setZoom(Number(e.target.value))}/></div>
      <button className="save-profile-btn" onClick={uploadAvatar} disabled={uploadingAvatar}><Check size={18}/>{uploadingAvatar?"Guardando foto…":"Usar esta foto"}</button>
    </div></div>}
   </main>;
 }

 return <main className="feed-shell">
   <header className="topbar">
     <div className="brand">RIVYZA</div>
     <div className="tabs"><button className="active-tab">Para ti</button><button>Siguiendo</button><button>LIVE</button></div>
     <button className="icon-btn"><Search size={22}/></button>
   </header>

   <section className="video-stage">
     <div className="demo-video">
       <div className="live-badge">RIVYZA</div>
       <div className="center-copy">
         {profile?.avatar_url?<img className="avatar avatar-img" src={profile.avatar_url} alt={profile.display_name}/>:<div className="avatar">{(profile?.display_name?.[0]||"R").toUpperCase()}</div>}
         <h2>{profile?.display_name}</h2>
         <p className="profile-handle">@{profile?.username}</p>
         {profile?.bio&&<p className="profile-bio">{profile.bio}</p>}
         <button className="mini-btn" onClick={()=>setView("profile")}>Editar perfil</button>
       </div>
       <div className="side-actions"><button><Heart/><span>125K</span></button><button><MessageCircle/><span>3.2K</span></button><button><Share2/><span>Compartir</span></button></div>
     </div>
   </section>

   <nav className="bottom-nav">
     <button className="active"><Home/><span>Inicio</span></button>
     <button><Radio/><span>Live</span></button>
     <button className="plus-btn"><Plus/></button>
     <button><Bell/><span>Alertas</span></button>
     <button onClick={()=>setView("profile")}><User/><span>Perfil</span></button>
   </nav>
 </main>;
}
