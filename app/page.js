"use client";
import {useEffect,useMemo,useState,useCallback} from "react";
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
  const flagFromCode=(code)=>code ? code.toUpperCase().replace(/./g,c=>String.fromCodePoint(127397+c.charCodeAt())) : "";
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
  const [loading,setLoading]=useState(true);
  const [view,setView]=useState("home"); const [profileTab,setProfileTab]=useState("posts");

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

  useEffect(()=>{
    if(!supabase){setLoading(false);return;}

    let alive=true;
    let initialized=false;

    async function routeSignedInUser(u){
      if(!u || !alive)return;
      setUser(u);
      const existingProfile=await loadProfile(u);
      if(!alive)return;
      setView(existingProfile ? "home" : "profile");
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

      // Google sign-in, token refresh, and restored sessions all reuse the same route.
      routeSignedInUser(u);
      setLoading(false);
    });

    return()=>{
      alive=false;
      l.subscription.unsubscribe();
    };
  },[supabase,loadProfile]);

  async function signInWithGoogle(){
    await supabase.auth.signInWithOAuth({provider:"google",options:{redirectTo:window.location.origin}});
  }

  async function signOut(){await supabase.auth.signOut();}

  function norm(v){
    return v.replace(/\s+/g,"").replace(/[^A-Za-z0-9._]/g,"").slice(0,24);
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

  
  if(view==="publicProfile"){
    return <main className="public-profile-shell">
      <header className="profile-topbar compact">
        <button className="profile-back" onClick={()=>setView("home")}>←</button>
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
                <span className="profile-country-flag">{flagFromCode(profile.country_code)}</span>
                <span>{profile.country_name || regionNames.of(profile.country_code) || profile.country_code}</span>
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
            <div className="empty-grid-card first">Tus fotos y videos aparecerán aquí</div>
            <div className="empty-grid-card"></div>
            <div className="empty-grid-card"></div>
            <div className="empty-grid-card"></div>
            <div className="empty-grid-card"></div>
            <div className="empty-grid-card"></div>
          </div>
        ) : (
          <div className="likes-private-panel">
            <Heart size={38}/>
            <h3>Me gusta</h3>
            <p>Solo tú puedes ver las publicaciones a las que les has dado like.</p>
          </div>
        )}
      </section>

      <nav className="bottom-nav">
        <button onClick={()=>setView("home")}><Home/><span>Inicio</span></button>
        <button><Radio/><span>Live</span></button>
        <button className="plus-btn"><Plus/></button>
        <button><Bell/><span>Alertas</span></button>
        <button className="active"><User/><span>Perfil</span></button>
      </nav>

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
        {profile&&<button className="back-home" onClick={()=>setView("home")}>← Volver</button>}
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
      <button className="icon-btn"><Search size={23}/></button>
    </header>

    <section className="video-feed">
      <div className="video-card">
        <div className="video-placeholder">
          
          <span className="video-hint">Tu feed de videos aparecerá aquí</span>
        </div>

        <div className="creator-copy">
          <div className="display-name">{profile?.display_name||"DJ Plus"}</div>
          <div className="handle">@{profile?.username||"djplus"}</div>
          {profile?.bio&&<div className="caption">{profile.bio}</div>}
          <div className="audio-line"><Music2 size={15}/> Sonido original · RIVYZA</div>
        </div>

        <div className="side-actions">
          <button className="avatar-action" onClick={()=>setView("profile")}>
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

    <nav className="bottom-nav">
      <button className="active"><Home/><span>Inicio</span></button>
      <button><Radio/><span>Live</span></button>
      <button className="plus-btn"><Plus/></button>
      <button><Bell/><span>Alertas</span></button>
      <button onClick={()=>setView("publicProfile")}><User/><span>Perfil</span></button>
    </nav>
  </main>;
}