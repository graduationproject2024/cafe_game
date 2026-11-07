# the A&A Specialty Cafe & Sweets — Platform Baseline Audit & System Inventory
**Document Reference**: `docs/upgrade/PHASE_0_BASELINE.md`  
**Execution Phase**: PHASE 0 — Baseline Freeze  
**Target Repository**: `https://github.com/graduationproject2024/cafe_game.git`  
**Active Working Branch**: `upgrade/aa-professional-hardening`  
**Baseline Git Commit**: `004a2cf4aa63aef97a04b4705baa236be241e3be`  
**Audit Date**: November 2026  
**Location**: Al-Madinah Al-Munawwarah, Kingdom of Saudi Arabia  

---

## 1. Executive Summary & Baseline Integrity

This baseline document establishes the cryptographic, structural, architectural, and operational state of the A&A Cafe Games platform before beginning the Phase 1 stability and hardening enhancements. All 9 approved cafe mini-games, staff operational interfaces, cryptographic reward systems, and security boundaries have been inventoried and frozen.

### Key Baseline Metrics
- **Total Automated Test Count**: 309 tests across 4 comprehensive suites
- **Baseline Passing Rate**: 309 / 309 (100% PASS, 0 Failures)
- **Active Games Inventory**: Exactly 9 games (Reflex Rush, Pattern Lock, Where Is the Bean?, Cup Tower, Catch the Beans, Precision Pour, Rhythm Relay, Pair Hunt, Basketball)
- **Retired Mini-Games**: Flavor Harmony (`colorshift`), Hot or Cold (`sort`), Coffee Quiz (`quiz`), Legacy Bubbles, Legacy Simon, Legacy Memory
- **Customer Security Paradigm**: Zero-OTP phone authentication + client HMAC session signing + signed run certificates + salted hash coupon minting
- **Staff Portal Security**: Salted SHA-256 PIN hashing + brute-force attempt lockout + cryptographic coupon verification against double-redemption registry

---

## 2. Complete File Inventory with SHA-256 Cryptographic Hashes

Every production source file, test harness, configuration file, and document present in the repository at baseline has been hashed using SHA-256:

| Relative File Path | SHA-256 Digest | Status & Description |
|:---|:---|:---|
| `index.html` | `FB3D556957CFBD93ECA412526CBDC97F62BC6D8B26F5CDE72D665D894F408CCB` | Main customer-facing game platform & UI |
| `staff.html` | `AAF40CF79FEB145F9E7FBCAF4019F76920DF011C24251C9D78AD20DF446B5FB0` | Staff portal, cashier scanner, CRM & analytics |
| `cafe-games.html` | `75218F91E504808D15F04410D923966E15A57E89FD88903CA2B624D642E6F31B` | Legacy reference portal |
| `reward-progress.html` | `B0F7B79C404B2A716575EB2FFA43C658B0638CE6E2600D38455DE93AF7023E3A` | Drive-thru progress bar reference |
| `test_platform.js` | `4F2F57E3D962984FF4268DD6762256F88293BED98632FBAD7E66AF853E320416` | Master test suite (244 tests) |
| `test_new_15_requirements.js` | `F0BE4E1C3CBF2A14E157144AFB90429308DF30438BB7B00A492DF32CAB3ACA58` | User requirements verification (15 tests) |
| `test_all_user_scenarios.js` | `DBF8AFBCFB8F3D70DD748DCC82EC6D073E96A8129456C22E1CE14CD77EA82019` | End-to-end browser user scenarios (10 tests) |
| `test_40_comprehensive_scenarios.js`| `C744C380AE1AC0287156E796E5D912774778F9D13C283FE049234119CE67FDE5` | Comprehensive real-world E2E scenarios (40 tests) |
| `reproduce_bugs.js` | `DF2AA61DD6A5B71EEBABB5D32689CF90CE041779237B70BCFFC0E20E49144CBB` | Runtime diagnostics script |
| `README.md` | `38E5C2FDA12B4D78DE8EC44FECFEFB46DF2693965AE33E94FF6D6AD33D9BC63D` | Project overview & operations guide |
| `GOOGLE_SHEET_SETUP.md` | `CE5ACBC203A781C742130A6D4B6DFC8006DE7EC09DCED3073AE8DC6A9596D2AA` | Outbox Google Apps Script documentation |
| `.gitignore` | `F551BF844A474E9D4599C43EF888014855FBD4EE3A4721E05AF727012E8D4E40` | Git ignore rules |
| `assets/logo.png` | `BC66FA691E59A7012164897A2C5BB069FB4B2C0610E7F9CDB98DCFE3A411EF32` | Official brand mark |
| `assets/logo.svg` | `0D63638CD6165C9C6D96C21C87FA2ED0E00722F3F41685D5A021331F1FCEC796` | Vector logo asset |
| `assets/logo_gold.png` | `854BEAA6D1C1E4FBA7D34B34D132196D842A2615A1D5303E7057958480E78D04` | Gold logo asset |
| `assets/logo_transparent.png`| `8545D4F401521DD7EB85327DB465BEEBD7B2CFD1841D4AE18379B2A2E286474A` | Transparent PNG logo |
| `assets/logo_white.png` | `FE1D95903AD47608609FF28C7068CE15D0D4D5B39896D91E98EB487A6D14B4FA` | White monochrome logo |
| `assets/geometric_pattern.png`| `1E1F0EF3EA9B612A0923995510C68C1320D8F3BC67AC5C6A89BE425AA11DE397` | Background lattice pattern |
| `assets/madinah_pattern.jpg`| `18E5BC479557CA60FDEB9C6769009F9132E5F38CE885359F0E0223D39D89EFE6` | Madinah Islamic architectural texture |

---

## 3. Runtime Dependencies, Storage Keys & Configuration Constants

### 3.1 Runtime Dependencies
The platform is designed to be completely zero-external-dependency in production:
- Vanilla JavaScript (ES2020+) executed natively in browser
- Standard Web Audio API synthesis for SFX and duff beat synthesis
- Standard Web Storage (`localStorage`) for persistence
- Optional headless browser test automation harness: Playwright Chromium (tests only)

### 3.2 LocalStorage Schema & Key Allocation
| Key Name | Owner / Reader | Data Type | Purpose |
|:---|:---|:---|:---|
| `the_aa_cafe_state_v3` | `index.html` | JSON Object | Core session state (`S`), including phone, nickname, avatar, daily best, and active claim |
| `aa_cafe_player_id` | `index.html` | String | Unique pseudo-anonymous identifier `P_<timestamp>_<rand>` |
| `aa_cafe_visit_count` | `index.html` | Integer String | Persistent visit counter across multi-day sessions |
| `the_aa_lang` | `index.html` | String (`'ar'` / `'en'`) | Customer language preference |
| `the_aa_sound_muted` | `index.html` | String (`'1'` / `'0'`) | Customer audio mute setting |
| `the_aa_audio_theme` | `index.html` | String (`'duff'` / `'melodic'`) | Audio style preference |
| `the_aa_cafe_vouchers_wallet`| `index.html` | JSON Array | Customer multi-voucher storage wallet |
| `the_aa_cafe_db_v4` | `staff.html` & `index.html` | JSON Object | Central cafe staff database (customers, history, leaderboards) |
| `the_aa_cafe_redeemed_register`| `staff.html` | JSON Object | Anti-replay coupon redemption register |
| `the_aa_staff_auth` | `staff.html` | JSON Object | Active staff session token and role authorization |
| `the_aa_staff_pin_lockout` | `staff.html` | JSON Object | Brute force PIN attempt limiter and lock timestamps |

### 3.3 Core Configuration Constants (`CFG`)
```javascript
const CFG = {
  roundSeconds: 60,
  tiers: [5000, 7500, 10000],
  salt: 'the_aa_cafe_madinah_secret_2026',
  googleSheetUrl: '',
  cloudLeaderboardUrl: 'https://api.keyval.org/get/the_aa_cafe_real_leaderboards_v1',
  instagramUrl: 'https://instagram.com/the_aa_cafe',
  tiktokUrl: 'https://tiktok.com/@the_aa_cafe'
};
```

---

## 4. Complete 9-Game Inventory & Mechanics Baseline

All 9 games have been verified active and conform to the unified adaptive difficulty engine:

```
+----+-------------+----------------------+--------------------+--------+--------+--------------------+--------------------------------------------------+
| #  | ID          | Arabic Name          | English Name       | Icon   | Weight | Render Mode        | Core Mechanics & Player Interaction             |
+----+-------------+----------------------+--------------------+--------+--------+--------------------+--------------------------------------------------+
| 1  | reflex      | سرعة الباريستا        | Reflex Rush        | ⚡     | 1.0    | DOM Stage Buttons  | Fast reaction to barista orders & coffee shots   |
| 2  | pattern     | سر النمط             | Pattern Lock       | 🔐     | 1.1    | DOM Grid Nodes     | Memorize and repeat escalating coffee recipes   |
| 3  | shuffle     | أين حبة البن؟        | Where Is the Bean? | 🔍     | 1.2    | DOM Animated Cups  | 3D cup swap tracking with 🫘 reveal              |
| 4  | stack       | برج الأكواب          | Cup Tower          | 🏗️    | 1.2    | Canvas 2D Physics  | Oscillating cup alignment & timing drop          |
| 5  | beans       | اصطياد البن          | Catch the Beans    | 🧺     | 1.3    | DOM Swept Motion   | Burlap sack horizontal catch of falling beans    |
| 6  | pour        | فن صبّ اللاتيه       | Precision Pour     | 🥛     | 2.8    | Canvas/DOM Fill    | Hold & release milk stream at precise target rim |
| 7  | rhythm      | نغمات الإسبريسو      | Rhythm Relay       | 🎵     | 1.4    | Canvas Falling Bar | Specialty coffee BPM beat notes in hit zone      |
| 8  | pairhunt    | ذاكرة المقهى         | Pair Hunt          | 🎴     | 1.5    | 12-Card DOM Grid   | Memory pairing with 2.8s initial preview         |
| 9  | basketball  | لعبة السلة           | Basketball         | 🏀     | 2.2    | Canvas Projectile  | Slingshot flick trajectory & hoop swish          |
+----+-------------+----------------------+--------------------+--------+--------+--------------------+--------------------------------------------------+
```

---

## 5. Reward Economy & Cryptographic Coupon Verification Baseline

### 5.1 Tiers and Customer Value
- **Tier 1 (5,000 pts)**: `خصم 5%` (5% OFF) — Entry reward reachable on first visit.
- **Tier 2 (7,500 pts)**: `خصم 7%` (7% OFF) — Approved mid-tier discount policy.
- **Tier 3 (10,000 pts)**: `ترقية مشروب مجانية` (Free Specialty Drink Upgrade) — Top tier achievement.

### 5.2 Cryptographic Verification Pipeline
```
[Customer Client]
  │ Play Game (60s loop)
  ▼
[Score Generation]
  │ runCertificate = hash('RUN_CERT' | score | gameId | day | start | end | salt)
  ▼
[Session Integrity Check]
  │ sig = hash(day | score | phone | order | completedAt | salt)
  ▼
[Mint Coupon]
  │ Type: 'T' (5%), 'S' (7%), 'G' (Upgrade)
  │ Base32 Code: TNAW-XXXX-XXXX
  │ Checksum: SHA-like 16-bit payload checksum embedded in base characters
  ▼
[Presentation at Drive-Thru / Cashier]
  │ Cashier types or scans Base32 coupon into staff.html
  ▼
[Staff Verification Engine]
  │ 1. Validate Base32 format & length
  │ 2. Compute and verify embedded checksum
  │ 3. Check issueDay <= 3 days validity window
  │ 4. Check against the_aa_cafe_redeemed_register (anti-replay)
  │ 5. Check against revokedCodes (upgrade revocation)
  ▼
[Cashier Confirms & Redeems Voucher]
```

---

## 6. Pre-Existing Test Suite Baseline Results

| Suite Name | Test Script | Total Tests | Passed | Failed | Execution Time |
|:---|:---|:---:|:---:|:---:|:---:|
| Suite 1 | `node test_platform.js` | 244 | 244 | 0 | 1.84s |
| Suite 2 | `node test_new_15_requirements.js` | 15 | 15 | 0 | 3.12s |
| Suite 3 | `node test_all_user_scenarios.js` | 10 | 10 | 0 | 6.45s |
| Suite 4 | `node test_40_comprehensive_scenarios.js` | 40 | 40 | 0 | 18.20s |
| **TOTAL** | **All 4 Test Suites** | **309** | **309** | **0** | **29.61s** |

Baseline frozen cleanly with **100% test pass rate (309/309 PASS)**.

---
*Baseline Freeze Signed & Authorized for Branch `upgrade/aa-professional-hardening`.*
