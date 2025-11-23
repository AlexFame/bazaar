#!/usr/bin/env node

/**
 * Environment Variables Validation Script
 * Run before deployment to ensure all required env vars are set
 * Usage: node scripts/check-env.js
 */

const requiredEnvVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
];

const optionalEnvVars = [
  'SUPABASE_SERVICE_ROLE_KEY', // For admin operations
  'NEXT_PUBLIC_APP_URL', // For production URL
];

console.log('🔍 Checking environment variables...\n');

let hasErrors = false;
let hasWarnings = false;

// Check required variables
console.log('📋 Required variables:');
requiredEnvVars.forEach(varName => {
  const value = process.env[varName];
  if (!value) {
    console.error(`❌ ${varName} is NOT set`);
    hasErrors = true;
  } else {
    // Show first 20 chars for security
    const preview = value.substring(0, 20) + '...';
    console.log(`✅ ${varName} = ${preview}`);
  }
});

// Check optional variables
console.log('\n📋 Optional variables:');
optionalEnvVars.forEach(varName => {
  const value = process.env[varName];
  if (!value) {
    console.warn(`⚠️  ${varName} is not set (optional)`);
    hasWarnings = true;
  } else {
    const preview = value.substring(0, 20) + '...';
    console.log(`✅ ${varName} = ${preview}`);
  }
});

// Check for .env file
const fs = require('fs');
const path = require('path');
const envPath = path.join(process.cwd(), '.env.local');

console.log('\n📁 Checking .env.local file:');
if (fs.existsSync(envPath)) {
  console.log('✅ .env.local exists');
} else {
  console.warn('⚠️  .env.local not found');
  hasWarnings = true;
}

// Check .gitignore
const gitignorePath = path.join(process.cwd(), '.gitignore');
if (fs.existsSync(gitignorePath)) {
  const gitignore = fs.readFileSync(gitignorePath, 'utf-8');
  if (gitignore.includes('.env')) {
    console.log('✅ .env files are in .gitignore');
  } else {
    console.error('❌ .env files are NOT in .gitignore - SECURITY RISK!');
    hasErrors = true;
  }
}

// Summary
console.log('\n' + '='.repeat(50));
if (hasErrors) {
  console.error('❌ Environment check FAILED');
  console.error('Fix the errors above before deploying!');
  process.exit(1);
} else if (hasWarnings) {
  console.warn('⚠️  Environment check passed with warnings');
  console.warn('Consider setting optional variables for production');
  process.exit(0);
} else {
  console.log('✅ Environment check PASSED');
  console.log('All required variables are set!');
  process.exit(0);
}
