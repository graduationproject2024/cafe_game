# A&A CAFE GAMES — PHASE 2 ARCHITECTURE PROPOSAL
## Authoritative Edge Backend, Multi-Terminal Synchronization & POS Integration

**Project:** the A&A Specialty Cafe & Sweets — Al-Madinah Al-Munawwarah, Saudi Arabia  
**Type:** Architectural Specification & Engineering Plan (Design Only)  
**Date:** November 8, 2026  
**Status:** **PROPOSED — READY FOR CLIENT & MANAGEMENT APPROVAL**  

---

### 1. Executive Summary

Phase 1.1.1 elevated the A&A Cafe Games single-page application to the pinnacle of client-side engineering quality, eliminating all known gameplay exploits, state corruption bugs, and UI race conditions.

Phase 2 transitions the platform from a client-isolated application to a **Commercial-Grade, Multi-Terminal Connected Ecosystem**. By introducing an ultra-lightweight, high-performance edge backend, the cafe achieves:
1. **Real-time cashier synchronization:** A voucher redeemed at the drive-thru window is instantly invalidated on the indoor cashier tablet within 50 milliseconds.
2. **True cryptographic fraud prevention:** Vouchers are minted using server-side private keys (Ed25519 / HMAC-SHA256) inaccessible to client DevTools.
3. **Automated Point-of-Sale (POS) integration:** Native integration with Saudi Arabia's leading cafe POS systems (**Foodics** and **Geidea**), automatically applying customer discounts to the drive-thru checkout screen.
4. **Zero-infrastructure cost:** The proposed architecture operates entirely within the free or \$5/month tiers of modern edge cloud platforms.

---

### 2. High-Level Architecture Diagram

```
                              ┌───────────────────────────────────┐
                              │    Customer Smartphone (Mobile)   │
                              │  HTML5 Canvas Games & Touch Input │
                              └─────────────────┬─────────────────┘
                                                │
                                                │ HTTPS / WebSocket (TLS 1.3)
                                                ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        CLOUDFLARE EDGE NETWORK (Riyadh / Jeddah PoP)                   │
│                                                                                        │
│   ┌────────────────────────────────────────────────────────────────────────────────┐   │
│   │                         Edge Worker API Gateway (TypeScript)                   │   │
│   │ - DDoS Mitigation & Bot Protection (WAF)                                      │   │
│   │ - IP & Device Rate Limiting (Cloudflare KV)                                    │   │
│   │ - JWT Session Authorization & Ed25519 Voucher Cryptography                     │   │
│   │ - Telemetry & Input Plausibility Validator                                    │   │
│   └───────────────┬────────────────────────────────────────────────┬───────────────┘   │
│                   │                                                │                   │
│                   ▼                                                ▼                   │
│   ┌───────────────────────────────┐                ┌───────────────────────────────┐   │
│   │    Cloudflare D1 Database     │                │     Cloudflare Durable        │   │
│   │     (Serverless SQLite)       │                │      Objects (Realtime)       │   │
│   │ - ACID Transactions           │                │ - WebSocket Broadcasting      │   │
│   │ - Global Read Replicas        │                │ - Real-time Cashier Terminal  │   │
│   │ - Multi-Terminal Ledger       │                │   Status Synchronization      │   │
│   └───────────────┬───────────────┘                └───────────────┬───────────────┘   │
└───────────────────┼────────────────────────────────────────────────┼───────────────────┘
                    │                                                │
                    │                                                │
                    ▼                                                ▼
     ┌──────────────────────────────┐                ┌──────────────────────────────┐
     │   Staff Tablet (Cashier 1)   │                │   Staff Tablet (Cashier 2)   │
     │     Drive-Thru Terminal      │                │       Indoor Counter         │
     └──────────────┬───────────────┘                └──────────────┬───────────────┘
                    │                                                │
                    └───────────────────────┬────────────────────────┘
                                            │ Webhook Sync
                                            ▼
                             ┌──────────────────────────────┐
                             │    Foodics / Geidea POS API  │
                             │  Automated Discount Check    │
                             └──────────────────────────────┘
```

---

### 3. Recommended Technology Stack

We deliberately recommend **Cloudflare Workers + Cloudflare D1** over traditional heavy container servers (such as AWS EC2 or Kubernetes) for four decisive reasons:
1. **Ultra-Low Latency in Saudi Arabia:** Cloudflare operates local Points of Presence (PoPs) directly inside Riyadh, Jeddah, and Dammam. Edge worker roundtrips from Al-Madinah average **12 to 24 milliseconds**.
2. **Serverless & Maintenance-Free:** Zero operating system patching, zero container clustering, and zero database connection pooling bottlenecks.
3. **Atomic ACID Consistency:** Cloudflare D1 provides atomic database transactions, guaranteeing that two cashiers scanning the exact same voucher code in the same millisecond will result in exactly one successful redemption and one immediate rejection.
4. **Economic Efficiency:** The Cloudflare Workers Free Tier includes **100,000 requests per day** at \$0 cost. Even during peak seasonal volume (e.g. Ramadan / Eid rush), the paid tier is a flat \$5.00/month.

---

### 4. Relational Database Schema (Cloudflare D1 / SQLite)

```sql
-- 1. Game Sessions (Stores play history and fraud detection telemetry)
CREATE TABLE game_sessions (
    id TEXT PRIMARY KEY,                       -- UUIDv4
    device_fingerprint TEXT NOT NULL,          -- Hashed device canvas/screen signature
    ip_hash TEXT NOT NULL,                     -- SHA-256(Client IP + Pepper)
    game_id TEXT NOT NULL,                     -- 'glide', 'hoops', 'beans', etc.
    score INTEGER NOT NULL,
    duration_seconds REAL NOT NULL,
    input_events_count INTEGER NOT NULL,
    started_at INTEGER NOT NULL,               -- Epoch millisecond timestamp
    ended_at INTEGER NOT NULL,
    is_valid INTEGER DEFAULT 1                 -- 1 = Valid, 0 = Suspicious
);

-- 2. Vouchers & Entitlements (Master Ledger)
CREATE TABLE vouchers (
    code TEXT PRIMARY KEY,                     -- 'G-XXXX-XX' (Base36 formatted)
    phone_number_hash TEXT NOT NULL,           -- SHA-256(05XXXXXXXX + Pepper)
    tier INTEGER NOT NULL,                     -- 1 (5%), 2 (7%), 3 (Drink Upgrade)
    is_welcome_promo INTEGER NOT NULL,         -- 1 = 350 pt welcome, 0 = regular score
    earned_score INTEGER NOT NULL,
    issued_at INTEGER NOT NULL,                -- Timestamp
    expires_at INTEGER NOT NULL,               -- Issued_at + (3 * 86400 * 1000)
    status TEXT NOT NULL DEFAULT 'ACTIVE',     -- 'ACTIVE', 'REDEEMED', 'EXPIRED', 'REVOKED'
    redeemed_at INTEGER,
    redeemed_by_staff_id TEXT,
    redeemed_at_terminal TEXT,
    FOREIGN KEY(redeemed_by_staff_id) REFERENCES staff_users(id)
);

-- 3. Staff Users & Authentication
CREATE TABLE staff_users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL,                        -- 'CASHIER', 'SUPERVISOR', 'MANAGER'
    pin_hash TEXT NOT NULL,                    -- Argon2id / bcrypt salted hash
    failed_attempts INTEGER DEFAULT 0,
    locked_until INTEGER DEFAULT 0,
    created_at INTEGER NOT NULL
);

-- 4. Immutable Audit Log (Compliance & Dispute Resolution)
CREATE TABLE staff_audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    staff_id TEXT NOT NULL,
    terminal_id TEXT NOT NULL,
    action TEXT NOT NULL,                      -- 'VERIFY_VOUCHER', 'REDEEM_VOUCHER', 'LOGIN', 'LOGOUT'
    target_voucher_code TEXT,
    result TEXT NOT NULL,                      -- 'SUCCESS', 'ALREADY_REDEEMED', 'EXPIRED', 'FAILED_PIN'
    ip_address TEXT NOT NULL,
    created_at INTEGER NOT NULL
);

CREATE INDEX idx_vouchers_phone ON vouchers(phone_number_hash);
CREATE INDEX idx_vouchers_status ON vouchers(status);
```

---

### 5. API Specification & Workflow

All endpoints accept and return JSON with mandatory `Content-Type: application/json` and TLS 1.3 encryption.

#### 5.1 POST `/api/v1/session/start`
- **Purpose:** Initiates a tracked game run.
- **Request:** `{ gameId: 'glide', deviceHash: '...' }`
- **Response:** `{ sessionId: 'uuid', seed: 489214, nonce: '...', expiresAt: 1731081600000 }`

#### 5.2 POST `/api/v1/voucher/claim`
- **Purpose:** Finalizes score and mints verified voucher.
- **Request:**
  ```json
  {
    "sessionId": "b8a91a92-...",
    "phone": "0501234567",
    "score": 520,
    "telemetry": { "clicks": 142, "accuracy": 0.88, "durationMs": 45120 }
  }
  ```
- **Validation Engine:** Checks that the duration matches physics limits, score is physically possible for that game mode, and phone number has not exceeded 1 voucher per 24 hours.
- **Response:**
  ```json
  {
    "status": "ISSUED",
    "voucherCode": "G-49F1-A8",
    "tier": 1,
    "discount": "5%",
    "expiresAt": 1731340800000
  }
  ```

#### 5.3 POST `/api/v1/staff/redeem` (Atomic Redemption)
- **Headers:** `Authorization: Bearer <JWT_STAFF_TOKEN>`
- **Request:** `{ "voucherCode": "G-49F1-A8", "terminalId": "DRIVE_THRU_POS_1" }`
- **Database Transaction (D1):**
  ```sql
  UPDATE vouchers 
  SET status = 'REDEEMED', 
      redeemed_at = ?1, 
      redeemed_by_staff_id = ?2, 
      redeemed_at_terminal = ?3 
  WHERE code = ?4 AND status = 'ACTIVE' AND expires_at > ?1;
  ```
- **Response (Success):**
  ```json
  {
    "success": true,
    "code": "G-49F1-A8",
    "tier": 1,
    "benefit": "5% Discount on Total Bill",
    "customerPhoneMasked": "050****567"
  }
  ```
- **Response (Collision / Already Redeemed):**
  ```json
  {
    "success": false,
    "error": "VOUCHER_ALREADY_REDEEMED",
    "message": "تم استخدام هذا الكوبون مسبقاً في نقطة بيع أخرى",
    "redeemedAt": 1731080920000,
    "terminal": "INDOOR_COUNTER_2"
  }
  ```

---

### 6. Point of Sale (POS) Integration: Foodics & Geidea

Saudi Arabia's cafe sector relies heavily on **Foodics POS**. Phase 2 incorporates native webhook dispatching:

```
[Cashier Scans Voucher in staff.html]
                   │
                   ▼
       [Cloudflare Worker Backend]
                   │
                   ├──► 1. Mark 'REDEEMED' in Cloudflare D1
                   │
                   └──► 2. Dispatch Foodics POS API Webhook
                           POST https://api.foodics.com/v5/orders/{activeOrderId}/discounts
                           Headers: Authorization: Bearer {FOODICS_API_TOKEN}
                           Body: { "discount_type": "PERCENTAGE", "value": 5, "reason": "A&A Games Reward" }
```

When Cashier 1 touches "Redeem", the discount is applied to the active ticket on the Foodics screen without manual cashier calculations, eliminating drive-thru delays.

---

### 7. Cost & Infrastructure Budget

| Component | Provider / Tier | Monthly Quota Included | Estimated Monthly Cost |
|---|---|---|---|
| Edge Compute & API | Cloudflare Workers (Paid Tier) | 10,000,000 requests/mo | **\$5.00** |
| Database Storage | Cloudflare D1 Serverless | 5,000,000 read units / day | **\$0.00** (Included) |
| In-Memory Caching | Cloudflare Workers KV | 1 GB storage, 100k reads/day | **\$0.00** (Included) |
| Web Application Firewall | Cloudflare WAF + DDoS Shield | Unlimited mitigation | **\$0.00** (Free Tier) |
| SMS Gateway (Optional) | Unifonic / Taqnyat (KSA) | 0.09 SAR per SMS verification | As consumed (~50 SAR/mo) |
| **TOTAL INFRASTRUCTURE** | **Cloudflare Edge Platform** | **Commercial Enterprise Grade** | **\$5.00 / month (~19 SAR)** |

---

### 8. Implementation Roadmap (Phase 2 Sprints)

- **Sprint 2.1 (Backend Foundation):** Deploy Cloudflare Worker project, configure D1 schema, and migrate staff authentication to Argon2id + JWT tokens.
- **Sprint 2.2 (Cryptographic Voucher Engine):** Wire `index.html` API client to fetch session nonces and submit scores to `/api/v1/voucher/claim`.
- **Sprint 2.3 (Cashier Real-time Sync):** Upgrade `staff.html` with WebSocket client for instantaneous cross-terminal redemption alerts.
- **Sprint 2.4 (Foodics POS Integration):** Connect Foodics sandbox, verify automatic ticket discount application, and conduct live drive-thru field trial.
