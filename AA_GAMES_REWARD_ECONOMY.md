# A&A Cafe Games — Reward Economy & Point Calibration Specification

**Document ID:** `AA_GAMES_REWARD_ECONOMY.md`  
**Platform:** the A&A specialty cafe & sweets (Al-Madinah Al-Munawwarah)  
**Version:** Production 2.0  
**Effective Date:** October 20, 2026

---

## 1. Overview & Policy Principles

The A&A Cafe Games point and reward economy is designed to provide customer engagement during drive-thru order preparation while protecting café margins and preventing score farming.

### Key Policy Rules
1. **Cycle Target:** The reward progression cycle is set to **10,000 points** (`CFG.cycleTarget = 10000`).
2. **50% Midpoint Rule:** Reward milestones begin strictly at or after the 50% midpoint of the cycle target (5,000 points).
3. **7% Discount Policy:** The second-tier discount is permanently set to **7%** (replacing the previous 10% discount).
4. **Adaptive Difficulty Multiplier:** Points per action are scaled by `DifficultyEngine.getScoreMultiplier(d)`, capping at `1.85x` during peak difficulty.

---

## 2. Milestone Ladder & Voucher Structure

| Milestone Tier | Score Threshold | Reward Description (Arabic) | Reward Description (English) | Reward Type Code |
| :---: | :---: | :--- | :--- | :---: |
| **Tier 1** | **5,000 pts** (50% Midpoint) | خصم 5% على الفاتورة | 5% OFF Receipt | `T` |
| **Tier 2** | **7,500 pts** (75% Mark) | خصم 7% على الفاتورة | 7% OFF Receipt | `S` |
| **Tier 3** | **10,000 pts** (100% Target) | ترقية مشروب مجانية 🏆 | Free Drink Upgrade 🏆 | `G` |

### Voucher Minting & Cryptographic Validation
- Vouchers are generated using single-use alphanumeric codes: `DAA-XXXX-XX`.
- Each code encodes the reward tier (`T`, `S`, `G`), the epoch day, and an anti-tamper checksum derived from `CFG.salt`.
- Only one voucher claim is permitted per eligible session.

---

## 3. Score Progression & Anti-Farming Guardrails

1. **Base Action Scoring:** Standard success actions award `40 base points` adjusted by game weight and current combo multiplier ($1.0 + \min(\text{combo}-1, 8) \times 0.12$).
2. **Session Score Normalization:** A skilled player playing a 60-second round earns between **1,200 and 2,500 points**. Accumulating 5,000 points requires consistent, skilled play across multiple rounds.
3. **Anti-Clicker / Anti-Spam Throttling:** `antiSpamCheck()` clamps inputs to a maximum rate of 12 actions/second with an interval floor of 45ms.
4. **Device & Daily Claim Quota:** Each device/phone number is capped at 2 reward claims per day to prevent exploitation.

---

## 4. Terms and Conditions: Voucher vs Loyalty Points Credit

In compliance with Phase 11, the customer choice note is displayed on the `#choice` and `#reward` screens:

> **ملاحظة الشروط والأحكام:**  
> يحق للعميل الاختيار بين استلام المكافأة ككود خصم فوري يُطبق على الفاتورة الحالية لدى الكاشير، أو تحويل القيمة المعادلة لها كرصيد نقاط ولاء يُضاف إلى حسابه لدى the A&A وفق سياسة برنامج الولاء المعتمدة.
