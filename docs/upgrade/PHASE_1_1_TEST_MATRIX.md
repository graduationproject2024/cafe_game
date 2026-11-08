# A&A CAFE GAMES — PHASE 1.1 TEST MATRIX
## Comprehensive Audit, Behavioral Classification & Traceability Report

**Project:** the A&A Specialty Cafe & Sweets — Al-Madinah Al-Munawwarah  
**Date:** November 8, 2026  
**Total Automated Tests:** 317  
**Passing Rate:** 317 / 317 (100%)

---

### 1. Test Suite Architecture & Summary

The platform's quality and stability are validated by five specialized automated test suites executing across Node.js unit harnesses and real Chromium browser contexts via Playwright:

| Test File | Focus & Scope | Execution Harness | Total Tests | Pass Rate |
|---|---|---|:---:|:---:|
| `test_phase_1_1_hardening.js` | 8 Phase 1.1 Hardening Targets & Root-Cause Proof | Real Headless Chromium | 8 | 8 / 8 (100%) |
| `test_platform.js` | Core Architectural, Cryptographic, Physics & Security Matrix | Headless DOM & VM Simulation | 244 | 244 / 244 (100%) |
| `test_new_15_requirements.js` | 15 Client-Specified Refinement Rules & Policies | Real Headless Chromium | 15 | 15 / 15 (100%) |
| `test_all_user_scenarios.js` | E2E Customer Journey Scenarios & Mobile Touch Testing | Real Headless Chromium | 10 | 10 / 10 (100%) |
| `test_40_comprehensive_scenarios.js` | 40 Real-User Scenarios & Security Penetration Matrix | Real Headless Chromium | 40 | 40 / 40 (100%) |
| **TOTAL** | **Comprehensive Full-Platform Coverage** | **Multi-Tier Automated Harness** | **317** | **317 / 317 (100%)** |

---

### 2. Behavioral vs. Static Classification

To prevent false confidence from static string matching, every test was audited and classified:

- **Dynamic Behavioral Tests (68% of assertions, 215 tests):**
  - Execute live JavaScript within a sandboxed page or Chromium browser.
  - Interact with pointer events, drag trajectories, DOM mutation, timers, audio contexts, and storage.
  - Test real state transitions, cryptographic signature invalidation, physics calculations, and race conditions.
  - Examples: Basketball shot arc & rim bounce, Session watchdog timeout, Leaderboard sync, Voucher cryptographic verification.

- **Static Contract & Structural Tests (32% of assertions, 102 tests):**
  - Validate syntax cleanliness, AST integrity, presence of required AR/EN localization keys, non-presence of retired legacy games, schema structure, and WCAG accessibility attributes.
  - Examples: HTML5 doctype verification, absence of `colorshift` (Flavor Harmony), accessibility `role="dialog"` attributes, zero occurrences of hardcoded developer paths.

---

### 3. Traceability Matrix

| Requirement / Component | Specific Behavioral Tests | Verification Method | Result |
|---|---|---|:---:|
| **9-Game Approved Inventory** | `test_platform.js` Suite 2 (14 tests) | AST parse of `GAMES` array; exact count == 9; verifies 4 new games, 5 kept games, retired games absent. | PASS |
| **Basketball Trajectory & Physics** | `test_phase_1_1_hardening.js` Target 5; `test_40_comprehensive_scenarios.js` Scen 9; `test_new_15_requirements.js` Req 12 | Real pointer drag downward; trajectory dot calculation; swish into hoop (+730 pts); off-center rim bounce & floor miss (-1 heart); 3 screenshots captured. | PASS |
| **Score Integrity & 5% Promo Isolation** | `test_phase_1_1_hardening.js` Target 2 | First-time player scoring 420 pts qualifies for welcome voucher; verifies `S.best === 420`, `S.bestBy['reflex'] === 420`, `#resScore === '420'`, voucher issued with type `'T'`. | PASS |
| **Legacy State Migration** | `test_phase_1_1_hardening.js` Target 1 | Pre-loads state lacking `visitCount` with `best > 0`; verifies page startup auto-migrates to `visitCount = 2, firstPromoAwarded = true`. | PASS |
| **Deterministic Hazard Coordination** | `test_phase_1_1_hardening.js` Target 3 | Calls `loseHeart()` and `miss()` in same turn; verifies 1 heart lost, 1 mistake recorded, 0 double points deducted. Tests standalone miss (-25 pts) and `hazard({ heart, miss })`. | PASS |
| **Catch the Beans Fairness** | `test_phase_1_1_hardening.js` Target 4 | Stationary test: falling good bean out of bounds deducts 10 pts and resets combo regardless of player motion. | PASS |
| **Session Exit & 120s Idle Reset** | `test_phase_1_1_hardening.js` Target 6; `test_40_comprehensive_scenarios.js` Scen 24 | Sets `lastActiveAt` to 125s ago; watchdog clears `S.best` and session state to 0 while strictly preserving claimed voucher `TEST-CLAIM-99`. | PASS |
| **Production Debug Isolation** | `test_phase_1_1_hardening.js` Target 7 | Validates that `window.__S`, `window.__mintRunCert`, and debug hooks are defined under test hostnames and completely blocked under production domain. | PASS |
| **Test Infrastructure Portability** | `test_phase_1_1_hardening.js` Target 8 | Scans all test scripts and HTML files; asserts zero occurrences of hardcoded developer paths (`c:/Users/sam20`). | PASS |
| **Single Reward & Upgrade Workflow** | `test_all_user_scenarios.js` Test 9; `test_40_comprehensive_scenarios.js` Scen 35 | Verifies customer can hold only one active coupon; higher score enables upgrade; old voucher code added to `revokedCodes`. | PASS |
| **Saudi Mobile Number Validation** | `test_platform.js` Suite 6 (18 tests) | Normalizes 05XXXXXXXX, 5XXXXXXXX, +9665XXXXXXXX; masks for privacy (`+966 50 *** 4567`); rejects landlines, short, or invalid inputs. Strictly zero OTP barriers. | PASS |
| **Staff Portal Security & Lockout** | `test_platform.js` Suite 28; `test_40_comprehensive_scenarios.js` Scen 37, 38 | Plaintext PINs removed; salted hash verification; failed attempt lockout persisted; HTML escaping of customer data. | PASS |
| **Anti-Cheat Cryptographic Tokens** | `test_platform.js` Suite 3 & Suite 29; `test_40_comprehensive_scenarios.js` Scen 17, 18, 19 | `RUN_CERT` day-bound cryptographic tokens required before voucher minting; session HMAC tamper detection. | PASS |

---

### 4. Regression Proof & Stability Evidence

Across all test runs, zero regression defects were observed:
- All 9 games initialize cleanly with standard difficulty scaling `DifficultyEngine.getNormalized(run)`.
- Cashier portal (`staff.html`) validates authentic cryptographic vouchers, rejects forged strings (e.g. `G-AAAA-AA`), and enforces 3-day expiration.
- UI styling, dark/light themes, Islamic Duff audio toggle, and bilingual translations remain 100% stable.
