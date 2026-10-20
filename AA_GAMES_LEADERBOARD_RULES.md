# A&A Cafe Games — Top 10 Leaderboard & 3-Month Qualification Rules

**Document ID:** `AA_GAMES_LEADERBOARD_RULES.md`  
**Platform:** the A&A specialty cafe & sweets (Al-Madinah Al-Munawwarah)  
**Version:** Production 2.0  
**Effective Date:** October 20, 2026

---

## 1. Top 10 Architecture Overview

Each of the 10 games in the A&A suite maintains an independent Top 10 leaderboard managed by the authoritative client engine `LeaderboardEngine`.

### Tracked Games
1. **Reflex Rush** (`reflex`) / سرعة الباريستا
2. **Pattern Lock** (`pattern`) / قفل النمط
3. **Where Is the Ball?** (`shuffle`) / أين الحبة؟
4. **Cup Tower** (`stack`) / برج الكوبايات
5. **Catch the Beans** (`beans`) / اصطياد الحبوب
6. **Flavor Harmony** (`colorshift`) / تناغم النكهات
7. **Precision Pour** (`pour`) / فن صبّ اللاتيه
8. **Espresso Rhythm** (`rhythm`) / نغمات الإسبريسو
9. **Cafe Memory** (`pairhunt`) / ذاكرة المقهى
10. **Basketball Shoot** (`basketball`) / لعبة السلة

---

## 2. Ranking & Tie-Breaking Rules

- **Primary Criterion:** Authoritative single-session score (`score` descending).
- **Secondary Tie-Breaker:** Earliest timestamp of qualification (`qualifiedAt` ascending).
- **Player Uniqueness:** Each player identity (associated with verified nickname or masked phone) holds at most one entry per game. Higher scores update the existing record without altering `qualifiedAt`.
- **Top 10 Capacity:** Exactly 10 players per game. Displaced players are removed from the active top 10.

---

## 3. Nickname Registration Flow (Phase 10, Req 2)

When a player achieves a score that enters the Top 10 for the first time and has no stored nickname:
1. The dedicated `#modalNickname` modal appears.
2. The player is prompted for a public nickname.
3. **Validation & Sanitization:**
   - Length between 2 and 15 characters.
   - Whitespace trimmed.
   - HTML/script characters (`<`, `>`, `&`, `"`, `'`) stripped to prevent XSS.
   - Default fallback: "باريستا the A&A".

---

## 4. Celebratory Qualification Popup (Phase 10, Req 3)

Upon entering the Top 10, the non-blocking celebration popup `#modalTop10Popup` displays the exact required Arabic message:

> **«إذا حافظت على مكانك ضمن أفضل 10 لاعبين لمدة ثلاثة أشهر، فستحصل على هدية إضافية»**

The popup does not interrupt active gameplay and triggers `SFX.celebrate()` upon display.

---

## 5. Three-Month Continuous Qualification Tracking (Phase 10, Req 4)

- **Qualification Clock:** The timestamp is recorded in `entry.qualifiedAt` when the player enters the Top 10.
- **Continuous Retention Requirement:**
  - 90 consecutive calendar days ($90 \times 24 \times 3600 \times 1000$ ms).
  - Calculated dynamically via `LeaderboardEngine.getQualificationDays(entry)`.
  - If a player is displaced from the Top 10, their qualification period ends. Re-entering resets `qualifiedAt` to the new timestamp.
- **Gift Eligibility:** When an entry reaches 90 continuous days without prior claim, `entry.eligibleForGift = true` is marked, allowing cashier validation of the additional three-month milestone gift.
