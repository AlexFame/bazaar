-- 1. Add counters to listings if they don't exist
ALTER TABLE public.listings 
ADD COLUMN IF NOT EXISTS views_count bigint DEFAULT 0,
ADD COLUMN IF NOT EXISTS contacts_count bigint DEFAULT 0,
ADD COLUMN IF NOT EXISTS favorites_count bigint DEFAULT 0; -- Optional, good for caching

-- 2. Create RPC for atomic increment
CREATE OR REPLACE FUNCTION increment_listing_views(listing_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.listings
  SET views_count = views_count + 1
  WHERE id = listing_id;
END;
$$;

-- 3. Ensure Notifications table exists (Fix 404)
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null,
  title text,
  message text,
  data jsonb default '{}'::jsonb,
  is_read boolean default false,
  created_at timestamptz default now()
);

-- Indexes for notifications
CREATE INDEX IF NOT EXISTS notifications_user_id_idx ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS notifications_created_at_idx ON public.notifications(created_at desc);

-- RLS for notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY notifications_select_own ON public.notifications FOR SELECT USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY notifications_update_own ON public.notifications FOR UPDATE USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
