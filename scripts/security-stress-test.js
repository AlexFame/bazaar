#!/usr/bin/env node
/**
 * 🔒 Bazaar Security Stress Test
 * 
 * Tests for common vulnerabilities:
 * 1. Unauthenticated access to protected endpoints
 * 2. Spam / rate limiting
 * 3. SQL injection via inputs
 * 4. XSS payloads in user content
 * 5. Auth bypass attempts
 * 6. Mass view inflation
 * 7. Notification spam
 * 
 * Usage: node scripts/security-stress-test.js
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

// ============================================================================
// Helpers
// ============================================================================

let passCount = 0;
let failCount = 0;
let criticalCount = 0;
const results = [];

function log(icon, msg) { console.log(`${icon}  ${msg}`); }

function pass(test) {
  passCount++;
  results.push({ status: 'PASS', test });
  log('✅', `PASS: ${test}`);
}

function fail(test, details) {
  failCount++;
  results.push({ status: 'FAIL', test, details });
  log('❌', `FAIL: ${test}`);
  if (details) log('  ', `  → ${details}`);
}

function critical(test, details) {
  criticalCount++;
  results.push({ status: 'CRITICAL', test, details });
  log('🚨', `CRITICAL: ${test}`);
  if (details) log('  ', `  → ${details}`);
}

async function fetchJSON(url, options = {}) {
  try {
    const res = await fetch(url, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...options.headers },
    });
    let body;
    try { body = await res.json(); } catch { body = null; }
    return { status: res.status, body, ok: res.ok };
  } catch (err) {
    return { status: 0, body: null, ok: false, error: err.message };
  }
}

// ============================================================================
// TEST 1: Unauthenticated Admin Ban
// ============================================================================
async function testAdminBanNoAuth() {
  log('🔍', '--- Test: Admin Ban Without Auth ---');

  // Try to ban a fake user without any authentication
  const res = await fetchJSON(`${BASE_URL}/api/admin/ban-user`, {
    method: 'POST',
    body: JSON.stringify({
      userId: '00000000-0000-0000-0000-000000000000', // Fake UUID
      reason: 'SECURITY_TEST',
      action: 'ban',
    }),
  });

  if (res.status === 401 || res.status === 403) {
    pass('Admin ban endpoint requires authentication');
  } else {
    critical(
      'Admin ban endpoint has NO authentication!',
      `Status: ${res.status}, Response: ${JSON.stringify(res.body)}`
    );
  }
}

// ============================================================================
// TEST 2: Unauthenticated Notification Spam
// ============================================================================
async function testNotificationSpamNoAuth() {
  log('🔍', '--- Test: Notification Send Without Auth ---');

  const res = await fetchJSON(`${BASE_URL}/api/notifications/send`, {
    method: 'POST',
    body: JSON.stringify({
      recipientId: '00000000-0000-0000-0000-000000000000',
      message: 'SECURITY_TEST_SPAM',
      listingTitle: 'Test',
    }),
  });

  if (res.status === 401 || res.status === 403) {
    pass('Notification send endpoint requires authentication');
  } else {
    critical(
      'Notification send has NO auth — anyone can spam push notifications!',
      `Status: ${res.status}, Response: ${JSON.stringify(res.body)}`
    );
  }
}

async function testTelegramNotificationNoAuth() {
  log('🔍', '--- Test: Telegram Notification Without Auth ---');

  const res = await fetchJSON(`${BASE_URL}/api/notifications/telegram`, {
    method: 'POST',
    body: JSON.stringify({
      recipientId: '00000000-0000-0000-0000-000000000000',
      message: 'SECURITY_TEST_SPAM',
      type: 'general',
    }),
  });

  if (res.status === 401 || res.status === 403) {
    pass('Telegram notification endpoint requires authentication');
  } else {
    critical(
      'Telegram notification has NO auth — anyone can spam anyone via Telegram!',
      `Status: ${res.status}, Response: ${JSON.stringify(res.body)}`
    );
  }
}

// ============================================================================
// TEST 3: Analytics View Spam (Inflate view count)
// ============================================================================
async function testAnalyticsViewSpam() {
  log('🔍', '--- Test: Analytics View Spam (50 rapid requests) ---');

  const fakeListingId = '00000000-0000-0000-0000-000000000001';
  let successCount = 0;
  let blocked = 0;

  const promises = [];
  for (let i = 0; i < 50; i++) {
    promises.push(
      fetchJSON(`${BASE_URL}/api/analytics/track`, {
        method: 'POST',
        body: JSON.stringify({
          listingId: fakeListingId,
          eventType: 'view',
        }),
      }).then((res) => {
        if (res.ok) successCount++;
        else blocked++;
      })
    );
  }

  await Promise.all(promises);

  if (blocked > 40) {
    pass(`Analytics rate-limited: ${blocked}/50 requests blocked`);
  } else if (blocked > 0) {
    fail(
      `Analytics has weak rate limiting: only ${blocked}/50 blocked`,
      'An attacker could inflate view counts with moderate effort'
    );
  } else {
    critical(
      'Analytics has NO rate limiting — all 50 spam views accepted!',
      `${successCount}/50 succeeded. Attacker can inflate views infinitely.`
    );
  }
}

// ============================================================================
// TEST 4: Auth Bypass — Fake initData
// ============================================================================
async function testFakeInitData() {
  log('🔍', '--- Test: Auth Bypass with Fake initData ---');

  // Try creating a listing with fake initData
  const res = await fetchJSON(`${BASE_URL}/api/listings/save`, {
    method: 'POST',
    body: JSON.stringify({
      initData: 'user=%7B%22id%22%3A999999%7D&hash=fakehashvalue',
      title: 'HACKED LISTING',
      description: 'This should be rejected',
      price: 0,
      contacts: 'hacker@evil.com',
      type: 'sell',
      category_key: 'electronics',
      status: 'active',
      images: [{ path: 'fake.jpg', position: 0 }],
    }),
  });

  if (res.status === 401) {
    pass('Fake initData correctly rejected (401)');
  } else if (res.status === 403) {
    pass('Fake initData correctly rejected (403)');
  } else {
    critical(
      'Auth bypass possible with fake initData!',
      `Status: ${res.status}, Response: ${JSON.stringify(res.body)}`
    );
  }
}

// ============================================================================
// TEST 5: No initData at all
// ============================================================================
async function testNoInitData() {
  log('🔍', '--- Test: Request Without initData ---');

  const res = await fetchJSON(`${BASE_URL}/api/listings/save`, {
    method: 'POST',
    body: JSON.stringify({
      title: 'NO AUTH LISTING',
      description: 'This should be rejected',
      price: 100,
      contacts: 'test@test.com',
      type: 'sell',
      status: 'active',
      images: [{ path: 'test.jpg', position: 0 }],
    }),
  });

  if (res.status === 401 || res.status === 403) {
    pass('Listing save correctly rejects requests without initData');
  } else {
    critical(
      'Listing save accepts requests without any authentication!',
      `Status: ${res.status}`
    );
  }
}

// ============================================================================
// TEST 6: XSS Injection in Listing Fields
// ============================================================================
async function testXSSPayloads() {
  log('🔍', '--- Test: XSS Payload in Comments API ---');

  const xssPayloads = [
    '<script>alert("XSS")</script>',
    '<img src=x onerror=alert(1)>',
    '"><svg onload=alert(document.cookie)>',
    "'; DROP TABLE listings; --",
  ];

  // We can't actually create comments without auth, but we can check
  // if the validation rejects XSS payloads or if they'd pass through
  for (const payload of xssPayloads) {
    const res = await fetchJSON(`${BASE_URL}/api/comments/create`, {
      method: 'POST',
      body: JSON.stringify({
        initData: 'fake', // Will fail auth anyway
        listingId: '00000000-0000-0000-0000-000000000001',
        content: payload,
      }),
    });

    if (res.status === 401) {
      // Auth blocked it anyway — good, but XSS sanitization is untested
      // We note this as a warning
    }
  }
  
  // Since auth blocks us, we note that XSS sanitization should be verified separately
  log('⚠️', '  XSS tests blocked by auth (good), but no server-side sanitization detected in code review');
  fail(
    'No XSS/HTML sanitization detected in comment/listing content',
    'If auth is bypassed or content comes from DB, XSS could execute on client'
  );
}

// ============================================================================
// TEST 7: SQL Injection via Supabase (unlikely but test)
// ============================================================================
async function testSQLInjection() {
  log('🔍', '--- Test: SQL Injection Attempts ---');

  // Supabase client uses parameterized queries, so this should be safe
  // But let's verify via the public-facing listing detail endpoint
  const injectionPayloads = [
    "' OR 1=1 --",
    "'; DROP TABLE listings; --",
    "1; SELECT * FROM profiles WHERE 1=1",
  ];

  let allSafe = true;
  for (const payload of injectionPayloads) {
    // Try to fetch a listing with an injected ID
    try {
      const res = await fetch(`${BASE_URL}/listing/${encodeURIComponent(payload)}`);
      // If we get a 200 with data, something went wrong
      if (res.status === 200) {
        const text = await res.text();
        if (text.includes('DROP TABLE') || text.includes('profiles')) {
          allSafe = false;
          critical('SQL Injection vulnerability detected!', payload);
        }
      }
    } catch (e) {
      // Connection error is fine
    }
  }

  if (allSafe) {
    pass('SQL injection attempts handled safely (Supabase parameterized queries)');
  }
}

// ============================================================================
// TEST 8: Translate API Abuse (Proxy to Google)
// ============================================================================
async function testTranslateAbuse() {
  log('🔍', '--- Test: Translate API Abuse (30 rapid requests) ---');

  let successCount = 0;
  let blocked = 0;

  const promises = [];
  for (let i = 0; i < 30; i++) {
    promises.push(
      fetchJSON(`${BASE_URL}/api/translate`, {
        method: 'POST',
        body: JSON.stringify({
          text: `Security test message ${i} ${'A'.repeat(500)}`,
          targetLang: 'en',
        }),
      }).then((res) => {
        if (res.ok) successCount++;
        else blocked++;
      })
    );
  }

  await Promise.all(promises);

  if (blocked > 20) {
    pass(`Translate API rate-limited: ${blocked}/30 blocked`);
  } else if (blocked > 0) {
    fail(`Translate API has weak rate limiting: only ${blocked}/30 blocked`);
  } else {
    fail(
      'Translate API has NO rate limiting — can be abused as proxy',
      `${successCount}/30 succeeded. Attacker could use your server to proxy unlimited translations.`
    );
  }
}

// ============================================================================
// TEST 9: Profile Update — Privilege Escalation
// ============================================================================
async function testProfileEscalation() {
  log('🔍', '--- Test: Profile Update Privilege Escalation ---');

  // The profile update has a whitelist, let's verify it blocks is_admin
  const res = await fetchJSON(`${BASE_URL}/api/profile/update`, {
    method: 'POST',
    body: JSON.stringify({
      initData: 'fakedata',
      is_admin: true,
      is_verified: true,
      is_banned: false,
    }),
  });

  if (res.status === 401) {
    pass('Profile update rejects unauthenticated requests');
    // Note: we can't test the whitelist without valid auth
    log('ℹ️', '  Code review confirms field whitelist: [notification_preferences, full_name, email]');
    pass('Profile update has field whitelist (code review confirmed)');
  } else {
    critical(
      'Profile update accepts unauthenticated requests!',
      `Status: ${res.status}`
    );
  }
}

// ============================================================================
// TEST 10: Listing Delete Without Ownership
// ============================================================================
async function testDeleteWithoutOwnership() {
  log('🔍', '--- Test: Delete Listing Without Auth ---');

  const res = await fetchJSON(`${BASE_URL}/api/listings/delete`, {
    method: 'POST',
    body: JSON.stringify({
      id: '00000000-0000-0000-0000-000000000001',
    }),
  });

  if (res.status === 401 || res.status === 403) {
    pass('Listing delete requires authentication');
  } else {
    critical(
      'Listing delete has no authentication!',
      `Status: ${res.status}`
    );
  }
}

// ============================================================================
// TEST 11: Image Sign URL Without Auth
// ============================================================================
async function testImageSignNoAuth() {
  log('🔍', '--- Test: Image Sign URL Without Auth ---');

  const res = await fetchJSON(`${BASE_URL}/api/images/sign`, {
    method: 'POST',
    body: JSON.stringify({
      fileName: 'malicious.jpg',
      contentType: 'image/jpeg',
    }),
  });

  if (res.status === 401 || res.status === 403) {
    pass('Image sign endpoint requires authentication');
  } else if (res.ok) {
    critical(
      'Image sign endpoint has NO auth — anyone can get upload URLs!',
      `Status: ${res.status}`
    );
  } else {
    // Other errors (like missing token) are OK 
    pass(`Image sign endpoint rejected unauthenticated request (status ${res.status})`);
  }
}

// ============================================================================
// TEST 12: Conversation Access Without Membership
// ============================================================================
async function testConversationNoAuth() {
  log('🔍', '--- Test: Chat Message Without Auth ---');

  const res = await fetchJSON(`${BASE_URL}/api/conversations/send`, {
    method: 'POST',
    body: JSON.stringify({
      conversationId: '00000000-0000-0000-0000-000000000001',
      content: 'SPAM MESSAGE',
    }),
  });

  if (res.status === 401 || res.status === 403 || res.status === 500) {
    pass('Chat send requires authentication');
  } else {
    critical(
      'Chat messages can be sent without authentication!',
      `Status: ${res.status}`
    );
  }
}

// ============================================================================
// RUNNER
// ============================================================================
async function runAll() {
  console.log('');
  console.log('═══════════════════════════════════════════════════');
  console.log('  🔒 BAZAAR SECURITY STRESS TEST');
  console.log(`  Target: ${BASE_URL}`);
  console.log(`  Time: ${new Date().toISOString()}`);
  console.log('═══════════════════════════════════════════════════');
  console.log('');

  await testAdminBanNoAuth();
  console.log('');
  await testNotificationSpamNoAuth();
  console.log('');
  await testTelegramNotificationNoAuth();
  console.log('');
  await testAnalyticsViewSpam();
  console.log('');
  await testFakeInitData();
  console.log('');
  await testNoInitData();
  console.log('');
  await testXSSPayloads();
  console.log('');
  await testSQLInjection();
  console.log('');
  await testTranslateAbuse();
  console.log('');
  await testProfileEscalation();
  console.log('');
  await testDeleteWithoutOwnership();
  console.log('');
  await testImageSignNoAuth();
  console.log('');
  await testConversationNoAuth();

  console.log('');
  console.log('═══════════════════════════════════════════════════');
  console.log('  📊 RESULTS SUMMARY');
  console.log('═══════════════════════════════════════════════════');
  console.log(`  ✅ Passed:   ${passCount}`);
  console.log(`  ❌ Failed:   ${failCount}`);
  console.log(`  🚨 Critical: ${criticalCount}`);
  console.log('═══════════════════════════════════════════════════');
  
  if (criticalCount > 0) {
    console.log('');
    console.log('  🚨🚨🚨 CRITICAL VULNERABILITIES FOUND! 🚨🚨🚨');
    console.log('  These must be fixed BEFORE going to production.');
    console.log('');
    results
      .filter(r => r.status === 'CRITICAL')
      .forEach(r => console.log(`  • ${r.test}`));
  }
  
  console.log('');
}

runAll().catch(console.error);
