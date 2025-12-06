-- Fix badges trigger logic to use valid enum values and correct parenthesis
create or replace function public.update_profile_badges(user_id uuid)
returns void
language plpgsql
security definer
as $$
declare
    new_badges text[] := '{}';
    sold_count int;
    active_count int;
    is_ver boolean;
begin
    -- 1. Check verified status
    select is_verified into is_ver from public.profiles where id = user_id;
    if is_ver then
        new_badges := array_append(new_badges, 'verified'); 
    end if;

    -- 2. Check sold count (status 'sold' or 'closed' or 'archived')
    -- Enclose ORs in parenthesis!
    select count(*) into sold_count from public.listings 
    where created_by = user_id 
    and (status = 'sold' OR status = 'closed' OR status = 'archived');
    
    if sold_count >= 3 then
        new_badges := array_append(new_badges, 'top_seller');
    end if;

    -- 3. Check active count
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
