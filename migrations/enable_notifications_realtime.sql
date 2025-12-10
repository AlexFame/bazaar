-- Enable Realtime for notifications table
begin;
  -- Check if table is already in publication to avoid errors, 
  -- but straightforward add is usually fine in Supabase migrations as they run once.
  -- However, to be safe:
  alter publication supabase_realtime add table notifications;
commit;
