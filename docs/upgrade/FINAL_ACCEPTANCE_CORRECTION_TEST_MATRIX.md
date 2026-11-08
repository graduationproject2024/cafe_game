# the A&A Specialty Cafe & Sweets — Al-Madinah Al-Munawwarah
## Final Acceptance Correction & Release Gate Test Matrix
**Suite:** `test_final_acceptance_gate.js`  
**Execution Environment:** Chromium Headless (390×844 Mobile Viewport)  
**Total Assertions:** 36 | **Passed:** 36 | **Failed:** 0 | **Success Rate:** 100%

---

## Complete Verification Matrix

| # | Target Area | Description | Verified Evidence / Assertion Criterion | Status |
|:---|:---|:---|:---|:---:|
| 1 | **Target A** | Earned qualifying score through real pointer taps on genuine game targets | Genuine Reflex Rush taps on `.rx-target.gold` earned $\ge 350\text{ pts}$ without script injection | **PASS** |
| 2 | **Target A** | Result screen displays genuine raw score and activates 5% welcome discount | Result screen displays actual score ($376\text{ pts}$) and renders 5% discount ladder indicator | **PASS** |
| 3 | **Target A** | 5% Welcome voucher issued with valid code, 3-day expiry & saved to customer wallet | Code issued starts with `T` (e.g. `TNAX-...`), type is `T`, expiry is 3 days, stored in `the_aa_cafe_vouchers_wallet` | **PASS** |
| 4 | **Target A** | Issued voucher persists across browser reload in both state and local wallet | Full page reload preserves `S.claim` and matches voucher code stored in persistent local wallet | **PASS** |
| 5 | **Target A** | Duplicate voucher claim attempt strictly rejected: no second coupon minted, wallet unchanged | Second claim attempt via UI and direct call blocked; wallet count stays at 1, existing code preserved | **PASS** |
| 6 | **Target B** | Unclaimed welcome promo entitlement SURVIVES midnight day rollover | Day rollover from Day $D$ to Day $D+1$ preserves `welcomePromoStatus === 'QUALIFIED'`, `welcomePromoCert`, and increments visit count to 2 | **PASS** |
| 7 | **Target B** | Cryptographic signature of Day D welcome certificate VERIFIES on Day D+1 | `verifyCert(S.welcomePromoCert)` accepts Day $D$ certificate within 48h approved window and verifies HMAC signature | **PASS** |
| 8 | **Target B** | Customer successfully claims 5% welcome voucher on Day D+1 into wallet | Customer executes `claimFlow()` on Day $D+1$, issues `TNAX-...` voucher, adds to wallet, transitions status to `CLAIMED` | **PASS** |
| 9 | **Target B** | Forged welcome certificate with altered score is strictly REJECTED on Day D+1 | Certificate with score modified to 10,000 pts with original signature strictly fails `verifyCert()` | **PASS** |
| 10 | **Target B** | Forged welcome certificate with invalid signature is strictly REJECTED on Day D+1 | Certificate with tampered signature string strictly fails `verifyCert()` | **PASS** |
| 11 | **Target B** | Normal (non-welcome) run certificate from Day D is strictly REJECTED on Day D+1 | Regular run certificate from yesterday (`isWelcomePromo: false`) fails same-day check on Day $D+1$ | **PASS** |
| 12 | **Target B** | Expired welcome certificate (>2 days old) is strictly REJECTED on Day D+1 | Welcome certificate dated 4 days prior strictly fails validity window ($currentDay - cert.day \le 2$) | **PASS** |
| 13 | **Target B** | Unqualified customer returning next day correctly transitions to INELIGIBLE | Visitor with score $< 350\text{ pts}$ on Day $D$ transitions to `welcomePromoStatus = 'INELIGIBLE'` on Day $D+1$ rollover | **PASS** |
| 14 | **Target C** | Basketball dragging renders parabolic trajectory aim dots | Pointer drag on `#bbBall` calculates and renders $\ge 8$ parabolic trajectory aim dots (`.bb-aim-dot`) | **PASS** |
| 15 | **Target C** | Made shot enters net cleanly: score increases, 0 hearts deducted | Release towards hoop triggers swish net animation, awards $> 700\text{ pts}$, retains 3 hearts | **PASS** |
| 16 | **Target C** | Missed shot bounces on floor, deducts exactly 1 heart with miss feedback | Deflected lateral shot misses rim, hits court floor, deducts exactly 1 heart ($hearts = 2$) with miss notification | **PASS** |
| 17 | **Target D** | Bean Catch renders real stage, burlap sack and responsive canvas dimensions | Stage height $> 200\text{px}$, responsive burlap sack `.beans-basket` rendered with A&A branding | **PASS** |
| 18 | **Target D** | Bean Catch swept collision catches golden beans and increases score strictly | Intercepting falling golden bean with sack strictly increases `run.score` ($> 0\text{ pts}$) | **PASS** |
| 19 | **Target D** | Stationary player exploit eliminated: missed good bean triggers strict -10 pt penalty | Moving sack away causes good bean to fall past floor, triggering exact $-10\text{ pt}$ deduction and popup notification | **PASS** |
| 20 | **Target D** | Burnt coffee bean collision deducts heart correctly (-1 ❤️) | Colliding with burnt bean (`✕`) deducts exactly 1 heart ($hearts = 2$) | **PASS** |
| 21 | **Target E** | Companion hazard unifies heart and score penalties without double deduction | Tokenized companion hazard unifies heart loss and miss without double point deduction | **PASS** |
| 22 | **Target E** | Duplicate callbacks on identical event ID are strictly idempotent | Duplicate event ID invocation ignored; state and score remain unaffected | **PASS** |
| 23 | **Target E** | Independent hazard with unique event ID applies score penalty correctly | Hazard with distinct event ID in same frame applies $-25\text{ pt}$ penalty as expected | **PASS** |
| 24 | **Target E** | Anonymous companion hazard unifies immediately and allows subsequent independent misses | Anonymous hazard unifies companion miss immediately while penalizing next independent miss | **PASS** |
| 25 | **Target F** | Production origin strictly excludes all internal debug and test hooks | Under simulated production domain, all debug hooks (`__setRun`, `__mintRunCert`, etc.) are `undefined` | **PASS** |
| 26 | **Target F** | Attacker setting window.__TEST_MODE__ in production CANNOT enable hooks | Malicious attempt to force test mode on production origin is strictly rejected | **PASS** |
| 27 | **Target G** | Game [reflex] launches, renders stage, verifies input behavior & exits cleanly | Reflex Rush spawns targets in `.rx-stage`; target click registers hit and cleans up to home | **PASS** |
| 28 | **Target G** | Game [pattern] launches, renders stage, verifies input behavior & exits cleanly | Pattern Lock renders 3×3 grid; node click registers tap state; cleanly exits to home | **PASS** |
| 29 | **Target G** | Game [shuffle] launches, renders stage, verifies input behavior & exits cleanly | Where Is the Bean renders 3 cups; cup selection registers choice; cleanly exits to home | **PASS** |
| 30 | **Target G** | Game [stack] launches, renders stage, verifies input behavior & exits cleanly | Cup Tower animates moving cup; tap drops cup onto stack; cleanly exits to home | **PASS** |
| 31 | **Target G** | Game [beans] launches, renders stage, verifies input behavior & exits cleanly | Catch the Beans burlap sack moves horizontally via keyboard arrows; cleanly exits to home | **PASS** |
| 32 | **Target G** | Game [pour] launches, renders stage, verifies input behavior & exits cleanly | Precision Pour stage pointerdown triggers stream and raises liquid height; cleanly exits to home | **PASS** |
| 33 | **Target G** | Game [rhythm] launches, renders stage, verifies input behavior & exits cleanly | Espresso Rhythm renders extraction track; clicking pill switches active track; cleanly exits to home | **PASS** |
| 34 | **Target G** | Game [pairhunt] launches, renders stage, verifies input behavior & exits cleanly | Cafe Memory renders 12 cards; card click flips and reveals icon; cleanly exits to home | **PASS** |
| 35 | **Target G** | Game [basketball] launches, renders stage, verifies input behavior & exits cleanly | Basketball Shoot renders ball; drag calculates aim dots and launches ball; cleanly exits to home | **PASS** |
| 36 | **Target G** | Zero uncaught console errors recorded across all nine game lifecycles | Total page errors across full execution of all nine games is strictly 0 | **PASS** |

---

## Regression Verification Suites Summary

1. **Phase 1.1.1 Hotfix Suite (`test_phase_1_1_1_hotfix.js`):**
   - 20 / 20 Assertions PASSED (100%)
   - Verified Welcome Reward Scenarios A through P, 120s Idle Reset with entitlement preservation, Basketball Aim/Miss, and Hazard Coordination.
2. **Platform Master Suite (`test_platform.js`):**
   - 244 / 244 Assertions PASSED (100%)
   - Verified 9-game authentic inventory, cryptographic anti-tamper, Saudi mobile validator (no OTP), reward economy (7% threshold), Cashier security, and WCAG accessibility.
3. **Total Automated Assertions Verified:** 300 / 300 PASSED (0 FAILURES).
