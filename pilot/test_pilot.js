/**
 * Automated Playwright Test Suite for Premium Visual & Audio Pilot
 * the A&A Specialty Cafe & Sweets — Al-Madinah Al-Munawwarah
 */

const fs = require('fs');
const path = require('path');

let playwright;
const candidatePaths = [
  'playwright',
  path.join(process.cwd(), 'node_modules', 'playwright'),
  path.join(process.env.USERPROFILE || process.env.HOME || '', '.agents', 'skills', 'playwright-skill', 'node_modules', 'playwright')
];
for(const p of candidatePaths){
  try {
    playwright = require(p);
    if(playwright) break;
  } catch(e){}
}
if(!playwright){
  console.error('Playwright not resolved.');
  process.exit(1);
}
const { chromium } = playwright;

const HTML_FILE = path.join(__dirname, 'index.html');
const SCREENSHOTS_DIR = path.join(__dirname, 'screenshots');
if(!fs.existsSync(SCREENSHOTS_DIR)) fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });

const results = [];
function assert(name, condition, detail){
  const status = condition ? 'PASS' : 'FAIL';
  results.push({ name, status, detail: detail || '' });
  const icon = condition ? '[\x1b[32m✓ PASS\x1b[0m]' : '[\x1b[31m✗ FAIL\x1b[0m]';
  console.log(`${icon} ${name}`);
  if(detail) console.log(`   -> ${detail}`);
  if(!condition){
    process.exitCode = 1;
  }
}

async function runPilotTests(){
  console.log('================================================================');
  console.log('   the A&A Cafe — VISUAL & AUDIO PILOT VERIFICATION SUITE       ');
  console.log('================================================================\n');

  const fileUrl = 'file:///' + HTML_FILE.replace(/\\/g, '/');
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--allow-file-access-from-files']
  });

  try {
    // 1. Desktop Visual Capture (1280x800)
    const pageDesktop = await browser.newPage();
    await pageDesktop.setViewportSize({ width: 1280, height: 800 });
    await pageDesktop.goto(fileUrl);
    await pageDesktop.waitForSelector('#startScreen');
    const desktopShotPath = path.join(SCREENSHOTS_DIR, 'reflex_desktop_1280px.png');
    await pageDesktop.screenshot({ path: desktopShotPath });
    assert('Pilot Desktop Viewport', fs.existsSync(desktopShotPath), `Saved screenshot: ${desktopShotPath}`);
    await pageDesktop.close();

    // 2. Mobile Visual Capture (390x844 - iPhone 14/15 size)
    const pageMobile = await browser.newPage();
    await pageMobile.setViewportSize({ width: 390, height: 844 });
    await pageMobile.goto(fileUrl);
    await pageMobile.waitForSelector('#startScreen');
    const mobileShotPath = path.join(SCREENSHOTS_DIR, 'reflex_mobile_390px.png');
    await pageMobile.screenshot({ path: mobileShotPath });
    assert('Pilot Mobile Responsive Viewport (390px)', fs.existsSync(mobileShotPath), `Saved screenshot: ${mobileShotPath}`);

    // 3. Audio & Sound Engine Verification
    const initialMuteState = await pageMobile.evaluate(() => window.AASoundEngine.isMuted());
    await pageMobile.click('#btnSoundToggle');
    const toggledMuteState = await pageMobile.evaluate(() => window.AASoundEngine.isMuted());
    const soundIconTxt = await pageMobile.$eval('#soundIcon', el => el.textContent.trim());
    assert('Audio Synthesizer Engine & Mute Control', toggledMuteState !== initialMuteState, `Mute toggled: ${initialMuteState} -> ${toggledMuteState}, Icon: ${soundIconTxt}`);

    // 4. Bilingual Localization Toggle (Arabic -> English -> Arabic)
    await pageMobile.click('#btnLangToggle');
    const enTitle = await pageMobile.$eval('#txtStartTitle', el => el.textContent.trim());
    const enDir = await pageMobile.evaluate(() => document.documentElement.dir);
    assert('Bilingual Support: Switch to English (LTR)', enTitle === 'Reflex Rush' && enDir === 'ltr', `Title: ${enTitle}, Dir: ${enDir}`);

    await pageMobile.click('#btnLangToggle');
    const arTitle = await pageMobile.$eval('#txtStartTitle', el => el.textContent.trim());
    const arDir = await pageMobile.evaluate(() => document.documentElement.dir);
    assert('Bilingual Support: Switch to Arabic (RTL)', arTitle === 'سرعة الباريستا' && arDir === 'rtl', `Title: ${arTitle}, Dir: ${arDir}`);

    // 5. Start Game & Real Pointer Interaction
    await pageMobile.click('#btnStartGame');
    await pageMobile.waitForSelector('.stage');
    const isPlaying = await pageMobile.evaluate(() => window.__pilotTestState.isPlaying());
    assert('Game Lifecycle: Start Challenge transitions to active stage', isPlaying === true, `State playing: ${isPlaying}`);

    // Play round by tapping golden targets
    let score = 0;
    const playStart = Date.now();
    let gameplayShotTaken = false;
    let comboShotTaken = false;

    while(score < 380 && (Date.now() - playStart) < 15000){
      const targets = await pageMobile.$$('.pilot-target.gold');
      for(const t of targets){
        try {
          const isVisible = await t.isVisible();
          if(isVisible){
            if(!gameplayShotTaken){
              await pageMobile.screenshot({ path: path.join(SCREENSHOTS_DIR, 'reflex_gameplay_active.png') });
              gameplayShotTaken = true;
            }
            await t.click({ timeout: 400 });
            await pageMobile.waitForTimeout(100);
          }
        } catch(e){}
      }

      score = await pageMobile.evaluate(() => window.__pilotTestState.getScore());
      const hasComboActive = await pageMobile.evaluate(() => document.getElementById('comboPill').classList.contains('active'));
      if(hasComboActive && !comboShotTaken){
        await pageMobile.screenshot({ path: path.join(SCREENSHOTS_DIR, 'reflex_combo_celebration.png') });
        comboShotTaken = true;
      }
      await pageMobile.waitForTimeout(120);
    }

    assert('Gameplay & Real Pointer Interaction: Tap targets to accumulate score', score >= 100, `Accumulated Score: ${score} pts`);
    assert('Dynamic Combo Streak: Visual multiplier feedback triggers on streaks', comboShotTaken === true, `Combo celebration verified & captured`);

    // 6. Hazard & Burnt Bean Interaction (Deterministic Spawning & Real Pointer Hit)
    const heartsBefore = await pageMobile.evaluate(() => window.__pilotTestState.getHearts());
    await pageMobile.evaluate(() => window.__pilotTestState.spawnBurntBean());
    await pageMobile.waitForSelector('.pilot-target.burnt', { timeout: 2000 });
    const burntTarget = await pageMobile.$('.pilot-target.burnt');
    assert('Hazard Mechanics: Burnt bean hazard target rendered on stage', burntTarget !== null, 'Burnt bean DOM element created');
    await burntTarget.click();
    await pageMobile.waitForTimeout(200);
    const heartsAfter = await pageMobile.evaluate(() => window.__pilotTestState.getHearts());
    assert('Hazard Mechanics: Burnt bean tap deducts exactly 1 heart', heartsAfter === (heartsBefore - 1), `Hearts strictly reduced: ${heartsBefore} -> ${heartsAfter}`);

    // 7. End Game & Result Screen Verification
    await pageMobile.evaluate(() => window.__pilotTestState.endGame('test_complete'));
    await pageMobile.waitForSelector('#resultScreen:not(.hidden)');
    const resScoreTxt = await pageMobile.$eval('#resScore', el => el.textContent.trim());
    const promoBadgeTxt = await pageMobile.$eval('#resPromoBadge', el => el.textContent.trim());
    const resultShotPath = path.join(SCREENSHOTS_DIR, 'reflex_result_screen.png');
    await pageMobile.screenshot({ path: resultShotPath });

    assert('Result Screen: Displays final score and qualifying welcome badge', parseInt(resScoreTxt, 10) >= 0 && promoBadgeTxt.length > 0, `Displayed Score: ${resScoreTxt}, Badge: ${promoBadgeTxt}`);
    assert('Result Screen Screenshot Saved', fs.existsSync(resultShotPath), `Saved screenshot: ${resultShotPath}`);

    await pageMobile.close();
  } catch(err){
    console.error('Fatal error in pilot tests:', err);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }

  console.log('\n================================================================');
  console.log('       VISUAL & AUDIO PILOT — TEST EXECUTION REPORT             ');
  console.log('================================================================');
  console.table(results);
  const total = results.length;
  const passed = results.filter(r => r.status === 'PASS').length;
  console.log(`\nOVERALL PILOT STATUS: ${passed} / ${total} PASSED\n`);
}

runPilotTests();

