# A&A CAFE GAMES — FINAL ACCEPTANCE RELEASE CHECKLIST
## Pre-Release Verification Checklist, Acceptance Criteria & Sign-Off

**Project:** the A&A Specialty Cafe & Sweets — Al-Madinah Al-Munawwarah, Saudi Arabia  
**Branch:** `upgrade/aa-professional-hardening`  
**Date:** November 8, 2026  
**Status:** **RELEASE READY FOR CUSTOMER PILOT**  

---

### 1. Release Acceptance Criteria Checklist

| # | Acceptance Criterion (Section 18) | Verified Condition & Evidence | Status |
|:---:|---|---|:---:|
| **1** | Customer can genuinely play and earn qualifying points | Playwright real pointer clicks in *Reflex Rush* earned 528 pts without state injection (`test_final_acceptance_gate.js` Target A) | **PASSED** |
| **2** | Welcome reward survives permitted session transitions | Qualified status survives replaying, 120s idle watchdog, browser reload, and midnight day rollover (`test_final_acceptance_gate.js` Target B) | **PASSED** |
| **3** | Voucher claiming flow works through real UI | Complete customer journey: `#result` -> `#choice` -> Saudi phone submission -> `#reward` voucher rendering (`test_final_acceptance_gate.js` Target A) | **PASSED** |
| **4** | No approved reward tiers change | Tier 1: 5% at 5,000 pts (350 pts welcome); Tier 2: 7% at 7,500 pts; Tier 3: Drink upgrade at 10,000 pts preserved strictly | **PASSED** |
| **5** | Duplicate claims are prevented within documented architecture | Attempting to claim a second welcome promo is blocked; `welcomePromoStatus === 'CLAIMED'` | **PASSED** |
| **6** | Basketball actually registers made and missed shots correctly | Slingshot drag renders 16 aim dots; Made shot scores +729 pts (0 hearts lost); Missed shot bounces on floor and deducts 1 heart (`test_final_acceptance_gate.js` Target C) | **PASSED** |
| **7** | Bean Catch tests exercise the real game engine | Swept continuous catchment catches beans (+166 pts); stationary player incurs -10 pt penalties (`test_final_acceptance_gate.js` Target D) | **PASSED** |
| **8** | Hazard events behave deterministically | Set-based event tokens unify companion heart+miss penalties; independent hazards apply penalties; duplicate calls idempotent (`test_final_acceptance_gate.js` Target E) | **PASSED** |
| **9** | Production debug hooks excluded from production artifact | `isTestEnv` evaluates strictly to `false` on remote hosts; hooks (`__setRun`, `__mintRunCert`, etc.) are `undefined` (`test_final_acceptance_gate.js` Target F) | **PASSED** |
| **10** | All nine games remain playable | Individual smoke tests for `reflex`, `pattern`, `shuffle`, `stack`, `beans`, `pour`, `rhythm`, `pairhunt`, `basketball` all launch, receive input & exit cleanly with 0 console errors (`test_final_acceptance_gate.js` Target G) | **PASSED** |
| **11** | Arabic and English remain functional | Full bilingual support, RTL/LTR styling, localized HUD, and WCAG 2.5.3 compliant labels | **PASSED** |
| **12** | Critical tests are meaningful, not superficial | Replaced all `window.__setRun` shortcuts with actual Playwright clicks and real engine updates | **PASSED** |
| **13** | Previous regressions do not recur | All 7 test suites (366 automated assertions) pass 100% | **PASSED** |
| **14** | No unauthorized changes to brand identity | Logo, fonts, gold/brown palette, and Saudi cultural duff audio themes strictly preserved | **PASSED** |
| **15** | The `main` branch remains untouched | All work committed exclusively to `upgrade/aa-professional-hardening` | **PASSED** |
| **16** | Remaining Phase 2 security risks documented honestly | Transparent report detailing FNV-1a, client-side PIN storage in `staff.html`, and device-isolated `localStorage` | **PASSED** |

---

### 2. Engineering Sign-Off Decision

Every condition of the release acceptance gate has been verified against executable browser truth.

**FINAL RELEASE GATE STATUS:**  
$$\mathbf{FINAL\ ACCEPTANCE\ GATE\ PASSED\ —\ VERIFIED\ WITH\ DEFINED\ SCOPE}$$

**Recommended Next Step:**  
Deploy `upgrade/aa-professional-hardening` to customer staging / kiosk pilot in Al-Madinah, and review the Phase 2 proposal for backend authorization and cashier multi-terminal synchronization.

