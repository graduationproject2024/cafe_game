# A&A Cafe Games — Production Readiness Checklist (Deliverable I)

## Category 1: Completed and Verified in Production Code
- [x] **Game Replacements**:
  - Hot or Cold (`sort`) fully retired and replaced with Reflex Rush (`reflex`).
  - Coffee & City Quiz (`quiz`) fully retired and replaced with Pattern Lock (`pattern`).
- [x] **5-Game Lineup Integrity**:
  - Exactly 5 games active: Reflex Rush, Pattern Lock, Where Is the Ball?, Cup Tower, Catch the Beans.
  - Zero broken routes, legacy question screens, or orphaned links.
- [x] **Anti-Cheat Hardening**:
  - Cryptographic session signature `signSession` active on all sessions; prevents score, difficulty, and identity tampering.
  - Rate limiting (max 1 claim/phone/day, max 1 claim/order/day, max 2 claims/device/day).
  - Cashier portal secured with salted PIN hash and 3-strike brute-force lockout.
  - Single-use voucher redemption tracking prevents duplicate counter claims.
- [x] **Unified Difficulty Framework**:
  - Easy (1.0x), Medium (1.2x), Hard (1.4x) selectable on pre-game screen and bound to gameplay formulas.
- [x] **Vehicle Movement Stability State Machine**:
  - 5-state hysteresis machine active in `SafetySensor` (MOVING, POTENTIALLY_STATIONARY, STATIONARY_CONFIRMED, MOVEMENT_DETECTED, INVALID_OR_UNAVAILABLE).
  - 1,500ms continuous observation window prevents false unlocks while driving.
- [x] **Three-Heart Lifecycle**:
  - HUD displays 3 hearts; deductions occur atomically on hazard hits; clean game-over upon reaching 0 hearts.
- [x] **Social Media Integration**:
  - Official Instagram (`@theaa.cafe`) and TikTok (`@theaa.cafe`) URLs configured with secure `noopener noreferrer` tags.
  - Extra-heart claim restricted to exactly 1 claim per session.
- [x] **Automated Regression Suite**:
  - 54/54 automated test assertions passing cleanly without syntax errors or regressions.

---

## Category 2: Implemented but Requires On-Site Physical Validation
- [ ] **Drive-Thru Canopy Field Calibration**:
  - While GPS and accelerometer thresholds (>7 km/h, >4.2 m/s²) are calibrated and unit-tested, physical validation in cars beneath the specific drive-thru metal canopy at the Madinah branch should be checked to observe local GPS attenuation.
- [ ] **Audio Balance in Real Automobiles**:
  - Sound synthesis works dynamically via Web Audio API; volume should be tested against typical in-car Bluetooth audio latency.

---

## 3. Blocked by External Dependencies (Transparently Documented)
- [ ] **Automated Instagram Server Follow Verification**:
  - **Status**: Blocked by Meta Platform Policies. Meta does not permit third-party web apps to verify user follows without Facebook Login review, verified business manager accounts, and user identity linking.
  - **Current Resolution**: Implemented a transparent, policy-compliant promotional honor flow that opens the profile in a new tab without making false verification claims.

---

## 4. Recommended Future Enhancements
- [ ] **Server-Authoritative WebSocket Engine**:
  - For future large-scale tournaments or high-value prizes (> 100 SAR), migrate scoring logic to an authoritative Node.js/Go backend where target taps are streamed and signed in real-time.
- [ ] **POS Webhook Integration**:
  - Connect `CFG.webhookUrl` directly to the cafe's POS provider (e.g., Foodics or Geidea) to automatically apply voucher codes to the cash register bill.
- [ ] **Live Leaderboard Screen**:
  - Add a digital signage dashboard showing top scores in the cafe dining area.
