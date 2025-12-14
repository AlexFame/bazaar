
-- Function to get analytics for a listing, with ownership check
CREATE OR REPLACE FUNCTION get_listing_analytics(target_listing_id uuid)
RETURNS TABLE (
  views_count bigint,
  contacts_count bigint,
  favorites_count bigint,
  messages_count bigint,
  daily_stats jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id uuid;
    v_listing_owner uuid;
BEGIN
  v_user_id := auth.uid();
  
  -- Check if user is logged in
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get listing owner
  SELECT created_by INTO v_listing_owner FROM listings WHERE id = target_listing_id;
  
  -- Check ownership
  IF v_listing_owner IS NULL THEN
     RAISE EXCEPTION 'Listing not found';
  END IF;
  
  IF v_listing_owner != v_user_id THEN
     RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT 
    l.views_count,
    COALESCE(SUM(s.contact_clicks), 0)::bigint as contacts_count,
    l.favorites_count,
    COALESCE(SUM(s.message_clicks), 0)::bigint as messages_count,
    COALESCE(
        jsonb_agg(
            jsonb_build_object(
                'date', s.date,
                'views_count', s.views_count,
                'contact_clicks', s.contact_clicks,
                'message_clicks', s.message_clicks,
                'favorite_adds', s.favorite_adds
            ) ORDER BY s.date ASC
        ) FILTER (WHERE s.id IS NOT NULL), 
        '[]'::jsonb
    ) as daily_stats
  FROM listings l
  LEFT JOIN listing_daily_stats s ON s.listing_id = l.id AND s.date >= (CURRENT_DATE - INTERVAL '30 days')
  WHERE l.id = target_listing_id
  GROUP BY l.id, l.views_count, l.favorites_count;
END;
$$;
