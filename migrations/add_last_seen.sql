-- Add last_seen column to profiles for "Online Status" feature
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS last_seen TIMESTAMPTZ DEFAULT NOW();

-- Index for fast sorting/filtering by online status
CREATE INDEX IF NOT EXISTS idx_profiles_last_seen ON profiles(last_seen DESC);

-- Function to update last_seen (can be called via RPC)
CREATE OR REPLACE FUNCTION update_last_seen()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE profiles
  SET last_seen = NOW()
  WHERE id = auth.uid(); -- Updates profile linked to currently authenticated user
END;
$$;
