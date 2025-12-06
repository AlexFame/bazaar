-- Add badges column to profiles
alter table public.profiles 
add column if not exists badges text[] default '{}';

-- Create index for faster filtering by Badge (e.g. find all top sellers)
create index if not exists profiles_badges_idx on public.profiles using gin(badges);
