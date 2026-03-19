import { supaAdmin } from "@/lib/supabaseAdmin";
import { supabase } from "@/lib/supabaseClient";

export async function GET(req) {
    try {
        // Authenticate the user from auth header or cookie
        // Supabase App router usually relies on the authorization header passed to supabase-js client
        // Or we can just grab the token from headers
        const token = req.headers.get("authorization")?.replace("Bearer ", "");
        
        if (!token) return new Response("Unauthorized", { status: 401 });

        const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
        if (authErr || !user) return new Response("Unauthorized", { status: 401 });

        const supa = supaAdmin();

        // Check Admin Role
        const { data: profile } = await supa.from("profiles").select("is_admin").eq("id", user.id).single();
        if (!profile?.is_admin) return new Response("Forbidden", { status: 403 });

        // Execute Business Logic securely
        const [
            { count: usersCount },
            { count: listingsCount },
            { count: offersCount }
        ] = await Promise.all([
            supa.from('profiles').select('*', { count: 'exact', head: true }),
            supa.from('listings').select('*', { count: 'exact', head: true }),
            supa.from('offers').select('*', { count: 'exact', head: true }).eq('status', 'accepted')
        ]);

        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const { data: dailyData } = await supa
            .from('listing_daily_stats')
            .select('date, views_count, contact_clicks, shares_count')
            .gte('date', thirtyDaysAgo.toISOString());

        const grouped = {};
        if (dailyData) {
            dailyData.forEach(item => {
                const d = item.date.split('T')[0];
                if (!grouped[d]) grouped[d] = { date: d, views: 0, clicks: 0, shares: 0 };
                grouped[d].views += item.views_count || 0;
                grouped[d].clicks += item.contact_clicks || 0;
                grouped[d].shares += item.shares_count || 0;
            });
        }
        const chartDataArray = Object.values(grouped).sort((a,b) => new Date(a.date) - new Date(b.date));

        const { data: topStats } = await supa
            .from('listing_daily_stats')
            .select('listing_id, views_count')
            .order('views_count', { ascending: false })
            .limit(50);
        
        let mergedListings = [];
        if (topStats) {
            const listingViews = {};
            topStats.forEach(s => {
               listingViews[s.listing_id] = (listingViews[s.listing_id] || 0) + s.views_count;
            });
            const topIds = Object.keys(listingViews).sort((a,b) => listingViews[b] - listingViews[a]).slice(0, 5);
            
            if (topIds.length > 0) {
                const { data: listings } = await supa
                    .from('listings')
                    .select('id, title, price, currency, main_image_path, created_at')
                    .in('id', topIds);
                
                mergedListings = listings.map(l => ({
                    ...l,
                    total_views: listingViews[l.id]
                })).sort((a,b) => b.total_views - a.total_views);
            }
        }

        return new Response(JSON.stringify({
            stats: { users: usersCount || 0, listings: listingsCount || 0, activeOffers: offersCount || 0 },
            chartData: chartDataArray,
            topListings: mergedListings
        }), { status: 200, headers: { 'Content-Type': 'application/json' }});
    } catch (e) {
        console.error("Admin API Error:", e);
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
}
