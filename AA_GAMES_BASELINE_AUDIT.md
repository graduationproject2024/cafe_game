# A&A Cafe Games — Baseline Discovery & Architecture Audit (Production-Level)
**Document ID:** `AA_GAMES_BASELINE_AUDIT.md`  
**Date:** October 20, 2026  
**Auditor:** Senior Product Engineering Team (Antigravity)  
**Target Platform:** the A&A specialty cafe & sweets (Drive-Thru & Branch, Al-Madinah Al-Munawwarah)  
**Primary Working Directory:** `C:\Users\sam20\OneDrive\سطح المكتب\cafe_game`  
**Secondary Sync Mirror:** `C:\Users\sam20\cafe_game`  
**Git Remote:** `https://github.com/graduationproject2024/cafe_game.git` | **Branch:** `main`  

---

## 1. Executive Summary & Audit Baseline

This baseline audit documents the state of the **A&A Cafe Games** platform prior to implementing the Phase 1 through Phase 15 production-level upgrades, defect remediations, economy rebalancing, leaderboard systems, and UI/UX modernization.

The application is a customer-facing interactive web application deployed at **the A&A specialty cafe & sweets** drive-thru and branch in Al-Madinah Al-Munawwarah. Customers scan a QR code upon ordering, play quick mini-games while their artisan specialty coffee and sweets are crafted, and compete for verified discount vouchers.

### Key Audit Findings:
1. **Start Screen Friction (Phase 1):** Currently, `#intro` presents a registration card requiring a Saudi mobile phone number and order number before the user can explore or play any games. This introduces severe onboarding drop-off.
2. **Bean Catching Heart Deduction Defect (Phase 2):** In `beans` (اصطياد البن), collision detection checks `it.y + 32 >= cupTop && it.y < H - 8`. High-velocity beans jumping past `H - 8` during frame delta drops trigger `it.y > H`, which unconditionally invokes `c.loseHeart()`, deducting a heart on legitimate catches. Furthermore, missing falling golden beans penalizes hearts instead of only combo/points, contradicting the stated game instructions ("تجنب الحبوب المحروقة ✕ التي تخصم قلباً").
3. **Latte Art / Precision Pour Defects (Phase 3):**
   - The sleeve container has a dark/black gradient background (`#2D2319`) behind the café logo.
   - Exact numeric fill percentages are updated live in `#pourLevelTxt` during pouring, rendering the mechanic trivial.
   - Opening pour speed (`lerp(26, 38, d)`) is excessively rapid for opening rounds.
   - Visual cup model requires a takeaway coffee cup silhouette with lid, clear liquid level, and wide middle sleeve displaying the authentic A&A logo.
4. **Flavor Harmony / تناغم النكهات Logic Defect (Phase 4):** The current implementation displays identical emoji icons and background colors on both the question card and the correct answer option, allowing players to match icons visually without engaging in coffee flavor reasoning.
5. **Basketball / لعبة السلة Requirements (Phase 5):** Requires an explicit shot lifecycle state machine (`READY`, `SHOT_IN_PROGRESS`, `VALIDATING_SHOT`, `SHOT_MADE`, `SHOT_MISSED`, `ROUND_COMPLETE`), elimination of flashing/strobing, and guaranteed zero false heart deductions on made shots.
6. **Point Economy & Reward Thresholds (Phases 8 & 9):**
   - Previous milestone thresholds (`[1200, 2400, 3400]`) allowed premature voucher attainment before reaching the halfway point. New policy requires milestones to begin at or after the 50% midpoint (e.g., 5,000 pts for a 10,000 pt cycle).
   - Old voucher tier specified a 10% discount; mandated update changes all calculations, displays, and coupons to 7%.
7. **Per-Game Top 10 Leaderboards (Phase 10):** Currently absent. Must provide durable local/synced persistence, nickname entry modal, exact 3-month qualification popup («إذا حافظت على مكانك ضمن أفضل 10 لاعبين لمدة ثلاثة أشهر، فستحصل على هدية إضافية»), and continuous qualification tracking.
8. **Celebration & Terms (Phases 11 & 12):** Side confetti bursts, short celebratory audio synth, and post-reward terms clarification on loyalty points vs discount vouchers.

---

## 2. Repository & Entry Point Inventory

- **Entry Point:** `index.html` (single-file architecture, zero build steps, vanilla HTML5/CSS3/ES2022).
- **Redirection Shim:** `cafe-games.html` (canonical redirect to `index.html`).
- **Test Harness:** `test_platform.js` (Node.js VM execution suite, currently 79/79 passing on previous baseline).
- **Brand Assets:**
  - `assets/logo.png`: Full color café logo.
  - `assets/logo_transparent.png`: Transparent alpha brand logo.
  - `assets/logo_gold.png`: Gold foil emblem.
  - `assets/logo.svg`: Vector logo mark.
  - `assets/geometric_pattern.png` & `assets/madinah_pattern.jpg`: Heritage motifs.
- **Configured Destinations:**
  - Instagram: `https://www.instagram.com/theaa.cafe`
  - TikTok: `https://www.tiktok.com/@theaa.cafe`
  - Google Maps: `https://maps.google.com/?q=the+A%26A+specialty+cafe+%26+sweets+Al-Madinah` (exposed in `CFG.social.maps`).

---

## 3. Game Registry Inventory

| Game ID | Arabic Title | English Title | Baseline Status | Required Upgrades |
| :--- | :--- | :--- | :--- | :--- |
| `reflex` | سرعة الباريستا | Reflex Rush | Active | Enlarge stage, responsive touch targets, encouraging end messages |
| `pattern` | سر النمط | Pattern Lock | Active | Enlarge 3x3 grid, clean animation, responsive layout |
| `shuffle` | أين حبة البن؟ | Where Is the Bean | Active | Enhanced cup models, smooth shuffle easing |
| `stack` | برج الأكواب | Cup Tower | Active | Enlarged physics stage, precision drop button |
| `beans` | اصطياد البن | Catch the Beans | Defect identified | Fix false heart loss on catch, clamp swept collisions, fix miss penalties |
| `colorshift`| تناغم النكهات | Flavor Harmony | Defect identified | Decouple emoji from answers; test real sensory coffee notes & attributes |
| `pour` | فن صبّ اللاتيه | Precision Pour | Defect identified | Takeaway cup with lid & sleeve, hide live %, slower initial pour, no black background |
| `rhythm` | نغمات الإسبريسو | Espresso Rhythm | Active | Background ambiance synth, precision hit windows |
| `pairhunt` | ذاكرة المقهى | Cafe Memory | Active | High contrast card tiles, responsive grid |
| `basketball`| لعبة السلة | Basketball | Required | Shot lifecycle (`READY`->`SHOT_IN_PROGRESS`->`VALIDATING_SHOT`->`SHOT_MADE`/`SHOT_MISSED`), no flashing, zero false heart loss |

---

## 4. Baseline Test Verification

Running `node test_platform.js` prior to edits verified 79/79 passing tests for legacy modules. The suite will now be systematically expanded to assert the new Phase 1–15 requirements.
