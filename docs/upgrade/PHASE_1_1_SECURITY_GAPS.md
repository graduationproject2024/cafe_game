# A&A CAFE GAMES — PHASE 1.1 SECURITY & ARCHITECTURAL GAPS
## Engineering-Honest Security Posture, Threat Modeling & Phase 2 Prerequisites

**Project:** the A&A Specialty Cafe & Sweets — Al-Madinah Al-Munawwarah  
**Date:** November 8, 2026  
**Audience:** Technical Management, Security Reviewers & Lead Engineers

---

### 1. Executive Security Assessment

In Phase 1 and Phase 1.1, the A&A Cafe Games platform achieved significant hardening against casual fraud, terminal tampering, opportunistic score manipulation, and cashier double-redemption.

However, from a rigorous cybersecurity perspective, **client-side controls cannot provide 100% cryptographic security**. As long as the game logic, signing salts, and voucher encoding logic reside entirely within client-side JavaScript (`index.html`), an adversary with browser developer tools, reverse-engineering skills, and script modification capabilities can inspect memory, forge local storage, or extract embedded keys.

This document transparently documents what the current architecture protects against, what it cannot protect against without a backend, and the precise technical requirements for Phase 2.

---

### 2. Current Defense Capabilities vs. Architectural Limitations

| Defense Layer | Implemented Mechanism (Phase 1.1) | Protection Provided | Residual Vulnerability / Limitation |
|---|---|---|---|
| **Session Integrity** | FNV-1a hash of phone, day, score, and salt (`signSession`) | Detects direct tampering with `localStorage` variables or casual console modifications. | FNV-1a is a 32-bit non-cryptographic checksum. An attacker reading the source can compute a valid signature for arbitrary scores locally. |
| **Run Certification** | Signed `runCert` token generated upon legitimate `endRun()` | Prevents calling `claimFlow()` without having initiated a gameplay run. | An attacker can trigger `endRun()` programmatically in the console with forged parameters in test mode, or mimic the internal call stack. |
| **Voucher Minting** | Base36 algorithmic encoding with checksum & date encoding | Prevents cashier staff or customers from guessing or presenting arbitrary random strings (e.g. `G-AAAA-AA`). | Because `CFG.salt` and `mintCode()` reside in client source, an attacker can generate syntactically valid codes offline without playing. |
| **Cashier Verification** | Algorithmic decode, 3-day window check, and `the_aa_cafe_redeemed_register` | Prevents presenting expired vouchers (> 3 days) or reusing the same voucher on the same browser device. | Without a shared central database, `localStorage` on the cashier iPad/device is isolated. If a customer visits a different cashier terminal or clears cache, replay is theoretically possible. |
| **Staff Authentication** | PBKDF2/SHA-256 style salted hash with persistent failed-attempt lockout | Eliminates plaintext PINs (`1001`, `2024`, `9999`) and prevents brute-force dictionary attacks at the cashier terminal. | Physical or local storage access to the cashier browser allows clearing the lockout state or inspecting local databases. |

---

### 3. Cryptographic Deep-Dive: FNV-1a vs. True Cryptographic Signatures

The platform currently employs an in-memory FNV-1a 32-bit hashing algorithm:
```javascript
function hash(str){
  let h = 0x811c9dc5;
  for(let i = 0; i < str.length; i++){
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36).toUpperCase();
}
```

#### Why FNV-1a was used in Phase 1:
- Zero external dependencies (essential to keep the single-file lightweight architecture).
- Sub-millisecond performance on low-end mobile devices without WebCrypto async overhead.
- Excellent avalanche properties for detecting casual accidental or deliberate string modifications.

#### Why FNV-1a is NOT sufficient for enterprise banking / high-value rewards:
- **32-Bit Collision Space:** $2^{32} \approx 4.29 \times 10^9$ possibilities. Birthday bound collisions occur in roughly $2^{16} = 65,536$ evaluations.
- **Symmetric Key Exposure:** The salt is public in the client script (`CFG.salt`). True zero-trust security requires an **Asymmetric Public-Key Infrastructure (PKI)** or a private server-held HMAC key.

---

### 4. Phase 2 Architecture: Authoritative Cloud Backend Prerequisites

To achieve commercial-grade fraud prevention and multi-branch scalability, the following backend components are required in Phase 2:

```
┌─────────────────────────────────┐
│     Client (Mobile Browser)     │
│   Gameplay & Local Rendering    │
└────────────────┬────────────────┘
                 │ 1. Seed & Input Events Stream
                 ▼
┌─────────────────────────────────┐
│    Authoritative Cloud Worker   │ ◄─── Private Master Key (HS256 / Ed25519)
│  (Cloudflare Workers / Node.js) │
│ - Validates game input timestamps
│ - Generates cryptographically signed JWT voucher
└────────────────┬────────────────┘
                 │ 2. Atomic Voucher Storage
                 ▼
┌─────────────────────────────────┐
│     Centralized Cloud DB        │ ◄─── Real-Time Cashier POS Sync
│ (Supabase / Postgres / Redis)   │      (Foodics / Geidea Integration)
│ - Atomic redemption (single-use)│
│ - Multi-device staff terminal   │
└─────────────────────────────────┘
```

#### Specific Phase 2 Deliverables:
1. **Authoritative Cloud Worker / API Gateway:**
   - Host private signing keys in secure server-side environment variables (`HMAC_SECRET`).
   - Implement server-side verification of gameplay sessions: client submits start timestamp, game action seed, and telemetry summary; server verifies physical feasibility before issuing a voucher token.
2. **Centralized Atomic Redemption Database:**
   - Replace device-local `localStorage` with a multi-tenant cloud store (e.g. Supabase, Firebase, or Redis).
   - Enforce database-level `SELECT ... FOR UPDATE` or atomic transactions so that once a voucher is scanned at Cashier Terminal A, it is instantly invalidated across all terminals and branches in real-time.
3. **Point of Sale (POS) Webhook Integration:**
   - Directly integrate validated vouchers with the cafe's active POS (Foodics, Geidea, or Square) via secure webhooks, applying the 5%, 7%, or Drink Upgrade directly to the order ticket at the drive-thru window.
4. **Device Fingerprinting & Rate-Limiting:**
   - Implement IP and device-rate limiting at the edge (Cloudflare) to prevent automated bot scripts from harvesting discount vouchers.

---

### 5. Conclusion & Recommendation

Phase 1.1 successfully eliminates all operational bugs, state leakage, and scoring inconsistencies. The platform is **operationally stable, enjoyable, and safe for drive-thru entertainment**.

For commercial rollout across multiple stores, Phase 2 should be authorized to deploy the lightweight authoritative server layer outlined above.
