-- Migration: Add status to listings
-- Description: Adds status column to listings table to support drafts

-- Add status column with default 'active'
ALTER TABLE listings ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';

-- Update existing listings to 'active' if null
UPDATE listings SET status = 'active' WHERE status IS NULL;

-- Create index on status for faster filtering
CREATE INDEX IF NOT EXISTS idx_listings_status ON listings(status);
