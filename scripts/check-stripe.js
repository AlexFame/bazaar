require('dotenv').config({ path: '.env.local' });
const Stripe = require('stripe');

const secretKey = process.env.STRIPE_SECRET_KEY;
const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY; // Optional check

if (!secretKey) {
  console.error('❌ Error: STRIPE_SECRET_KEY is missing in .env.local');
  process.exit(1);
}

const stripe = new Stripe(secretKey);

async function checkStripe() {
  console.log('🔄 Checking Stripe connection...');
  try {
    // Try to list 1 customer just to ping the API
    const customers = await stripe.customers.list({ limit: 1 });
    console.log('✅ Success! Your Stripe Secret Key is working.');
    console.log(`   Connected to account in mode: ${customers.data.length >= 0 ? 'Live/Test' : 'Unknown'}`);
    
    if (publishableKey) {
        if (publishableKey.startsWith('pk_')) {
            console.log('✅ Publishable Key found (starts with pk_)');
        } else {
             console.log('⚠️  Warning: Publishable Key does not start with pk_');
        }
    } else {
        console.log('ℹ️  Note: NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is not set (frontend might need it later).');
    }

  } catch (error) {
    console.error('❌ Authentication Failed:', error.message);
    console.log('   Please check if you copied the full key (sk_test_...) correctly.');
  }
}

checkStripe();
