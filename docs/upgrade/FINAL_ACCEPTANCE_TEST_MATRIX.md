# A&A CAFE GAMES — FINAL ACCEPTANCE TEST MATRIX
## Comprehensive Verification Breakdown, Per-Game Results & Observable Evidence

**Project:** the A&A Specialty Cafe & Sweets — Al-Madinah Al-Munawwarah, Saudi Arabia  
**Environment:** Node.js v24.x, Playwright v1.48+, Chromium Headless (Mobile Emulation: 390x844)  
**Date:** November 8, 2026  
**Status:** **366 / 366 TESTS PASSED (100% PASS RATE)**  

---

### 1. Master Acceptance Suite Breakdown (`test_final_acceptance_gate.js`)

| Index | Target Category | Description / Assertion | Observable Browser Evidence | Status |
|:---:|---|---|---|:---:|
| 0 | **Target A** | Earned qualifying score through real pointer taps on genuine game targets | Earned genuine score: 528 pts via real pointer clicks on `.rx-target.gold` (no state injection) | **PASS** |
| 1 | **Target A** | Result screen displays genuine raw score and activates 5% welcome discount | `#resScore` text: "528", `#ladderRes` displays active 5% welcome stop | **PASS** |
| 2 | **Target A** | 5% Welcome voucher issued with valid code, 3-day expiry & saved to wallet | Code: `TNAX-L34-6YK`, Type: `T`, Wallet count: 1 | **PASS** |
| 3 | **Target A** | Issued voucher persists across browser reload in both state and local wallet | Code persists across page reload in `S.claim` and `the_aa_cafe_vouchers_wallet` | **PASS** |
| 4 | **Target A** | Duplicate welcome promo claim is strictly blocked after voucher issuance | Status: `CLAIMED`, `firstPromoAwarded: true`, duplicate claim blocked | **PASS** |
| 5 | **Target B** | Unclaimed welcome promo entitlement SURVIVES midnight day rollover | Status: `QUALIFIED`, `welcomePromoQualified: true`, certificate preserved on Day D+1 | **PASS** |
| 6 | **Target B** | Customer successfully claims 5% discount on the following day | `claimFlow()` accepts preserved `welcomePromoCert` on Day D+1; voucher issued | **PASS** |
| 7 | **Target B** | Unqualified customer returning next day correctly transitions to INELIGIBLE | Player with 150 pts (< 350) transitions to `visitCount: 2, status: 'INELIGIBLE'` | **PASS** |
| 8 | **Target C** | Basketball dragging renders parabolic trajectory aim dots | Mouse down + pull creates 16 dynamic `.bb-aim-dot` elements | **PASS** |
| 9 | **Target C** | Made shot enters net cleanly: score increases, 0 hearts deducted | Swish animation triggered, score increased to 729 pts, hearts remained 3 | **PASS** |
| 10 | **Target C** | Missed shot bounces on floor, deducts exactly 1 heart with miss feedback | Ball rebounds, bounces on floor, hearts decrease 3 -> 2, HUD displays miss | **PASS** |
| 11 | **Target D** | Bean Catch renders real stage, burlap sack and responsive canvas dimensions | Stage height: 418px, Burlap sack `.beans-basket` rendered and responsive | **PASS** |
| 12 | **Target D** | Bean Catch swept collision catches golden beans and increases score | Burlap sack intercepting falling bean increments score (+166 pts) via `c.ok()` | **PASS** |
| 13 | **Target D** | Stationary player exploit eliminated: missed beans trigger real penalty | Uncaught good beans falling past bottom trigger -10 pt penalty pop and combo reset | **PASS** |
| 14 | **Target E** | Companion hazard unifies heart and score penalties without double deduction | Single event token deducts 1 heart and 1 mistake, score remains 1000 (no double penalty) | **PASS** |
| 15 | **Target E** | Duplicate callbacks on identical event ID are strictly idempotent | Duplicate `loseHeart` call on same event ID is ignored; hearts remain 2 | **PASS** |
| 16 | **Target E** | Independent hazard with unique event ID applies score penalty correctly | Independent miss with distinct ID deducts 25 pts (score: 975, mistakes: 2) | **PASS** |
| 17 | **Target E** | Anonymous companion hazard unifies immediately & allows subsequent misses | Companion miss is unified; subsequent independent miss deducts 25 pts (score: 950) | **PASS** |
| 18 | **Target F** | Production origin strictly excludes all internal debug and test hooks | Simulated production host has 0 exposed debug hooks (`__mintRunCert`, `__setRun`, etc.) | **PASS** |
| 19 | **Target F** | Attacker setting window.__TEST_MODE__ in production CANNOT enable hooks | `isTestEnv` evaluates strictly to `false` on any non-localhost host | **PASS** |
| 20 | **Target G** | Game [reflex] launches, renders stage, handles input & exits cleanly | Tile: OK, Stage Children: true, Title: "سرعة الباريستا", 0 console errors | **PASS** |
| 21 | **Target G** | Game [pattern] launches, renders stage, handles input & exits cleanly | Tile: OK, Stage Children: true, Title: "سر النمط", 0 console errors | **PASS** |
| 22 | **Target G** | Game [shuffle] launches, renders stage, handles input & exits cleanly | Tile: OK, Stage Children: true, Title: "أين حبة البن؟", 0 console errors | **PASS** |
| 23 | **Target G** | Game [stack] launches, renders stage, handles input & exits cleanly | Tile: OK, Stage Children: true, Title: "برج الأكواب", 0 console errors | **PASS** |
| 24 | **Target G** | Game [beans] launches, renders stage, handles input & exits cleanly | Tile: OK, Stage Children: true, Title: "اصطياد البن", 0 console errors | **PASS** |
| 25 | **Target G** | Game [pour] launches, renders stage, handles input & exits cleanly | Tile: OK, Stage Children: true, Title: "فن صبّ اللاتيه", 0 console errors | **PASS** |
| 26 | **Target G** | Game [rhythm] launches, renders stage, handles input & exits cleanly | Tile: OK, Stage Children: true, Title: "نغمات الإسبريسو", 0 console errors | **PASS** |
| 27 | **Target G** | Game [pairhunt] launches, renders stage, handles input & exits cleanly | Tile: OK, Stage Children: true, Title: "ذاكرة المقهى", 0 console errors | **PASS** |
| 28 | **Target G** | Game [basketball] launches, renders stage, handles input & exits cleanly | Tile: OK, Stage Children: true, Title: "لعبة السلة", 0 console errors | **PASS** |

---

### 2. The Nine Authentic Games Smoke Test Matrix (Target G)

All nine client-approved authentic games were individually verified in headless Chromium with real user pointer/keyboard inputs:

| # | Game ID | Arabic Name | English Name | Emoji | Tile Selector | Input Verification | Score & Life Engine | Clean Exit | Status |
|:---:|---|---|---|:---:|---|---|---|:---:|:---:|
| 1 | `reflex` | سرعة الباريستا | Reflex Rush | ⚡ | `#tile-reflex` | Click on `.rx-target` | `c.hit` / `c.ok` / `c.loseHeart` | `#resHome` | **PASS** |
| 2 | `pattern` | سر النمط | Pattern Lock | 🔒 | `#tile-pattern` | Click on `.pl-dot` | Pattern sequence matching | `#resHome` | **PASS** |
| 3 | `shuffle` | أين حبة البن؟ | Where Is the Bean | 🫘 | `#tile-shuffle` | Click on `.sh-cup` | Coffee bean reveal (🫘✨) | `#resHome` | **PASS** |
| 4 | `stack` | برج الأكواب | Cup Tower | 🏗️ | `#tile-stack` | Tap on stage | Cup physics & alignment | `#resHome` | **PASS** |
| 5 | `beans` | اصطياد البن | Catch the Beans | 🧺 | `#tile-beans` | Arrow keys & mouse drag | Swept continuous catchment | `#resHome` | **PASS** |
| 6 | `pour` | فن صبّ اللاتيه | Precision Pour | ☕ | `#tile-pour` | Pointer down & hold | Liquid fill & target line | `#resHome` | **PASS** |
| 7 | `rhythm` | نغمات الإسبريسو | Espresso Rhythm | 🎵 | `#tile-rhythm` | Tap / Space bar | Beat sync & hit zone | `#resHome` | **PASS** |
| 8 | `pairhunt` | ذاكرة المقهى | Cafe Memory | 🃏 | `#tile-pairhunt` | Card tap / flip | 12-card match engine | `#resHome` | **PASS** |
| 9 | `basketball` | لعبة السلة | Basketball Shoot | 🏀 | `#tile-basketball` | Slingshot pointer drag | Parabolic arc & net swish | `#resHome` | **PASS** |

---

### 3. Regression Test Suites Execution Record

| Suite Name | Execution Command | Tests | Passed | Failed | Execution Time |
|---|---|:---:|:---:|:---:|:---:|
| Final Acceptance Gate | `node test_final_acceptance_gate.js` | 29 | 29 | 0 | ~35s |
| Phase 1.1.1 Hotfix Suite | `node test_phase_1_1_1_hotfix.js` | 20 | 20 | 0 | ~28s |
| Phase 1.1 Hardening Suite | `node test_phase_1_1_hardening.js` | 8 | 8 | 0 | ~2s |
| Master Platform Suite | `node test_platform.js` | 244 | 244 | 0 | ~12s |
| New 15 Requirements | `node test_new_15_requirements.js` | 15 | 15 | 0 | ~3s |
| User Scenarios E2E | `node test_all_user_scenarios.js` | 10 | 10 | 0 | ~4s |
| 40 Comprehensive Scenarios | `node test_40_comprehensive_scenarios.js` | 40 | 40 | 0 | ~30s |
| **TOTAL** | — | **366** | **366** | **0** | **~114s** |
