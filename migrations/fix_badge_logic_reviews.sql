-- Fix badges logic to prevent fake sales abuse.
-- 'top_seller' now relies on REVIEWS (Rating >= 4), not self-reported sales.

create or replace function public.update_profile_badges(user_id uuid)
returns void
language plpgsql
security definer
as $$
declare
    new_badges text[] := '{}';
    review_count int;
    active_count int;
    is_ver boolean;
begin
    -- 1. Keep 'verified' if manually verified (or rely on existing is_verified flag)
    select is_verified into is_ver from public.profiles where id = user_id;
    if is_ver then
        new_badges := array_append(new_badges, 'verified'); 
    end if;

    -- 2. "Top Seller" now requires 5+ POSITIVE REVIEWS (Rating >= 4)
    select count(*) into review_count from public.reviews 
    where target_id = user_id and rating >= 4;
    
    if review_count >= 5 then
        new_badges := array_append(new_badges, 'top_seller');
    end if;

    -- 3. "Fast Responder" (Active listings proxy)
    select count(*) into active_count from public.listings 
    where created_by = user_id and status = 'active';

    if active_count >= 3 then
        new_badges := array_append(new_badges, 'fast_responder'); 
    end if;

    -- Update profile
    update public.profiles 
    set badges = new_badges 
    where id = user_id;
end;
$$;

-- Trigger a re-calculation for all users to revoke invalid badges immediately
do $$
declare
    r record;
begin
    for r in select id from public.profiles loop
        perform public.update_profile_badges(r.id);
    end loop;
end $$;
