-- CRITICAL: Change CASCADE to SET NULL to prevent accidental data deletion
-- This ensures that if a profile is deleted, listings are NOT deleted

-- Drop existing foreign key constraint
ALTER TABLE listings 
DROP CONSTRAINT IF EXISTS listings_created_by_fkey;

-- Add new constraint with SET NULL instead of CASCADE
ALTER TABLE listings 
ADD CONSTRAINT listings_created_by_fkey 
FOREIGN KEY (created_by) 
REFERENCES profiles(id) 
ON DELETE SET NULL;  -- Changed from CASCADE to SET NULL

-- This way, if a profile is deleted, the listing remains but created_by becomes NULL
-- You can later clean up orphaned listings manually if needed
