-- ============================================
-- MIGRATION 1: Add Geolocation Support
-- ============================================

-- Add geolocation columns to listings table
ALTER TABLE listings 
ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8);

-- Enable PostGIS extension if not already enabled
CREATE EXTENSION IF NOT EXISTS earthdistance CASCADE;

-- Add spatial index for fast distance queries
CREATE INDEX IF NOT EXISTS listings_location_idx 
ON listings (latitude, longitude) 
WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- ============================================
-- MIGRATION 2: Add Favorites Feature
-- ============================================

-- Create favorites table
CREATE TABLE IF NOT EXISTS public.favorites (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  listing_id uuid not null references public.listings(id) on delete cascade,
  created_at timestamptz default now(),
  unique(profile_id, listing_id)
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS favorites_profile_id_idx on public.favorites (profile_id);
CREATE INDEX IF NOT EXISTS favorites_listing_id_idx on public.favorites (listing_id);

-- Enable RLS
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

-- Favorites policies
DO $$ BEGIN
  CREATE POLICY favorites_read_own ON public.favorites FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY favorites_insert_own ON public.favorites FOR INSERT WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY favorites_delete_own ON public.favorites FOR DELETE USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';
