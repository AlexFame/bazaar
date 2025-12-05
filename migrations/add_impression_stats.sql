-- Add columns for impressions and search appearances to daily stats
ALTER TABLE listing_daily_stats 
ADD COLUMN IF NOT EXISTS impressions_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS search_appearances_count INTEGER DEFAULT 0;

-- Update the aggregation function to include new metrics
CREATE OR REPLACE FUNCTION aggregate_daily_stats(target_date DATE DEFAULT CURRENT_DATE)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO listing_daily_stats (
    listing_id, 
    date, 
    views_count, 
    contact_clicks, 
    message_clicks, 
    favorite_adds, 
    impressions_count,
    search_appearances_count,
    updated_at
  )
  SELECT 
    listing_id,
    target_date,
    COUNT(*) FILTER (WHERE event_type = 'view') as views_count,
    COUNT(*) FILTER (WHERE event_type = 'contact_click') as contact_clicks,
    COUNT(*) FILTER (WHERE event_type = 'message_click') as message_clicks,
    COUNT(*) FILTER (WHERE event_type = 'favorite_add') as favorite_adds,
    COUNT(*) FILTER (WHERE event_type = 'impression') as impressions_count,
    COUNT(*) FILTER (WHERE event_type = 'search_appearance') as search_appearances_count,
    NOW() as updated_at
  FROM listing_analytics_events
  WHERE DATE(created_at) = target_date
  GROUP BY listing_id
  ON CONFLICT (listing_id, date) 
  DO UPDATE SET
    views_count = EXCLUDED.views_count,
    contact_clicks = EXCLUDED.contact_clicks,
    message_clicks = EXCLUDED.message_clicks,
    favorite_adds = EXCLUDED.favorite_adds,
    impressions_count = EXCLUDED.impressions_count,
    search_appearances_count = EXCLUDED.search_appearances_count,
    updated_at = NOW();
END;
$$;
