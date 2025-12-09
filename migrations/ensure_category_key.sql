-- Ensure category_key exists (used in logic but potentially missing in schema)
ALTER TABLE listings 
ADD COLUMN IF NOT EXISTS category_key TEXT DEFAULT 'other';

-- Ensure index exists
CREATE INDEX IF NOT EXISTS idx_listings_category_key ON listings(category_key);
