require('dotenv').config({ path: '.env.local' });
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE;
const PARSER_USER_ID = process.env.PARSER_USER_ID;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

(async () => {
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .or('tg_username.eq.iam_fvme,full_name.eq.iam_fvme')
        .single();
        
    if (error) {
        console.error("Error fetching profile:", error.message);
    } else {
        console.log("--- FOUND USER ---");
        console.log("Data:", data);
        // console.log("Name:", data.full_name);
        // console.log("Username:", data.username);
        // console.log("Phone:", data.phone);
        // console.log("Email:", data.email);
    }
})();
