-- Real-time Analytics Trigger
-- enable immediate updates to daily stats when an event occurs

-- 1. Create Trigger Function
CREATE OR REPLACE FUNCTION update_stats_live()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert or Update (Increment) daily stats
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
  VALUES (
    NEW.listing_id,
    CURRENT_DATE,
    CASE WHEN NEW.event_type = 'view' THEN 1 ELSE 0 END,
    CASE WHEN NEW.event_type = 'contact_click' THEN 1 ELSE 0 END,
    CASE WHEN NEW.event_type = 'message_click' THEN 1 ELSE 0 END,
    CASE WHEN NEW.event_type = 'favorite_add' THEN 1 ELSE 0 END,
    CASE WHEN NEW.event_type = 'impression' THEN 1 ELSE 0 END,
    CASE WHEN NEW.event_type = 'search_appearance' THEN 1 ELSE 0 END,
    NOW()
  )
  ON CONFLICT (listing_id, date)
  DO UPDATE SET
    views_count = listing_daily_stats.views_count + EXCLUDED.views_count,
    contact_clicks = listing_daily_stats.contact_clicks + EXCLUDED.contact_clicks,
    message_clicks = listing_daily_stats.message_clicks + EXCLUDED.message_clicks,
    favorite_adds = listing_daily_stats.favorite_adds + EXCLUDED.favorite_adds,
    impressions_count = listing_daily_stats.impressions_count + EXCLUDED.impressions_count,
    search_appearances_count = listing_daily_stats.search_appearances_count + EXCLUDED.search_appearances_count,
    updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Create Trigger
DROP TRIGGER IF EXISTS on_analytics_insert ON listing_analytics_events;
CREATE TRIGGER on_analytics_insert
AFTER INSERT ON listing_analytics_events
FOR EACH ROW
EXECUTE FUNCTION update_stats_live();
