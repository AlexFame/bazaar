-- Function to get daily platform stats efficiently
create or replace function get_platform_daily_stats(days_limit int default 30)
returns table (
    date date,
    views bigint,
    clicks bigint,
    shares bigint,
    favorites bigint
)
language sql
security definer
as $$
    select 
        date_trunc('day', date)::date as date,
        sum(views_count) as views,
        sum(contact_clicks) as clicks,
        sum(shares_count) as shares,
        sum(favorites_count) as favorites
    from listing_daily_stats
    where date >= (current_date - (days_limit || ' days')::interval)
    group by 1
    order by 1 asc;
$$;

-- Function to get top performing listings
create or replace function get_top_listings(limit_count int default 5)
returns table (
    id uuid,
    title text,
    views bigint
)
language sql
security definer
as $$
    select 
        l.id,
        l.title,
        coalesce(sum(s.views_count), 0) as views
    from listings l
    left join listing_daily_stats s on l.id = s.listing_id
    group by l.id, l.title
    order by views desc
    limit limit_count;
$$;
