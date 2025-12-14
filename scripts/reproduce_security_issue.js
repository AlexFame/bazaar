
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');
require('dotenv').config({ path: '.env.local' });

// Config
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE;
const BOT_TOKEN = process.env.TG_BOT_TOKEN;

if (!SUPABASE_URL || !SERVICE_KEY || !BOT_TOKEN) {
    console.error("Missing env vars");
    process.exit(1);
}

const admin = createClient(SUPABASE_URL, SERVICE_KEY);

// Mock Init Data Generator
function createMockInitData(userObj) {
    const userStr = JSON.stringify(userObj);
    const params = new URLSearchParams();
    params.set('user', userStr);
    params.set('auth_date', Math.floor(Date.now() / 1000).toString());
    params.set('query_id', 'testing');
    
    // Sign
    const dataCheckString = Array.from(params.keys())
        .sort()
        .map(key => `${key}=${params.get(key)}`)
        .join('\n');
        
    const secret = crypto.createHmac('sha256', 'WebAppData').update(BOT_TOKEN).digest();
    const hash = crypto.createHmac('sha256', secret).update(dataCheckString).digest('hex');
    
    params.set('hash', hash);
    return params.toString();
}

async function run() {
    console.log("=== Security Reproduction Test ===");

    // 1. Create Victim Profile & Listing
    const victimTgId = 111111;
    let { data: victim } = await admin.from('profiles').select('id').eq('tg_user_id', victimTgId).single();
    
    if (!victim) {
        console.log("Creating victim profile...");
        const { data: v, error } = await admin.from('profiles').insert({
            tg_user_id: victimTgId,
            tg_username: 'victim_user',
            full_name: 'Victim User'
        }).select().single();
        if (error) throw error;
        victim = v;
    }
    console.log("Victim ID:", victim.id);

    // Create Victim Listing
    const { data: listing, error: lErr } = await admin.from('listings').insert({
        title: 'Victim Listing',
        price: 100,
        type: 'sell',
        category_key: 'electronics',
        location_text: 'Test City',
        contacts: 'Test Contact',
        created_by: victim.id, // Explicitly set owner
        description: 'Original description'
    }).select().single();
    
    if (lErr) throw lErr;
    console.log("Victim Listing ID:", listing.id);

    // 2. Create Attacker Profile
    const attackerTgId = 999999;
    let { data: attacker } = await admin.from('profiles').select('id').eq('tg_user_id', attackerTgId).single();
    
    if (!attacker) {
        console.log("Creating attacker profile...");
        const { data: a, error } = await admin.from('profiles').insert({
            tg_user_id: attackerTgId,
            tg_username: 'attacker_user',
            full_name: 'Attacker User'
        }).select().single();
         if (error) throw error;
        attacker = a;
    }
    console.log("Attacker ID:", attacker.id);

    // 3. Attempt to Update Listing via API as Attacker
    console.log("\n--- Attempting Update via API ---");
    
    // Mock initData for Attacker
    const initData = createMockInitData({
        id: attackerTgId,
        first_name: 'Attacker',
        username: 'attacker_user',
        language_code: 'en'
    });

    const payload = {
        id: listing.id,
        initData: initData,
        title: "HACKED TITLE",
        description: "Hacked via API",
        price: 0,
        images: []
    };

    // We can't fetch the local API route easily from node script without running server.
    // So we will SIMULATE the API logic here using the same check.
    // Wait, the user claimed "Any user can edit". If I replicate logic and it passes, it's the bug.
    // If it fails, then the live API is different or I am missing something.
    
    // Let's emulate the API logic EXACTLY:
    
    // API Step 1: Auth
    // (Assume Auth passed as we generated valid hash)
    
    // API Step 2: Get Profile
    const { data: profile } = await admin.from('profiles').select('id').eq('tg_user_id', attackerTgId).single();
    const userId = profile.id; // Attacker ID
    
    // API Step 3: Handle Operation
    const { data: existing } = await admin.from('listings').select('created_by').eq('id', listing.id).maybeSingle();
    
    console.log(`Checking Logic: existing.created_by (${existing.created_by}) !== userId (${userId})`);
    
    if (existing.created_by !== userId) {
        console.log("✅ API Logic would RETURN 403 Forbidden");
    } else {
        console.log("❌ API Logic would ALLOW update (VULNERABLE)");
    }
    
    // 4. Check RLS Vulnerability (Direct Update)
    // We need a client that is NOT service role, but authenticated as Attacker.
    // But since `auth.uid()` uses Supabase Auth, and Telegram users don't have it...
    // They are effectively anonymous.
    
    // Check if ANON can update
    console.log("\n--- Attempting Update via Anonymous RLS ---");
    const anonClient = createClient(SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
    
    const { error: rlsError, data: rlsData } = await anonClient
        .from('listings')
        .update({ title: 'HACKED VIA RLS' })
        .eq('id', listing.id)
        .select();
        
    if (rlsError) {
        console.log("✅ RLS Blocked Update:", rlsError.message);
    } else if (rlsData && rlsData.length > 0) {
        console.log("❌ RLS ALLOWED Update (VULNERABLE):", rlsData);
    } else {
        // If no error but no data, it means row not found (RLS hidden it) or update count 0
        // We need to check if title changed.
        const { data: check } = await admin.from('listings').select('title').eq('id', listing.id).single();
        if (check.title === 'HACKED VIA RLS') {
             console.log("❌ RLS ALLOWED Update (VULNERABLE - Silent)");
        } else {
             console.log("✅ RLS update had no effect (Safe)");
        }
    }

    // 5. Check Identity Theft Vulnerability (Profile Update)
    console.log("\n--- Attempting Identity Theft (Profile Update via RLS) ---");
    const { error: pError, data: pData } = await anonClient
        .from('profiles')
        .update({ full_name: 'HACKED NAME' })
        .eq('id', victim.id)
        .select();

    if (pError) {
        console.log("✅ Profile RLS Blocked Update:", pError.message);
    } else if (pData && pData.length > 0) {
        console.log("❌ Profile RLS ALLOWED Update (CRITICAL VULNERABILITY):", pData);
    } else {
        // Double check read
        const { data: vCheck } = await admin.from('profiles').select('full_name').eq('id', victim.id).single();
        if (vCheck.full_name === 'HACKED NAME') {
             console.log("❌ Profile RLS ALLOWED Update (Silent CRITICAL VULNERABILITY)");
        } else {
             console.log("✅ Profile RLS update had no effect (Safe)");
        }
    }

    // Cleanup
    await admin.from('listings').delete().eq('id', listing.id);
    // await admin.from('profiles').delete().eq('id', victim.id);
    // await admin.from('profiles').delete().eq('id', attacker.id);
}

run().catch(console.error);
