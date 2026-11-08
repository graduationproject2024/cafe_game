# A&A CAFE GAMES — PHASE 2 ARCHITECTURE PROPOSAL (REVISED)
## Lightweight Authoritative Edge Backend, Multi-Terminal Synchronization & Security Hardening

**Project:** the A&A Specialty Cafe & Sweets — Al-Madinah Al-Munawwarah, Saudi Arabia  
**Type:** Architectural Specification & Engineering Plan (Design Only — Not Implemented in Phase 1.x)  
**Date:** November 8, 2026  
**Status:** **REVISED & ALIGNED WITH SOURCE-OF-TRUTH CODEBASE**  

---

### 1. Executive Summary & Purpose

Phase 1.1.1 and the Final Acceptance Gate completed all achievable client-side hardening for the A&A Cafe Games single-page application (`index.html`). The platform operates reliably, fairly, and stably on drive-thru and in-store mobile devices.

However, as documented in the security review, **client-side storage (`localStorage`) is physically isolated to each device**. Without a backend:
1. Cashier tablets cannot synchronize redeemed vouchers in real time.
2. Vouchers are minted using client-side algorithms whose salts are exposed in client source code.
3. Staff authentication in `staff.html` relies on client-side FNV-1a hashes.

The purpose of Phase 2 is to introduce a **minimal, lightweight, authoritative cloud backend** that solves these multi-terminal synchronization and security challenges without disrupting the existing client gameplay experience or adding heavy operational overhead.

---

### 2. High-Level Architecture Overview

```
                        ┌───────────────────────────────────┐
                        │    Customer Smartphone (Mobile)   │
                        │    9 Vanilla JS Canvas Games      │
                        │ (reflex, pattern, shuffle, stack, │
                        │  beans, pour, rhythm, pairhunt,   │
                        │            basketball)            │
                        └─────────────────┬─────────────────┘
                                          │
                                          │ HTTPS (TLS 1.3)
                                          ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        AUTHORITATIVE CLOUD BACKEND (EDGE / NODE)                       │
│                                                                                        │
│   ┌────────────────────────────────────────────────────────────────────────────────┐   │
│   │                         API Gateway & Security Layer                           │   │
│   │ - Server-Authoritative Voucher Minting (HMAC-SHA256 / Ed25519)                 │   │
│   │ - Staff Authentication (Argon2id Hash + HttpOnly JWT Tokens)                   │   │
│   │ - Input Telemetry Plausibility & Anti-Abuse Rate Limiting                      │   │
│   │ - Privacy-Preserving Customer Phone Storage (SHA-256 + Pepper)                 │   │
│   └───────────────┬────────────────────────────────────────────────┬───────────────┘   │
│                   │                                                │                   │
│                   ▼                                                ▼                   │
│   ┌───────────────────────────────┐                ┌───────────────────────────────┐   │
│   │     Central SQL Database      │                │   Real-Time Terminal Sync     │   │
│   │  (Cloudflare D1 / PostgreSQL) │                │    (Server-Sent Events / SSE) │   │
│   │ - Atomic Voucher Ledger       │                │ - Broadcasts instant voucher  │   │
│   │ - Multi-Terminal Single Use   │                │   redemptions to all active   │   │
│   │ - Immutable Audit Logs        │                │   cashier tablet screens      │   │
│   └───────────────┬───────────────┘                └───────────────┬───────────────┘   │
└───────────────────┼────────────────────────────────────────────────┼───────────────────┘
                    │                                                │
                    ▼                                                ▼
     ┌──────────────────────────────┐                ┌──────────────────────────────┐
     │   Staff Tablet (Cashier 1)   │                │   Staff Tablet (Cashier 2)   │
     │     Drive-Thru Window        │                │       Indoor Counter         │
     └──────────────────────────────┘                └──────────────────────────────┘
```

---

### 3. Recommended Technology Stack

To minimize operational complexity, vendor lock-in, and monthly recurring costs, we recommend:
1. **Compute:** **Cloudflare Workers** (or lightweight Node.js container / Supabase Edge Functions).
   - Serverless, cold-start free, zero server OS patching.
2. **Database:** **Cloudflare D1** (Serverless SQLite) or **Supabase PostgreSQL**.
   - ACID-compliant transactions (`BEGIN TRANSACTION ... COMMIT`).
   - Guarantees that two cashiers scanning the exact same voucher code simultaneously will result in exactly one successful redemption and one immediate collision rejection.
3. **Staff Real-Time Updates:** **Server-Sent Events (SSE)** or lightweight WebSockets.
   - Pushes redemption notifications to all active staff tablets.
4. **Estimated Infrastructure Cost:**
   - Cloudflare Workers Free Tier covers **100,000 requests/day** at **\$0/month**.
   - Standard paid tier is a flat **\$5.00/month** (~19 SAR), providing ample capacity for peak drive-thru rushes.

---

### 4. Database Schema (Master Ledger)

```sql
-- 1. Game Runs & Telemetry (Fraud Auditing)
CREATE TABLE game_runs (
    id TEXT PRIMARY KEY,                       -- UUIDv4
    player_id TEXT NOT NULL,
    game_id TEXT NOT NULL,                     -- 'reflex', 'pattern', 'shuffle', 'stack', 'beans', 'pour', 'rhythm', 'pairhunt', 'basketball'
    score INTEGER NOT NULL,
    duration_seconds REAL NOT NULL,
    created_at INTEGER NOT NULL,
    ip_hash TEXT NOT NULL
);

-- 2. Vouchers & Entitlements (Master Ledger)
CREATE TABLE vouchers (
    code TEXT PRIMARY KEY,                     -- 'TNAX-XXXX-XXX' (Standard Base36 format)
    phone_hash TEXT NOT NULL,                  -- SHA-256(Phone + Server_Secret_Pepper)
    tier INTEGER NOT NULL,                     -- 1 (5%), 2 (7%), 3 (Drink Upgrade)
    is_welcome_promo INTEGER NOT NULL,         -- 1 = Yes, 0 = No
    earned_score INTEGER NOT NULL,
    issued_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL,               -- issued_at + 3 days (259,200,000 ms)
    status TEXT NOT NULL DEFAULT 'ACTIVE',     -- 'ACTIVE', 'REDEEMED', 'EXPIRED', 'REVOKED'
    redeemed_at INTEGER,
    redeemed_by_staff_id TEXT,
    redeemed_at_terminal TEXT
);

-- 3. Staff Accounts & Roles
CREATE TABLE staff_accounts (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL,                        -- 'CASHIER', 'SUPERVISOR', 'MANAGER'
    pin_hash TEXT NOT NULL,                    -- Argon2id salted hash
    failed_attempts INTEGER DEFAULT 0,
    locked_until INTEGER DEFAULT 0
);

-- 4. Immutable Audit Log
CREATE TABLE staff_audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    staff_id TEXT NOT NULL,
    terminal_id TEXT NOT NULL,
    action TEXT NOT NULL,                      -- 'LOGIN', 'VERIFY_VOUCHER', 'REDEEM_VOUCHER'
    target_voucher_code TEXT,
    result TEXT NOT NULL,                      -- 'SUCCESS', 'ALREADY_REDEEMED', 'EXPIRED'
    created_at INTEGER NOT NULL
);

CREATE INDEX idx_vouchers_phone ON vouchers(phone_hash);
CREATE INDEX idx_vouchers_status ON vouchers(status);
```

---

### 5. Core API Endpoints

All endpoints use standard JSON over HTTPS:

1. `POST /api/v1/run/complete`
   - **Client submits:** Game ID, raw score, duration, and action telemetry.
   - **Server validates:** Score feasibility for the game mode.
   - **Server returns:** Signed cryptographic session token.

2. `POST /api/v1/voucher/claim`
   - **Client submits:** Session token, customer Saudi mobile number.
   - **Server validates:** One voucher per phone per 24h, tier qualification (Tier 1: 5,000 pts or 350 pts welcome promo; Tier 2: 7,500 pts; Tier 3: 10,000 pts).
   - **Server returns:** Master-minted voucher code (`TNAX-XXXX-XXX`) and expiration timestamp.

3. `POST /api/v1/staff/login`
   - **Staff submits:** Username and PIN.
   - **Server verifies:** Argon2id hash with persistent lockout after 5 failures.
   - **Server returns:** HttpOnly JWT session cookie with role permissions.

4. `POST /api/v1/staff/redeem` (Atomic Single-Use Redemption)
   - **Staff submits:** Scanned voucher code and cashier terminal identifier.
   - **Server executes:** Atomic transaction:
     ```sql
     UPDATE vouchers 
     SET status = 'REDEEMED', 
         redeemed_at = ?1, 
         redeemed_by_staff_id = ?2, 
         redeemed_at_terminal = ?3 
     WHERE code = ?4 AND status = 'ACTIVE' AND expires_at > ?1;
     ```
   - **Server broadcasts:** Instant SSE notification to all connected cashier tablets to invalidate the code on their screens.

---

### 6. Optional Integrations (As Business Needs Require)

- **Point-of-Sale (POS) Webhook Integration:**
  If the cafe leadership chooses to connect directly with the store's POS (such as Foodics or Geidea), webhook dispatchers can apply the discount to the active order ticket automatically. This is strictly optional and not required for core voucher synchronization.
- **SMS Delivery (Optional):**
  If management desires sending the coupon code to the customer via SMS (Taqnyat / Unifonic), an edge webhook can be triggered upon claim. No OTP barrier should be imposed on gameplay.

---

### 7. Implementation Roadmap & Milestones

- **Phase 2.1:** Deploy Cloudflare Worker API & D1 Database schema; migrate staff authentication to Argon2id.
- **Phase 2.2:** Connect `index.html` claim flow to authoritative voucher issuance API.
- **Phase 2.3:** Update `staff.html` with real-time redemption synchronization.
- **Phase 2.4:** Conduct end-to-end drive-thru pilot testing in Al-Madinah.
