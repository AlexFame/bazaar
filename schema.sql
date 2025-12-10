-- 1. Enum types
create type if not exists public.listing_type as enum ('buy','sell','free','service','exchange');
create type if not exists public.listing_status as enum ('active','hidden','closed','draft');

-- 2. Profiles
create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  tg_user_id bigint unique,
  tg_username text,
  full_name text,
  created_at timestamptz default now()
);

-- 3. Listings
create table if not exists public.listings (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(title) between 3 and 120),
  type listing_type not null,
  price numeric(12,2),
  description text,
  location_text text,
  contacts text not null,
  status listing_status not null default 'active',
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  -- New columns for filters
  condition text, -- 'new', 'used', 'like_new'
  parameters jsonb default '{}'::jsonb, -- Category specific attributes
  main_image_path text -- Path to the main image for preview
);
create index if not exists listings_type_status_created_at_idx on public.listings (type, status, created_at desc);
create index if not exists listings_created_by_idx on public.listings (created_by);

-- 4. Listing images
create table if not exists public.listing_images (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  file_path text not null,
  position int not null default 1,
  created_at timestamptz default now()
);
create index if not exists listing_images_listing_id_pos_idx on public.listing_images (listing_id, position);

-- Enable RLS
alter table public.profiles enable row level security;
alter table public.listings enable row level security;
alter table public.listing_images enable row level security;

-- Profiles policies
do $$ begin
  create policy profiles_read_all on public.profiles for select using (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy profiles_insert_self on public.profiles for insert with check (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy profiles_update_self on public.profiles for update using (true);
exception when duplicate_object then null; end $$;

-- Listings policies
-- Listings policies (SECURED: Mutations only via Server Side API)
do $$ begin
  create policy listings_select on public.listings for select using (
    status = 'active' or created_by = auth.uid()
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create policy listings_insert on public.listings for insert with check (false);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy listings_update_own on public.listings for update using (false);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy listings_delete_own on public.listings for delete using (false);
exception when duplicate_object then null; end $$;

-- Note: For production, replace (true) checks with auth.uid() ownership checks via Supabase Auth.
-- Storage: create bucket 'listing-images' (private) in Supabase UI.
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null, -- 'question', 'offer', 'system'
  title text,
  message text,
  data jsonb default '{}'::jsonb,
  is_read boolean default false,
  created_at timestamptz default now()
);

create index if not exists notifications_user_id_idx on public.notifications(user_id);
create index if not exists notifications_created_at_idx on public.notifications(created_at desc);

alter table public.notifications enable row level security;

do $$ begin
  create policy notifications_select_own on public.notifications for select using (user_id = auth.uid());
exception when duplicate_object then null; end $$;

-- Allow users to update their own notifications (e.g. mark as read)
do $$ begin
  create policy notifications_update_own on public.notifications for update using (user_id = auth.uid());
exception when duplicate_object then null; end $$;
