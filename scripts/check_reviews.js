const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkReviews() {
    // 1. Get the user's profile (Assuming we can find them by some recent activity or just list all with reviews)
    // Let's list all reviews first to see what exists
    const { data: reviews, error } = await supabase.from('reviews').select('*');
    if (error) {
        console.error("Error fetching reviews:", error);
        return;
    }
    console.log("Total reviews:", reviews.length);
    console.log("Reviews:", reviews);

    // Get profiles to map names
    const { data: profiles } = await supabase.from('profiles').select('id, full_name, tg_username, tg_user_id');
    
    reviews.forEach(r => {
        const target = profiles.find(p => p.id === r.target_id);
        const reviewer = profiles.find(p => p.id === r.reviewer_id);
        console.log(`Review ${r.id}: By ${reviewer?.full_name} (${reviewer?.tg_username}) -> To ${target?.full_name} (${target?.tg_username}) [Rating: ${r.rating}]`);
    });
}

checkReviews();
