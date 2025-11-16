import { createClient } from '@supabase/supabase-js';

export function supaAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE;
  if (!url || !key) throw new Error("Supabase env vars missing");
  return createClient(url, key);
}
