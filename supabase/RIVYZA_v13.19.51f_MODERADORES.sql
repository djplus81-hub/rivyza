-- Ejecutar en Supabase SQL Editor ANTES de desplegar esta version.
create table if not exists public.rivyza_live_moderators (
 room_id uuid not null references public.rivyza_live_rooms(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 assigned_by uuid not null references auth.users(id),
 created_at timestamptz not null default now(),
 primary key(room_id,user_id)
);
create table if not exists public.rivyza_live_expulsion_reports (
 id uuid primary key default gen_random_uuid(),
 room_id uuid not null references public.rivyza_live_rooms(id) on delete cascade,
 host_id uuid not null references auth.users(id),
 reported_user_id uuid not null references auth.users(id),
 reported_by uuid not null references auth.users(id),
 reason text not null,
 details text not null default '',
 status text not null default 'pending',
 created_at timestamptz not null default now()
);
alter table public.rivyza_live_moderators enable row level security;
alter table public.rivyza_live_expulsion_reports enable row level security;
-- Access through server service role only; no public policies.
