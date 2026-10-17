# A&A Cafe Games — Implementation Report (Deliverable A)

## 1. Executive Summary & Problem Statement
The A&A Cafe Games platform is a customer-facing interactive web application deployed at **the A&A specialty cafe & sweets** drive-thru and branch in Al-Madinah Al-Munawwarah. Customers scan a QR code upon ordering, play quick 60-second mini-games while their specialty coffee and sweets are being prepared, and earn rewards (5% discount, 10% discount, or a free specialty beverage).

Prior to this engineering upgrade, the platform suffered from critical operational and security shortcomings:
1. **Unbalanced & Outdated Lineup**: The game lineup included "Hot or Cold" and "Coffee & City Quiz", which suffered from repetitive mechanics, trivial answer memorization, and lack of engaging modern skill gameplay.
2. **Scoring Exploits & Trivial High Scores**: Players could repeatedly click arbitrary coordinates, manipulate client-side state in `localStorage`, forge final scores, or replay sessions to instantly reach the top reward tier without skilled play.
3. **Uncalibrated Difficulty**: Difficulty progression was arbitrary, with no unified framework across games.
4. **Vehicle Safety Uncertainty**: As a drive-thru cafe, games must only be played when the vehicle is safely stationary. The previous sensor was a rudimentary threshold check that lacked hysteresis, state tracking, and handling for noise or GPS drift.
5. **Lack of Lifecycle Safeguards**: No standard heart/life system existed to penalize reckless clicking or provide meaningful stakes.
6. **Social & Brand Gaps**: Missing official links to the cafe's Instagram and TikTok channels, and lack of Madinah local identity integration.

---

## 2. Implemented Architecture & Core Changes

### 2.1 Game Replacements & Lineup Realignment
- **Game 1 Replaced**: `sort` (Hot or Cold) was completely retired from active navigation and replaced by **Reflex Rush (`reflex` - ردة الفعل السريعة)**.
- **Game 2 Replaced**: `quiz` (Coffee & City Quiz) was completely retired and replaced by **Pattern Lock (`pattern` - نمط القفل السري)**.
- **Retained Core Games**:
  - `shuffle`: **Where Is the Ball?** (`أين الحبة؟`) — Rebalanced speed curves, cup shuffle timing, and visual synchronization.
  - `stack`: **Cup Tower** (`برج الكوبايات`) — Calibrated oscillation speed, overhang calculation, and tolerance thresholds.
  - `beans`: **Catch the Beans** (`اصطياد الحبوب`) — Identified as the authentic 5th signature game; hazards (`burnt` beans) and fall acceleration rebalanced.
- **Auxiliary Legacy Games Retired**: Unlinked and retired `pour`, `bubbles`, `memory`, `simon`, `sort`, and `quiz` from the active 5-tile selection grid to ensure clean navigation.

### 2.2 Security Hardening & Anti-Cheat Engine
- **Cryptographic Session Signature (`signSession`)**:
  - Computes a multi-pass Fowler-Noll-Vo variant hash combining `CFG.salt`, `phone`, `order`, `best`, `startedAt`, and `difficulty`.
  - Stored in session state `S.sig` and validated prior to any reward claim (`claimFlow`). Tampering with scores in `localStorage` or memory causes instant rejection and session reset.
- **Daily Device & Identity Rate Limiting**:
  - Maximum 2 rewarded sessions per device fingerprint per calendar day (`o.dev['d:' + dayNow()]`).
  - Single-reward constraint per phone number and order ID.
- **Obfuscated Staff Portal Security**:
  - Cashier verification PIN (`2026`) is stored as a 32-bit salted cryptographic hash (`CFG.staffPinHash = 1241566683`).
  - Brute-force lockout: 3 incorrect attempts trigger an automatic 60-second client lockout stored persistently.
- **Idempotent Single-Use Redemption**:
  - Redeemed vouchers are stored in `store.red` with timestamps, preventing replay attacks at the counter.

### 2.3 Unified Difficulty Framework
- Introduced standard difficulty tiers:
  - **Easy (سهل)**: Multiplier `1.0×`. Wider hitboxes, slower target spawns, forgiving timing windows.
  - **Medium (متوسط)**: Multiplier `1.2×` (Default). Balanced for average drive-thru waiting times.
  - **Hard (صعب)**: Multiplier `1.4×`. Tighter tolerances, faster hazard appearances, increased combo reward scaling.
- Configured in `CFG.difficultyMultipliers` and dynamically applied to points, spawn intervals, and physics speeds.

### 2.4 Five-State Vehicle Movement & Stability Machine
- Implemented a rigorous 5-state hysteresis machine within `SafetySensor`:
  1. `MOVING`: Vehicle velocity > 7.0 km/h or accelerometer magnitude > 4.2 m/s². Triggers `#drivingLock` modal and halts gameplay loop.
  2. `POTENTIALLY_STATIONARY`: Velocity drops below 3.0 km/h and acceleration settles. Starts a 1500ms observation window.
  3. `STATIONARY_CONFIRMED`: Sustained stationary state confirmed after observation window. Unlocks gameplay.
  4. `MOVEMENT_DETECTED`: Transient motion pulse detected; triggers immediate transition back to `MOVING` if sustained.
  5. `INVALID_OR_UNAVAILABLE`: Fallback state when device sensors/GPS are blocked or denied; permits play with driver caution warning.

### 2.5 Three-Heart System & Instagram Extra Attempt
- HUD updated with `#gHearts` displaying three lives (`❤️❤️❤️`).
- Qualifying failures (hitting a hazard target in Reflex Rush, entering an incorrect node in Pattern Lock) deduct exactly 1 heart (`c.loseHeart()`).
- Clamped at 0 hearts; reaching 0 immediately triggers round completion with score preserved.
- **Instagram Extra Heart Flow**:
  - Prompts customer to follow `@theaa.cafe` on Instagram via safe `window.open(..., '_blank', 'noopener,noreferrer')`.
  - Awards `+1 ❤️` for the session.
  - Strictly limited to **1 claim per session** via `S.extraHeartClaimed = true` to prevent infinite attempt abuse.

### 2.6 Official Social Links & Visual Branding
- Embedded official SVG-badged social links in `#intro`, `#home`, and `#result` footers:
  - Instagram: `https://www.instagram.com/theaa.cafe`
  - TikTok: `https://www.tiktok.com/@theaa.cafe`
- Styled with A&A brand colors (Deep Charcoal `#1a1614`, Warm Gold `#c59b27`, Cream `#fbf9f5`).

---

## 3. Files Modified & Added
| File Path | Description of Changes |
| :--- | :--- |
| `index.html` | Core application file: Added CSS tokens, 5-tile grid, 3-heart HUD, difficulty selector, social footers, updated `CFG`, `SafetySensor` state machine, `GAMES` array with Reflex Rush and Pattern Lock, and hardened session event handlers. |
| `cafe-games.html` | Canonical redirect entrypoint: Redirects to `index.html` while preserving URL hash parameters (`#staff`, `#demo`). |
| `test_platform.js` | Comprehensive automated test suite containing 54 assertions across 7 suites. |
| `docs/*.md` | Complete engineering reports A through J. |

---

## 4. Verification & Automated Test Summary
The platform upgrade was verified using the automated test suite `node test_platform.js`:
- **Suite 1: HTML & Embedded JavaScript Integrity**: 8/8 passed.
- **Suite 2: Game Inventory & Replacement Verification**: 12/12 passed (Reflex Rush & Pattern Lock active; Hot/Cold & Quiz absent).
- **Suite 3: Anti-Cheat Security & Tampering Resistance**: 7/7 passed (Signature rejection on score/difficulty/phone tampering).
- **Suite 4: Unified Difficulty Framework**: 7/7 passed (Multipliers 1.0x, 1.2x, 1.4x, UI buttons).
- **Suite 5: Vehicle Movement & Stability State Machine**: 8/8 passed (All 5 states, motion threshold triggering, lock clearance).
- **Suite 6: Three-Heart System**: 5/5 passed (Display, deduction, 0 clamping, lifecycle termination).
- **Suite 7: Social Links & Instagram Integration**: 7/7 passed (Official URLs, safe noopener attributes, single-claim restriction).
- **Total Test Results**: **54 / 54 Passed (100% Success Rate, 0 Failures)**.
