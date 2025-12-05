// Example: Protected endpoint with rate limiting
import { withRateLimit } from '@/lib/ratelimit';
import { supaAdmin } from '@/lib/supabaseAdmin';

async function createListingHandler(req) {
  try {
    const body = await req.json();
    const supa = supaAdmin();
    
    // Your listing creation logic here
    const { data, error } = await supa
      .from('listings')
      .insert(body)
      .select()
      .single();
    
    if (error) throw error;
    
    return new Response(JSON.stringify({ success: true, data }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// Export with rate limiting: 5 listings per minute per IP
export const POST = withRateLimit(createListingHandler, {
  limit: 5,
  window: '1 m',
});
