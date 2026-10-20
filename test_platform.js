/**
 * A&A Cafe Games — Master Upgrade Verification & Test Suite
 * Validates:
 * 1. JavaScript syntax and parse integrity of index.html
 * 2. Exactly 9-Game Inventory (Reflex Rush, Pattern Lock, Where Is Ball, Cup Tower, Catch Beans, Color Shift, Precision Pour, Rhythm Relay, Pair Hunt)
 * 3. Complete retirement of Hot/Cold and Quiz
 * 4. Anti-Cheat Security & Session Tampering Signature Verification
 * 5. Unified Adaptive Difficulty Engine (No customer difficulty selection)
 * 6. Vehicle Movement & SafetySensor complete excision
 * 7. Saudi Mobile Number Format Validation (Strict: No OTP, No paid providers)
 * 8. Three-Heart HUD & Lifecycle Management
 * 9. Social Link Integration & Safe Instagram Extra-Heart Claim Logic
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const htmlPath = path.join(__dirname, 'index.html');
const html = fs.readFileSync(htmlPath, 'utf8');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✓ PASS: ${message}`);
  } else {
    failedTests++;
    console.error(`  ✗ FAIL: ${message}`);
  }
}

console.log('========================================================');
console.log('  the A&A Cafe Games — Master Automated Test Suite     ');
console.log('========================================================\n');

// 1. Syntax & Extraction Check
console.log('--- Suite 1: HTML & Embedded JavaScript Integrity ---');
assert(html.includes('<!DOCTYPE html>'), 'Valid HTML5 doctype declaration');
assert(html.includes('ردة الفعل السريعة'), 'Reflex Rush Arabic title present in DOM/script');
assert(html.includes('قفل النمط'), 'Pattern Lock title present');
assert(html.includes('أين الحبة؟'), 'Where Is the Ball? title present');
assert(html.includes('برج الكوبايات'), 'Cup Tower title present');
assert(html.includes('اصطياد الحبوب'), 'Catch the Beans (5th game) title present');
assert(html.includes('تحوّل الألوان'), 'Color Shift (New game 1) title present');
assert(html.includes('صبّة الدقة'), 'Precision Pour (New game 2) title present');
assert(html.includes('إيقاع القهوة'), 'Rhythm Relay (New game 3) title present');
assert(html.includes('صيد الأزواج'), 'Pair Hunt (New game 4) title present');

// Extract the main <script> tag content
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/);
assert(scriptMatch && scriptMatch[1], 'Extracted main inline script successfully');
const scriptCode = scriptMatch ? scriptMatch[1] : '';

// Syntax validation via Node VM Script
let syntaxOk = false;
try {
  new vm.Script(scriptCode, { filename: 'index.html.inline.js' });
  syntaxOk = true;
} catch (e) {
  console.error('Syntax error details:', e.message);
}
assert(syntaxOk, 'Main JavaScript script parses cleanly without syntax errors');

// Mock Sandbox for unit testing internal modules
const mockSandbox = {
  window: {},
  document: {
    querySelector: () => null,
    querySelectorAll: () => [],
    addEventListener: () => {}
  },
  navigator: { vibrate: () => true },
  localStorage: { getItem: () => null, setItem: () => null },
  location: { hash: '' },
  performance: { now: () => Date.now() },
  console: console,
  Math: Math,
  Date: Date
};
mockSandbox.window = mockSandbox;
vm.createContext(mockSandbox);

// 2. Exactly 9-Game Inventory Verification
console.log('\n--- Suite 2: 9-Game Inventory & Replacement Verification ---');
const gamesDefMatch = scriptCode.match(/const GAMES\s*=\s*\[([\s\S]*?)\];\s*\/\*\s*============\s*التدفق/);
assert(gamesDefMatch, 'Found GAMES array in script');

if (gamesDefMatch) {
  // Extract and evaluate GAMES array in VM
  const harnessGames = `
    const GAMES = [${gamesDefMatch[1]}];
    globalThis.__gamesList = GAMES.map(g => ({ id: g.id, name: g.name, emoji: g.emoji, weight: g.weight }));
  `;
  vm.runInContext(harnessGames, mockSandbox);
  const games = mockSandbox.__gamesList;
  const gameIds = games.map(g => g.id);

  assert(gameIds.length === 10, `Expected exactly 10 games, found ${gameIds.length}: [${gameIds.join(', ')}]`);
  assert(gameIds.includes('reflex'), '1. Reflex Rush (reflex) is active');
  assert(gameIds.includes('pattern'), '2. Pattern Lock (pattern) is active');
  assert(gameIds.includes('shuffle'), '3. Where Is the Ball (shuffle) is active');
  assert(gameIds.includes('stack'), '4. Cup Tower (stack) is active');
  assert(gameIds.includes('beans'), '5. Catch the Beans (beans) is active');
  assert(gameIds.includes('colorshift'), '6. Color Shift (colorshift) is active');
  assert(gameIds.includes('pour'), '7. Precision Pour (pour) is active');
  assert(gameIds.includes('rhythm'), '8. Rhythm Relay (rhythm) is active');
  assert(gameIds.includes('pairhunt'), '9. Pair Hunt (pairhunt) is active');
  assert(gameIds.includes('basketball'), '10. Basketball (basketball) is active');

  assert(!gameIds.includes('sort'), 'Hot or Cold (sort) is retired');
  assert(!gameIds.includes('quiz'), 'Coffee Quiz (quiz) is retired');
  assert(!gameIds.includes('bubbles'), 'Legacy Bubbles is not active');
  assert(!gameIds.includes('memory'), 'Legacy Memory is not active');
  assert(!gameIds.includes('simon'), 'Legacy Simon is not active');
}

// 3. Anti-Cheat Security & Signature Validation
console.log('\n--- Suite 3: Anti-Cheat Security & Tampering Resistance ---');
const cfgMatch = scriptCode.match(/var CFG\s*=\s*\{[\s\S]*?\};/);
assert(cfgMatch, 'CFG object found in script');

const antiCheatHarness = `
${cfgMatch[0]}
${scriptCode.match(/function hash\(s\)\{[\s\S]*?return \(h >>> 0\);\s*\}/)[0]}
${scriptCode.match(/function signSession\(s\)\{[\s\S]*?return acc;\s*\}/)[0]}
globalThis.CFG = CFG;
globalThis.hash = hash;
globalThis.signSession = signSession;
`;
vm.runInContext(antiCheatHarness, mockSandbox);
const { CFG, hash, signSession } = mockSandbox;

assert(typeof hash === 'function', 'Cryptographic hash function is defined');
assert(typeof signSession === 'function', 'signSession anti-tamper function is defined');

const validSession = {
  phone: '+966501234567',
  order: 'AA-4821',
  best: 2450,
  startedAt: 1729000000000,
  completedAt: 1729000060000
};

const sig1 = signSession(validSession);
assert(typeof sig1 === 'number' && sig1 > 0, `Signature generated successfully (${sig1})`);

// Test resistance against score tampering
const tamperedScoreSession = { ...validSession, best: 9999 };
assert(sig1 !== signSession(tamperedScoreSession), 'Score tampering invalidates session signature');

// Test resistance against phone identity tampering
const tamperedPhoneSession = { ...validSession, phone: '+966509999999' };
assert(sig1 !== signSession(tamperedPhoneSession), 'Phone identity tampering invalidates signature');

// Test resistance against timestamp tampering
const tamperedTimeSession = { ...validSession, startedAt: 1729000001000 };
assert(sig1 !== signSession(tamperedTimeSession), 'Timestamp tampering invalidates signature');

// 4. Unified Adaptive Difficulty Engine Verification
console.log('\n--- Suite 4: Unified Adaptive Difficulty Engine ---');
const diffEngineMatch = scriptCode.match(/const DifficultyEngine\s*=\s*\{[\s\S]*?\n\};/);
assert(diffEngineMatch, 'DifficultyEngine module exists in codebase');

vm.runInContext(diffEngineMatch[0] + '; globalThis.DifficultyEngine = DifficultyEngine;', mockSandbox);
const { DifficultyEngine } = mockSandbox;

assert(typeof DifficultyEngine.getNormalized === 'function', 'DifficultyEngine.getNormalized function defined');
assert(typeof DifficultyEngine.getScoreMultiplier === 'function', 'DifficultyEngine.getScoreMultiplier function defined');

// Verify initial onboarding difficulty starts at 0
const startRun = { clock: 0, combo: 0, mistakeCount: 0 };
const midRun = { clock: 30000, combo: 4, mistakeCount: 0 };
const endRun = { clock: 60000, combo: 6, mistakeCount: 0 };
const mistakeRun = { clock: 30000, combo: 0, mistakeCount: 3 };

const dStart = DifficultyEngine.getNormalized(startRun);
const dMid = DifficultyEngine.getNormalized(midRun);
const dEnd = DifficultyEngine.getNormalized(endRun);
const dMistake = DifficultyEngine.getNormalized(mistakeRun);

assert(dStart === 0, `Initial difficulty is welcoming (0.0): got ${dStart}`);
assert(dMid > dStart && dMid < 1.0, `Mid-game difficulty smoothly escalates: got ${dMid.toFixed(3)}`);
assert(dEnd === 1.0, `Peak difficulty hits validated ceiling (1.0): got ${dEnd}`);
assert(dMistake < dMid, `Mistakes provide stabilization buffer without instant reset: ${dMistake.toFixed(3)} < ${dMid.toFixed(3)}`);

// Strict customer difficulty control removal check:
assert(!html.includes('data-diff="easy"'), 'Easy difficulty button removed from DOM');
assert(!html.includes('data-diff="medium"'), 'Medium difficulty button removed from DOM');
assert(!html.includes('data-diff="hard"'), 'Hard difficulty button removed from DOM');
assert(!scriptCode.includes('difficultyMultipliers:'), 'difficultyMultipliers configuration removed');

// 5. Vehicle Movement Detection Excision Verification
console.log('\n--- Suite 5: Vehicle Movement Feature Excision ---');
assert(!scriptCode.includes('const SafetySensor'), 'SafetySensor module completely removed from codebase');
assert(!html.includes('id="drivingLock"'), 'drivingLock modal removed from DOM');
assert(!html.includes('id="homeSensorStatus"'), 'homeSensorStatus indicator removed from DOM');
assert(!html.includes('id="gameSensorStatus"'), 'gameSensorStatus indicator removed from DOM');
assert(!html.includes('id="safe"'), 'Vehicle stationary checkbox removed from registration');
assert(!scriptCode.includes('SafetySensor.isMoving'), 'Game loop does not check vehicle movement sensor');

// 6. Saudi Mobile Phone Validation (Format Only, No OTP, No Paid Provider)
console.log('\n--- Suite 6: Saudi Mobile Number Format Validation ---');
const phoneModuleMatch = scriptCode.match(/const SaudiPhone\s*=\s*\{[\s\S]*?\n\};/);
assert(phoneModuleMatch, 'SaudiPhone module exists in codebase');

vm.runInContext(phoneModuleMatch[0] + '; globalThis.SaudiPhone = SaudiPhone;', mockSandbox);
const { SaudiPhone } = mockSandbox;

// Test valid formats and canonical normalization
const v1 = SaudiPhone.validate('0501234567');
assert(v1.valid && v1.canonical === '+966501234567', 'Format 05XXXXXXXX normalized to +9665XXXXXXXX');

const v2 = SaudiPhone.validate('501234567');
assert(v2.valid && v2.canonical === '+966501234567', 'Format 5XXXXXXXX normalized to +9665XXXXXXXX');

const v3 = SaudiPhone.validate('+966501234567');
assert(v3.valid && v3.canonical === '+966501234567', 'Format +9665XXXXXXXX preserved as canonical');

const v4 = SaudiPhone.validate('966501234567');
assert(v4.valid && v4.canonical === '+966501234567', 'Format 9665XXXXXXXX normalized to +9665XXXXXXXX');

const v5 = SaudiPhone.validate('050 123 4567');
assert(v5.valid && v5.canonical === '+966501234567', 'Handles harmless spaces gracefully');

const v6 = SaudiPhone.validate('050-123-4567');
assert(v6.valid && v6.canonical === '+966501234567', 'Handles harmless dashes gracefully');

const v7 = SaudiPhone.validate('(050) 123.4567');
assert(v7.valid && v7.canonical === '+966501234567', 'Handles parentheses and dots gracefully');

const v8 = SaudiPhone.validate('٠٥٠١٢٣٤٥٦٧');
assert(v8.valid && v8.canonical === '+966501234567', 'Handles Arabic-Indic digits gracefully');

// Test privacy masking
assert(v1.masked === '+966 50 *** 4567', `Phone masked for privacy: got ${v1.masked}`);

// Test rejection of invalid formats
assert(!SaudiPhone.validate('011234567').valid, 'Rejects landline numbers (011...)');
assert(!SaudiPhone.validate('05012345').valid, 'Rejects short numbers (< 10 digits)');
assert(!SaudiPhone.validate('050123456789').valid, 'Rejects long numbers (> 10 digits)');
assert(!SaudiPhone.validate('0401234567').valid, 'Rejects non-Saudi mobile prefix (04...)');
assert(!SaudiPhone.validate('+971501234567').valid, 'Rejects non-Saudi international country codes');
assert(!SaudiPhone.validate('abcdefghij').valid, 'Rejects non-numeric alphabetic strings');
assert(!SaudiPhone.validate('').valid, 'Rejects empty input');

// Strict assertion: No OTP code, no SMS send, no paid providers
assert(!scriptCode.includes('sendOtp') && !scriptCode.includes('verifyOtp'), 'Strictly no OTP endpoints or delivery logic');
assert(!html.includes('id="otpInput"'), 'Strictly no OTP verification screen in DOM');

// 7. Three-Heart Lifecycle System
console.log('\n--- Suite 7: Three-Heart System ---');
assert(html.includes('id="gHearts"'), 'Hearts display (#gHearts) present in HUD');
assert(scriptCode.includes('r.hearts = Math.max(0, r.hearts - 1)'), 'Heart deduction clamps safely at 0');
assert(scriptCode.includes('if(r.hearts <= 0)'), 'Zero hearts triggers game over');

// 8. Social Links & Safe Instagram Extra-Heart Claim Logic
console.log('\n--- Suite 8: Social Links & Instagram Integration ---');
assert(CFG.social && CFG.social.instagram === 'https://www.instagram.com/theaa.cafe', 'Official Instagram URL is accurate');
assert(CFG.social && CFG.social.tiktok === 'https://www.tiktok.com/@theaa.cafe', 'Official TikTok URL is accurate');

const instaLinkCount = (html.match(/href="https:\/\/www\.instagram\.com\/theaa\.cafe"[^>]*rel="noopener noreferrer"/g) || []).length;
assert(instaLinkCount >= 2, `Social links have safe noopener noreferrer tags (count: ${instaLinkCount})`);

assert(scriptCode.includes('if(S.extraHeartClaimed)'), 'Extra heart checks if already claimed');
// 9. Reward Economy & 7% Discount Policy (Midpoint Rule)
console.log('\n--- Suite 9: Reward Economy & 7% Discount Policy ---');
assert(CFG.cycleTarget === 10000, `Reward cycle target is 10,000 points: got ${CFG.cycleTarget}`);
assert(Array.isArray(CFG.tiers) && CFG.tiers.length === 3, 'CFG.tiers defines exactly 3 milestone tiers');
assert(CFG.tiers[0] >= 5000, `First milestone is at or after 50% midpoint (>= 5000): got ${CFG.tiers[0]}`);
assert(CFG.tiers[0] === 5000 && CFG.tiers[1] === 7500 && CFG.tiers[2] === 10000, `Milestone tiers correctly calibrated [5000, 7500, 10000]: got [${CFG.tiers.join(', ')}]`);

// Verify 7% discount replacement everywhere
const scriptRewMatch = scriptCode.match(/const REW\s*=\s*\{([\s\S]*?)\};/);
assert(scriptRewMatch && scriptRewMatch[1].includes('discount: 7'), 'REW.S defines 7% discount (discount: 7)');
assert(scriptRewMatch && scriptRewMatch[1].includes('خصم 7%'), 'REW.S display name specifies 7% discount');
assert(scriptCode.includes("'7% OFF Receipt'") || scriptCode.includes("'7% OFF'"), '7% OFF receipt option defined');
assert(!scriptCode.includes("'10% OFF Receipt'"), 'Zero occurrences of 10% OFF Receipt in claim options');
assert(!scriptCode.includes("'خصم 10% على الفاتورة'"), 'Zero occurrences of 10% discount in Arabic claim options');

// 10. Start Screen (#intro) & Post-Game Phone Collection Flow
console.log('\n--- Suite 10: Start Screen (#intro) & Post-Game Phone Collection Flow ---');
const introSectionMatch = html.match(/<section id="intro"[^>]*>([\s\S]*?)<\/section>/);
assert(introSectionMatch, '#intro section exists in DOM');
const introHtml = introSectionMatch ? introSectionMatch[1] : '';
assert(!introHtml.includes('id="phone"'), '#intro does NOT contain phone input field');
assert(!introHtml.includes('id="order"'), '#intro does NOT contain order input field');
assert(introHtml.includes('id="goBtn"'), '#intro contains direct start button (#goBtn)');

const choiceSectionMatch = html.match(/<section id="choice"[^>]*>([\s\S]*?)<\/section>/);
assert(choiceSectionMatch, '#choice section exists in DOM');
const choiceHtml = choiceSectionMatch ? choiceSectionMatch[1] : '';
assert(choiceHtml.includes('id="choicePhoneCard"'), '#choice contains post-game phone collection card (#choicePhoneCard)');
assert(choiceHtml.includes('id="chPhone"'), '#choice contains Saudi phone input (#chPhone) before voucher minting');

// 11. Top 10 Leaderboard & 3-Month Qualification
console.log('\n--- Suite 11: Top 10 Leaderboards & 3-Month Qualification ---');
assert(scriptCode.includes('const LeaderboardEngine ='), 'LeaderboardEngine module defined in codebase');
assert(html.includes('id="modalNickname"'), 'Nickname registration modal (#modalNickname) present in DOM');
assert(html.includes('id="modalTop10Popup"'), 'Top 10 celebration popup (#modalTop10Popup) present in DOM');
assert(html.includes('id="modalLeaderboard"'), 'Leaderboard view modal (#modalLeaderboard) present in DOM');

const exactTop10ArabicMsg = '«إذا حافظت على مكانك ضمن أفضل 10 لاعبين لمدة ثلاثة أشهر، فستحصل على هدية إضافية»';
assert(html.includes(exactTop10ArabicMsg), 'Top 10 popup contains exact required Arabic message');
assert(scriptCode.includes('getQualificationDays'), 'Continuous 90-day qualification tracking implemented');

// 12. Bean Catching & Basketball Defect Verifications
console.log('\n--- Suite 12: Bean Catching & Basketball Defect Verifications ---');
// Bean Catching swept continuous collision check
assert(scriptCode.includes('inCatchY = (it.y + 24 >= cupTop)'), 'Bean Catching swept collision detection implemented (inCatchY)');
assert(scriptCode.includes('inCatchX = Math.abs(it.x - cx) <= (half + 12)'), 'Bean Catching swept X-axis tolerance implemented');
assert(scriptCode.includes('c.ok(0.25') && scriptCode.includes('Evaded Burnt Bean'), 'Evading burnt beans awards evasion points without deducting hearts');

const beansExitBlock = scriptCode.match(/if\(it\.y > H\)\{[\s\S]*?return false;\s*\}/);
assert(beansExitBlock && !beansExitBlock[0].includes('loseHeart'), 'Missed falling good beans do not call c.loseHeart()');

// Basketball Shot Lifecycle State Machine
assert(scriptCode.includes('STATES = {'), 'Basketball explicit shot lifecycle states defined');
assert(scriptCode.includes("READY: 'READY'") && scriptCode.includes("VALIDATING_SHOT: 'VALIDATING_SHOT'"), 'Basketball includes READY and VALIDATING_SHOT states');
assert(scriptCode.includes("SHOT_MADE: 'SHOT_MADE'") && scriptCode.includes("SHOT_MISSED: 'SHOT_MISSED'"), 'Basketball includes SHOT_MADE and SHOT_MISSED states');
assert(scriptCode.includes('netEl.classList.add(\'swish\')'), 'Basketball triggers net swish animation on made shot');

const bbMadeBlock = scriptCode.match(/state\s*=\s*STATES\.SHOT_MADE;[\s\S]*?return;/);
assert(bbMadeBlock && !bbMadeBlock[0].includes('loseHeart'), 'Basketball made shot NEVER deducts a heart');

// 13. Precision Pour & Flavor Harmony Overhaul
console.log('\n--- Suite 13: Precision Pour & Flavor Harmony Overhaul ---');
// Pour live numeric % is hidden during active pour
assert(scriptCode.includes("levelTxt.textContent = (currentLang === 'en' ? '☕ Pouring...' : '☕ جارٍ الصب...')"), 'Precision Pour hides live numeric percentage during pouring');
assert(scriptCode.includes('speed = lerp(16, 28, d)'), 'Precision Pour early speed calibrated (lerp 16 -> 28)');
assert(html.includes('cup-takeaway-sleeve') && html.includes('assets/logo_transparent.png'), 'Takeaway cup sleeve uses transparent logo (assets/logo_transparent.png)');
assert(/\.cup-grad-markers\s*\{[\s\S]*?display:\s*none\s*!important/.test(html), 'Graduation markers hidden to avoid trivial stopping point cues');

// Flavor Harmony question bank & icon decoupling
assert(scriptCode.includes('CUPPING_BANK = ['), 'Specialty coffee cupping question bank defined (CUPPING_BANK)');
assert(scriptCode.includes('allChoices[i], allChoices[j]'), 'Flavor Harmony shuffles option positions across rounds');
assert(scriptCode.includes('Sensory Harmony! 🎯'), 'Flavor Harmony rewarding feedback implemented');

// 14. Google Maps & Confetti Celebration
console.log('\n--- Suite 14: Google Maps, Social Links & Celebration ---');
const officialMapsUrl = 'https://maps.google.com/?q=the+A%26A+specialty+cafe+%26+sweets+Al-Madinah';
assert(CFG.social && CFG.social.maps === officialMapsUrl, 'Official Google Maps URL configured in CFG.social.maps');
const mapsLinkCount = (html.match(/href="https:\/\/maps\.google\.com\/\?q=the\+A%26A\+specialty\+cafe\+%26\+sweets\+Al-Madinah"/g) || []).length;
assert(mapsLinkCount >= 2, `Google Maps button present in footers with verified URL (count: ${mapsLinkCount})`);

assert(scriptCode.includes('function launchCelebrationConfetti()'), 'Side confetti burst celebration implemented (launchCelebrationConfetti)');
assert(scriptCode.includes('celebrate()'), 'Web Audio celebration victory chime implemented (SFX.celebrate)');
assert(html.includes('reward-terms-note'), 'Terms and conditions reward vs loyalty points note present in DOM');

console.log('\n========================================================');
console.log(`Test Execution Complete: ${passedTests}/${totalTests} Passed (${failedTests} Failed)`);
console.log('========================================================\n');

if (failedTests > 0) {
  process.exit(1);
}
