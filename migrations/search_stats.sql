-- Create table for search statistics
create table if not exists search_stats (
  id uuid default uuid_generate_v4() primary key,
  query text not null,
  count int default 1,
  last_searched_at timestamptz default now()
);

-- Index for fast lookup
create index if not exists idx_search_stats_query on search_stats(query);
create index if not exists idx_search_stats_count on search_stats(count desc);

-- RLS
alter table search_stats enable row level security;

-- Allow anyone to read stats (for autocomplete)
create policy "Anyone can read search stats"
  on search_stats for select
  using (true);

-- Allow anyone to insert/update stats (via server function usually, but for now client-side is easier for MVP)
-- Ideally this should be a stored procedure to increment count
create policy "Anyone can insert search stats"
  on search_stats for insert
  with check (true);

create policy "Anyone can update search stats"
  on search_stats for update
  using (true);

-- Function to increment search count safely
create or replace function increment_search_stat(search_query text)
returns void as $$
begin
  insert into search_stats (query, count, last_searched_at)
  values (lower(trim(search_query)), 1, now())
  on conflict (id) do nothing; -- This is tricky because query is not unique constraint yet.
  
  -- Better approach:
  -- We want unique queries.
end;
$$ language plpgsql;

-- Let's make query unique to handle upsert properly
alter table search_stats add constraint search_stats_query_key unique (query);

-- Re-create function
create or replace function increment_search_stat(search_query text)
returns void as $$
begin
  insert into search_stats (query, count, last_searched_at)
  values (lower(trim(search_query)), 1, now())
  on conflict (query) 
  do update set 
    count = search_stats.count + 1,
    last_searched_at = now();
end;
$$ language plpgsql security definer;
