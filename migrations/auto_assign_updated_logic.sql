-- Function to calculate and update badges for a user
create or replace function public.update_profile_badges(user_id uuid)
returns void
language plpgsql
security definer
as $$
declare
    new_badges text[] := '{}';
    sold_count int;
    active_count int;
begin
    -- 1. Calculate sold count (status 'closed' means sold)
    select count(*) into sold_count from public.listings 
    where created_by = user_id and (status = 'closed' OR status = 'sold');
    
    -- 2. "Verified Seller" logic: Automatic after 3 sales
    -- Since all users are Telegram-authenticated, we use sales history as trust metric.
    if sold_count >= 3 then
        new_badges := array_append(new_badges, 'verified'); 
    end if;

    -- 3. "Top Seller" logic: Higher tier, e.g., 10+ sales
    if sold_count >= 10 then
        new_badges := array_append(new_badges, 'top_seller');
    end if;

    -- 4. Check active count for "Fast Responder" proxy (optional, keeping existing logic)
    select count(*) into active_count from public.listings 
    where created_by = user_id and status = 'active';

    if active_count >= 3 then
        new_badges := array_append(new_badges, 'fast_responder');
    end if;

    -- Update profile
    update public.profiles 
    set badges = new_badges,
        -- Optionally update is_verified column to stay in sync, though badge is primary now
        is_verified = (sold_count >= 3)
    where id = user_id;
end;
$$;

-- Run update for all users immediately
do $$
declare
    r record;
begin
    for r in select id from public.profiles loop
        perform public.update_profile_badges(r.id);
    end loop;
end $$;
