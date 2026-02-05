-- Enable extensions for geo-search
create extension if not exists cube;
create extension if not exists earthdistance;

-- Create index for fast geo-queries
create index if not exists listings_geo_idx on public.listings using gist (ll_to_earth(latitude, longitude));

-- 1. Helper Function: Get IDs of listings within radius
create or replace function public.get_listings_within_radius(
  lat float, 
  lon float, 
  radius_km float
)
returns table (id uuid)
language sql
as $$
  select id from public.listings
  where status = 'active'
    and latitude is not null 
    and longitude is not null
    and earth_box(ll_to_earth(lat, lon), radius_km * 1000) @> ll_to_earth(latitude, longitude)
    and earth_distance(ll_to_earth(lat, lon), ll_to_earth(latitude, longitude)) < (radius_km * 1000);
$$;

-- 2. New Helper: Get IDs sorted by distance (with search filter)
-- Used when user is searching AND we know their location, to show nearest results first.
create or replace function public.get_search_listings_sorted_by_distance(
  lat float, 
  lon float,
  search_query text,
  max_limit int default 100
)
returns table (id uuid)
language plpgsql
as $$
begin
  return query
  select listings.id from public.listings
  where status = 'active'
    and latitude is not null 
    and longitude is not null
    -- Apply Search Logic (Same as main search)
    and (
      search_query is null or search_query = ''
      or
      (
        fts @@ websearch_to_tsquery('russian', search_query)
        or
        fts @@ websearch_to_tsquery('english', search_query)
        or
        (length(search_query) > 3 and title % search_query)
        or
        (length(search_query) < 3 and title ilike search_query || '%')
        or
        (length(search_query) >= 3 and title ilike '%' || search_query || '%')
      )
    )
  order by 
    -- Primary Sort: Distance
    earth_distance(ll_to_earth(lat, lon), ll_to_earth(latitude, longitude)) asc
  limit max_limit;
end;
$$;


-- 3. Updated General Search Function (Backward Compatible + Location)
DROP FUNCTION IF EXISTS public.search_listings(text, text, numeric, numeric, int, int);

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
    -- Apply Location Filter (if params provided)
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
    -- Apply Search Logic
    and (
      search_query is null or search_query = ''
      or
      (
        -- 1. Full Text Search match
        fts @@ websearch_to_tsquery('russian', search_query)
        or
        fts @@ websearch_to_tsquery('english', search_query)
        or
        -- 2. Fuzzy Title match (for typos)
        (length(search_query) > 3 and title % search_query)
        or
        -- 3. Simple ILIKE fallback
        (length(search_query) < 3 and title ilike search_query || '%')
        or
        -- 4. ILIKE for mid-length queries
        (length(search_query) >= 3 and title ilike '%' || search_query || '%')
      )
    )
  order by
    -- 1. Premium Priority
    priority_score desc,
    
    -- 2. Distance (Now applies if lat/lon provided even without radius!)
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
