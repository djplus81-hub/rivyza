-- RIVYZA v13.6 — ejecutar UNA sola vez en Supabase > SQL Editor
-- Likes: el conteo es público, la identidad de quien dio like NO lo es.
create table if not exists public.post_likes (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id,user_id)
);
alter table public.post_likes enable row level security;
drop policy if exists "Users can add their own likes" on public.post_likes;
create policy "Users can add their own likes" on public.post_likes for insert to authenticated with check (auth.uid()=user_id);
drop policy if exists "Users can remove their own likes" on public.post_likes;
create policy "Users can remove their own likes" on public.post_likes for delete to authenticated using (auth.uid()=user_id);
drop policy if exists "Private like identities" on public.post_likes;
create policy "Private like identities" on public.post_likes for select to authenticated using (
  auth.uid()=user_id or exists (select 1 from public.posts p where p.id=post_id and p.user_id=auth.uid())
);
create or replace function public.get_post_like_count(target_post_id uuid)
returns bigint language sql security definer set search_path=public
as $$ select count(*)::bigint from public.post_likes where post_id=target_post_id; $$;
grant execute on function public.get_post_like_count(uuid) to anon,authenticated;

-- Asegura que cada usuario solo pueda ocupar una vez cada posición fijada.
create unique index if not exists posts_user_pinned_position_unique
on public.posts (user_id,pinned_position) where pinned_position is not null;
