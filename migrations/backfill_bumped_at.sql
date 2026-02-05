-- Backfill bumped_at for existing listings so sorting works correctly
UPDATE public.listings SET bumped_at = created_at WHERE bumped_at IS NULL;
