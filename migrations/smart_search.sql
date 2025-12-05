-- Enable pg_trgm for fuzzy search (typo tolerance)
create extension if not exists pg_trgm;

-- Add Full Text Search (FTS) column to listings
-- We combine title, description and category for better recall
alter table public.listings
add column if not exists fts tsvector 
generated always as (
  setweight(to_tsvector('russian', coalesce(title, '')), 'A') || 
  setweight(to_tsvector('russian', coalesce(description, '')), 'B') ||
  setweight(to_tsvector('english', coalesce(title, '')), 'A') || -- Also index as English for better tech terms support
  setweight(to_tsvector('english', coalesce(description, '')), 'B')
) stored;

-- Create GIN index for FTS (fast text search)
create index if not exists listings_fts_idx on public.listings using gin (fts);

-- Create GIN index for Trigram (fuzzy search on title)
create index if not exists listings_title_trgm_idx on public.listings using gin (title gin_trgm_ops);

-- Smart Search Function
create or replace function public.search_listings(
  search_query text,
  filter_category text default null,
  min_price numeric default null,
  max_price numeric default null,
  limit_count int default 20,
  offset_count int default 0
)
returns setof public.listings
language plpgsql
as $$
begin
  return query
  select *
  from public.listings
  where status = 'active'
    -- Apply Category Filter
    and (filter_category is null or filter_category = 'all' or category = filter_category)
    -- Apply Price Filter
    and (min_price is null or price >= min_price)
    and (max_price is null or price <= max_price)
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
        -- 2. Fuzzy Title match (for typos) - only if query is long enough
        (length(search_query) > 3 and title % search_query)
        or
        -- 3. Simple ILIKE fallback
        -- If query is short (<3 chars), only match prefix logic to avoid "Headphones" matching "ho"
        (length(search_query) < 3 and title ilike search_query || '%')
        or
        -- If query is longer, allow containment but maybe still prefer bounds? 
        -- Let's keep containment for longer queries but it might still be noisy. 
        -- Better: ' %query%' (start of word) or just rely on FTS.
        -- For now, let's just make the existing line restrict to > 2 chars for wildcards.
        (length(search_query) >= 3 and title ilike '%' || search_query || '%')
      )
    )
  order by
    -- Rank by relevance if searching
    case when search_query is not null and search_query != '' then
      ts_rank(fts, websearch_to_tsquery('russian', search_query)) +
      ts_rank(fts, websearch_to_tsquery('english', search_query)) +
      (case when title % search_query then 0.5 else 0 end) -- Bonus for fuzzy match
    else
      0
    end desc,
    created_at desc
  limit limit_count
  offset offset_count;
end;
$$;
