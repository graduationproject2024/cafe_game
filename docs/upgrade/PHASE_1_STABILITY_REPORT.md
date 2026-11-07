# the A&A Specialty Cafe & Sweets — Core Engine Stability & Critical Remediation Report
**Document Reference**: `docs/upgrade/PHASE_1_STABILITY_REPORT.md`  
**Execution Phase**: PHASE 1 — Stability & Bug Remediation  
**Target Repository**: `https://github.com/graduationproject2024/cafe_game.git`  
**Active Working Branch**: `upgrade/aa-professional-hardening`  
**Audit Date**: November 2026  
**Location**: Al-Madinah Al-Munawwarah, Kingdom of Saudi Arabia  

---

## 1. Executive Summary

Phase 1 focused on resolving critical runtime exceptions, physics anomalies, scoring integrity leaks, punitive game deduction conflicts, and test suite fragility across the A&A Cafe Games platform. All modifications were implemented strictly on the isolated branch `upgrade/aa-professional-hardening` without touching the production `main` branch.

All **309 automated tests** across all 4 regression and real-world test suites were executed and verified with a **100% pass rate (309/309 PASS, 0 failures)**.

---

## 2. Itemized Bug Remediation & Root Cause Analysis

### Target 1: Basketball (`basketball`) Runtime Error & Physics Hardening
- **Severity**: P0 Critical
- **Symptoms**: Intermittent `Uncaught ReferenceError: shotSeq is not defined` occurred in browser consoles during shot timeout watchdogs. In addition, high-velocity drag releases caused trajectory calculation freeze or ball clipping beyond canvas boundaries.
- **Root Cause**: The variable `shotSeq` was referenced in `const currentShotId = ++shotSeq;` within `onPointerUp()` without prior initialization in the game function scope. Furthermore, coordinate boundaries lacked strict `Math.max`/`Math.min` clamping and `NaN`/`isFinite` validation.
- **Fix Applied**:
  - Initialized `let shotSeq = 0;` inside `basketball.start(c)`.
  - Added coordinate clamping for `ballX` and `ballY` (`Math.max(4, Math.min(W - 48, ballX))`).
  - Added defensive guards against `NaN` or non-finite values in the trajectory integration step to trigger a clean `resetBall()`.
  - Clamped throw velocity vectors `vx` between `[-360, 360]` and `vy` between `[-880, -460]`.
- **Files Modified**: `index.html` (lines ~4860, ~5020-5040).

---

### Target 2: First-Visit Logic & Visit Counter Persistence
- **Severity**: P0 Critical
- **Symptoms**: Line 3608 evaluated `const isFirstVisit = !S.visitCount || S.visitCount <= 1;`, but `S.visitCount` was never persisted in local storage or initialized in state `S`. Consequently, every session was permanently treated as a first-time visitor.
- **Root Cause**: `visitCount` was missing from `S` initial state declaration, was omitted from day-rollover logic, and was not preserved across session resets.
- **Fix Applied**:
  - Added persistent `visitCount` initialization reading from `localStorage.getItem('aa_cafe_visit_count')`.
  - Incremented `S.visitCount` on day rollover (`saved.S.day !== dayNow()`) and stored the updated count back to `localStorage`.
  - Updated `resetSession()` to preserve existing `visitCount`, ensuring that resetting a game session never resets the customer's historical visit status.
- **Files Modified**: `index.html` (lines ~3340, ~6500-6550).

---

### Target 3: Score Modification vs. Leaderboard Integrity
- **Severity**: P0 Critical
- **Symptoms**: When a first-time player scored $\ge 350$ points, `endRun()` overwrote `run.score = 5000;`. This synthetic score was then passed directly into `LeaderboardEngine.recordScore()`, placing low-scoring players at the top of the competitive leaderboard.
- **Root Cause**: The promotional qualification bonus was modifying the single `run.score` variable used for both reward qualification and competitive ranking.
- **Fix Applied**:
  - Captured `const rawScore = run.score; run.rawScore = rawScore;` before applying the promotional welcome bonus.
  - Allowed `run.score = 5000;` to remain in effect for voucher ladder qualification (`tierOf(S.best)`).
  - Derived `const lbScore = (run.rawScore !== undefined) ? run.rawScore : run.score;` and passed `lbScore` to both `LeaderboardEngine.recordScore()` and `syncCustomerTransactionToStaffDB()`.
- **Files Modified**: `index.html` (lines ~3610-3620, ~3685, ~3730).

---

### Target 4: Deductions Audit & Double-Penalty Elimination
- **Severity**: P0 Critical
- **Symptoms**: When a critical hazard occurred (such as hitting a burnt bean or missing a cup), games called `c.loseHeart()` and `c.miss()` concurrently. This doubled `mistakeCount`, triggered two overlapping audio tones (`SFX.miss()`), and deducted points on top of heart loss.
- **Root Cause**: Lack of debouncing and state coordination between the heart-loss handler and the minor mistake penalty handler.
- **Fix Applied**:
  - Recorded timestamp `r.lastHeartLossAt = Date.now();` within `c.loseHeart()`.
  - In `c.miss()`, checked `const justLostHeart = (Date.now() - (run.lastHeartLossAt || 0)) < 80;`.
  - If a heart was just deducted, `c.miss()` suppresses the secondary point deduction, does not increment `mistakeCount` a second time, and avoids duplicate audio playback.
  - Minor mistakes without heart loss (such as rhythm offbeats) continue to apply standard combo penalties and small point adjustments.
- **Files Modified**: `index.html` (lines ~5580-5645).

---

### Target 5: Pair Hunt (`pairhunt`) Card Mismatch Penalty
- **Severity**: P1 High
- **Symptoms**: In Pair Hunt, flipping two non-matching cards deducted a full heart (`c.loseHeart()`), resulting in rapid game over after only 3 non-matching flips, which contradicted the stated game instructions.
- **Root Cause**: Line 4785 called `c.loseHeart()` inside the card mismatch branch.
- **Fix Applied**:
  - Removed `c.loseHeart()` from card mismatch.
  - Retained `c.miss()` to break combo, deduct minor points, and flip cards back after 650ms, matching the game rules and player expectations.
- **Files Modified**: `index.html` (lines ~4790-4805).

---

### Target 6: Coffee Bean Catch (`beans`) Physics & Reachable Bounds
- **Severity**: P0 Critical
- **Symptoms**: During browser frame drops or tab switching, large delta-time spikes caused falling beans to skip physics steps. Furthermore, consecutive beans occasionally spawned at opposite screen edges simultaneously, making them physically impossible to catch.
- **Root Cause**: Unclamped `dt` in `c.loop()`, unconstrained random horizontal coordinates, and un-capped falling speeds at higher difficulty tiers.
- **Fix Applied**:
  - Clamped frame delta time: `const safeDt = Math.min(dt, 0.05);`.
  - Tracked `lastSpawnX` and constrained subsequent spawn coordinates to reachable horizontal bounds (`maxReach = 190px`).
  - Clamped maximum bean drop velocity to `360 px/s` and spawn rate timer to `Math.max(380ms, ...)`.
  - Suppressed uncollected bean penalties if the player had not moved or if an unnatural lag spike occurred.
- **Files Modified**: `index.html` (lines ~4290-4350).

---

### Target 7: Saudi Phone Number Normalization & Masking
- **Severity**: P1 High
- **Symptoms**: `SaudiPhone.validate` returned `{ valid, canonical, masked, localDigits }`, but callers referenced `v.formatted`. If `v.formatted` was undefined, `S.phone` became `undefined`.
- **Root Cause**: Mismatch between the return signature of `SaudiPhone.validate` and caller expectations.
- **Fix Applied**:
  - Updated `SaudiPhone.validate` to include `formatted: canonical`.
  - Defensive fallback in caller: `S.phone = v.canonical || v.formatted;`.
  - Ensured phone numbers are masked everywhere in public views (`+966 5X *** XXXX`) and only unmasked for authorized staff.
- **Files Modified**: `index.html` (lines ~2556, ~5775).

---

### Target 8: Two-Minute Inactivity Session Expiry Watchdog
- **Severity**: P1 High
- **Symptoms**: Drive-thru customers who abandoned an active session or left the tab idle on the home screen left uncommitted scores vulnerable to tampering or lingering states.
- **Root Cause**: `checkSessionInactivity` only checked active runs (`run && !run.over`) and did not clean up idle uncommitted scores on the home view.
- **Fix Applied**:
  - Expanded `checkSessionInactivity` to handle both active runs (expiring the game cleanly) and idle home states (`!run || run.over`).
  - If a user is idle for $\ge 120$ seconds with an uncommitted score (`S.best > 0 && !S.claim`), the score is cleared (`S.best = 0; S.bestBy = {};`) and the home view refreshed, while legitimately claimed vouchers in `S.claim` and local wallet remain preserved.
- **Files Modified**: `index.html` (lines ~5885-5900).

---

### Target 9: Production Test Hooks Security Gating
- **Severity**: P1 Security
- **Symptoms**: `window.__mintRunCert` was unconditionally exposed on the global `window` object in all runtime environments.
- **Root Cause**: Debugging and test harness helper functions were exposed without checking the runtime origin.
- **Fix Applied**:
  - Gated `window.__mintRunCert` strictly behind `isTestEnv` verification:
    ```javascript
    const isTestEnv = (typeof location !== 'undefined' && 
      (location.protocol === 'file:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) || 
      (typeof window !== 'undefined' && !!window.__TEST_MODE__);
    ```
- **Files Modified**: `index.html` (lines ~6625-6645).

---

### Target 10: Test Suite Hardening & Cross-Platform Portability
- **Severity**: P1 Engineering Quality
- **Symptoms**: `reproduce_bugs.js`, `test_40_comprehensive_scenarios.js`, `test_all_user_scenarios.js`, and `test_new_15_requirements.js` contained hardcoded Windows paths (`c:/Users/sam20/...`). Running these scripts on Linux, macOS, or standard CI environments produced immediate load errors.
- **Root Cause**: Absolute file paths hardcoded during rapid local diagnostic sessions.
- **Fix Applied**:
  - Replaced hardcoded playwright require paths with dynamic fallback loaders checking standard module resolution, `process.env.USERPROFILE`, and `process.env.HOME`.
  - Replaced hardcoded HTML paths with `path.join(__dirname, 'index.html')` and portable URI resolvers.
- **Files Modified**: `reproduce_bugs.js`, `test_40_comprehensive_scenarios.js`, `test_all_user_scenarios.js`, `test_new_15_requirements.js`.

---

## 3. Regression Verification & Full Test Suite Execution

All 4 test suites were executed sequentially following Phase 1 implementation.

### Comprehensive Results Summary
```
=======================================================================================
                         PHASE 1 TEST VERIFICATION MATRIX                              
=======================================================================================
Test Suite                              Passed / Total    Pass Rate    Status
---------------------------------------------------------------------------------------
test_platform.js (Master Suite)           244 / 244         100%       VERIFIED PASS
test_new_15_requirements.js               15 / 15          100%       VERIFIED PASS
test_all_user_scenarios.js                10 / 10          100%       VERIFIED PASS
test_40_comprehensive_scenarios.js        40 / 40          100%       VERIFIED PASS
---------------------------------------------------------------------------------------
TOTAL AGGREGATE                         309 / 309         100%       ZERO REGRESSIONS
=======================================================================================
```

---

## 4. Phase 1 Sign-Off & Verification

All targets defined under Phase 0 and Phase 1 of the Master Engineering Prompt have been fully executed, tested, and frozen.

**Execution Phase Status**: `PHASE 0 + PHASE 1 COMPLETE — VERIFIED`
