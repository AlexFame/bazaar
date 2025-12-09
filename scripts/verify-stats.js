const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

// Load env
const localEnvPath = path.resolve(process.cwd(), '.env.local');
const envPath = path.resolve(process.cwd(), '.env');

let envConfig = {};
if (fs.existsSync(localEnvPath)) {
    console.log('Loading .env.local');
    envConfig = dotenv.parse(fs.readFileSync(localEnvPath));
} else if (fs.existsSync(envPath)) {
    console.log('Loading .env');
    envConfig = dotenv.parse(fs.readFileSync(envPath));
} else {
    console.error('No .env file found');
}

// Merge with process.env to allow system envs to override
const combinedEnv = { ...envConfig, ...process.env };

const supabaseUrl = combinedEnv.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = combinedEnv.SUPABASE_SERVICE_ROLE_KEY || combinedEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const isServiceRole = !!combinedEnv.SUPABASE_SERVICE_ROLE_KEY;

console.log(`Using Service Role Key: ${isServiceRole}`);
if (supabaseKey) console.log(`Key length: ${supabaseKey.length}, Starts with: ${supabaseKey.substring(0, 5)}...`);

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials in env files.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyStats() {
    console.log('--- Verifying Stats Pipeline ---');

    // 1. Get a distinct listing ID
    let listingId;
    const { data: listings, error: lError } = await supabase.from('listings').select('id').limit(1);
    
    if (lError) {
        console.error('Listing fetch failed (RLS?):', lError.message);
        if (isServiceRole) {
             console.error('Even Service Role failed? Check env var name.');
        }
        // Fallback: Use a known dummy or random UUID to test DB connection at least
        // But FK constraint will fail insert.
        // We really need a real listing.
        // If we are Anon, we can only see 'active' listings.
    } else if (listings && listings.length > 0) {
        listingId = listings[0].id;
        console.log(`Found Listing ID: ${listingId}`);
    } else {
        console.log('No listings returned (Empty DB or RLS hidden).');
    }

    if (!listingId) {
        console.log('Skipping insert test due to no listing ID.');
        return;
    }

    // 2. Track an impression
    console.log('Inserting test impression event...');
    const { error: insertError } = await supabase.from('listing_analytics_events').insert({
        listing_id: listingId,
        event_type: 'impression',
        event_data: { source: 'test_script' },
        user_agent: 'verification_script'
    });

    if (insertError) {
        console.error('Failed to insert event:', insertError);
        return;
    }
    console.log('Event inserted.');

    // 3. Run aggregation manually
    console.log('Running aggregation function...');
    const { error: rpcError } = await supabase.rpc('aggregate_daily_stats');
    if (rpcError) {
        console.error('Failed to run aggregation:', rpcError);
        console.log('NOTE: If function is restricted to service_role, this is expected if using anon key.');
        return;
    }
    console.log('Aggregation complete.');

    // 4. Check stats
    console.log('Reading daily stats...');
    // Stats also RLS protected.
    const { data: stats, error: sError } = await supabase
        .from('listing_daily_stats')
        .select('impressions_count')
        .eq('listing_id', listingId)
        .eq('date', new Date().toISOString().split('T')[0])
        .maybeSingle();

    if (sError) {
        console.error('Failed to read stats:', sError);
        return;
    }

    console.log('Stats Check Result:', stats);
    if (stats && stats.impressions_count > 0) {
        console.log('SUCCESS: Impressions are being counted.');
    } else {
        console.error('FAILURE: Stats record not found or count is 0.');
    }
}

verifyStats();
