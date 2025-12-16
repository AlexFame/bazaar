-- Migration to improved search function with fallback to 'simple' dictionary
-- This helps with Ukrainian queries that might not be handled well by the Russian stemmer.

-- Drop the old function explicitly to allow signature change (adding filter_type)
DROP FUNCTION IF EXISTS search_listings(text, text, numeric, numeric, int, int);

CREATE OR REPLACE FUNCTION search_listings(
  search_query text,
  filter_category text DEFAULT NULL,
  min_price numeric DEFAULT NULL,
  max_price numeric DEFAULT NULL,
  limit_count int DEFAULT 20,
  offset_count int DEFAULT 0,
  filter_type text DEFAULT NULL
)
RETURNS SETOF listings 
LANGUAGE sql
STABLE
AS $$
  SELECT *
  FROM listings
  WHERE 
    status = 'active'
    AND (
      search_query IS NULL OR search_query = ''
      OR
      (
        -- Match using Russian stemming (default) OR Simple (exact word match fallback)
        fts @@ websearch_to_tsquery('russian', search_query)
        OR
        fts @@ websearch_to_tsquery('simple', search_query)
        OR
        -- Also try English for good measure
        fts @@ websearch_to_tsquery('english', search_query)
        OR
        -- Fuzzy match for typos (if supported by index)
        (length(search_query) > 3 AND title % search_query)
      )
    )
    AND (filter_category IS NULL OR filter_category = 'all' OR category_key = filter_category)
    AND (min_price IS NULL OR price >= min_price)
    AND (max_price IS NULL OR price <= max_price)
    AND (filter_type IS NULL OR filter_type = 'all' OR type = filter_type)
  ORDER BY 
    CASE WHEN search_query IS NOT NULL AND search_query != '' THEN
      ts_rank(fts, websearch_to_tsquery('russian', search_query)) +
      (CASE WHEN title % search_query THEN 0.5 ELSE 0 END)
    ELSE 0 END DESC,
    created_at DESC
  LIMIT limit_count OFFSET offset_count;
$$;
