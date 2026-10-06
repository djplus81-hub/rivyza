-- RIVYZA v13.8 — perfiles públicos de usuarios
-- Ejecuta este archivo UNA VEZ en Supabase > SQL Editor.
-- Permite que usuarios autenticados encuentren y vean filas de public.profiles.
-- No expone auth.users, email ni credenciales.

alter table public.profiles enable row level security;

drop policy if exists "Authenticated users can view public profiles" on public.profiles;
create policy "Authenticated users can view public profiles"
on public.profiles
for select
to authenticated
using (true);

-- Las publicaciones ya deben tener su política pública existente.
-- v13.8 además filtra visibility='public' al abrir perfiles ajenos.
