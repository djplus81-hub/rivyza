-- RIVYZA v13.6: likes + comments + two pinned posts
alter table public.posts add column if not exists pinned_position smallint check (pinned_position in (1,2));

create table if not exists public.post_likes (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id,user_id)
);
alter table public.post_likes enable row level security;
drop policy if exists "Likes are countable" on public.post_likes;
create policy "Likes are countable" on public.post_likes for select using (true);
drop policy if exists "Users add own likes" on public.post_likes;
create policy "Users add own likes" on public.post_likes for insert to authenticated with check (auth.uid()=user_id);
drop policy if exists "Users remove own likes" on public.post_likes;
create policy "Users remove own likes" on public.post_likes for delete to authenticated using (auth.uid()=user_id);

create table if not exists public.post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 500),
  created_at timestamptz not null default now()
);
alter table public.post_comments enable row level security;
drop policy if exists "Comments are readable" on public.post_comments;
create policy "Comments are readable" on public.post_comments for select using (true);
drop policy if exists "Users add own comments" on public.post_comments;
create policy "Users add own comments" on public.post_comments for insert to authenticated with check (auth.uid()=user_id);
drop policy if exists "Users delete own comments" on public.post_comments;
create policy "Users delete own comments" on public.post_comments for delete to authenticated using (auth.uid()=user_id);
