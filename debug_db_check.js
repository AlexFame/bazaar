const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE // Use Admin key
);

async function check() {
  console.log("Checking DB integrity...");
  
  const { count: msgCount, error: msgError } = await supabase
    .from('messages')
    .select('*', { count: 'exact', head: true });
    
  const { count: convCount, error: convError } = await supabase
    .from('conversations')
    .select('*', { count: 'exact', head: true });

  console.log("Total Messages:", msgCount);
  console.log("Total Conversations:", convCount);
  
  if (msgError) console.error("Msg Error:", msgError);
  if (convError) console.error("Conv Error:", convError);
  
  // Check for specific user
  const userId = '28db66d4-2534-40e0-b25d-1a568d71a4c2';
  const { data: userConvs } = await supabase
     .from('conversations')
     .select('id')
     .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`);
     
  console.log(`Conversations for user ${userId}:`, userConvs?.length);
}

check();
