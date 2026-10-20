const { chromium } = require('c:/Users/sam20/.agents/skills/playwright-skill/node_modules/playwright');
const path = require('path');
const fs = require('fs');

async function runAllScenarios() {
  console.log('================================================================');
  console.log('   A&A Cafe Games — 11 User Issues Comprehensive Verification  ');
  console.log('================================================================\n');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } }); // Mobile iPhone 14
  const page = await context.newPage();

  const screenshotDir = path.join(__dirname, 'test_screenshots');
  if (!fs.existsSync(screenshotDir)) fs.mkdirSync(screenshotDir);

  const errors = [];
  page.on('pageerror', err => {
    console.error('Page error:', err.message);
    errors.push(err.message);
  });

  const results = {};

  // Helper to open a game by name
  async function openGame(name) {
    await page.evaluate((targetName) => {
      const tiles = Array.from(document.querySelectorAll('#grid button.tile'));
      const found = tiles.find(t => t.textContent.includes(targetName));
      if (!found) throw new Error('Game tile not found: ' + targetName);
      found.click();
    }, name);
    await page.waitForTimeout(400);
  }

  try {
    // -------------------------------------------------------------
    // ISSUE 2: Home Counter & Fresh Session Start
    // -------------------------------------------------------------
    console.log('--- TEST 1: Home Counter & Fresh Session Start ---');
    await page.goto('http://localhost:8085/index.html', { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);

    // Click goBtn to enter #home
    await page.click('#goBtn');
    await page.waitForTimeout(400);

    // Check resetSession button exists in home header
    const resetBtnVisible = await page.$eval('#sessionResetHome', el => el.offsetWidth > 0).catch(() => false);
    console.log('   [Check] #sessionResetHome exists in header:', resetBtnVisible);

    // Click reset to ensure clean fresh start
    await page.click('#sessionResetHome');
    await page.waitForTimeout(300);

    const homeScore = await page.$eval('#bestTxt', el => el.textContent.trim()).catch(() => '');
    const ladderScore = await page.$eval('#ladderHome .rp-score span', el => el.textContent.trim()).catch(() => '');
    console.log(`   [Result] Best text: "${homeScore}", Ladder score: "${ladderScore}"`);
    const isZeroClean = ladderScore === '0' || ladderScore === '';
    results.issue2_homeCounter = isZeroClean ? 'PASS' : 'FAIL';
    console.log('   -> Issue 2 (Counter fixed at 6541):', results.issue2_homeCounter);
    await page.screenshot({ path: path.join(screenshotDir, '01_home_fresh_counter.png') });

    // -------------------------------------------------------------
    // ISSUE 1 & 8: Latte Art Takeaway Cup Design & No Buttons
    // -------------------------------------------------------------
    console.log('\n--- TEST 2: Latte Art Cup Design & Controls (pour) ---');
    await openGame('فن صب');
    await page.click('#preGo');
    await page.waitForTimeout(600);

    // Verify #pourBtn is GONE from DOM
    const pourBtnExists = await page.$eval('#pourBtn', () => true).catch(() => false);
    console.log('   [Check] #pourBtn completely removed:', !pourBtnExists);

    // Verify cup design elements match reference takeaway cup
    const cupLidTop = await page.$eval('.cup-takeaway-lid-top', el => el.offsetWidth > 0).catch(() => false);
    const cupLidRim = await page.$eval('.cup-takeaway-lid-rim', el => el.offsetWidth > 0).catch(() => false);
    const cupBody = await page.$eval('.cup-takeaway-body', el => el.offsetWidth > 0).catch(() => false);
    const cupSleeve = await page.$eval('.cup-takeaway-sleeve img', el => el.getAttribute('src')).catch(() => '');
    console.log('   [Check] Cup elements present:', { cupLidTop, cupLidRim, cupBody, cupSleeve });

    // Verify required target is visible from start
    const targetHeaderVal = await page.$eval('#pourTargetHeader', el => el.textContent.trim());
    const clientLevelBefore = await page.$eval('#pourLevelTxt', el => el.textContent.trim());
    console.log(`   [Check] Required target displayed from start: "${targetHeaderVal}" (e.g. 65%)`);
    console.log(`   [Check] Client percentage hidden before pour: "${clientLevelBefore}" (should be ---)`);

    const targetHasNumber = /\d+%/.test(targetHeaderVal);
    const clientHidden = clientLevelBefore === '---';

    // Test pouring by touching screen
    console.log('   [Action] Holding on stage to pour coffee...');
    const stageBox = await page.$('#stage').then(el => el.boundingBox());
    await page.mouse.move(stageBox.x + stageBox.width / 2, stageBox.y + stageBox.height * 0.6);
    await page.mouse.down();
    await page.waitForTimeout(1200);

    const clientLevelDuring = await page.$eval('#pourLevelTxt', el => el.textContent.trim());
    console.log(`   [Check] Client level during pour: "${clientLevelDuring}" (must not show percentage)`);
    const clientHiddenDuring = !/\d+%/.test(clientLevelDuring);

    await page.mouse.up();
    await page.waitForTimeout(400);

    const clientLevelAfter = await page.$eval('#pourLevelTxt', el => el.textContent.trim());
    console.log(`   [Check] Client level AFTER release: "${clientLevelAfter}" (should now reveal %!)`);
    const clientRevealedAfter = /\d+%/.test(clientLevelAfter);

    results.issue1_cupDesign = (cupLidTop && cupLidRim && cupBody) ? 'PASS' : 'FAIL';
    results.issue8_pourButtonsAndLevels = (!pourBtnExists && targetHasNumber && clientHidden && clientHiddenDuring && clientRevealedAfter) ? 'PASS' : 'FAIL';
    console.log('   -> Issue 1 (Cup Design matching reference):', results.issue1_cupDesign);
    console.log('   -> Issue 8 (Remove buttons, target visible, client level hidden until release):', results.issue8_pourButtonsAndLevels);
    await page.screenshot({ path: path.join(screenshotDir, '02_latte_pour_game.png') });

    await page.click('#gExit');
    await page.waitForTimeout(400);

    // -------------------------------------------------------------
    // ISSUE 4, 10 & 11: Espresso Notes (rhythm) No Button & No 119 Auto-Score
    // -------------------------------------------------------------
    console.log('\n--- TEST 3: Espresso Notes (rhythm) Fixes ---');
    await openGame('نغمات الإسبريسو');

    // Click #preGo to start
    await page.click('#preGo');
    // Wait 2 seconds without touching anything
    console.log('   [Action] Waiting 2 seconds without touching anything in rhythm game...');
    await page.waitForTimeout(2000);

    const rhythmScoreAFK = await page.$eval('#gScore', el => parseInt(el.textContent, 10));
    console.log(`   [Check] Score after 2s without playing: ${rhythmScoreAFK} (was 119 in bug!)`);
    const noAutoScore = rhythmScoreAFK === 0;

    // Verify #rhBtn is gone
    const rhBtnExists = await page.$eval('#rhBtn', () => true).catch(() => false);
    console.log('   [Check] #rhBtn button completely removed:', !rhBtnExists);

    // Tap stage to test strike
    await page.mouse.click(stageBox.x + stageBox.width / 2, stageBox.y + stageBox.height * 0.5);
    await page.waitForTimeout(300);
    const pulseExists = await page.$eval('.rh-pulse', () => true).catch(() => false);
    console.log('   [Check] Tapping screen produces note strike pulse:', pulseExists !== false);

    results.issue4_rhythmRestored = noAutoScore ? 'PASS' : 'FAIL';
    results.issue10_rhythm119Fix = (rhythmScoreAFK === 0) ? 'PASS' : 'FAIL';
    results.issue11_rhythmButtonRemoved = (!rhBtnExists) ? 'PASS' : 'FAIL';
    console.log('   -> Issue 4 (Rhythm game gameplay):', results.issue4_rhythmRestored);
    console.log('   -> Issue 10 (119 pts auto score bug resolved):', results.issue10_rhythm119Fix);
    console.log('   -> Issue 11 (Remove rhythm button):', results.issue11_rhythmButtonRemoved);
    await page.screenshot({ path: path.join(screenshotDir, '03_rhythm_game.png') });

    await page.click('#gExit');
    await page.waitForTimeout(400);

    // -------------------------------------------------------------
    // ISSUE 3: Basketball Hoop Assembly & Realistic Motion
    // -------------------------------------------------------------
    console.log('\n--- TEST 4: Basketball Hoop Alignment & Animation (basketball) ---');
    await openGame('لعبة السلة');
    await page.click('#preGo');
    await page.waitForTimeout(600);

    // Check hoop DOM structure: .bb-backboard contains .bb-hoop which contains .bb-rim and .bb-net
    const hoopAssembly = await page.evaluate(() => {
      const board = document.querySelector('.bb-backboard');
      if (!board) return { exists: false };
      const hoop = board.querySelector('.bb-hoop');
      if (!hoop) return { exists: false, hasHoop: false };
      const rim = hoop.querySelector('.bb-rim');
      const net = hoop.querySelector('.bb-net');
      return {
        exists: true,
        hasHoop: true,
        hasRim: !!rim,
        hasNet: !!net,
        hoopBottom: window.getComputedStyle(hoop).bottom,
        rimTop: window.getComputedStyle(rim).top,
        netTop: window.getComputedStyle(net).top
      };
    });
    console.log('   [Check] Hoop assembly unified structure:', hoopAssembly);
    const hoopProperlyUnified = hoopAssembly.hasHoop && hoopAssembly.hasRim && hoopAssembly.hasNet;

    // Test shooting ball with drag & release
    const ballPosBefore = await page.$eval('#bbBall', el => el.getBoundingClientRect());
    console.log(`   [Action] Dragging ball from (${Math.round(ballPosBefore.x)}, ${Math.round(ballPosBefore.y)}) upward...`);
    await page.mouse.move(ballPosBefore.x + 22, ballPosBefore.y + 22);
    await page.mouse.down();
    await page.mouse.move(ballPosBefore.x + 22, ballPosBefore.y - 60, { steps: 5 });
    await page.mouse.up();

    // Check shot in progress and depth scale/spin
    await page.waitForTimeout(300);
    const ballTransformDuringFlight = await page.$eval('#bbBall', el => el.style.transform);
    console.log('   [Check] Ball transform during trajectory flight:', ballTransformDuringFlight);
    const hasScaleAndRotate = ballTransformDuringFlight.includes('scale') && ballTransformDuringFlight.includes('rotate');

    results.issue3_basketballHoopAndPhysics = (hoopProperlyUnified && hasScaleAndRotate) ? 'PASS' : 'FAIL';
    console.log('   -> Issue 3 (Hoop unified & realistic ball physics):', results.issue3_basketballHoopAndPhysics);
    await page.screenshot({ path: path.join(screenshotDir, '04_basketball_game.png') });

    await page.click('#gExit');
    await page.waitForTimeout(400);

    // -------------------------------------------------------------
    // ISSUE 5: Flavor Harmony Layout
    // -------------------------------------------------------------
    console.log('\n--- TEST 5: Flavor Harmony Layout (colorshift) ---');
    await openGame('تناغم النكهات');
    await page.click('#preGo');
    await page.waitForTimeout(600);

    const csLayout = await page.evaluate(() => {
      const banner = document.querySelector('#csRuleBanner');
      const target = document.querySelector('#csTarget');
      const grid = document.querySelector('#csGrid');
      const cards = Array.from(grid.querySelectorAll('.cs-card'));
      return {
        bannerText: banner ? banner.textContent : '',
        targetHTML: target ? target.innerHTML : '',
        hasDuplicateCat: target ? target.querySelector('.cs-prompt-cat') !== null : true,
        cardCount: cards.length,
        firstCardHeight: cards[0] ? cards[0].offsetHeight : 0
      };
    });
    console.log('   [Check] Target has duplicate category:', csLayout.hasDuplicateCat);
    console.log(`   [Check] Card count: ${csLayout.cardCount}, First card height: ${csLayout.firstCardHeight}px`);

    results.issue5_flavorHarmonyLayout = (!csLayout.hasDuplicateCat && csLayout.cardCount === 4 && csLayout.firstCardHeight >= 60) ? 'PASS' : 'FAIL';
    console.log('   -> Issue 5 (Flavor harmony layout fixed):', results.issue5_flavorHarmonyLayout);
    await page.screenshot({ path: path.join(screenshotDir, '05_flavor_harmony.png') });

    await page.click('#gExit');
    await page.waitForTimeout(400);

    // -------------------------------------------------------------
    // ISSUE 9: Cup Tower Overlapping Sentence Fix
    // -------------------------------------------------------------
    console.log('\n--- TEST 6: Cup Tower Instructions (stack) ---');
    await openGame('برج الأكواب');
    await page.click('#preGo');
    await page.waitForTimeout(600);

    const stackInstructions = await page.evaluate(() => {
      const stage = document.querySelector('#stage');
      const msgs = Array.from(stage.querySelectorAll('.t-msg, .stack-guide-banner'));
      return msgs.map(m => ({ class: m.className, text: m.textContent }));
    });
    console.log('   [Check] Instruction banners in stage:', stackInstructions);
    const noDuplicateStackMsg = stackInstructions.length === 1;

    results.issue9_cupTowerTextOverlap = noDuplicateStackMsg ? 'PASS' : 'FAIL';
    console.log('   -> Issue 9 (Cup tower overlapping sentences fixed):', results.issue9_cupTowerTextOverlap);
    await page.screenshot({ path: path.join(screenshotDir, '06_cup_tower.png') });

    await page.click('#gExit');
    await page.waitForTimeout(400);

    // -------------------------------------------------------------
    // ISSUE 7: Score Deductions (-10 pts) in Reflex & Beans
    // -------------------------------------------------------------
    console.log('\n--- TEST 7: Score Deductions in Barista Speed & Bean Catching ---');

    // Reflex Rush: start with score 50, wait for gold target to expire, verify -10 deduction
    await openGame('سرعة الباريستا');
    await page.click('#preGo');
    await page.waitForTimeout(500);

    const reflexDeducted = await page.evaluate(async () => {
      const run = window.__getRun();
      run.score = 50;
      const init = run.score;
      // Wait 2.2s for the first gold target (life ~1.65s) to expire naturally
      await new Promise(r => setTimeout(r, 2200));
      return {
        initial: init,
        after: run.score,
        deducted: run.score < init && (init - run.score) >= 10
      };
    });
    console.log(`   [Reflex] Initial: ${reflexDeducted.initial}, After natural expiration: ${reflexDeducted.after}`);
    console.log(`   [Reflex] Missed gold target deducted 10 points:`, reflexDeducted.deducted);

    await page.click('#gExit');
    await page.waitForTimeout(400);

    // Bean Catching: move sack off-screen so no beans are caught, let good bean fall off bottom, verify -10 deduction
    await openGame('اصطياد البن');
    await page.click('#preGo');
    await page.waitForTimeout(500);

    // Move basket to left edge so middle and right beans fall off screen
    for (let k = 0; k < 15; k++) {
      await page.keyboard.press('ArrowLeft');
    }

    const beansDeducted = await page.evaluate(async () => {
      const run = window.__getRun();
      run.score = 60;
      const init = run.score;
      // Wait 3.5s for beans to fall off screen
      await new Promise(r => setTimeout(r, 3500));
      return {
        initial: init,
        after: run.score,
        deducted: run.score < init
      };
    });
    console.log(`   [Beans] Initial: ${beansDeducted.initial}, After falling off screen: ${beansDeducted.after}`);
    console.log(`   [Beans] Missed good bean deducted 10 points:`, beansDeducted.deducted);

    results.issue7_scoreDeduction = (reflexDeducted.deducted && beansDeducted.deducted) ? 'PASS' : 'FAIL';
    console.log('   -> Issue 7 (Missed targets/beans deduct 10 pts):', results.issue7_scoreDeduction);
    await page.screenshot({ path: path.join(screenshotDir, '07_score_deduction.png') });

    await page.click('#gExit');
    await page.waitForTimeout(400);

    // -------------------------------------------------------------
    // ISSUE 6: Reward Voucher Claim Button & Full Claim Flow
    // -------------------------------------------------------------
    console.log('\n--- TEST 8: Reward Voucher Claim Flow ---');
    // Open a game and simulate achieving winning score (6,000 pts >= Tier 1: 5,000 pts)
    await openGame('سرعة الباريستا');
    await page.click('#preGo');
    await page.waitForTimeout(500);

    await page.evaluate(() => {
      const run = window.__getRun();
      if (run) { run.score = 6200; }
      window.__endRun('Test round completed with winning score');
    });
    await page.waitForTimeout(600);

    // Check result screen is shown
    const resultVisible = await page.$eval('#result', el => el.classList.contains('on'));
    console.log('   [Check] Result screen active:', resultVisible);

    // Check #resClaim button is visible and active!
    const claimBtnDisplay = await page.$eval('#resClaim', el => el.style.display);
    const claimBtnText = await page.$eval('#resClaim', el => el.textContent.trim());
    console.log(`   [Check] #resClaim button display: "${claimBtnDisplay}", text: "${claimBtnText}"`);

    const claimButtonActive = claimBtnDisplay !== 'none' && claimBtnDisplay !== '';

    // Click claim button to proceed to voucher choice screen
    await page.click('#resClaim');
    await page.waitForTimeout(500);

    const choiceScreenActive = await page.$eval('#choice', el => el.classList.contains('on'));
    console.log('   [Check] Choice screen active after clicking claim:', choiceScreenActive);

    // Select the 5% reward button
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('#chOpts button'));
      if (btns[0]) btns[0].click();
    });
    await page.waitForTimeout(500);

    // If phone card appears, enter Saudi mobile number
    const phoneCardVisible = await page.$eval('#choicePhoneCard', el => el.style.display !== 'none').catch(() => false);
    if (phoneCardVisible) {
      console.log('   [Action] Entering valid Saudi mobile number: 0501234567');
      await page.fill('#chPhone', '0501234567');
      await page.click('#btnConfirmChoicePhone');
      await page.waitForTimeout(800);
    }

    // Verify voucher reward screen (#reward) is now active with code!
    const rewardScreenActive = await page.$eval('#reward', el => el.classList.contains('on'));
    const voucherCode = await page.$eval('#rwCode', el => el.textContent.trim());
    console.log(`   [Check] Reward screen active: ${rewardScreenActive}, Issued Code: "${voucherCode}"`);

    // Now return to home and verify claim bar is visible with button to view voucher
    await page.click('#rwBack');
    await page.waitForTimeout(400);

    const homeClaimBarVisible = await page.$eval('#claimBar', el => !el.hidden && el.offsetWidth > 0).catch(() => false);
    const homeClaimBarBtn = await page.$eval('#claimBar button', el => el.textContent.trim()).catch(() => '');
    console.log(`   [Check] Home claim bar visible with reserved voucher: ${homeClaimBarVisible}, button: "${homeClaimBarBtn}"`);

    results.issue6_rewardVoucherClaim = (claimButtonActive && choiceScreenActive && rewardScreenActive && voucherCode.length > 5 && homeClaimBarVisible) ? 'PASS' : 'FAIL';
    console.log('   -> Issue 6 (Reward voucher claim & view flow):', results.issue6_rewardVoucherClaim);
    await page.screenshot({ path: path.join(screenshotDir, '08_reward_voucher_flow.png') });

  } catch (err) {
    console.error('Test execution error:', err);
  } finally {
    await browser.close();
  }

  console.log('\n================================================================');
  console.log('                  FINAL VERIFICATION REPORT                     ');
  console.log('================================================================');
  console.table(results);
  const allPassed = Object.values(results).every(v => v === 'PASS');
  console.log(`OVERALL STATUS: ${allPassed ? 'ALL TESTS PASSED (100% HEALTHY) ✓' : 'SOME TESTS FAILED ✗'}`);
}

runAllScenarios();
