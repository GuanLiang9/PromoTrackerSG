-- PromoSG: friendships (mutual follow with request/accept)
-- Run: node --env-file=.env.local scripts/run-sql.mjs supabase/migrations/0010_friends.sql

create table if not exists public.friendships (
  id            uuid primary key default gen_random_uuid(),
  requester_id  uuid not null references auth.users(id) on delete cascade,
  addressee_id  uuid not null references auth.users(id) on delete cascade,
  status        text not null default 'pending' check (status in ('pending','accepted')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint friendships_distinct check (requester_id <> addressee_id),
  unique (requester_id, addressee_id)
);

create index if not exists friendships_requester_idx on public.friendships (requester_id, status);
create index if not exists friendships_addressee_idx on public.friendships (addressee_id, status);

alter table public.friendships enable row level security;

-- Either party can see the row.
drop policy if exists "friendships read" on public.friendships;
create policy "friendships read"
  on public.friendships for select
  using (auth.uid() = requester_id or auth.uid() = addressee_id);

-- Only the requester can create a pending request (for themselves).
drop policy if exists "friendships insert" on public.friendships;
create policy "friendships insert"
  on public.friendships for insert
  with check (auth.uid() = requester_id and status = 'pending');

-- The addressee accepts (or either party can re-touch their own row).
drop policy if exists "friendships update" on public.friendships;
create policy "friendships update"
  on public.friendships for update
  using (auth.uid() = requester_id or auth.uid() = addressee_id)
  with check (auth.uid() = requester_id or auth.uid() = addressee_id);

-- Either party can remove the friendship / cancel the request.
drop policy if exists "friendships delete" on public.friendships;
create policy "friendships delete"
  on public.friendships for delete
  using (auth.uid() = requester_id or auth.uid() = addressee_id);

-- Keep updated_at fresh (reuses set_updated_at from 0001).
drop trigger if exists friendships_set_updated_at on public.friendships;
create trigger friendships_set_updated_at
  before update on public.friendships
  for each row execute function public.set_updated_at();

notify pgrst, 'reload schema';
