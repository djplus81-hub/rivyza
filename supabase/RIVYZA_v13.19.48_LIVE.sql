-- RIVYZA LIVE: salas y solicitudes de cámara.
-- Ejecutar una sola vez en Supabase SQL Editor.
create table if not exists public.rivyza_live_rooms (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'RIVYZA LIVE',
  status text not null default 'live' check (status in ('live','ended')),
  created_at timestamptz not null default now(),
  ended_at timestamptz
);
create unique index if not exists rivyza_only_one_live_per_host
  on public.rivyza_live_rooms(host_id) where status='live';
create index if not exists rivyza_live_recent on public.rivyza_live_rooms(status,created_at desc);

create table if not exists public.rivyza_live_camera_requests (
  room_id uuid not null references public.rivyza_live_rooms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now(),
  primary key(room_id,user_id)
);

alter table public.rivyza_live_rooms enable row level security;
alter table public.rivyza_live_camera_requests enable row level security;

-- Descubrimiento público; las escrituras se realizan en el servidor autenticado.
drop policy if exists rivyza_live_discover on public.rivyza_live_rooms;
create policy rivyza_live_discover on public.rivyza_live_rooms
  for select to authenticated using (status='live' or host_id=auth.uid());
drop policy if exists rivyza_live_request_read on public.rivyza_live_camera_requests;
create policy rivyza_live_request_read on public.rivyza_live_camera_requests
  for select to authenticated using (
    user_id=auth.uid() or exists (
      select 1 from public.rivyza_live_rooms r
      where r.id=room_id and r.host_id=auth.uid()
    )
  );

-- Serializa aprobaciones para no admitir más de nueve invitados con cámara.
create or replace function public.rivyza_live_approve_camera(p_room uuid, p_guest uuid)
returns void language plpgsql security definer set search_path=public as $$
declare v_host uuid; v_status text; v_current text; v_count integer;
begin
  select host_id,status into v_host,v_status from public.rivyza_live_rooms
    where id=p_room for update;
  if v_host is null or v_host<>auth.uid() or v_status<>'live' then
    raise exception 'No tienes permiso para aprobar esta cámara';
  end if;
  select status into v_current from public.rivyza_live_camera_requests
    where room_id=p_room and user_id=p_guest;
  if v_current is distinct from 'pending' then
    raise exception 'La solicitud no está pendiente';
  end if;
  select count(*) into v_count from public.rivyza_live_camera_requests
    where room_id=p_room and status='approved';
  if v_count>=9 then raise exception 'Ya hay nueve cámaras de invitados'; end if;
  update public.rivyza_live_camera_requests set status='approved'
    where room_id=p_room and user_id=p_guest;
end $$;
revoke all on function public.rivyza_live_approve_camera(uuid,uuid) from public;
grant execute on function public.rivyza_live_approve_camera(uuid,uuid) to authenticated;
