-- Create saved_searches table
CREATE TABLE IF NOT EXISTS saved_searches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT,
  query_params JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE saved_searches ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own saved searches" 
ON saved_searches FOR SELECT 
USING (auth.uid() IN (SELECT tg_user_id FROM profiles WHERE id = user_id));

-- Note: The insert policy is tricky because auth.uid() is the telegram ID (integer) 
-- but user_id is the profile UUID. We need to ensure the inserted user_id matches the auth.uid()'s profile.
-- However, usually we insert from the client where we know the profile ID.
-- Let's simplify and trust the application logic for now, or use a subquery.

CREATE POLICY "Users can insert their own saved searches" 
ON saved_searches FOR INSERT 
WITH CHECK (
  auth.uid() IN (SELECT tg_user_id FROM profiles WHERE id = user_id)
);

CREATE POLICY "Users can delete their own saved searches" 
ON saved_searches FOR DELETE 
USING (
  auth.uid() IN (SELECT tg_user_id FROM profiles WHERE id = user_id)
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS saved_searches_user_id_idx ON saved_searches(user_id);
