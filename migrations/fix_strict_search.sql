-- Fix search logic for precision
-- This script replaces the previous search_listings function to prevent
-- 'ма' matching substring 'таргетированная реклама' and improves text matching.

DROP FUNCTION IF EXISTS public.search_listings(text, text, numeric, numeric, int, int);
DROP FUNCTION IF EXISTS public.search_listings(text, text, numeric, numeric, int, int, float, float, float);

create or replace function public.search_listings(
  search_query text,
  filter_category text default null,
  min_price numeric default null,
  max_price numeric default null,
  limit_count int default 20,
  offset_count int default 0,
  user_lat float default null,
  user_lon float default null,
  radius_km float default null
)
returns setof public.listings
language plpgsql
SET search_path = public
as $$
begin
  return query
  select *
  from public.listings
  where status = 'active'
    -- Apply Category Filter
    and (filter_category is null or filter_category = 'all' or category_key = filter_category)
    -- Apply Price Filter
    and (min_price is null or price >= min_price)
    and (max_price is null or price <= max_price)
    -- Apply Location Filter
    and (
      user_lat is null or user_lon is null or radius_km is null
      or 
      (
        latitude is not null and longitude is not null
        and 
        earth_box(ll_to_earth(user_lat, user_lon), radius_km * 1000) @> ll_to_earth(latitude, longitude)
        and 
        earth_distance(ll_to_earth(user_lat, user_lon), ll_to_earth(latitude, longitude)) < (radius_km * 1000)
      )
    )
    -- Apply Strict Search Logic
    and (
      search_query is null or search_query = ''
      or
      (
        -- 1. Full Text Search match (exact word matching + stemming)
        fts @@ websearch_to_tsquery('russian', search_query)
        or
        fts @@ websearch_to_tsquery('english', search_query)
        or
        -- 2. Word boundary ILIKE logic for title AND description (Fixes "ма" matching "реклама")
        (title ilike search_query || '%')
        or 
        (title ilike '% ' || search_query || '%')
        or
        (description ilike search_query || '%')
        or 
        (description ilike '% ' || search_query || '%')
        or
        -- 3. Fuzzy Title match (for typos) only if > 3 chars
        (length(search_query) > 3 and title % search_query)
      )
    )
  order by
    -- 1. Premium Priority
    priority_score desc,
    
    -- 2. Distance
    case when user_lat is not null then
       earth_distance(ll_to_earth(user_lat, user_lon), ll_to_earth(latitude, longitude))
    else 
       0 
    end asc,

    -- 3. Search Relevance
    case when search_query is not null and search_query != '' then
      ts_rank(fts, websearch_to_tsquery('russian', search_query)) +
      (case when title % search_query then 0.5 else 0 end)
    else
      0
    end desc,
    
    -- 4. Created Date
    created_at desc
  limit limit_count
  offset offset_count;
end;
$$;
