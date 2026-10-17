# A&A Cafe Games — Security and Anti-Cheat Report (Deliverable C)

## 1. Threat Modeling & Trust Boundaries

The A&A Cafe Games application operates primarily as a client-side progressive web application running in mobile and desktop browsers, accessed via a QR code at the cafe's drive-thru and dining counter.

### 1.1 Identified Trust Boundaries
```
+-------------------------------------------------------------+
| UNTRUSTED ZONE: Customer Browser / Client Environment       |
| - JavaScript runtime, DOM, Window, Console                   |
| - LocalStorage / SessionStorage                             |
| - Device Sensors (Orientation, Accelerometer, Geolocation)  |
+-------------------------------------------------------------+
                              |
      [Cryptographic Token & Voucher Exchange]
                              |
+-------------------------------------------------------------+
| TRUSTED / AUTHORITATIVE ZONE: Cashier Counter Verification   |
| - Staff Portal (#staff) with salted PIN hash verification    |
| - Voucher decoding and signature check                      |
| - Physical verification of order & phone at POS register    |
| - Webhook sync to cafe backend/database (when configured)    |
+-------------------------------------------------------------+
```

### 1.2 Core Security Philosophy
In accordance with application security best practices, **no client-side environment can ever be considered 100% tamper-proof**. An attacker with physical access to their own browser runtime, developer tools, or a debugger can technically inspect memory or modify local variables.

Therefore, the anti-cheat architecture implements **layered defense-in-depth**:
1. Make casual tampering, score injection, and script-kiddie exploits immediately fail signature verification.
2. Ensure that even if a client-side score is fabricated, the resulting voucher cannot be redeemed without valid cryptographic checksums, unexpired timestamps, and cashier one-time verification.
3. Eliminate game-logic vulnerabilities (screen spamming, rapid replay, multiple claims).

---

## 2. Implemented Anti-Cheat & Security Controls

### 2.1 Cryptographic Session Signatures (`signSession`)
- **Mechanism**: Every active game session generates a dynamic signature `S.sig` calculated over critical game parameters:
  ```javascript
  function signSession(s){
    let acc = hash(CFG.salt + '|' + s.phone + '|' + s.order + '|' + s.best + '|' + s.startedAt + '|' + (s.difficulty || 'medium'));
    for(let i = 0; i < 3; i++) acc = hash(acc + '|' + CFG.salt + '|' + s.phone);
    return acc;
  }
  ```
- **Validation**:
  - Whenever the customer attempts to view or claim a reward in `claimFlow()`, `signSession(S)` is recalculated and compared strictly against `S.sig`.
  - If a user modifies `S.best` in the browser console or alters `localStorage['cafeGames.v3']`, `S.sig !== signSession(S)` is triggered.
  - The application immediately alerts the user, aborts the claim, and executes `resetSession()`.

### 2.2 Rate Limiting & Identity Protection
- **Phone & Order Daily Caps**:
  - A customer phone number or order number can only claim **one reward per calendar day** (`o.used['p:' + phone + '|' + day]`).
  - Entering a previously claimed order or phone number prevents issuing duplicate vouchers.
- **Device Fingerprint Throttling**:
  - Maximum of **2 reward claim attempts per device per day** (`o.dev['d:' + dayNow()] >= 2`).
  - Mitigates automated script runners attempting to harvest discount codes.

### 2.3 Cashier Portal Security & Brute-Force Lockout (`#staff`)
- **Salted PIN Hash**:
  - The default cashier PIN (`2026`) is not stored in plaintext anywhere in the client code.
  - It is evaluated via `hash('salt-staff-2026:' + pinInput) === CFG.staffPinHash (1241566683)`.
- **Brute-Force Lockout Protection**:
  - Failed PIN attempts are recorded persistently in `store.stFailCount`.
  - Reaching 3 consecutive failed attempts triggers an automated **60-second hardware lockout** (`stLockedUntil = now + 60000`).
  - Subsequent requests within the lockout window are immediately rejected with a countdown timer.

### 2.4 Cryptographic Single-Use Vouchers
- **Format**: Vouchers are generated using an encoded 9-character format:
  $$\text{Code} = \text{Type} + \text{Day} + \text{Random Salt} + \text{Checksum}$$
- **Redemption Idempotency**:
  - When the cashier clicks "صرف المكافأة للعميل", the voucher body is committed to `store.red[p.body] = Date.now()`.
  - If the same voucher is scanned or presented a second time, the portal alerts the cashier: `❌ تم صرف هذا الكود مسبقاً في: [timestamp]`.
- **Expiration Enforcement**:
  - Vouchers carry an embedded day integer (`p.day`). Codes older than `CFG.validDays` (3 days) are permanently expired.

### 2.5 Instagram Extra Heart Fraud Prevention
- To prevent customers from claiming unlimited extra lives by repeatedly clicking the social button:
  - The claim flag `S.extraHeartClaimed = true` is immediately saved to session state.
  - Subsequent clicks display a clear warning: "تم استخدام المحاولة الإضافية لهذه الجلسة مسبقاً (الحد الأقصى: محاولة واحدة)".
  - The reward awards exactly $+1$ heart (capped at `maxHearts: 3`), ensuring it cannot break the health bounds.

---

## 3. Attack Surface Analysis & Test Evidence

| Attack Vector | Exploit Attempt | Implemented Defense | Test Suite Evidence |
| :--- | :--- | :--- | :--- |
| **Score Forgery** | Modifying `localStorage.best = 9999` | Multi-pass FNV hash mismatch triggers session purge | `Suite 3 - Test 5`: PASS |
| **Difficulty Manipulation** | Forcing difficulty from `hard` to `easy` | Difficulty included in salt signature; hash invalidates | `Suite 3 - Test 6`: PASS |
| **Phone Spoofing** | Changing phone number in memory | Phone included in signature; hash invalidates | `Suite 3 - Test 7`: PASS |
| **Screen Auto-Clicker** | Rapid clicking whole screen in Reflex Rush | Background clicks penalized with `c.miss()` and broken combo | Verified in `reflex.start` |
| **Pattern Lock Peeking** | Inspecting DOM for sequence | Nodes do not store sequence in DOM; stored in JS closure | Verified in `pattern.start` |
| **Replay Attack** | Presenting screenshot of old voucher | Voucher timestamp verified; single-use stored in `red` list | Verified in `#stRedeem` |
| **Social Heart Farming** | Clicking Instagram button 10 times | Capped at 1 claim per session via `S.extraHeartClaimed` | `Suite 7 - Test 5`: PASS |

---

## 4. Candid Assessment of Backend Limitations
Because this platform runs as a static client application at the cafe branch:
- **Client Authoritative Scoring**: The final score is computed by the client JavaScript engine. While session signatures prevent direct variable editing, an adversary using a browser debugger could alter the `r.score` internal counter during runtime.
- **Recommended Production Backend Evolution**:
  - For high-value promotions (e.g., prizes > 50 SAR), implement an authoritative Node.js/Go backend where each target tap or pattern sequence is streamed via WebSocket with monotonic millisecond timestamps, and final scores are computed exclusively server-side.
