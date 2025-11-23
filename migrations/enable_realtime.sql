-- Enable Realtime for messages and conversations tables
-- This is required for the client to receive 'postgres_changes' events

begin;
  -- Check if publication exists (it usually does in Supabase)
  -- If not, create it (unlikely needed, but safe)
  -- create publication supabase_realtime; 
  
  -- Add tables to publication
  alter publication supabase_realtime add table messages;
  alter publication supabase_realtime add table conversations;
commit;
