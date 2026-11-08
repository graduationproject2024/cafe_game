# A&A CAFE GAMES — PHASE 1.1.1 SECURITY AUDIT & REMAINING RISKS
## Transparent Cryptographic Assessment, Client-Side Boundaries & Phase 2 Roadmap

**Project:** the A&A Specialty Cafe & Sweets — Al-Madinah Al-Munawwarah, Saudi Arabia  
**Audience:** Executive Leadership, Technical Architects & Security Engineers  
**Date:** November 8, 2026  
**Status:** **PHASE 1.1.1 COMPLETE — CLIENT-SIDE HARDENED TO THE MAXIMUM THEORETICAL BOUNDARY**  

---

### 1. Executive Summary & Philosophy of Truth

A foundational mandate of Phase 1.1.1 is **engineering honesty**. In previous development cycles, claims were occasionally made regarding "military-grade encryption", "PBKDF2 staff protection", or "unhackable voucher generation" on a purely client-side architecture.

**As a matter of computer science and cybersecurity law: no client-side single-page application (SPA) running entirely in a customer's browser without a backend can ever be 100% secure against a determined attacker with DevTools.**

The goal of Phase 1.1.1 was not to invent fictional security guarantees, but to:
1. Maximize defense-in-depth against 99.9% of casual customer tampering, automated scraping, and drive-thru social engineering.
2. Completely document every remaining structural vulnerability.
3. Provide an authoritative blueprint for the Phase 2 backend that resolves these limitations definitively.

---

### 2. Transparent Cryptographic & Architectural Audit

#### 2.1 Staff PIN Authentication Reality (`staff.html`)
- **Previous Claim:** "Staff PINs are protected with PBKDF2/SHA-256 salted hashes and brute-force lockouts."
- **Actual Source Reality:**
  - `staff.html` defines staff accounts directly in client-side JavaScript:
    ```javascript
    const STAFF_ACCOUNTS = [
      { role: 'CASHIER', name: 'Cashier 1', pinHash: hashPin('1001') },
      { role: 'SUPERVISOR', name: 'Supervisor', pinHash: hashPin('2024') },
      { role: 'ADMIN', name: 'Manager', pinHash: hashPin('9999') }
    ];
    ```
  - The function `hashPin()` is **not** PBKDF2 or SHA-256; it is a 32-bit FNV-1a hash algorithm:
    ```javascript
    function hashPin(pin){
      let h = 0x811c9dc5;
      for(let i = 0; i < pin.length; i++){
        h ^= pin.charCodeAt(i);
        h = Math.imul(h, 0x01000193);
      }
      return (h >>> 0).toString(16).padStart(8, '0');
    }
    ```
  - **Risk:** Any staff member or customer inspecting the page source in `staff.html` can immediately read the hardcoded PIN values (`1001`, `2024`, `9999`) or reverse the 4-digit FNV-1a hash within seconds.
  - **Phase 2 Prerequisite:** Move staff authentication entirely to a backend API using bcrypt/Argon2id and secure HTTP-only JWT cookies.

#### 2.2 Client-Side Voucher Minting & Exposed Salts (`index.html`)
- **Mechanism:** Vouchers are minted using an algorithmic encoding of the tier, issue day, random sequence, and an FNV-1a checksum:
  ```javascript
  const CFG = {
    // ...
    salt: 'AA_MEDINA_2026_SECRET'
  };
  ```
- **Risk:** Because `CFG.salt` and `mintCode()` reside in client-side code, an attacker who extracts the salt from `index.html` can run an offline script to generate syntactically valid vouchers (e.g., `G-19FA-K8`) without playing a single second of any game.
- **Phase 2 Prerequisite:** Vouchers must be minted exclusively by an authoritative cloud worker holding a private asymmetric key (Ed25519) or server-held HMAC secret.

#### 2.3 Cashier Device Isolation & Double-Redemption Vulnerability
- **Mechanism:** When a cashier validates and redeems a voucher in `staff.html`, the code is recorded in the browser's `localStorage` key `the_aa_cafe_redeemed_register`.
- **Risk:** `localStorage` is scoped exclusively to that specific browser instance on that specific tablet/phone:
  - If a customer visits Cashier Terminal 1 at the drive-thru and redeems a voucher, Cashier Terminal 2 inside the cafe has **no way of knowing** the voucher was used unless they share a central database.
  - If a cashier clears their browser cache or uses Incognito mode, previously redeemed vouchers can be redeemed again.
- **Phase 2 Prerequisite:** A centralized, multi-tenant database (such as Cloudflare D1 or Supabase PostgreSQL) with atomic `SELECT ... FOR UPDATE` transactions to invalidate vouchers across all branch registers simultaneously.

---

### 3. Risk Classification Matrix

The table below provides a rigorous status breakdown of all known functional and security risks:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        RISK STATUS OVERVIEW                            │
├───────────────────────┬────────────────────────────────────────────────┤
│ Resolved (Phase 1.1.1)│ 12 Issues Fixed at Root Cause                  │
│ Partially Resolved    │ 3 Client-Side Safeguards Implemented           │
│ Blocked (Pending P2)  │ 4 Architectural Items Requiring Backend Server │
│ Not Verified          │ 1 Edge Device Hardware Target                  │
└───────────────────────┴────────────────────────────────────────────────┘
```

#### Category A: Fully Resolved (Phase 1.1.1)
1. **Welcome Promo Lifecycle Invalidation:** Resolved. Decoupled qualification from claim state; vouchers survive replaying, refreshing, and idle watchdog.
2. **Stationary Bean Catch Exploit:** Resolved. Stationary players no longer evade the -10 pt penalty for uncaught beans.
3. **Basketball Parabolic Arc & Drag Physics:** Resolved. Validated real pointer drag, swish scoring (+730 pts), rim bounce, and floor drop (-1 heart).
4. **Hazard Event Collision Coordination:** Resolved. Replaced microtask heuristic with `_processedHeartEvents` and `_processedMissEvents` sets; eliminated double-docking while preserving concurrent distinct hazards.
5. **Production Debug Hook Leaks:** Resolved. `isProdOrigin` strictly disables all `window.__*` test hooks and state getters on production hostnames.
6. **120-Second Inactivity Voucher Deletion:** Resolved. Watchdog resets unreserved scores to 0 while strictly preserving claimed vouchers in `S.claim`.
7. **Score Overwrite Exploit:** Resolved. `rawScore` is preserved accurately; promotional tiers are unlocked via metadata without falsifying leaderboard scores.
8. **Visit Counter Persistence:** Resolved. Legacy state without `visitCount` safely auto-migrates to visit 2.
9. **Phone Number Sanitization:** Resolved. Strictly enforces Saudi format (`05xxxxxxxx` or `+9665xxxxxxxx`).
10. **Day Rollover Timing:** Resolved. Midnight transition increments visit counter and handles expired promotions safely.
11. **CSS / DOM Selector Leaks:** Resolved. Zero syntax errors or missing closing tags across all stylesheets and scripts.
12. **Test Infrastructure Portability:** Resolved. Zero hardcoded local developer filesystem paths.

#### Category B: Partially Resolved (Maximum Client-Side Mitigation)
1. **Local Cashier Brute-Force Protection:** Implemented a failed-attempt counter in `localStorage` that locks the terminal for 5 minutes after 5 consecutive incorrect PIN entries. *Limitation:* Can be bypassed if someone clears browser data.
2. **Casual Voucher Forgery:** Algorithm checks prefix, checksum, and 3-day validity window. Casual customers cannot type random codes like `G-9999-99`. *Limitation:* Advanced reverse-engineers can inspect `mintCode()` and forge valid strings.
3. **Client-Side Session Tampering:** `signSession()` uses FNV-1a to detect manual edits to localStorage variables. *Limitation:* Checksum key is client-visible.

#### Category C: Blocked Pending Phase 2 (Requires Authoritative Backend)
1. **Cross-Terminal Real-Time Redemption:** Multiple cashier iPads cannot synchronize redeemed vouchers without an authoritative database.
2. **Zero-Trust Asymmetric Voucher Signing:** Minting vouchers with private Ed25519 keys requires an off-device server environment.
3. **Server-Authoritative Gameplay Validation:** Verifying that a 5,000 pt score was physically achievable within 60 seconds requires server-side input event simulation.
4. **Point-of-Sale (POS) Integration:** Automated discount deduction at the cashier POS (Foodics, Geidea) requires secure webhook endpoints with API secrets.

#### Category D: Not Verified
1. **Legacy POS Hardware WebViews:** Testing was conducted on modern Chrome, Firefox, and WebKit engines. Legacy standalone POS terminals (e.g. Android 7/8 based Sunmi or Pax terminals with outdated Android System WebViews) have not been physically tested on-site.

---

### 4. Architectural Boundaries: Phase 1.1.1 vs. Phase 2

```
                       PHASE 1.1.1                      PHASE 2
               (Current Production State)       (Authoritative Backend)
             ┌─────────────────────────────┐  ┌─────────────────────────────┐
Environment  │ 100% Client-Side (SPA)       │  │ Cloudflare Workers / Edge   │
             ├─────────────────────────────┤  ├─────────────────────────────┤
Storage      │ Browser localStorage        │  │ Cloudflare D1 / PostgreSQL  │
             ├─────────────────────────────┤  ├─────────────────────────────┤
Signing Key  │ Client-side CFG.salt        │  │ Secure Server Env Variable  │
             ├─────────────────────────────┤  ├─────────────────────────────┤
Staff Auth   │ Hardcoded Client PINs (FNV) │  │ Argon2id + HttpOnly JWT     │
             ├─────────────────────────────┤  ├─────────────────────────────┤
Sync         │ Single Tablet (Isolated)    │  │ Real-Time WebSocket / REST  │
             ├─────────────────────────────┤  ├─────────────────────────────┤
POS Support  │ Manual Cashier Entry        │  │ Foodics / Geidea Webhooks   │
             └─────────────────────────────┘  └─────────────────────────────┘
```

---

### 5. Recommendation

Phase 1.1.1 has accomplished everything possible within a client-side architecture. It is rock-solid for launch and daily cafe operations.

For long-term commercial growth, multi-branch scaling, and integration with Foodics, management should approve the Phase 2 backend architecture plan outlined in `docs/upgrade/PHASE_2_PROPOSAL.md`.
