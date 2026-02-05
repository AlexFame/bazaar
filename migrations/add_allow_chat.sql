-- Add allow_chat column to listings table
ALTER TABLE listings 
ADD COLUMN IF NOT EXISTS allow_chat BOOLEAN DEFAULT TRUE;

-- Update RLS policies to allow update (if necessary, though usually implicit for owners)
-- No special RLS needed for just adding a column if update policy already covers all columns.
