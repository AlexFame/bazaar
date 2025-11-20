-- Create favorites table
create table if not exists public.favorites (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  listing_id uuid not null references public.listings(id) on delete cascade,
  created_at timestamptz default now(),
  unique(profile_id, listing_id)
);

-- Create index for faster queries
create index if not exists favorites_profile_id_idx on public.favorites (profile_id);
create index if not exists favorites_listing_id_idx on public.favorites (listing_id);

-- Enable RLS
alter table public.favorites enable row level security;

-- Favorites policies
do $$ begin
  create policy favorites_read_own on public.favorites for select using (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy favorites_insert_own on public.favorites for insert with check (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy favorites_delete_own on public.favorites for delete using (true);
exception when duplicate_object then null; end $$;
