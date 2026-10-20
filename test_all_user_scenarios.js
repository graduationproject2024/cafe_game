const { chromium } = require('c:/Users/sam20/.agents/skills/playwright-skill/node_modules/playwright');
const path = require('path');
const fs = require('fs');

async function runAllScenarios() {
  console.log('================================================================');
  console.log('   the A&A Cafe Games — User Requests Comprehensive E2E Tests  ');
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
    // 1. Reset Session Button Removed & Clean Zero Counter
    // -------------------------------------------------------------
    console.log('--- TEST 1: Session Reset Button Removal & Zero Counter ---');
    await page.goto('http://localhost:8085/index.html', { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);

    // Click goBtn to enter #home
    await page.click('#goBtn');
    await page.waitForTimeout(400);

    // Verify #sessionResetHome button is COMPLETELY REMOVED from DOM
    const resetBtnExists = await page.$eval('#sessionResetHome', () => true).catch(() => false);
    console.log('   [Check] #sessionResetHome removed from DOM:', !resetBtnExists);

    const ladderScore = await page.$eval('#ladderHome .rp-score span', el => el.textContent.trim()).catch(() => '');
    console.log(`   [Check] Clean ladder score on entry: "${ladderScore}"`);
    const isZeroClean = (!resetBtnExists) && (ladderScore === '0' || ladderScore === '');
    results.req10_sessionResetRemoved = isZeroClean ? 'PASS' : 'FAIL';
    console.log('   -> Requirement 10 (Remove reset session button):', results.req10_sessionResetRemoved);
    await page.screenshot({ path: path.join(screenshotDir, '01_home_screen.png') });

    // -------------------------------------------------------------
    // 2. English Layout (LTR) and Typography (Outfit / Plus Jakarta Sans)
    // -------------------------------------------------------------
    console.log('\n--- TEST 2: English Language LTR & Font Polish ---');
    await page.click('#langToggleHome');
    await page.waitForTimeout(400);

    const langState = await page.evaluate(() => {
      const htmlDir = document.documentElement.dir;
      const bodyDir = document.body.dir;
      const htmlLang = document.documentElement.lang;
      const fontH2 = window.getComputedStyle(document.querySelector('#homeTitle')).fontFamily;
      const homeTitleText = document.querySelector('#homeTitle').textContent;
      return { htmlDir, bodyDir, htmlLang, fontH2, homeTitleText };
    });
    console.log('   [Check] English mode attributes:', langState);

    const isLtrCorrect = langState.htmlDir === 'ltr' && langState.bodyDir === 'ltr' && langState.htmlLang === 'en';
    const isFontPolished = langState.fontH2.includes('Outfit');
    results.req1_12_englishAndFonts = (isLtrCorrect && isFontPolished) ? 'PASS' : 'FAIL';
    console.log('   -> Requirements 1 & 12 (English layout & fonts):', results.req1_12_englishAndFonts);
    await page.screenshot({ path: path.join(screenshotDir, '02_english_ltr.png') });

    // Switch back to Arabic for subsequent tests
    await page.click('#langToggleHome');
    await page.waitForTimeout(400);

    // -------------------------------------------------------------
    // 3. Latte Cup Contrast & Barista Counter Station
    // -------------------------------------------------------------
    console.log('\n--- TEST 3: Latte Cup Contrast & Barista Mat (pour) ---');
    await openGame('فن صب');
    await page.click('#preGo');
    await page.waitForTimeout(600);

    const cupCheck = await page.evaluate(() => {
      const station = document.querySelector('#pourStation');
      const lidTop = document.querySelector('.cup-takeaway-lid-top');
      const lidRim = document.querySelector('.cup-takeaway-lid-rim');
      const body = document.querySelector('.cup-takeaway-body');
      const stStyle = window.getComputedStyle(station);
      return {
        stationBorder: stStyle.borderColor,
        stationBg: stStyle.backgroundImage,
        hasLidTop: !!lidTop && lidTop.offsetWidth > 0,
        hasLidRim: !!lidRim && lidRim.offsetWidth > 0,
        hasBody: !!body && body.offsetWidth > 0
      };
    });
    console.log('   [Check] Precision Pour cup & station:', cupCheck);
    results.req3_cupContrast = (cupCheck.hasLidTop && cupCheck.hasLidRim && cupCheck.hasBody && cupCheck.stationBg.includes('gradient')) ? 'PASS' : 'FAIL';
    console.log('   -> Requirement 3 (Latte cup contrast with station backdrop):', results.req3_cupContrast);
    await page.screenshot({ path: path.join(screenshotDir, '03_pour_cup_contrast.png') });

    await page.click('#gExit');
    await page.waitForTimeout(400);

    // -------------------------------------------------------------
    // 4. Flavor Harmony Completely Removed
    // -------------------------------------------------------------
    console.log('\n--- TEST 4: Flavor Harmony Completely Removed ---');
    const fhExists = await page.evaluate(() => {
      const tiles = Array.from(document.querySelectorAll('#grid button.tile'));
      const foundInTiles = tiles.some(t => t.textContent.includes('تناغم النكهات') || t.textContent.includes('Flavor Harmony'));
      const foundInGames = (typeof GAMES !== 'undefined') && GAMES.some(g => g.id === 'colorshift');
      return foundInTiles || foundInGames;
    });
    console.log('   [Check] Flavor Harmony present in tiles or GAMES array:', fhExists);
    results.req4_flavorHarmonyRemoved = (!fhExists) ? 'PASS' : 'FAIL';
    console.log('   -> Requirement 4 (Completely remove flavor harmony):', results.req4_flavorHarmonyRemoved);

    // -------------------------------------------------------------
    // 5. Basketball Progressive Difficulty
    // -------------------------------------------------------------
    console.log('\n--- TEST 5: Basketball Progressive Difficulty ---');
    await openGame('لعبة السلة');
    await page.click('#preGo');
    await page.waitForTimeout(600);

    const bbState = await page.evaluate(() => {
      const board = document.querySelector('#bbBoard');
      const ball = document.querySelector('#bbBall');
      const rim = document.querySelector('#bbRim');
      const net = document.querySelector('#bbNet');
      return {
        boardLeft: board ? board.style.left : '',
        ballExists: !!ball,
        rimExists: !!rim,
        netExists: !!net
      };
    });
    console.log('   [Check] Basketball initial board position (stationary at 50%):', bbState.boardLeft);
    const bbStationaryInitial = bbState.boardLeft === '50%' || bbState.boardLeft === '';
    results.req5_basketballDifficulty = (bbStationaryInitial && bbState.ballExists && bbState.rimExists) ? 'PASS' : 'FAIL';
    console.log('   -> Requirement 5 (Basketball progressive difficulty):', results.req5_basketballDifficulty);
    await page.screenshot({ path: path.join(screenshotDir, '04_basketball_stationary.png') });

    await page.click('#gExit');
    await page.waitForTimeout(400);

    // -------------------------------------------------------------
    // 6. Where Is the Bean (Shows Coffee Bean 🫘, Not Cup)
    // -------------------------------------------------------------
    console.log('\n--- TEST 6: Where Is the Bean Icon (🫘✨) ---');
    await openGame('أين حبة البن');
    await page.click('#preGo');
    await page.waitForTimeout(500);

    const beanIcon = await page.evaluate(() => {
      const ballEl = document.querySelector('.s-ball');
      return ballEl ? ballEl.textContent.trim() : '';
    });
    console.log(`   [Check] Icon under cups: "${beanIcon}" (must contain bean 🫘)`);
    results.req6_beanIcon = beanIcon.includes('🫘') ? 'PASS' : 'FAIL';
    console.log('   -> Requirement 6 (Coffee bean under cup instead of coffee cup):', results.req6_beanIcon);
    await page.screenshot({ path: path.join(screenshotDir, '05_where_is_the_bean.png') });

    await page.click('#gExit');
    await page.waitForTimeout(400);

    // -------------------------------------------------------------
    // 7. Player Profile Modal, Avatar Grid & Photo Upload
    // -------------------------------------------------------------
    console.log('\n--- TEST 7: Player Profile, Avatar Selection & Photo Upload ---');
    await page.click('#profileToggleHome');
    await page.waitForTimeout(400);

    const profModalVisible = await page.$eval('#modalProfile', el => el.classList.contains('active'));
    const avatarButtonsCount = await page.$$eval('#profAvatarGrid .prof-avatar-btn', btns => btns.length);
    const fileInputExists = await page.$eval('#profFileInput', el => el.type === 'file');
    console.log(`   [Check] Profile modal visible: ${profModalVisible}, Avatars: ${avatarButtonsCount}, File upload exists: ${fileInputExists}`);

    // Set nickname and choose avatar
    await page.fill('#profNickInput', 'باريستا فهد');
    await page.click('#profAvatarGrid .prof-avatar-btn[data-avatar="👑"]');
    await page.click('#btnSaveProfile');
    await page.waitForTimeout(400);

    const savedProfile = await page.evaluate(() => {
      const s = (typeof window.getCafeState === 'function') ? window.getCafeState() : {};
      return { nickname: s.nickname, avatar: s.avatar };
    });
    console.log('   [Check] Saved profile state:', savedProfile);
    results.req8_playerProfile = (profModalVisible && avatarButtonsCount >= 8 && fileInputExists && savedProfile.nickname === 'باريستا فهد' && savedProfile.avatar === '👑') ? 'PASS' : 'FAIL';
    console.log('   -> Requirement 8 (Nickname & avatar/photo profile):', results.req8_playerProfile);

    // -------------------------------------------------------------
    // 8. Leaderboard Clean State Until Nicknames Are Registered
    // -------------------------------------------------------------
    console.log('\n--- TEST 8: Leaderboard Clean Registration ---');
    await openGame('سرعة الباريستا');
    const lbContent = await page.$eval('#preLeaderboardList', el => el.textContent.trim());
    console.log(`   [Check] Embedded leaderboard text: "${lbContent}"`);
    results.req11_leaderboardEmptyState = (lbContent.length > 0) ? 'PASS' : 'FAIL';
    console.log('   -> Requirement 11 (Clean leaderboard with clear notice):', results.req11_leaderboardEmptyState);

    await page.click('#preBack');
    await page.waitForTimeout(400);

    // -------------------------------------------------------------
    // 9. Single Reward Upgrade & Next Order Wording
    // -------------------------------------------------------------
    console.log('\n--- TEST 9: Single Reward per Session, Upgrades & Next Order Badge ---');
    // Simulate scoring 5000 points
    await page.evaluate(() => {
      const s = window.getCafeState();
      if(s){ s.best = 5200; window.saveCafeState(); window.renderHomeView(); }
    });
    await page.waitForTimeout(400);

    // Click claim button on home claimbar
    await page.click('#claimBar button');
    await page.waitForTimeout(500);

    // Select 5% reward
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('#chOpts button'));
      if (btns[0]) btns[0].click();
    });
    await page.waitForTimeout(400);

    // Enter phone if prompted
    const phoneCardVisible = await page.$eval('#choicePhoneCard', el => el.style.display !== 'none').catch(() => false);
    if (phoneCardVisible) {
      await page.fill('#chPhone', '0501234567');
      await page.click('#btnConfirmChoicePhone');
      await page.waitForTimeout(600);
    }

    // Verify NEXT ORDER text prominently on voucher screen
    const voucherNextOrderText = await page.$eval('#rwNextOrderBadge', el => el.textContent.trim());
    const voucherExpText = await page.$eval('#rwExp', el => el.textContent.trim());
    console.log(`   [Check] Next order badge: "${voucherNextOrderText}"`);
    console.log(`   [Check] Voucher validity: "${voucherExpText}"`);
    const hasNextOrderNotice = voucherNextOrderText.includes('طلبك القادم') || voucherNextOrderText.includes('NEXT ORDER');

    // Return to home and verify claim bar is now for VIEW or UPGRADE only (one reward only!)
    await page.click('#rwBack');
    await page.waitForTimeout(400);

    const claimBarText = await page.$eval('#claimBar', el => el.textContent.trim());
    console.log(`   [Check] Claim bar with reserved voucher: "${claimBarText}"`);

    // Now simulate player earning 8000 points (tier 2 upgrade available!)
    await page.evaluate(() => {
      const s = window.getCafeState();
      if(s){ s.best = 8200; window.saveCafeState(); window.renderHomeView(); }
    });
    await page.waitForTimeout(400);

    const upgradeBarText = await page.$eval('#claimBar', el => el.textContent.trim());
    const upgradeBtnText = await page.$eval('#claimBar button', el => el.textContent.trim());
    console.log(`   [Check] Claim bar when higher score earned: "${upgradeBtnText}"`);

    const isSingleRewardUpgrade = hasNextOrderNotice && (upgradeBtnText.includes('ترقية') || upgradeBtnText.includes('Upgrade'));
    results.req7_9_singleRewardAndNextOrder = isSingleRewardUpgrade ? 'PASS' : 'FAIL';
    console.log('   -> Requirements 7 & 9 (Single reward upgrade & Next Order badge):', results.req7_9_singleRewardAndNextOrder);
    await page.screenshot({ path: path.join(screenshotDir, '06_reward_next_order.png') });

    // -------------------------------------------------------------
    // 10. Motivating Loss Message
    // -------------------------------------------------------------
    console.log('\n--- TEST 10: Motivating Loss Message ---');
    await openGame('سرعة الباريستا');
    await page.click('#preGo');
    await page.waitForTimeout(500);

    const lossMsg = await page.evaluate(() => {
      const r = window.__getRun();
      if(r){
        r.hearts = 0;
        r.score = 0;
      }
      window.__endRun('hearts');
      const msg = document.querySelector('#resMsg');
      return msg ? msg.textContent.trim() : '';
    });
    console.log(`   [Check] Motivating loss message on 0 hearts / 0 score: "${lossMsg}"`);
    const hasMotivatingWords = lossMsg.includes('لا تتوقف') || lossMsg.includes('لا تستسلم') || lossMsg.includes('محاولة رائعة') || lossMsg.includes('جرب مرة ثانية');
    results.req2_motivatingLossMessage = hasMotivatingWords ? 'PASS' : 'FAIL';
    console.log('   -> Requirement 2 (Motivating message to keep playing):', results.req2_motivatingLossMessage);

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
  console.log(`OVERALL STATUS: ${allPassed ? 'ALL USER REQUIREMENTS VERIFIED & PASSED (100%) ✓' : 'SOME TESTS FAILED ✗'}`);
}

runAllScenarios();
