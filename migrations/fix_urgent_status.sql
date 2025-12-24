-- Fix 1: Update the features JSON for 'urgent_sticker' to include the key expected by the trigger
UPDATE premium_services
SET features = features || '{"urgent_badge": true}'::jsonb
WHERE service_type = 'urgent_sticker';

-- Fix 2: Force re-sync of all active listings to apply the new status
-- We trigger the 'sync_listing_premium_status' function by doing a dummy update on listing_boosts
UPDATE listing_boosts
SET is_active = true
WHERE is_active = true;

-- Optional: Manually update the specific listing if needed (just to be safe)
-- but the trigger above should handle it for all active boosts.
