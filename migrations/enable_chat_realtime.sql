-- Enable Realtime for chat tables
begin;
  -- Add tables to the publication
  alter publication supabase_realtime add table messages;
  alter publication supabase_realtime add table conversations;
commit;
