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
    is_ver boolean;
begin
    -- 1. Check verified status
    select is_verified into is_ver from public.profiles where id = user_id;
    if is_ver then
        new_badges := array_append(new_badges, 'verified'); -- Maps to Trusted/Verified
    end if;

    -- 2. Check sold count
    select count(*) into sold_count from public.listings 
    where created_by = user_id and status = 'back' OR status = 'closed'; -- 'closed' is 'sold'
    
    if sold_count >= 3 then
        new_badges := array_append(new_badges, 'top_seller');
    end if;

    -- 3. Check active count
    select count(*) into active_count from public.listings 
    where created_by = user_id and status = 'active';

    if active_count >= 3 then
        new_badges := array_append(new_badges, 'fast_responder'); -- Using 'Active' as proxy for 'Fast' for now
    end if;

    -- Update profile
    update public.profiles 
    set badges = new_badges 
    where id = user_id;
end;
$$;

-- Trigger to update badges when listings change
create or replace function public.trigger_update_badges()
returns trigger
language plpgsql
as $$
begin
    if (TG_OP = 'DELETE') then
        perform public.update_profile_badges(OLD.created_by);
    else
        perform public.update_profile_badges(NEW.created_by);
    end if;
    return null;
end;
$$;

drop trigger if exists on_listing_change_badges on public.listings;
create trigger on_listing_change_badges
after insert or update or delete on public.listings
for each row execute function public.trigger_update_badges();

-- Initial run to seed existing users
do $$
declare
    r record;
begin
    for r in select id from public.profiles loop
        perform public.update_profile_badges(r.id);
    end loop;
end $$;
