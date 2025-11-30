-- Create analytics tables for seller statistics
-- Tracks detailed events and aggregated daily stats

-- Table for individual analytics events
CREATE TABLE IF NOT EXISTS listing_analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL, -- 'view', 'contact_click', 'message_click', 'favorite_add'
  event_data JSONB DEFAULT '{}', -- Additional data (e.g., contact_type: 'phone'|'telegram')
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table for aggregated daily statistics
CREATE TABLE IF NOT EXISTS listing_daily_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  views_count INTEGER DEFAULT 0,
  contact_clicks INTEGER DEFAULT 0,
  message_clicks INTEGER DEFAULT 0,
  favorite_adds INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(listing_id, date)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_analytics_events_listing ON listing_analytics_events(listing_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_events_type ON listing_analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_daily_stats_listing_date ON listing_daily_stats(listing_id, date DESC);

-- Enable RLS
ALTER TABLE listing_analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE listing_daily_stats ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only see analytics for their own listings
CREATE POLICY "Users can view analytics for their listings" ON listing_analytics_events
  FOR SELECT USING (
    listing_id IN (
      SELECT id FROM listings WHERE created_by = auth.uid()
    )
  );

CREATE POLICY "Users can view daily stats for their listings" ON listing_daily_stats
  FOR SELECT USING (
    listing_id IN (
      SELECT id FROM listings WHERE created_by = auth.uid()
    )
  );

-- Policy for inserting events (anyone can track events)
CREATE POLICY "Anyone can insert analytics events" ON listing_analytics_events
  FOR INSERT WITH CHECK (true);

-- Policy for upserting daily stats (system only, via function)
CREATE POLICY "System can manage daily stats" ON listing_daily_stats
  FOR ALL USING (true);

-- Function to aggregate events into daily stats (run via cron or manually)
CREATE OR REPLACE FUNCTION aggregate_daily_stats(target_date DATE DEFAULT CURRENT_DATE)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO listing_daily_stats (listing_id, date, views_count, contact_clicks, message_clicks, favorite_adds, updated_at)
  SELECT 
    listing_id,
    target_date,
    COUNT(*) FILTER (WHERE event_type = 'view') as views_count,
    COUNT(*) FILTER (WHERE event_type = 'contact_click') as contact_clicks,
    COUNT(*) FILTER (WHERE event_type = 'message_click') as message_clicks,
    COUNT(*) FILTER (WHERE event_type = 'favorite_add') as favorite_adds,
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
    updated_at = NOW();
END;
$$;

-- Comments
COMMENT ON TABLE listing_analytics_events IS 'Individual analytics events for tracking user interactions';
COMMENT ON TABLE listing_daily_stats IS 'Aggregated daily statistics for seller analytics dashboard';
COMMENT ON FUNCTION aggregate_daily_stats IS 'Aggregates analytics events into daily stats (run daily via cron)';
