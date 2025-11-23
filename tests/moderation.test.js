// Simple tests for moderation functions
// Run with: node tests/moderation.test.js

const { 
  validateTitle, 
  validateDescription, 
  validatePrice, 
  hasEmoji 
} = require('../lib/moderation.js');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✅ ${name}`);
    passed++;
  } catch (error) {
    console.error(`❌ ${name}`);
    console.error(`   ${error.message}`);
    failed++;
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

console.log('\n🧪 Running Moderation Tests...\n');

// validateTitle tests
test('validateTitle: rejects empty title', () => {
  const result = validateTitle('');
  assert(!result.valid, 'Should reject empty title');
  assert(result.error.includes('пустым'), 'Should mention empty');
});

test('validateTitle: rejects short title (< 5 chars)', () => {
  const result = validateTitle('abc');
  assert(!result.valid, 'Should reject short title');
  assert(result.error.includes('короткий'), 'Should mention too short');
});

test('validateTitle: rejects long title (> 100 chars)', () => {
  const longTitle = 'a'.repeat(101);
  const result = validateTitle(longTitle);
  assert(!result.valid, 'Should reject long title');
  assert(result.error.includes('длинный'), 'Should mention too long');
});

test('validateTitle: rejects repeated characters', () => {
  const result = validateTitle('aaaaaaaa');
  assert(!result.valid, 'Should reject repeated chars');
  assert(result.error.includes('повторяющихся'), 'Should mention repeated');
});

test('validateTitle: rejects too many numbers', () => {
  const result = validateTitle('123123123123');
  assert(!result.valid, 'Should reject too many numbers');
  assert(result.error.includes('цифр'), 'Should mention numbers');
});

test('validateTitle: accepts valid title', () => {
  const result = validateTitle('Продам iPhone 13');
  assert(result.valid, 'Should accept valid title');
});

// validateDescription tests
test('validateDescription: rejects empty description', () => {
  const result = validateDescription('');
  assert(!result.valid, 'Should reject empty description');
});

test('validateDescription: rejects short description (< 10 chars)', () => {
  const result = validateDescription('test');
  assert(!result.valid, 'Should reject short description');
  assert(result.error.includes('короткое'), 'Should mention too short');
});

test('validateDescription: accepts valid description', () => {
  const result = validateDescription('Отличное состояние, полный комплект');
  assert(result.valid, 'Should accept valid description');
});

// validatePrice tests
test('validatePrice: rejects negative price', () => {
  const result = validatePrice(-100, 'sell');
  assert(!result.valid, 'Should reject negative price');
});

test('validatePrice: rejects invalid price', () => {
  const result = validatePrice('abc', 'sell');
  assert(!result.valid, 'Should reject invalid price');
});

test('validatePrice: rejects price > 50000 for sell', () => {
  const result = validatePrice(100000, 'sell');
  assert(!result.valid, 'Should reject price > 50000');
  assert(result.error.includes('50000'), 'Should mention max price');
});

test('validatePrice: rejects price > 5000 for service', () => {
  const result = validatePrice(10000, 'service');
  assert(!result.valid, 'Should reject price > 5000 for service');
  assert(result.error.includes('5000'), 'Should mention max price');
});

test('validatePrice: accepts valid price for sell', () => {
  const result = validatePrice(500, 'sell');
  assert(result.valid, 'Should accept valid price');
});

test('validatePrice: requires price 0 for free listings', () => {
  const result = validatePrice(100, 'free');
  assert(!result.valid, 'Should reject non-zero price for free');
});

test('validatePrice: accepts price 0 for free listings', () => {
  const result = validatePrice(0, 'free');
  assert(result.valid, 'Should accept price 0 for free');
});

// hasEmoji tests
test('hasEmoji: detects emoji', () => {
  const result = hasEmoji('🔥 Hot deal 🔥');
  assert(result, 'Should detect emoji');
});

test('hasEmoji: returns false for text without emoji', () => {
  const result = hasEmoji('Regular text');
  assert(!result, 'Should not detect emoji in regular text');
});

// Summary
console.log('\n' + '='.repeat(50));
console.log(`✅ Passed: ${passed}`);
console.log(`❌ Failed: ${failed}`);
console.log(`📊 Total: ${passed + failed}`);
console.log('='.repeat(50) + '\n');

if (failed > 0) {
  process.exit(1);
}
