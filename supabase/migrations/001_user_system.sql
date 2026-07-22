-- FilmFlik user system: profiles, progress, watchlist, subscriptions
-- Run in Supabase SQL editor or via CLI.

-- Profiles (1:1 with auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  avatar_url text,
  role text not null default 'user' check (role in ('user', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'display_name',
      split_part(new.email, '@', 1)
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Watch progress / history
create table if not exists public.watch_progress (
  user_id uuid not null references auth.users (id) on delete cascade,
  movie_id text not null,
  position_seconds numeric not null default 0,
  duration_seconds numeric not null default 0,
  completed boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, movie_id)
);

create index if not exists watch_progress_user_updated_idx
  on public.watch_progress (user_id, updated_at desc);

alter table public.watch_progress enable row level security;

create policy "watch_progress_select_own"
  on public.watch_progress for select
  using (auth.uid() = user_id);

create policy "watch_progress_insert_own"
  on public.watch_progress for insert
  with check (auth.uid() = user_id);

create policy "watch_progress_update_own"
  on public.watch_progress for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "watch_progress_delete_own"
  on public.watch_progress for delete
  using (auth.uid() = user_id);

-- Watchlist
create table if not exists public.watchlist (
  user_id uuid not null references auth.users (id) on delete cascade,
  movie_id text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, movie_id)
);

create index if not exists watchlist_user_created_idx
  on public.watchlist (user_id, created_at desc);

alter table public.watchlist enable row level security;

create policy "watchlist_select_own"
  on public.watchlist for select
  using (auth.uid() = user_id);

create policy "watchlist_insert_own"
  on public.watchlist for insert
  with check (auth.uid() = user_id);

create policy "watchlist_delete_own"
  on public.watchlist for delete
  using (auth.uid() = user_id);

-- Subscriptions (ready for paywall; not enforced until REQUIRE_SUBSCRIPTION=true)
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  status text not null default 'canceled'
    check (status in ('active', 'canceled', 'past_due', 'trialing')),
  plan_id text,
  current_period_end timestamptz,
  provider text not null default 'manual'
    check (provider in ('manual', 'stripe')),
  provider_customer_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists subscriptions_user_status_idx
  on public.subscriptions (user_id, status);

alter table public.subscriptions enable row level security;

create policy "subscriptions_select_own"
  on public.subscriptions for select
  using (auth.uid() = user_id);

-- Entitlement helper: authenticated + (optional) active subscription / admin
create or replace function public.user_can_watch(uid uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  user_role text;
  has_sub boolean;
begin
  if uid is null then
    return false;
  end if;

  select role into user_role from public.profiles where id = uid;
  if user_role = 'admin' then
    return true;
  end if;

  select exists (
    select 1
    from public.subscriptions s
    where s.user_id = uid
      and s.status in ('active', 'trialing')
      and (s.current_period_end is null or s.current_period_end > now())
  ) into has_sub;

  -- When no subscription rows exist yet, app-level REQUIRE_SUBSCRIPTION=false
  -- still allows watch. This function returns true for any authenticated user
  -- unless they have only expired/canceled subs AND we want strict mode —
  -- MVP: authenticated users can watch; subscription check is app-gated.
  return true;
end;
$$;

grant execute on function public.user_can_watch(uuid) to authenticated, anon;
