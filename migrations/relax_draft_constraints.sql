-- Relax constraints to allow incomplete drafts

-- 1. Relax Title Constraint
ALTER TABLE public.listings DROP CONSTRAINT IF EXISTS listings_title_check;
ALTER TABLE public.listings ADD CONSTRAINT listings_title_check 
  CHECK (status = 'draft' OR (length(title) >= 3 AND length(title) <= 120));

-- 2. Relax Contacts Constraint
-- First, make column nullable (it was NOT NULL)
ALTER TABLE public.listings ALTER COLUMN contacts DROP NOT NULL;
-- Then add check constraint to enforce it for active listings
ALTER TABLE public.listings ADD CONSTRAINT listings_contacts_check
  CHECK (status = 'draft' OR contacts IS NOT NULL);
