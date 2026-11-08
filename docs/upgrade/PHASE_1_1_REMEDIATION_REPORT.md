# A&A CAFE GAMES — PHASE 1.1 REMEDIATION REPORT
## Critical Stability Verification, Root-Cause Remediation & Regression Hardening

**Project:** the A&A Specialty Cafe & Sweets — Al-Madinah Al-Munawwarah  
**Branch:** `upgrade/aa-professional-hardening`  
**Base Commit:** `75f39cc874f52a77821a3eabec9bafefadc1e789`  
**Date:** November 8, 2026  
**Status:** COMPLETE — ALL TARGETS VERIFIED (100% PASS)

---

### Executive Summary

Phase 1.1 was chartered to perform rigorous root-cause remediation and regression hardening on 8 critical issues identified in previous evaluations. The business rules, brand identity, customer experience, reward economy (Tier 1: 5% at 5,000 pts; Tier 2: 7% at 7,500 pts; Tier 3: Drink upgrade at 10,000 pts), staff workflows, and all 9 games (including Basketball) were strictly preserved.

All 8 mandatory targets were fixed at root cause, automated in the new test suite `test_phase_1_1_hardening.js`, and verified across the existing test suites (317 tests total, 100% passing).

---

### Remediation Matrix & Root-Cause Analysis

| # | Remediation Target | Root Cause in Phase 1 | Engineering Solution Applied | Regression Verification |
|---|-------------------|------------------------|------------------------------|-------------------------|
| **1** | **Visit Counter Semantics & Legacy State Migration** | Legacy stored states in `the_aa_cafe_games_v4` lacked `visitCount` or `firstPromoAwarded`. The check `!S.visitCount` evaluated to `true`, allowing returning players to re-qualify for the first-visit welcome bonus on every reload. | Added proactive startup state migration: if `visitCount` is absent and `S.best > 0` or `S.claim` exists, `visitCount` is set to 2 and `firstPromoAwarded` to `true`. Otherwise initializes to visit 1. | `test_phase_1_1_hardening.js` Target 1: Migrates legacy state without `visitCount` to `visitCount=2, firstPromoAwarded=true` and prevents promo repetition. |
| **2** | **Score Integrity & Promotional Bonus Isolation** | To allow first-time players achieving $\ge 350$ pts to claim the 5% welcome discount, `endRun()` previously overwrote `run.score = 5000`. This corrupted `S.best`, `S.bestBy`, `#resScore`, and the public leaderboard. | Isolated `rawScore` completely: `run.rawScore`, `S.best`, `S.bestBy`, `#resScore`, and leaderboards now store the true gameplay score (e.g. 420 pts). Added `S.welcomePromoQualified = true` flag which informs the reward ladder and `claimFlow()` to unlock Tier 1 (5%) without falsifying the player's true score. | `test_phase_1_1_hardening.js` Target 2: Proves `S.best=420`, `S.bestBy=420`, `welcomePromoQualified=true`, `#resScore=420`, and voucher minted with Tier `T` (5%). |
| **3** | **Deterministic Hazard Coordination (80ms Workaround Replacement)** | To prevent companion penalty calls (`loseHeart()` followed by `miss()`) from double-docking points, the previous code checked `Date.now() - lastHeartLossAt < 80`. Clock jitter, low frame rates, or CPU throttling could cause spurious double penalties or missed feedback. | Replaced timestamp heuristic with deterministic event token and synchronous microtask flag: `r._syncHeartLossActive = true; queueMicrotask(() => { r._syncHeartLossActive = false; })`. Added unified `ctx.hazard({ heart, miss, x, y, msg, penaltyMul })` API. Companion calls in the same event turn are unified deterministically without clock dependence. | `test_phase_1_1_hardening.js` Target 3: Proves companion call deducts 1 heart, 1 mistake, 0 double points. Standalone miss without heart loss deducts 25 pts. Unified hazard operates cleanly. |
| **4** | **Coffee Bean Catch Fairness (Stationary Exploit Eliminated)** | Missed good beans checked `if(playerMoved && dt < 0.12)` before deducting 10 points. Players leaving their phone motionless avoided penalties for all dropped good beans. | Removed `if(playerMoved && dt < 0.12)` condition. Every good bean falling past the screen bottom reliably deducts 10 points, resets combo, and displays `-10` floating indicator. Swept collision detection guarantees catchability. | `test_phase_1_1_hardening.js` Target 4: Proves condition excision and validates that stationary players incur the standard -10 pt penalty for dropped beans. |
| **5** | **Basketball Functional Verification & Artifact Capture** | Reviewers requested concrete visual and programmatic proof of pointer drag mechanics, projectile arc trajectory, clean baskets, rim rebounds, and floor bounces. | Built full pointer automation in Playwright: drags ball downwards with progressive aim dots, releases for clean swish basket, and tests off-center trajectory for rim bounce and floor miss. Captured 3 high-resolution screenshots. | `test_screenshots/basketball_aim.png`<br>`test_screenshots/basketball_made_shot.png`<br>`test_screenshots/basketball_missed_shot.png`<br>Verified made shot (+730 pts) and missed shot (-1 heart). |
| **6** | **Session Exit & 2-Minute Reset** | Idle sessions over 120s needed to clear unclaimed gameplay scores so subsequent customers start at 0, while strictly protecting claimed coupons from deletion. | Refactored `checkSessionInactivity()` and page reload watchdog: when idle $\ge 120$s, resets `S.best = 0`, `S.bestBy = {}`, `S.runCert = null`, and `S.welcomePromoQualified = false`, while keeping `S.claim` completely intact. | `test_phase_1_1_hardening.js` Target 6: Proves unclaimed score resets to 0 both during active watchdog and across page reloads, while voucher `TEST-CLAIM-99` remains safe. |
| **7** | **Production Debug Hooks Isolation** | Diagnostic test hooks (`__S`, `__endRun`, `__mintRunCert`, etc.) were previously exposed on `window` in production builds. | Wrapped all internal test and diagnostic helpers inside `const isTestEnv = (location.protocol === 'file:' \|\| location.hostname === 'localhost' \|\| location.hostname === '127.0.0.1') \|\| !!window.__TEST_MODE__; if(isTestEnv){ ... }`. | `test_phase_1_1_hardening.js` Target 7: Verifies hooks exist during local test runs and are completely absent under simulated production host (`https://theaacafe.com`). |
| **8** | **Test Infrastructure Portability** | Test scripts contained fallback `require('c:/Users/sam20/...')` paths that broke on external machines or CI/CD pipelines. | Replaced all hardcoded Windows paths with standard candidate resolution arrays searching local `node_modules`, standard user profile dirs, and `process.cwd()`. | `test_phase_1_1_hardening.js` Target 8: Automated filesystem audit across all scripts and HTML files confirmed 0 occurrences of hardcoded developer paths. |

---

### Detailed Code Changes in `index.html`

1. **State Schema & Welcome Promo Isolation (`S`):**
   - Added `firstPromoAwarded: false` and `welcomePromoQualified: false` to the default state and session resets.
   - Updated `ladder(score, promoQualified)` to highlight the Tier 1 (5%) unlocked marker when `promoQualified` is true without altering the genuine numeric score.
   - Refactored `endRun()`: genuine `rawScore` is written to `S.best`, `S.bestBy`, `#resScore`, Google Sheets, and the Leaderboard. `welcomeQualified` sets `S.firstPromoAwarded = true` and `S.welcomePromoQualified = true`.
   - Updated `claimFlow()`: tier eligibility is checked via `let t = tierOf(S.best); if(S.welcomePromoQualified && t < 1) t = 1;`.

2. **Deterministic Hazard Coordination (`makeCtx`):**
   - Implemented `loseHeart(x, y, msg, eventId)` with synchronous event token `r._lastHazardToken` and `r._syncHeartLossActive = true; queueMicrotask(() => { run._syncHeartLossActive = false; })`.
   - Implemented `miss(x, y, penaltyMul, msg, eventId)` checking `isCompanionHazard`: avoids double-decrementing score or double-incrementing `mistakeCount`.
   - Added `hazard(opts)` API for unified hazard invocations.

3. **Coffee Bean Catch Fairness (`beans`):**
   - Eliminated `if(playerMoved && dt < 0.12)`. Uncaught good beans consistently deduct 10 points and reset the combo.

4. **Session Watchdog & Startup Migration:**
   - In `store.get()` restoration on load: automatically upgrades states missing `visitCount`, setting `visitCount = 2, firstPromoAwarded = true` if player had prior activity.
   - Added startup idle check: if inactive for $\ge 120$s, clears unreserved score while preserving `S.claim`.

5. **Diagnostic Isolation (`isTestEnv`):**
   - Enclosed all `window.__*` test hooks and state getters inside `if(isTestEnv)`.

---

### Verification Summary

- **Automated Test Suites Executed:**
  - `test_phase_1_1_hardening.js`: 8/8 Passed (100%)
  - `test_platform.js`: 244/244 Passed (100%)
  - `test_new_15_requirements.js`: 15/15 Passed (100%)
  - `test_all_user_scenarios.js`: 10/10 Passed (100%)
  - `test_40_comprehensive_scenarios.js`: 40/40 Passed (100%)
- **Total Tests Passed:** 317 / 317 (0 Failures, 0 Regressions)
