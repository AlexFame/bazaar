import { supaAdmin } from "@/lib/supabaseAdmin";
import { withRateLimit } from '@/lib/ratelimit';

// GET /api/analytics/chart?userId=xxx&days=7
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const days = parseInt(searchParams.get('days') || '7', 10);
    
    if (!userId) {
      return new Response(JSON.stringify({ error: 'Missing userId' }), { status: 400 });
    }

    const { data: listings } = await supaAdmin()
      .from('listings')
      .select('id')
      .eq('created_by', userId);

    const listingIds = listings?.map(l => l.id) || [];
    
    // Prepare the date range
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - days);
    
    // Generate dates template
    const chartDataMap = {};
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0]; // YYYY-MM-DD
      const displayDate = `${d.getDate().toString().padStart(2, '0')}.${(d.getMonth() + 1).toString().padStart(2, '0')}`;
      chartDataMap[dateStr] = {
        date: displayDate,
        fullDate: dateStr,
        views: 0,
        contacts: 0,
        impressions: 0
      };
    }

    if (listingIds.length > 0) {
      const { data: events, error } = await supaAdmin()
        .from('listing_analytics_events')
        .select('event_type, created_at')
        .in('listing_id', listingIds)
        .gte('created_at', pastDate.toISOString());

      if (error) {
        throw error;
      }

      events?.forEach(event => {
        const dateStr = event.created_at.split('T')[0];
        if (chartDataMap[dateStr]) {
          if (event.event_type === 'view') {
            chartDataMap[dateStr].views += 1;
          } else if (event.event_type === 'contact_click') {
            chartDataMap[dateStr].contacts += 1;
          } else if (event.event_type === 'impression') {
            chartDataMap[dateStr].impressions += 1;
          }
        }
      });
    }

    const result = Object.values(chartDataMap).sort((a, b) => a.fullDate.localeCompare(b.fullDate));
    
    return new Response(JSON.stringify(result), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (e) {
    console.error("GET /api/analytics/chart Error:", e);
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
}
