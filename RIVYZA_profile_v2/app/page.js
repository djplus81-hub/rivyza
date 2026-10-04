"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { Home, Radio, Plus, Bell, User, Heart, MessageCircle, Share2, Search, AtSign, Save, LogOut } from "lucide-react";

export default function HomePage() {
  const supabase = useMemo(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) return null;
    return createClient(url, key);
  }, []);

  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");

  useEffect(() => {
    if (!supabase) { setLoading(false); return; }
    async function boot() {
      const { data } = await supabase.auth.getUser();
      const currentUser = data?.user ?? null;
      setUser(currentUser);
      setLoading(false);
      if (currentUser) await loadProfile(currentUser);
    }
    boot();
    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) await loadProfile(currentUser);
      else setProfile(null);
    });
    return () => listener.subscription.unsubscribe();
  }, [supabase]);

  async function loadProfile(currentUser) {
    if (!supabase || !currentUser) return;
    setProfileLoading(true); setMessage("");
    const { data, error } = await supabase.from("profiles").select("id, username, display_name, bio, avatar_url, created_at").eq("id", currentUser.id).maybeSingle();
    if (error) setMessage("No se pudo cargar el perfil.");
    if (data) {
      setProfile(data);
      setUsername(data.username || "");
      setDisplayName(data.display_name || "");
      setBio(data.bio || "");
      setAvatarUrl(data.avatar_url || currentUser.user_metadata?.avatar_url || currentUser.user_metadata?.picture || "");
    } else {
      setProfile(null);
      setDisplayName(currentUser.user_metadata?.full_name || currentUser.user_metadata?.name || "");
      setAvatarUrl(currentUser.user_metadata?.avatar_url || currentUser.user_metadata?.picture || "");
    }
    setProfileLoading(false);
  }

  async function signInWithGoogle() {
    if (!supabase) { alert("Faltan las variables de Supabase en Vercel."); return; }
    await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: window.location.origin } });
  }

  async function signOut() { if (supabase) await supabase.auth.signOut(); }

  function normalizeUsername(value) {
    return value.toLowerCase().replace(/\s+/g, "").replace(/[^a-z0-9._]/g, "").slice(0, 24);
  }

  async function saveProfile(e) {
    e.preventDefault();
    if (!supabase || !user) return;
    const cleanUsername = normalizeUsername(username);
    if (cleanUsername.length < 3) { setMessage("El @usuario debe tener por lo menos 3 caracteres."); return; }
    if (!displayName.trim()) { setMessage("Escribe tu nombre para mostrar."); return; }
    setSaving(true); setMessage("");
    const payload = { id: user.id, username: cleanUsername, display_name: displayName.trim(), bio: bio.trim().slice(0, 160), avatar_url: avatarUrl || null };
    const { data, error } = await supabase.from("profiles").upsert(payload, { onConflict: "id" }).select().single();
    if (error) {
      setMessage(error.code === "23505" ? "Ese @usuario ya está ocupado. Prueba otro." : "No se pudo guardar el perfil. Inténtalo otra vez.");
      setSaving(false); return;
    }
    setProfile(data); setUsername(data.username || ""); setDisplayName(data.display_name || ""); setBio(data.bio || ""); setAvatarUrl(data.avatar_url || ""); setMessage("Perfil guardado."); setSaving(false);
  }

  if (loading) return <div className="center">Cargando RIVYZA…</div>;

  if (!user) return (
    <main className="auth-shell">
      <div className="glow glow-a" /><div className="glow glow-b" />
      <section className="auth-card">
        <div className="logo-mark">R</div><h1>RIVYZA</h1><p className="tagline">Vive. Conecta. Transmite.</p>
        <button className="google-btn" onClick={signInWithGoogle}>Continuar con Google</button>
        <div className="divider"><span>o</span></div>
        <button className="secondary-btn" disabled>Registrarse con email</button>
        <p className="small">La verificación por teléfono se activará cuando conectemos el servicio SMS.</p>
      </section>
    </main>
  );

  if (profileLoading) return <div className="center">Preparando tu perfil…</div>;

  if (!profile) return (
    <main className="profile-setup-shell">
      <div className="glow glow-a" /><div className="glow glow-b" />
      <section className="profile-card">
        <div className="profile-brand">RIVYZA</div><p className="step-label">PRIMER PASO</p><h2>Crea tu perfil</h2>
        <p className="profile-intro">Escoge cómo quieres aparecer cuando entres a RIVYZA.</p>
        <div className="profile-avatar-wrap">{avatarUrl ? <img className="profile-photo" src={avatarUrl} alt="Foto de perfil" /> : <div className="profile-photo-fallback">{(displayName?.[0] || user.email?.[0] || "R").toUpperCase()}</div>}</div>
        <p className="photo-note">Por ahora usamos tu foto de Google. Luego podrás subir otra.</p>
        <form onSubmit={saveProfile} className="profile-form">
          <label><span>@Usuario</span><div className="input-icon-wrap"><AtSign size={18} /><input value={username} onChange={(e)=>setUsername(normalizeUsername(e.target.value))} placeholder="ejemplo: djplus" autoComplete="off" maxLength={24}/></div></label>
          <label><span>Nombre para mostrar</span><input value={displayName} onChange={(e)=>setDisplayName(e.target.value)} placeholder="Tu nombre" maxLength={40}/></label>
          <label><span>Bio</span><textarea value={bio} onChange={(e)=>setBio(e.target.value)} placeholder="Cuéntale a la gente quién eres…" maxLength={160} rows={4}/><small>{bio.length}/160</small></label>
          {message && <div className="form-message">{message}</div>}
          <button className="save-profile-btn" type="submit" disabled={saving}><Save size={18}/>{saving ? "Guardando…" : "Crear mi perfil"}</button>
        </form>
        <button className="logout-link" onClick={signOut}><LogOut size={16}/>Cerrar sesión</button>
      </section>
    </main>
  );

  return (
    <main className="feed-shell">
      <header className="topbar"><div className="brand">RIVYZA</div><div className="tabs"><button className="active-tab">Para ti</button><button>Siguiendo</button><button>LIVE</button></div><button className="icon-btn" aria-label="Buscar"><Search size={23}/></button></header>
      <section className="video-stage"><div className="demo-video"><div className="live-badge">RIVYZA</div><div className="center-copy">
        {profile.avatar_url ? <img className="avatar avatar-img" src={profile.avatar_url} alt={profile.display_name}/> : <div className="avatar">{(profile.display_name?.[0] || profile.username?.[0] || "R").toUpperCase()}</div>}
        <h2>{profile.display_name}</h2><p className="profile-handle">@{profile.username}</p>{profile.bio && <p className="profile-bio">{profile.bio}</p>}<p className="muted-copy">Tu perfil RIVYZA ya está activo.</p><button onClick={signOut} className="mini-btn">Cerrar sesión</button>
      </div><div className="side-actions"><button><Heart/><span>125K</span></button><button><MessageCircle/><span>3.2K</span></button><button><Share2/><span>Compartir</span></button></div></div></section>
      <nav className="bottom-nav"><button className="active"><Home/><span>Inicio</span></button><button><Radio/><span>Live</span></button><button className="plus-btn" aria-label="Crear"><Plus/></button><button><Bell/><span>Alertas</span></button><button><User/><span>Perfil</span></button></nav>
    </main>
  );
}
