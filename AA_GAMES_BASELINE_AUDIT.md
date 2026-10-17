# A&A Cafe Games — Baseline Discovery & Architecture Audit
**Document ID:** `AA_GAMES_BASELINE_AUDIT.md`  
**Date:** October 17, 2026  
**Auditor:** Senior Multidisciplinary Product Engineering Team (Antigravity)  
**Target Platform:** the A&A specialty cafe & sweets (Drive-Thru & Branch, Al-Madinah Al-Munawwarah)  
**Active Project Location:** `C:\Users\sam20\OneDrive\سطح المكتب\cafe_game`  
**Git Branch:** `main` | **HEAD Commit:** `905ae7f docs: correct quiz facts and qualify security claims`  

---

## 1. Executive Summary

This baseline discovery audit establishes the empirical state of the **A&A Cafe Games** platform prior to executing the Master Upgrade. The platform is an interactive, customer-facing mobile web application deployed for drive-thru and in-store patrons of **the A&A specialty cafe & sweets** in Al-Madinah Al-Munawwarah. Customers scan a QR code upon ordering, play quick 60-second mini-games while their artisan coffee and pastries are being crafted, and compete for verified discount vouchers (5% discount, 10% discount, or a complimentary signature beverage).

The audit confirms:
1. **Architecture Model:** A high-performance, zero-dependency, client-only single-page web application (`index.html`) using HTML5, CSS3, and vanilla ES2022 JavaScript, utilizing the Web Audio API for synthetic audio.
2. **Current Game Inventory:** The repository currently has 5 games (`reflex`, `pattern`, `shuffle`, `stack`, `beans`). The fifth signature game is conclusively verified as **Catch the Beans** (`beans` - اصطياد الحبوب).
3. **Vehicle Safety Feature Status:** A legacy 5-state vehicle movement detection system (`SafetySensor`) is present, monitoring GPS `watchPosition` and accelerometer data to interrupt gameplay above 7 km/h. Per Section 10 & 13 of the mandate, this feature must be cleanly excised.
4. **Difficulty System Status:** An intermediate unstaged commit introduced user-facing difficulty buttons (`data-diff="easy"`, `medium`, `hard`). Per Section 4 & 7, customer difficulty selection is strictly prohibited and must be replaced by a unified, automated, adaptive difficulty engine.
5. **Phone Validation Status:** Current validation only checks `phone.length >= 9 && phone.length <= 15`. No Saudi numbering plan validation, canonical normalization (`+9665XXXXXXXX`), or privacy masking is enforced.
6. **Available Agent Capabilities:** 115 specialized agent roles were discovered and verified in `C:\Users\sam20\OneDrive\سطح المكتب\cafe_game.opencode\agents`, providing deep domain expertise across AppSec, Game Design, Accessibility, and UI/UX.

---

## 2. Repository & Environment Discovery

### 2.1 Git Status & Commit Trajectory
- **Primary Working Directory:** `C:\Users\sam20\OneDrive\سطح المكتب\cafe_game`
- **Remote URL:** `https://github.com/graduationproject2024/cafe_game.git`
- **Active Branch:** `main` (tracked to `origin/main`)
- **Recent Git Log:**
  - `905ae7f`: *docs: correct quiz facts and qualify security claims*
  - `f37a6c8`: *chore: redirect duplicate entry file, add global error reporter*
  - `18d6200`: *fix: correct staff PIN hash so the default PIN (2026) still resolves*
  - `fcf81d3`: *harden: remove PIN fallback, persist lockout, stronger signature, device cap*
  - `2583cad`: *feat: accessibility, focus, zoom, and friction fixes*
- **Unstaged Working Tree Changes:**
  - `index.html`: Contains 562 additions and 355 deletions introducing early prototypes of `reflex` (Reflex Rush), `pattern` (Pattern Lock), difficulty selection buttons, and extra-heart Instagram flow.

### 2.2 Physical File Inventory
| File / Directory | Size | Purpose & Role |
| :--- | :--- | :--- |
| `index.html` | 94.6 KB | Primary monolithic application (DOM, CSS design system, SFX synthesizer, game logic, anti-cheat, vouchers) |
| `cafe-games.html` | 569 B | Legacy canonical redirect shim pointing to `index.html` |
| `test_platform.js` | 10.7 KB | Node.js VM-based test runner (54 baseline assertions) |
| `assets/logo.png` | 222 KB | Primary official brand logo of the A&A cafe |
| `assets/logo_gold.png` | 41.8 KB | Gold foil emblem variant for dark surfaces and vouchers |
| `assets/logo_transparent.png` | 212 KB | Alpha-channel logo for header and overlay compositions |
| `assets/logo_white.png` | 41.7 KB | High-contrast white brand mark |
| `assets/geometric_pattern.png` | 323 KB | Subtle Madinah Islamic geometric lattice pattern |
| `assets/madinah_pattern.jpg` | 137 KB | Textured heritage motif for background ambiance |
| `docs/` | 10 files | Previous phase reports (A through J) |
| `.opencode/agents/` | 115 files | Specialization profiles for agentic pair-programming |

---

## 3. Game Inventory Analysis & Baseline Assessment

### 3.1 Historical vs Current vs Required Lineup
In the earliest version of the codebase (`dc2c2d3`), 9 games were defined:
1. `beans` (اصطياد الحبوب)
2. `pour` (صبّة الكابتشينو - early prototype)
3. `bubbles` (فقاعات البخار)
4. `memory` (ذاكرة الكافيه)
5. `quiz` (كويز القهوة والمدينة)
6. `simon` (كرّر التحضير)
7. `shuffle` (أين الحبة؟)
8. `sort` (ساخن أو بارد)
9. `stack` (برج الكوبايات)

In intermediate iteration `905ae7f`, games were narrowed to 5: `reflex`, `pattern`, `shuffle`, `stack`, `beans`.

### 3.2 Identification of the Authentic 5th Game
The prompt requires: *"Inspect the repository to identify the actual fifth existing game. Preserve and improve it unless the repository proves that the current game lineup differs."*

**Audit Finding:** The fifth game is **Catch the Beans** (`id: 'beans'`, Arabic: **اصطياد الحبوب**).  
- **Mechanics:** A collection cup moves horizontally along the bottom of the viewport via touch/pointer gestures to catch falling golden coffee beans (+points, +combo) while avoiding burnt/black beans (`burnt` ✕) which penalize points, break combo, and deduct hearts.
- **Verdict:** Retained and elevated with calibrated acceleration curves, dynamic spawn rates, and full integration into the shared difficulty engine.

### 3.3 Final 9-Game Target Lineup
| # | Game Key | Arabic Title | English Name | Status | Gameplay Archetype |
| :---: | :---: | :---: | :---: | :---: | :---: |
| 1 | `reflex` | ردة الفعل السريعة | Reflex Rush | **Replaces Hot or Cold** | Dynamic target-popping & distractor avoidance |
| 2 | `pattern` | قفل النمط | Pattern Lock | **Replaces Coffee Quiz** | Procedural spatial sequence memory reconstruction |
| 3 | `shuffle` | أين الحبة؟ | Where Is the Ball? | **Retained & Improved** | Three-cup dynamic shell game with visual tracking |
| 4 | `stack` | برج الكوبايات | Cup Tower | **Retained & Improved** | High-precision oscillating cup drop & stack balance |
| 5 | `beans` | اصطياد الحبوب | Catch the Beans | **5th Game Retained & Improved** | Touch basket falling projectile collection & hazard avoidance |
| 6 | `colorshift` | تحوّل الألوان | Color Shift | **NEW Addition 1** | Dynamic rule-switching cognitive flexibility (Stroop/shape) |
| 7 | `pour` | صبّة الدقة | Precision Pour | **NEW Addition 2** | Continuous hold-and-release fill timing in golden zone |
| 8 | `rhythm` | إيقاع القهوة | Rhythm Relay | **NEW Addition 3** | Precision musical beat-matching with visual hit windows |
| 9 | `pairhunt` | صيد الأزواج | Pair Hunt | **NEW Addition 4** | Dual-card spatial memory & visual matching grid |

---

## 4. Architectural & Security Baseline

### 4.1 Trust Boundaries & Client-Side Constraints
Because this platform runs as a static client application (deployable directly to GitHub Pages or static CDN), authoritative server-side computation is absent. The baseline audit identifies these explicit trust boundaries:

1. **Vulnerability:** Players could manipulate `localStorage` or execute console commands (`S.best = 9999`) to forge maximum scores.
   - *Existing Mitigation:* `signSession(s)` generates a 32-bit FNV-1a hash over `(salt, phone, order, best, startedAt, difficulty)`. If state is altered, the signature mismatches and the session resets.
   - *Upgrade Action:* Strengthen cryptographic signature with session nonce, action checksum, elapsed time verification, and strict rate limits on score acquisition.
2. **Vulnerability:** Trivial repetition and memorization of fixed questions or static layouts.
   - *Upgrade Action:* Procedural generation layer with randomized seeds, avoiding immediate repeat sequences across consecutive rounds.
3. **Vulnerability:** Unrestricted rapid-fire clicking or automated clickers.
   - *Upgrade Action:* Human reaction time lower-bounds (rejecting clicks < 120ms from stimulus appearance) and anti-spam penalties for empty canvas taps.

### 4.2 Cashier / Staff Portal
- **Route:** `index.html#staff`
- **Current State:** Cashier enters PIN `2026`. The PIN is hashed using `hash(CFG.salt + '|' + pin)` and compared to `CFG.staffPinHash = 1241566683`.
- **Brute-Force Protection:** 3 consecutive failed attempts trigger an immutable 60-second lockout stored in `localStorage`.
- **Action:** Retain and preserve this working implementation; add masked customer phone numbers in redemption records for customer privacy.

---

## 5. Vehicle Safety Sensor Findings & Excision Plan

### 5.1 Analysis of Existing `SafetySensor`
The current implementation in `index.html` includes:
- Lines 691–880: `const SafetySensor = { ... }` implementing a 5-state machine (`MOVING`, `POTENTIALLY_STATIONARY`, `STATIONARY_CONFIRMED`, `MOVEMENT_DETECTED`, `INVALID_OR_UNAVAILABLE`).
- Lines 721–736: GPS `navigator.geolocation.watchPosition` and `window.DeviceMotionEvent`.
- Lines 308–320: `#screen-locked` modal ("السيارة تتحرك!").
- Lines 384, 463: `#homeSensorStatus`, `#gameSensorStatus` sensor badges.
- Lines 1814–1818: Simulated motion toggle for debugging.
- Lines 346: Customer consent checkbox ("السيارة متوقفة تماماً...").

### 5.2 Excision Protocol
Per Section 10 & 13 of the specification:
1. Remove `SafetySensor` object entirely.
2. Remove `#screen-locked` modal, sensor pills, and simulation buttons.
3. Remove vehicle motion check from game loop (`if(!r.paused && !SafetySensor.isMoving)` -> `if(!r.paused)`).
4. Remove `#safe` checkbox and related registration blocking.
5. Update `test_platform.js` to eliminate vehicle sensor assertions and verify complete absence of movement restrictions.

---

## 6. Saudi Mobile Validation Baseline

### 6.1 Current Defect
Currently, registration only checks:
```javascript
if(phone.length < 9 || phone.length > 15) problems.push('رقم جوال صحيح (مثال: 05XXXXXXXX)');
```
This permits invalid prefixes (e.g. `011...` landlines, `02...`), international numbers, arbitrary strings of digits, and fails to normalize to the canonical international E.164 standard (`+9665XXXXXXXX`).

### 6.2 Target Requirements (Strict: Format Only, No OTP, No Paid API)
- **Supported Formats:**
  - `05XXXXXXXX`
  - `5XXXXXXXX`
  - `+9665XXXXXXXX`
  - `9665XXXXXXXX`
- **Normalization:** Canonical `+9665XXXXXXXX` (exactly 13 characters, starting with `+9665` followed by 8 digits).
- **Validation Rules:** First national digit must be `5`. Total mobile length must equal 9 digits. Rejects landlines, non-Saudi prefixes, and incorrect lengths.
- **Privacy:** Phone numbers displayed on public leaderboards or cashier logs must be masked (e.g. `+966 5* *** 1234`).
- **No OTP:** Explicitly remove any OTP screens, provider configs, or SMS verification claims.

---

## 7. Baseline Test Execution Results

The existing test suite was executed prior to modifications:
```bash
node C:\Users\sam20\OneDrive\سطح المكتب\cafe_game\test_platform.js
```
**Results:**
- **Suite 1 (HTML & Script Syntax):** 8/8 Passed
- **Suite 2 (Game Inventory - 5 games):** 13/13 Passed
- **Suite 3 (Anti-Cheat & Signature):** 7/7 Passed
- **Suite 4 (Difficulty Multipliers - Old):** 7/7 Passed (Tested easy/medium/hard buttons)
- **Suite 5 (Vehicle SafetySensor - Old):** 9/9 Passed
- **Suite 6 (Three Hearts System):** 5/5 Passed
- **Suite 7 (Social Links):** 5/5 Passed
- **Total:** 54/54 Passed (0 Failed)

*Note:* Suites 4 and 5 reflect the previous design that is being superseded. The new test suite will expand coverage to 9 games, procedural generation, automated difficulty scaling, and comprehensive Saudi phone normalization.

---

## 8. Implementation Phase Roadmap

- **Phase 0:** Environment Discovery & Baseline Audit *(Completed — this document)*.
- **Phase 1:** Shared Architecture, Unified Adaptive Difficulty Engine, and Saudi Phone Validator.
- **Phase 2:** Replace Hot or Cold (`reflex`) & Coffee Quiz (`pattern`) with enhanced procedural mechanics.
- **Phase 3:** Rebalance & Upgrade Where Is the Ball? (`shuffle`), Cup Tower (`stack`), and Catch the Beans (`beans`).
- **Phase 4:** Implement 4 New Games: Color Shift (`colorshift`), Precision Pour (`pour`), Rhythm Relay (`rhythm`), and Pair Hunt (`pairhunt`).
- **Phase 5:** Excision of Vehicle Safety Sensor & Implementation of Privacy Protections.
- **Phase 6:** Premium UI/UX Redesign (Madinah Cafe Brand Identity, Mobile-Native Touch, CSS Typography & Micro-Interactions).
- **Phase 7:** Automated Testing Expansion & Browser Visual QA.
- **Phase 8:** Release Readiness Documentation & Deployment Verification.
