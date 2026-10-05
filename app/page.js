"use client";
import {useEffect,useMemo,useState,useCallback} from "react";
import {createClient} from "@supabase/supabase-js";
import Cropper from "react-easy-crop";
import {AtSign,Save,LogOut,Camera,X,Check} from "lucide-react";

function createImage(url){return new Promise((resolve,reject)=>{const image=new Image();image.addEventListener("load",()=>resolve(image));image.addEventListener("error",reject);image.setAttribute("crossOrigin","anonymous");image.src=url;});}
async function getCroppedBlob(imageSrc,pixelCrop){
 const image=await createImage(imageSrc); const canvas=document.createElement("canvas"); const size=768;
 canvas.width=size; canvas.height=size; const ctx=canvas.getContext("2d");
 ctx.drawImage(image,pixelCrop.x,pixelCrop.y,pixelCrop.width,pixelCrop.height,0,0,size,size);
 return new Promise((resolve)=>canvas.toBlob((blob)=>resolve(blob),"image/jpeg",0.88));
}

export default function HomePage(){
 const supabase=useMemo(()=>{const url=process.env.NEXT_PUBLIC_SUPABASE_URL; const key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY; return url&&key?createClient(url,key):null;},[]);
 const [user,setUser]=useState(null),[profile,setProfile]=useState(null),[loading,setLoading]=useState(true);
 const [username,setUsername]=useState(""),[displayName,setDisplayName]=useState(""),[bio,setBio]=useState(""),[avatarUrl,setAvatarUrl]=useState("");
 const [message,setMessage]=useState(""),[saving,setSaving]=useState(false);
 const [cropOpen,setCropOpen]=useState(false),[cropSrc,setCropSrc]=useState(""),[crop,setCrop]=useState({x:0,y:0}),[zoom,setZoom]=useState(1),[croppedPixels,setCroppedPixels]=useState(null),[uploadingAvatar,setUploadingAvatar]=useState(false);

 const loadProfile=useCallback(async(currentUser)=>{
   if(!supabase||!currentUser)return;
   const {data}=await supabase.from("profiles").select("id,username,display_name,bio,avatar_url").eq("id",currentUser.id).maybeSingle();
   if(data){setProfile(data);setUsername(data.username||"");setDisplayName(data.display_name||"");setBio(data.bio||"");setAvatarUrl(data.avatar_url||currentUser.user_metadata?.avatar_url||currentUser.user_metadata?.picture||"");}
   else{setDisplayName(currentUser.user_metadata?.full_name||currentUser.user_metadata?.name||"");setAvatarUrl(currentUser.user_metadata?.avatar_url||currentUser.user_metadata?.picture||"");}
 },[supabase]);

 useEffect(()=>{if(!supabase){setLoading(false);return;}
   supabase.auth.getUser().then(async({data})=>{const u=data?.user??null;setUser(u);setLoading(false);if(u)await loadProfile(u);});
   const {data:l}=supabase.auth.onAuthStateChange(async(_e,s)=>{const u=s?.user??null;setUser(u);if(u)await loadProfile(u);});
   return()=>l.subscription.unsubscribe();
 },[supabase,loadProfile]);

 async function signInWithGoogle(){await supabase.auth.signInWithOAuth({provider:"google",options:{redirectTo:window.location.origin}});}
 async function signOut(){await supabase.auth.signOut();}
 function norm(v){return v.toLowerCase().replace(/\s+/g,"").replace(/[^a-z0-9._]/g,"").slice(0,24);}

 async function saveProfile(e){
   e.preventDefault(); const clean=norm(username);
   if(clean.length<3){setMessage("El @usuario debe tener por lo menos 3 caracteres.");return;}
   if(!displayName.trim()){setMessage("Escribe tu nombre para mostrar.");return;}
   setSaving(true);
   const payload={id:user.id,username:clean,display_name:displayName.trim(),bio:bio.trim().slice(0,160),avatar_url:avatarUrl||null};
   const {data,error}=await supabase.from("profiles").upsert(payload,{onConflict:"id"}).select().single();
   if(error)setMessage(error.code==="23505"?"Ese @usuario ya está ocupado.":"No se pudo guardar el perfil.");
   else{setProfile(data);setMessage("Perfil guardado.");}
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
     const blob=await getCroppedBlob(cropSrc,croppedPixels); const path=`${user.id}/avatar.jpg`;
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

 return <main className="profile-setup-shell">
   <section className="profile-card">
     <div className="profile-brand">RIVYZA</div><p className="step-label">{profile?"EDITAR PERFIL":"PRIMER PASO"}</p><h2>{profile?"Tu perfil":"Crea tu perfil"}</h2>
     <div className="profile-avatar-wrap">
       {avatarUrl?<img className="profile-photo" src={avatarUrl} alt="Foto de perfil"/>:<div className="profile-photo-fallback">{(displayName?.[0]||user.email?.[0]||"R").toUpperCase()}</div>}
       <label className="change-photo-btn"><Camera size={17}/>Cambiar foto<input type="file" accept="image/jpeg,image/png,image/webp" onChange={onPickPhoto} hidden/></label>
     </div>
     <form onSubmit={saveProfile} className="profile-form">
       <label><span>@Usuario</span><div className="input-icon-wrap"><AtSign size={18}/><input value={username} onChange={(e)=>setUsername(norm(e.target.value))} placeholder="ejemplo: djplus"/></div></label>
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
