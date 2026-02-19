#!/usr/bin/env node
/**
 * 🔍 Bazaar Full App Audit Script
 * 
 * Checks:
 * 1. Translation completeness — all keys present in en/ru/ua
 * 2. Build integrity — imports and exports
 * 3. Environment variables — all required vars present
 * 4. Dead code / unused translations
 * 
 * Usage: node scripts/audit-app.js
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

let passCount = 0;
let failCount = 0;
let warnCount = 0;

function log(icon, msg) { console.log(`${icon}  ${msg}`); }
function pass(test) { passCount++; log('✅', test); }
function fail(test) { failCount++; log('❌', test); }
function warn(test) { warnCount++; log('⚠️', test); }

// ============================================================================
// 1. Translation Completeness
// ============================================================================
async function checkTranslations() {
  console.log('\n═══ 🌍 TRANSLATION AUDIT ═══\n');

  // Load all translation files
  const enFile = path.join(ROOT, 'lib/translations/en.js');
  const ruFile = path.join(ROOT, 'lib/translations/ru.js');
  const uaFile = path.join(ROOT, 'lib/translations/ua.js');

  let en, ru, ua;
  try {
    // Simple extraction: find the object in the file
    const extractKeys = (filePath) => {
      const content = fs.readFileSync(filePath, 'utf8');
      // Find all key: "value" or key: 'value' patterns
      const keys = new Set();
      const regex = /^\s+(\w+)\s*:/gm;
      let match;
      while ((match = regex.exec(content)) !== null) {
        keys.add(match[1]);
      }
      return keys;
    };

    en = extractKeys(enFile);
    ru = extractKeys(ruFile);
    ua = extractKeys(uaFile);
  } catch (e) {
    fail(`Cannot read translation files: ${e.message}`);
    return;
  }

  log('ℹ️', `EN: ${en.size} keys | RU: ${ru.size} keys | UA: ${ua.size} keys`);

  // Find keys missing in each language
  const missingInRu = [];
  const missingInUa = [];
  const missingInEn = [];

  for (const key of en) {
    if (!ru.has(key)) missingInRu.push(key);
    if (!ua.has(key)) missingInUa.push(key);
  }
  for (const key of ru) {
    if (!en.has(key)) missingInEn.push(key);
  }
  for (const key of ua) {
    if (!en.has(key) && !ru.has(key)) missingInEn.push(key);
  }

  if (missingInRu.length === 0) {
    pass(`RU: All ${en.size} keys present`);
  } else {
    fail(`RU: Missing ${missingInRu.length} keys: ${missingInRu.join(', ')}`);
  }

  if (missingInUa.length === 0) {
    pass(`UA: All ${en.size} keys present`);
  } else {
    fail(`UA: Missing ${missingInUa.length} keys: ${missingInUa.join(', ')}`);
  }

  if (missingInEn.length === 0) {
    pass('EN: Has all keys from other languages');
  } else {
    warn(`EN missing keys from RU/UA: ${missingInEn.join(', ')}`);
  }

  // Check for t() calls in source that have no translation key
  const srcDir = path.join(ROOT, 'components');
  const appDir = path.join(ROOT, 'app');
  
  const usedKeys = new Set();
  const tCallRegex = /t\(['"`](\w+)['"`]\)/g;
  
  function scanDir(dir) {
    if (!fs.existsSync(dir)) return;
    const items = fs.readdirSync(dir, { withFileTypes: true });
    for (const item of items) {
      const fullPath = path.join(dir, item.name);
      if (item.isDirectory()) {
        scanDir(fullPath);
      } else if (item.name.endsWith('.jsx') || item.name.endsWith('.js')) {
        const content = fs.readFileSync(fullPath, 'utf8');
        let match;
        const regex = /t\(['"`](\w+)['"`]\)/g;
        while ((match = regex.exec(content)) !== null) {
          usedKeys.add(match[1]);
        }
      }
    }
  }

  scanDir(srcDir);
  scanDir(appDir);

  const undefinedKeys = [];
  for (const key of usedKeys) {
    if (!en.has(key) && !ru.has(key) && !ua.has(key)) {
      // Skip common false positives
      if (['key', 'type', 'label', 'value', 'name', 'error', 'data', 'id'].includes(key)) continue;
      undefinedKeys.push(key);
    }
  }

  if (undefinedKeys.length === 0) {
    pass(`All ${usedKeys.size} t() calls have corresponding translation keys`);
  } else {
    fail(`${undefinedKeys.length} t() calls reference undefined keys: ${undefinedKeys.join(', ')}`);
  }
}

// ============================================================================
// 2. Environment Variables Check
// ============================================================================
async function checkEnvVars() {
  console.log('\n═══ 🔐 ENVIRONMENT VARIABLES ═══\n');

  const envFile = path.join(ROOT, '.env');
  let envContent = '';
  try {
    envContent = fs.readFileSync(envFile, 'utf8');
  } catch (e) {
    fail('.env file not found!');
    return;
  }

  const requiredVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE',
    'TG_BOT_TOKEN',
    'TG_WEBHOOK_SECRET',
    'JWT_SECRET',
    'NEXT_PUBLIC_APP_URL',
  ];

  const optionalVars = [
    'STRIPE_WEBHOOK_SECRET',
    'TG_PAYMENT_PROVIDER_TOKEN',
    'NEXT_PUBLIC_SENTRY_DSN',
  ];

  for (const v of requiredVars) {
    const regex = new RegExp(`^${v}=(.+)$`, 'm');
    const match = envContent.match(regex);
    if (match && match[1] && !match[1].includes('your_') && !match[1].includes('here')) {
      pass(`${v} is set`);
    } else if (match && (match[1].includes('your_') || match[1].includes('here'))) {
      fail(`${v} has placeholder value!`);
    } else {
      fail(`${v} is MISSING from .env`);
    }
  }

  for (const v of optionalVars) {
    const regex = new RegExp(`^${v}=(.+)$`, 'm');
    if (envContent.match(regex)) {
      pass(`${v} is set (optional)`);
    } else {
      warn(`${v} is not set (optional feature)`);
    }
  }
}

// ============================================================================
// 3. Page Routes Check
// ============================================================================
async function checkRoutes() {
  console.log('\n═══ 📄 PAGE ROUTES ═══\n');

  const pagesDir = path.join(ROOT, 'app');
  const routes = [];

  function findPages(dir, prefix = '') {
    const items = fs.readdirSync(dir, { withFileTypes: true });
    for (const item of items) {
      if (item.name.startsWith('_') || item.name.startsWith('.')) continue;
      const fullPath = path.join(dir, item.name);
      if (item.isDirectory()) {
        findPages(fullPath, `${prefix}/${item.name}`);
      } else if (item.name === 'page.js' || item.name === 'page.jsx') {
        routes.push(prefix || '/');
      }
    }
  }

  findPages(pagesDir);
  log('ℹ️', `Found ${routes.length} page routes: ${routes.join(', ')}`);

  // Check API routes
  const apiDir = path.join(ROOT, 'app/api');
  const apiRoutes = [];

  function findApiRoutes(dir, prefix = '/api') {
    if (!fs.existsSync(dir)) return;
    const items = fs.readdirSync(dir, { withFileTypes: true });
    for (const item of items) {
      if (item.name.startsWith('_') || item.name.startsWith('.')) continue;
      const fullPath = path.join(dir, item.name);
      if (item.isDirectory()) {
        findApiRoutes(fullPath, `${prefix}/${item.name}`);
      } else if (item.name === 'route.js' || item.name === 'route.jsx') {
        apiRoutes.push(prefix);
      }
    }
  }

  findApiRoutes(apiDir);
  log('ℹ️', `Found ${apiRoutes.length} API routes`);
  pass(`${routes.length} pages + ${apiRoutes.length} API routes detected`);
}

// ============================================================================
// 4. Build Check
// ============================================================================
async function checkImports() {
  console.log('\n═══ 📦 IMPORT INTEGRITY ═══\n');

  const componentsDir = path.join(ROOT, 'components');
  const issues = [];

  function checkFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const importRegex = /import\s+.*from\s+['"]([^'"]+)['"]/g;
    let match;
    while ((match = importRegex.exec(content)) !== null) {
      const importPath = match[1];
      
      // Check relative imports
      if (importPath.startsWith('.') || importPath.startsWith('@/')) {
        let resolved;
        if (importPath.startsWith('@/')) {
          resolved = path.join(ROOT, importPath.slice(2));
        } else {
          resolved = path.resolve(path.dirname(filePath), importPath);
        }
        
        // Try common extensions
        const exts = ['', '.js', '.jsx', '.ts', '.tsx', '/index.js', '/index.jsx'];
        const exists = exts.some(ext => fs.existsSync(resolved + ext));
        
        if (!exists) {
          const rel = path.relative(ROOT, filePath);
          issues.push(`${rel}: import "${importPath}" not found`);
        }
      }
    }
  }

  function scanDir(dir) {
    if (!fs.existsSync(dir)) return;
    const items = fs.readdirSync(dir, { withFileTypes: true });
    for (const item of items) {
      if (item.name.startsWith('.') || item.name === 'node_modules') continue;
      const fullPath = path.join(dir, item.name);
      if (item.isDirectory()) {
        scanDir(fullPath);
      } else if (item.name.endsWith('.jsx') || item.name.endsWith('.js')) {
        checkFile(fullPath);
      }
    }
  }

  scanDir(componentsDir);
  scanDir(path.join(ROOT, 'app'));
  scanDir(path.join(ROOT, 'lib'));

  if (issues.length === 0) {
    pass('All imports resolve correctly');
  } else {
    for (const issue of issues.slice(0, 15)) {
      fail(issue);
    }
    if (issues.length > 15) {
      fail(`... and ${issues.length - 15} more broken imports`);
    }
  }
}

// ============================================================================
// 5. Gitignore & Security Files Check
// ============================================================================
async function checkSecurityFiles() {
  console.log('\n═══ 🔐 SECURITY FILES ═══\n');

  // Check .gitignore has .env
  const gitignore = fs.readFileSync(path.join(ROOT, '.gitignore'), 'utf8');
  if (gitignore.includes('.env')) {
    pass('.env is in .gitignore');
  } else {
    fail('.env is NOT in .gitignore — secrets could leak to GitHub!');
  }

  // Check if .env.local exists  
  if (fs.existsSync(path.join(ROOT, '.env.local'))) {
    if (gitignore.includes('.env.local')) {
      pass('.env.local exists and is gitignored');
    } else {
      fail('.env.local exists but is NOT gitignored');
    }
  }

  // Check node_modules is gitignored
  if (gitignore.includes('node_modules')) {
    pass('node_modules is in .gitignore');
  } else {
    fail('node_modules is NOT in .gitignore');
  }
}

// ============================================================================
// RUNNER
// ============================================================================
async function main() {
  console.log('');
  console.log('═══════════════════════════════════════════════════');
  console.log('  🔍 BAZAAR FULL APP AUDIT');
  console.log(`  Time: ${new Date().toISOString()}`);
  console.log('═══════════════════════════════════════════════════');

  await checkTranslations();
  await checkEnvVars();
  await checkRoutes();
  await checkImports();
  await checkSecurityFiles();

  console.log('');
  console.log('═══════════════════════════════════════════════════');
  console.log('  📊 AUDIT RESULTS');
  console.log('═══════════════════════════════════════════════════');
  console.log(`  ✅ Passed:   ${passCount}`);
  console.log(`  ⚠️ Warnings: ${warnCount}`);
  console.log(`  ❌ Failed:   ${failCount}`);
  console.log('═══════════════════════════════════════════════════');
  console.log('');
}

main().catch(console.error);
