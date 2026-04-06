-- Product-level analytics events for early-stage funnel tracking

CREATE TABLE IF NOT EXISTS product_analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  event_data JSONB DEFAULT '{}',
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_product_analytics_type
  ON product_analytics_events(event_type, created_at DESC);

ALTER TABLE product_analytics_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert product analytics events" ON product_analytics_events
  FOR INSERT WITH CHECK (true);

COMMENT ON TABLE product_analytics_events IS 'Product-level analytics events for funnel and retention tracking';
