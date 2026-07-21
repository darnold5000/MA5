-- MA5 community board: shared posts with optional replies; staff can delete.

create table if not exists public.ma5_community_posts (
  id uuid primary key default gen_random_uuid(),
  author_user_id uuid not null references public.ma5_profiles (id) on delete cascade,
  body text not null check (char_length(trim(body)) > 0 and char_length(body) <= 2000),
  parent_id uuid references public.ma5_community_posts (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists ma5_community_posts_created_idx
  on public.ma5_community_posts (created_at desc);

create index if not exists ma5_community_posts_parent_idx
  on public.ma5_community_posts (parent_id, created_at asc)
  where parent_id is not null;

alter table public.ma5_community_posts enable row level security;

-- Authenticated members and staff can read the board.
drop policy if exists ma5_community_posts_select on public.ma5_community_posts;
create policy ma5_community_posts_select
on public.ma5_community_posts
for select
to authenticated
using (true);

-- Any authenticated user can post as themselves (top-level or reply).
drop policy if exists ma5_community_posts_insert on public.ma5_community_posts;
create policy ma5_community_posts_insert
on public.ma5_community_posts
for insert
to authenticated
with check (author_user_id = auth.uid());

-- Staff can delete any post; authors can delete their own.
drop policy if exists ma5_community_posts_delete on public.ma5_community_posts;
create policy ma5_community_posts_delete
on public.ma5_community_posts
for delete
to authenticated
using (author_user_id = auth.uid() or public.ma5_is_staff());

-- Soft-delete for direct messages (staff only).
drop policy if exists ma5_messages_update_staff on public.ma5_messages;
create policy ma5_messages_update_staff
on public.ma5_messages
for update
to authenticated
using (public.ma5_can_message_clients())
with check (public.ma5_can_message_clients());
