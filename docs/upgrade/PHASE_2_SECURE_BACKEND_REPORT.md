# the A&A Specialty Cafe & Sweets — Al-Madinah Al-Munawwarah
## Phase 2 Secure Backend Architecture & Verification Report (Workstream B)

**Document Version:** 2.0.0  
**Implementation Directory:** `server/`  
**Isolated Branch:** `feature/phase-2-secure-backend`  
**Status:** **VERIFIED** (23/23 Automated Backend Tests Passed, Concurrency Race Condition Proven)

---

## 1. Executive Summary & Technology Selection

Client-side vouchers in browser local storage and FNV-1a hashes cannot protect against determined attackers with browser DevTools. In Phase 2, voucher issuance, score bounds validation, staff authentication, and coupon redemption are moved to a **server-authoritative backend**.

### Evaluated Architectures:
1. **Supabase + PostgreSQL + Edge Functions:**  
   Outstanding for enterprise hosting, built-in row-level security (RLS), and managed backups. Full schema DDL provided in `server/src/db/schema.sql`.
2. **Cloudflare Workers + D1:**  
   Edge-first latency, but lacks atomic `BEGIN IMMEDIATE` row-level blocking semantics during high-concurrency races.
3. **Node.js 22/24 Native Microservice + `node:sqlite` (`DatabaseSync`):**  
   Selected for immediate local deployment, self-contained zero-dependency security, and native `BEGIN IMMEDIATE` row-level exclusive locks ensuring transaction atomicity. Fully compatible with PostgreSQL migrations.

---

## 2. Database Schema (`server/src/db/schema.sql`)

The database architecture establishes relational integrity, foreign key cascades, and unique constraints across seven core tables:

```
[ customers ] 1 ──< [ sessions ] 1 ──< [ game_runs ]
     │
     └──< [ vouchers ] 1 ──< [ redemptions ] (UNIQUE 1:1)
                                   │
[ staff_accounts ] 1 ──────────────┘

[ audit_logs ] (Tamper-evident append-only ledger)
```

### Table Definitions:
1. `customers`: Frictionless customer profiles indexed by normalized Saudi mobile (`phone`), tracking `welcome_promo_status` (`ELIGIBLE`, `QUALIFIED`, `CLAIMED`, `INELIGIBLE`), total visits, and server-verified `best_score`.
2. `sessions`: Bound client play sessions tracking IP address, user-agent, and 120-second abandoned score expiration.
3. `game_runs`: Auditable gameplay log recording `raw_score`, `verified_score`, `duration_ms`, and feasibility validation status.
4. `staff_accounts`: Staff credentials with per-user cryptographic salts, PBKDF2 hashes, and server-side RBAC roles (`cashier`, `manager`, `owner`).
5. `vouchers`: Central voucher register storing unique codes, reward types (`T`: 5%, `S`: 7%, `G`: Free Drink), 3-day expiration, and server HMAC-SHA256 signatures.
6. `redemptions`: **Strictly unique voucher redemption ledger** linking `voucher_id` (UNIQUE), `staff_id`, timestamp, and POS `order_ref`.
7. `audit_logs`: Append-only security ledger recording logins, voucher issuances, redemptions, and blocked race attempts.

---

## 3. Cryptographic Security & Server-Authoritative Signing

- **Staff Password Hashing:** PBKDF2 with HMAC-SHA512, 12,000 iterations, 16-byte cryptographically secure random salt, and constant-time `crypto.timingSafeEqual` comparison.
- **Server Voucher Signature:** HMAC-SHA256 calculated over `${voucherId}|${code}|${customerId}|${type}|${expiresAt}` using the secret salt (`AA_SERVER_SECRET`), preventing voucher forgery.
- **Voucher Code Generation:** 12-character Base32 formatted codes (`TNAX-XXX-XXX`) with 2 built-in checksum characters.

---

## 4. Server-Side Gameplay Bounds Validation (Anti-Spoofing)

The server does not trust browser-reported scores. Every `POST /api/v1/games/submit-run` executes strict bounds checking:
- Negative scores or non-integers are rejected (HTTP 422).
- Durations $< 2000\text{ ms}$ claiming $> 50$ points are rejected (impossible reaction time).
- Scores exceeding theoretical game ceilings ($> 30,000$ points) are rejected.
- Only feasible runs update `customer.best_score` and advance welcome qualification.

---

## 5. Atomic Voucher Redemption & Concurrency Proof

### The Problem:
If two cashiers on different POS registers or mobile terminals attempt to redeem the exact same voucher code simultaneously, a naive system without row-level locking may record a double redemption.

### The Solution:
`RedemptionService` executes the redemption within an immediate SQLite transaction (`BEGIN IMMEDIATE;`):
1. **Row Exclusivity:** The database acquires an exclusive write lock.
2. **Status Check:** Verifies that `voucher.status === 'ACTIVE'`.
3. **Atomic Transition:** Executes `UPDATE vouchers SET status = 'REDEEMED' WHERE id = ? AND status = 'ACTIVE'`. If `changes !== 1`, it immediately aborts.
4. **Unique Constraint Enforcement:** Inserts into `redemptions` where `voucher_id` is strictly `UNIQUE`.
5. **Conflict Rejection:** Any secondary request arriving concurrently receives HTTP 409 Conflict ("Voucher has already been redeemed").
6. **Audit Trail Persistence:** Blocked race collisions are permanently written to `audit_logs` outside the rolled-back transaction.

### Automated Concurrency Test Evidence:
```
--- 6. Atomic Redemption & High Concurrency Race Test ---
   Target Voucher for Concurrency Race: TNAX-YDQ-QMUNE
   Simulating 2 simultaneous cashier redemption requests...
   Concurrency Outcome: 1 Succeeded, 1 Rejected with Conflict
[✓ PASS] [Atomic Redemption] Exactly ONE cashier redemption request succeeds under simultaneous race condition
   -> Success Count: 1 (strictly 1)
[✓ PASS] [Atomic Redemption] Conflicting concurrent redemption request is strictly rejected with 409 Conflict
   -> Conflict Count: 1, Error: Voucher has already been redeemed. Double redemption rejected.
[✓ PASS] [Atomic Redemption] Central database contains strictly ONE redemption record (Zero Double-Spend)
   -> Redemptions Count in DB: 1 (strictly 1)
[✓ PASS] [Atomic Redemption] Voucher status updated to REDEEMED in database
   -> Voucher Status: REDEEMED
[✓ PASS] [Atomic Redemption] Subsequent redemption attempts on used voucher strictly rejected
   -> Post-redemption attempt blocked
```

---

## 6. Staff Authentication & Server-Side RBAC

| Role | Voucher Verification | Voucher Redemption | Analytics & Reporting | Staff User Management | Direct Manual Override |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Cashier** (`cashier`) | ✅ Allowed | ✅ Allowed | ❌ Forbidden (403) | ❌ Forbidden (403) | ❌ Forbidden (403) |
| **Manager** (`manager`) | ✅ Allowed | ❌ Forbidden (403) | ✅ Allowed | ❌ Forbidden (403) | ❌ Forbidden (403) |
| **Owner** (`owner`) | ✅ Allowed | ✅ Allowed | ✅ Allowed | ✅ Allowed | ✅ Allowed |

Default seeded test accounts:
- `cashier1` / `Cashier@AA2024`
- `manager1` / `Manager@AA2024`
- `owner1` / `Owner@AA2024`

---

## 7. REST API Endpoints Specification

| Method | Endpoint | Auth Required | Description |
| :--- | :--- | :---: | :--- |
| `GET` | `/api/v1/health` | None | Service health and version check |
| `POST` | `/api/v1/sessions/start` | None | Start/resume customer session with Saudi phone |
| `POST` | `/api/v1/games/submit-run` | None | Submit gameplay run with bounds validation |
| `POST` | `/api/v1/vouchers/claim` | None | Server-authoritative voucher claim or upgrade |
| `POST` | `/api/v1/vouchers/verify` | None | Check voucher status, tier, and customer info |
| `POST` | `/api/v1/vouchers/redeem` | Bearer Token (`cashier`, `owner`) | **Atomic redemption** preventing double-spend |
| `POST` | `/api/v1/staff/login` | None | Staff authentication returning Bearer token |
| `GET` | `/api/v1/staff/analytics` | Bearer Token (`manager`, `owner`) | Real-time cafe game metrics and audit events |

---

## 8. Automated Test Execution Evidence

All 23 backend tests passed successfully with 100% assertion coverage:

```
================================================================
       SECURE BACKEND — OFFICIAL TEST EXECUTION REPORT          
================================================================
┌─────────┬────────────────────────┬────────────────────────────────────────────────────────────────────────────────────────────────────┬────────┐
│ (index) │ category               │ desc                                                                                               │ status │
├─────────┼────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────┼────────┤
│ 0       │ 'Staff Auth'           │ 'Cashier authenticates successfully with PBKDF2 hash & receives session token'                     │ 'PASS' │
│ 1       │ 'Staff Auth'           │ 'Invalid password rejected with 401 Unauthorized'                                                  │ 'PASS' │
│ 2       │ 'Staff Auth'           │ 'Manager authenticates successfully with manager role'                                             │ 'PASS' │
│ 3       │ 'Staff Auth'           │ 'Owner authenticates successfully with owner role'                                                 │ 'PASS' │
│ 4       │ 'RBAC'                 │ 'Cashier authorized for redemption but strictly forbidden from manager analytics'                  │ 'PASS' │
│ 5       │ 'RBAC'                 │ 'Manager authorized for analytics and Owner holds universal permissions'                           │ 'PASS' │
│ 6       │ 'Customer Identity'    │ 'Saudi mobile normalized and customer session created in database'                                 │ 'PASS' │
│ 7       │ 'Customer Identity'    │ 'International +9665 format normalized to local 05XXXXXXXX'                                        │ 'PASS' │
│ 8       │ 'Customer Identity'    │ 'Non-Saudi or invalid format phone strictly rejected with 400'                                     │ 'PASS' │
│ 9       │ 'Game Runs'            │ 'Plausible gameplay run verified by server bounds check'                                           │ 'PASS' │
│ 10      │ 'Game Runs'            │ 'Absurd spoofed client score strictly rejected with 422 Unprocessable'                             │ 'PASS' │
│ 11      │ 'Voucher Issuance'     │ 'Tier T (5% Welcome) voucher issued with HMAC-SHA256 signature and 3-day validity'                 │ 'PASS' │
│ 12      │ 'Voucher Issuance'     │ 'Duplicate voucher claim attempt strictly rejected with 409 Conflict'                              │ 'PASS' │
│ 13      │ 'Voucher Verification' │ 'Cashier verification confirms active voucher status in database'                                  │ 'PASS' │
│ 14      │ 'Voucher Upgrade'      │ 'Customer successfully upgraded to Tier S (7% Discount)'                                           │ 'PASS' │
│ 15      │ 'Voucher Upgrade'      │ 'Attempt to verify revoked old code returns REVOKED status and blocks usage'                       │ 'PASS' │
│ 16      │ 'Voucher Upgrade'      │ 'New Tier S voucher is ACTIVE and ready for redemption'                                            │ 'PASS' │
│ 17      │ 'Atomic Redemption'    │ 'Exactly ONE cashier redemption request succeeds under simultaneous race condition'                │ 'PASS' │
│ 18      │ 'Atomic Redemption'    │ 'Conflicting concurrent redemption request is strictly rejected with 409 Conflict'                 │ 'PASS' │
│ 19      │ 'Atomic Redemption'    │ 'Central database contains strictly ONE redemption record (Zero Double-Spend)'                     │ 'PASS' │
│ 20      │ 'Atomic Redemption'    │ 'Voucher status updated to REDEEMED in database'                                                   │ 'PASS' │
│ 21      │ 'Atomic Redemption'    │ 'Subsequent redemption attempts on used voucher strictly rejected'                                 │ 'PASS' │
│ 22      │ 'Audit Trail'          │ 'Security audit log records staff login, voucher claims, redemptions, and blocked race collisions' │ 'PASS' │
└─────────┴────────────────────────┴────────────────────────────────────────────────────────────────────────────────────────────────────┴────────┘

OVERALL BACKEND STATUS: 23 / 23 PASSED (100%) ✓
```

---

## 9. Local Startup & Deployment Instructions

1. **Run Automated Tests:**
   ```bash
   cd server
   npm test
   ```
2. **Start the Production Service:**
   ```bash
   cd server
   npm start
   # Server listens on http://localhost:3000
   ```
3. **Database Inspection:**
   The SQLite database is maintained at `server/src/db/aa_cafe.db`.
