-- Add optimization columns for premium sorting/display
ALTER TABLE listings 
ADD COLUMN IF NOT EXISTS priority_score INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_urgent BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS promotion_expires_at TIMESTAMPTZ;

-- Add index for fast sorting
CREATE INDEX IF NOT EXISTS listings_priority_idx ON listings (priority_score DESC, created_at DESC);
