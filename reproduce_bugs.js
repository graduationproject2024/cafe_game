const { chromium } = require('c:/Users/sam20/.agents/skills/playwright-skill/node_modules/playwright');

async function runDiagnostics() {
  console.log('========================================================');
  console.log('   A&A Cafe Games — Real Browser Runtime Diagnostics   ');
  console.log('========================================================\n');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } }); // Mobile iPhone 14
  const page = await context.newPage();

  const consoleLogs = [];
  const consoleErrors = [];
  page.on('console', msg => {
    const text = msg.text();
    consoleLogs.push(text);
    if (msg.type() === 'error') consoleErrors.push(text);
  });
  page.on('pageerror', err => consoleErrors.push(err.message));

  console.log('1. Loading http://localhost:8085/index.html ...');
  await page.goto('http://localhost:8085/index.html', { waitUntil: 'networkidle' });

  console.log('   Console errors upon load:', consoleErrors.length);
  if (consoleErrors.length > 0) {
    console.error('   ERRORS:', consoleErrors);
  }

  // Click start button to go to #home
  await page.click('#goBtn');
  await page.waitForTimeout(400);

  // Helper to click game by keyword in title
  async function openGame(keyword) {
    await page.evaluate(kw => {
      const btns = Array.from(document.querySelectorAll('#grid button'));
      const target = btns.find(b => b.textContent.includes(kw));
      if (target) target.click();
      else throw new Error('Game button not found: ' + kw);
    }, keyword);
    await page.waitForTimeout(400);
  }

  // Diagnostic A: Bean Catching (beans)
  console.log('\n--- Diagnostic A: Bean Catching (beans) ---');
  await openGame('اصطياد البن');

  // Check Top 10 leaderboard card in #pre
  const preLbVisible = await page.$eval('#preLeaderboardCard', el => el.offsetWidth > 0 && el.offsetHeight > 0).catch(() => false);
  console.log('   Always-visible Top 10 Leaderboard in #pre lobby:', preLbVisible);

  // Launch Bean Catching
  await page.click('#preGo');
  await page.waitForTimeout(500);

  let initialScore = await page.$eval('#gScore', el => parseInt(el.textContent, 10));
  let initialHearts = await page.$eval('#gHearts', el => el.textContent);
  console.log(`   Initial State -> Score: ${initialScore}, Hearts: ${initialHearts}`);

  // Let beans fall for 3.5 seconds without catching
  console.log('   Letting beans fall without touching for 3.5 seconds...');
  await page.waitForTimeout(3500);

  let scoreAfterFall = await page.$eval('#gScore', el => parseInt(el.textContent, 10));
  let heartsAfterFall = await page.$eval('#gHearts', el => el.textContent);
  console.log(`   After 3.5s -> Score: ${scoreAfterFall}, Hearts: ${heartsAfterFall}`);
  console.log('   Score decreased on falling beans?', scoreAfterFall < initialScore ? 'YES (BUG!)' : 'NO (PASSED ✓)');
  console.log('   Hearts decreased on falling beans?', heartsAfterFall.length < initialHearts.length ? 'YES (BUG!)' : 'NO (PASSED ✓)');

  // Exit back to home
  await page.click('#gExit');
  await page.waitForTimeout(400);

  // Diagnostic B: Barista Speed (reflex)
  console.log('\n--- Diagnostic B: Barista Speed (reflex) ---');
  await openGame('سرعة الباريستا');
  await page.click('#preGo');
  await page.waitForTimeout(500);

  initialScore = await page.$eval('#gScore', el => parseInt(el.textContent, 10));
  initialHearts = await page.$eval('#gHearts', el => el.textContent);
  console.log(`   Initial State -> Score: ${initialScore}, Hearts: ${initialHearts}`);

  // Tap empty stage background 5 times rapidly
  console.log('   Tapping empty stage 5 times rapidly...');
  const stageBox = await page.$('#stage').then(el => el.boundingBox());
  for (let i = 0; i < 5; i++) {
    await page.mouse.click(stageBox.x + 15, stageBox.y + 15);
    await page.waitForTimeout(100);
  }

  let scoreAfterEmptyTap = await page.$eval('#gScore', el => parseInt(el.textContent, 10));
  let heartsAfterEmptyTap = await page.$eval('#gHearts', el => el.textContent);
  console.log(`   After 5 empty taps -> Score: ${scoreAfterEmptyTap}, Hearts: ${heartsAfterEmptyTap}`);
  console.log('   Score penalized on empty taps?', scoreAfterEmptyTap < initialScore ? 'YES (BUG!)' : 'NO (PASSED ✓)');
  console.log('   Hearts penalized on empty taps?', heartsAfterEmptyTap.length < initialHearts.length ? 'YES (BUG!)' : 'NO (PASSED ✓)');

  // Wait 3.5 seconds for gold targets to naturally expire
  console.log('   Waiting 3.5 seconds for gold targets to expire naturally...');
  await page.waitForTimeout(3500);
  let heartsAfterExpire = await page.$eval('#gHearts', el => el.textContent);
  console.log(`   After target expiration -> Hearts: ${heartsAfterExpire}`);
  console.log('   Hearts penalized on naturally expired target?', heartsAfterExpire.length < heartsAfterEmptyTap.length ? 'YES (BUG!)' : 'NO (PASSED ✓)');

  await page.click('#gExit');
  await page.waitForTimeout(400);

  // Diagnostic C: Basketball (basketball)
  console.log('\n--- Diagnostic C: Basketball (basketball) ---');
  await openGame('لعبة السلة');
  await page.click('#preGo');
  await page.waitForTimeout(500);

  const ballBox = await page.$('#bbBall').then(el => el.boundingBox());
  console.log('   Ball element bounding box:', ballBox);

  // Test shooting: drag ball downwards (slingshot)
  console.log('   Executing shot (slingshot pull-down)...');
  const bCenter = { x: ballBox.x + ballBox.width / 2, y: ballBox.y + ballBox.height / 2 };
  await page.mouse.move(bCenter.x, bCenter.y);
  await page.mouse.down();
  await page.mouse.move(bCenter.x, bCenter.y + 64, { steps: 5 });
  await page.mouse.up();

  // Wait for shot trajectory resolution
  await page.waitForTimeout(1600);
  const bbMsg = await page.$eval('#bbMsg', el => el.textContent);
  const bbScore = await page.$eval('#gScore', el => parseInt(el.textContent, 10));
  const bbHearts = await page.$eval('#gHearts', el => el.textContent);
  console.log(`   Shot result -> HUD Msg: "${bbMsg}", Score: ${bbScore}, Hearts: ${bbHearts}`);
  console.log('   Basketball shot registered & scored?', (bbScore > 0 || bbMsg.includes('سلة')) ? 'YES (PASSED ✓)' : 'NO (BUG!)');

  await page.click('#gExit');
  await page.waitForTimeout(400);

  // Diagnostic D: Flavor Harmony (colorshift)
  console.log('\n--- Diagnostic D: Flavor Harmony (colorshift) ---');
  await openGame('تناغم النكهات');
  await page.click('#preGo');
  await page.waitForTimeout(500);

  const promptTitle = await page.$eval('.cs-prompt-title', el => el.textContent);
  const optionCount = await page.$$eval('.cs-card', els => els.length);
  console.log(`   Question Prompt: "${promptTitle}"`);
  console.log(`   Rendered Option Cards: ${optionCount}`);

  // Click first option
  await page.click('.cs-card');
  await page.waitForTimeout(700);
  const csScore = await page.$eval('#gScore', el => parseInt(el.textContent, 10));
  const csHearts = await page.$eval('#gHearts', el => el.textContent);
  console.log(`   After answering -> Score: ${csScore}, Hearts: ${csHearts}`);

  await page.click('#gExit');
  await page.waitForTimeout(400);

  // Diagnostic E: Latte Art (pour)
  console.log('\n--- Diagnostic E: Latte Art (pour) ---');
  await openGame('فن صبّ اللاتيه');
  await page.click('#preGo');
  await page.waitForTimeout(500);

  const pourTargetText = await page.$eval('#pourTargetBadge', el => el.textContent);
  const pourLevelInit = await page.$eval('#pourLevelTxt', el => el.textContent);
  console.log(`   Initial State -> Badge: "${pourTargetText}", Live level display: "${pourLevelInit}"`);

  // Start pouring
  console.log('   Simulating pour pointerdown...');
  const stageCenter = await page.$('#stage').then(el => el.boundingBox());
  await page.mouse.move(stageCenter.x + stageCenter.width / 2, stageCenter.y + stageCenter.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(900);

  const livePouringText = await page.$eval('#pourLevelTxt', el => el.textContent);
  console.log(`   During active pour -> Live level text: "${livePouringText}" (Percentage hidden: ${livePouringText.includes('---') || livePouringText.includes('Pouring') || livePouringText.includes('جارٍ') ? 'YES ✓' : 'NO (BUG!)'})`);

  await page.mouse.up();
  await page.waitForTimeout(500);

  const measuredResultText = await page.$eval('#pourLevelTxt', el => el.textContent);
  console.log(`   After pour ended -> Measured percentage revealed: "${measuredResultText}"`);

  await page.click('#gExit');
  await page.waitForTimeout(400);

  // Diagnostic F: Cup Tower (stack)
  console.log('\n--- Diagnostic F: Cup Tower (stack) ---');
  await openGame('برج الأكواب');

  // Verify drop button is NOT overlapping cups
  const dropBtnInStage = await page.$('.stack-btn-wrap button').then(el => !!el).catch(() => false);
  console.log('   Overlapping drop button in stage:', dropBtnInStage ? 'YES (BUG!)' : 'NO (CLEAN ✓)');

  await page.click('#preGo');
  await page.waitForTimeout(500);

  // Tap to drop cup
  console.log('   Tapping stage to drop cup...');
  await page.mouse.click(stageCenter.x + stageCenter.width / 2, stageCenter.y + 100);
  await page.waitForTimeout(700);
  const stackScore = await page.$eval('#gScore', el => parseInt(el.textContent, 10));
  const stackHearts = await page.$eval('#gHearts', el => el.textContent);
  console.log(`   Stack result -> Score: ${stackScore}, Hearts: ${stackHearts}`);

  await page.click('#gExit');
  await page.waitForTimeout(400);

  // Diagnostic G: Espresso Notes (rhythm) Multi-track
  console.log('\n--- Diagnostic G: Espresso Notes (rhythm) Multi-track ---');
  await openGame('نغمات الإسبريسو');
  await page.click('#preGo');
  await page.waitForTimeout(500);

  const trackCount = await page.$$eval('.rh-track-pill', els => els.length);
  const trackNames = await page.$$eval('.rh-track-pill', els => els.map(e => e.textContent.trim()));
  console.log(`   Rendered track pills (${trackCount}): [${trackNames.join(', ')}]`);

  // Click on Jazz track pill
  console.log('   Switching to second track...');
  await page.click('.rh-track-pill:nth-child(2)');
  await page.waitForTimeout(300);
  const isSecondTrackActive = await page.$eval('.rh-track-pill:nth-child(2)', el => el.classList.contains('active'));
  console.log('   Second track active:', isSecondTrackActive);

  await page.click('#gExit');
  await page.waitForTimeout(400);

  // Diagnostic H: Instagram Bonus Heart Checkpoint Resume
  console.log('\n--- Diagnostic H: Instagram Bonus Heart Checkpoint Resume ---');
  await openGame('سرعة الباريستا');
  await page.click('#preGo');
  await page.waitForTimeout(400);

  // Simulate scoring points then losing all hearts
  await page.evaluate(() => {
    // Grant 600 points, then lose all hearts
    const r = window.__getRun();
    if(r){
      r.score = 600;
      r.hearts = 0;
    }
    document.getElementById('gScore').textContent = '600';
    document.getElementById('gHearts').textContent = '';
    window.__endRun('نفدت القلوب ❤️!');
  });
  await page.waitForTimeout(500);

  const resultActive = await page.$eval('#result', el => el.classList.contains('on'));
  const gameOverBannerVisible = await page.$eval('#gameOverExtraHeart', el => el.style.display !== 'none');
  const resLeaderboardVisible = await page.$eval('#resLeaderboardCard', el => el.offsetWidth > 0 && el.offsetHeight > 0);
  const resMsgText = await page.$eval('#resMsg', el => el.textContent);

  console.log('   #result screen is active:', resultActive);
  console.log('   Game over extra heart banner visible:', gameOverBannerVisible);
  console.log('   Always-visible Top 10 Leaderboard in #result:', resLeaderboardVisible);
  console.log(`   Prominent motivational message (#resMsg): "${resMsgText}"`);

  // Click claim extra heart button
  console.log('   Clicking claim extra heart button (#btnClaimExtraHeartGameOver)...');
  await page.click('#btnClaimExtraHeartGameOver');
  await page.waitForTimeout(600);

  const gameResumed = await page.$eval('#game', el => el.classList.contains('on'));
  const resumedScore = await page.$eval('#gScore', el => parseInt(el.textContent, 10));
  const resumedHearts = await page.$eval('#gHearts', el => el.textContent);
  console.log('   Game resumed active screen (#game):', gameResumed);
  const hasRestoredHeart = resumedHearts.includes('❤️');
  console.log(`   Resumed Score: ${resumedScore} (Preserved 600 points? ${resumedScore === 600 ? 'YES ✓' : 'NO (BUG!)'})`);
  console.log(`   Resumed Hearts: ${resumedHearts} (Restored +1 heart? ${hasRestoredHeart ? 'YES ✓' : 'NO (BUG!)'})`);

  console.log('\n========================================================');
  console.log('            Diagnostics Execution Complete              ');
  console.log('========================================================\n');

  await browser.close();
}

runDiagnostics().catch(err => {
  console.error('Diagnostic error:', err);
  process.exit(1);
});
