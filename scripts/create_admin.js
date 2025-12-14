const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE; // Must use Service Role for admin actions

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing env vars. Ensure .env.local has NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const ADMIN_EMAIL = "admin@bazaar.com";
const ADMIN_PASSWORD = "password123";

async function createAdmin() {
  console.log(`Checking for user: ${ADMIN_EMAIL}...`);

  // 1. Create User in Auth (or update password if exists)
  // Unfortunately createClient with service role usually requires admin api
  const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
  
  let userId;

  const existingUser = users?.find(u => u.email === ADMIN_EMAIL);

  if (existingUser) {
      console.log("User exists. Updating password...");
      userId = existingUser.id;
      const { error: updateError } = await supabase.auth.admin.updateUserById(userId, { password: ADMIN_PASSWORD });
      if (updateError) {
          console.error("Error updating password:", updateError);
          return;
      }
      console.log("Password updated.");
  } else {
      console.log("Creating new user...");
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
          email: ADMIN_EMAIL,
          password: ADMIN_PASSWORD,
          email_confirm: true
      });
      if (createError) {
          console.error("Error creating user:", createError);
          return;
      }
      userId = newUser.user.id;
      console.log("User created.");
  }

  // 2. Ensure Profile exists and is_admin = true
  // Insert or Update profile
  const { error: profileError } = await supabase.from('profiles').upsert({
      id: userId,
      full_name: "Super Admin",
      is_admin: true
  });

  if (profileError) {
      console.error("Error updating profile:", profileError);
  } else {
      console.log("SUCCESS! You can now login.");
      console.log(`URL: http://localhost:3000/admin-panel`);
      console.log(`Email: ${ADMIN_EMAIL}`);
      console.log(`Password: ${ADMIN_PASSWORD}`);
  }
}

createAdmin();
