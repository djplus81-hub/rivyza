-- RIVYZA v13.9 — FOLLOW / FOLLOWING
create table if not exists public.follows (
  follower_id uuid not null references auth.users(id) on delete cascade,
  following_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  constraint follows_no_self_follow check (follower_id <> following_id)
);
create index if not exists follows_follower_idx on public.follows (follower_id);
create index if not exists follows_following_idx on public.follows (following_id);
alter table public.follows enable row level security;
drop policy if exists "Authenticated users can view follows" on public.follows;
create policy "Authenticated users can view follows" on public.follows for select to authenticated using (true);
drop policy if exists "Users can follow from their own account" on public.follows;
create policy "Users can follow from their own account" on public.follows for insert to authenticated
with check (auth.uid() = follower_id and follower_id <> following_id);
drop policy if exists "Users can unfollow from their own account" on public.follows;
create policy "Users can unfollow from their own account" on public.follows for delete to authenticated
using (auth.uid() = follower_id);
