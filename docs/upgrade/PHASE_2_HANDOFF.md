# the A&A Specialty Cafe & Sweets — Al-Madinah Al-Munawwarah
## Phase 2 Engineering Handoff & Architecture Baseline

**Document:** Engineering Handoff to Phase 2  
**Branch:** `upgrade/aa-professional-hardening`  
**Baseline Release:** Phase 1.1.2 Final Acceptance Correction  
**Date:** November 8, 2026

---

## 1. Verified Architecture Baseline

The platform has achieved a stable, verified, zero-regression state across all client requirements. The client-side architecture enforces:
1. **Nine Authentic Games:**
   - `reflex`: Reflex Rush (سرعة الباريستا)
   - `pattern`: Pattern Lock (سر النمط)
   - `shuffle`: Where Is the Bean (أين حبة البن؟)
   - `stack`: Cup Tower (برج الأكواب)
   - `beans`: Catch the Beans (اصطياد البن)
   - `pour`: Precision Pour (فن صبّ اللاتيه)
   - `rhythm`: Espresso Rhythm (نغمات الإسبريسو)
   - `pairhunt`: Cafe Memory (ذاكرة المقهى)
   - `basketball`: Basketball Shoot (لعبة السلة)
   *(Strictly zero hallucinated games; all legacy placeholders retired).*
2. **Reward Economy:**
   - Tier 1: 5% Discount ($5,000\text{ pts}$ or First-Time Welcome Promo at $\ge 350\text{ pts}$).
   - Tier 2: 7% Discount ($7,500\text{ pts}$).
   - Tier 3: Free Drink Upgrade ($10,000\text{ pts}$).
   - 3-Day expiration window with persistent wallet retention in `the_aa_cafe_vouchers_wallet`.
3. **Cryptographic Integrity & Anti-Forgery:**
   - Session signing with salt (`signSession(S)`).
   - Signed gameplay run certificates (`RUN_CERT` hash verification).
   - Multi-day welcome voucher preservation with 48h claim window verification.
   - Dual-layer duplicate voucher prevention.
4. **Automated CI Release Enforcement:**
   - `.github/workflows/quality-gate.yml` configured with Node 20, Playwright Chromium, syntax checks, and 300 passing automated assertions.

---

## 2. Phase 2 Scope & Objectives

Phase 2 transitions the platform from a standalone client-side application to a cloud-connected, resilient multi-store architecture:

### 1. Server-Side Verification Backend (Supabase / Edge Functions)
- **Objective:** Move certificate signing and voucher issuance from client JavaScript to secure edge functions.
- **Key Deliverables:**
  - PostgreSQL database schema with Row Level Security (RLS).
  - Edge function `claim-voucher`: Accepts signed gameplay payload, verifies difficulty bounds, issues signed voucher in DB.
  - Edge function `verify-voucher`: Cashier verification endpoint checking redemption register and revocation lists.
  - Server-side rate limiting and replay prevention.

### 2. Optional Verified SMS OTP Authentication
- **Objective:** Transition from unverified Saudi mobile collection to secure SMS OTP delivery (Twilio / Unifonic / Taqnyat) strictly as an opt-in or Phase 2 requirement.
- **Constraints:**
  - Preserve frictionless first-round gameplay.
  - Ensure zero disruption for in-store cafe customers.

### 3. Centralized Multi-Branch Cashier & Analytics Portal
- **Objective:** Upgrade `staff.html` to a cloud-synchronized portal supporting:
  - Real-time cashier redemption across multiple branches in Al-Madinah.
  - Live revenue impact and promotion conversion dashboards.
  - Role-based access control (Cashier, Store Manager, Owner).

---

## 3. Ground Rules & Non-Negotiables for Phase 2 Team

1. **Brand & City Identity:** Always honor **the A&A Specialty Cafe & Sweets** and Al-Madinah Al-Munawwarah heritage. Dual-language (Arabic primary, English secondary) must be maintained across all screens.
2. **Game Mechanics:** Never alter the core mechanics, responsive dimensions, or scoring weights of the nine authentic games without explicit stakeholder sign-off.
3. **Reward Economy:** Do not alter the 5%, 7%, and Free Drink Upgrade reward thresholds.
4. **Git Discipline:** Never push directly to `main`. All Phase 2 work must branch from `upgrade/aa-professional-hardening` or a dedicated `feature/phase-2-backend` branch with full CI checks passing.
5. **No Regression:** All 300 existing automated assertions in `test_platform.js`, `test_phase_1_1_1_hotfix.js`, and `test_final_acceptance_gate.js` must remain green.

---

## 4. Phase 2 Readiness Checklist

- [x] All Phase 1 critical defects and P0/P1 audit findings closed.
- [x] Zero false-positive assertions in test runner.
- [x] Full Playwright E2E browser tests passing on mobile viewports.
- [x] GitHub Actions CI workflow implemented and verified.
- [x] Complete documentation and test matrices published in `docs/upgrade/`.
- [x] Handoff sign-off approved for Phase 2 commencement.

