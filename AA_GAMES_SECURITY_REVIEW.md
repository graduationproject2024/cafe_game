# A&A Cafe Games — Application Security & Anti-Cheat Review
**Document ID:** `AA_GAMES_SECURITY_REVIEW.md`  
**Date:** October 17, 2026  
**Auditor:** Application Security & Cryptographic Systems Specialist (Antigravity AppSec)  
**Target Platform:** the A&A specialty cafe & sweets (Drive-Thru & Branch, Al-Madinah Al-Munawwarah)  
**Classification:** Internal Engineering Security Assessment  

---

## 1. Executive Summary & Security Posture

The A&A Cafe Games application is a client-side web application designed to run on patron smartphones during in-car drive-thru visits and in-store table waits. Patrons scan a physical QR code, play 60-second games, and earn redeemable promotional discount codes (5%, 10%, or free drinks).

Because this application runs client-side without an authoritative gaming server executing every game frame in the cloud, **clear trust boundaries must be explicitly mapped**. This review details:
1. The real threats and attack vectors.
2. The deployed cryptographic and procedural countermeasures.
3. The Saudi mobile phone validation architecture (strictly format-validated, no OTP, no paid services).
4. Residual risks and recommended future server-side hardening.

---

## 2. Threat Modeling & Trust Boundaries

```
[ UNTRUSTED ZONE: CLIENT BROWSER / DEVICE ]
┌────────────────────────────────────────────────────────┐
│ - Patron Mobile Browser (Safari, Chrome, Samsung)       │
│ - DOM / JavaScript Engine / LocalStorage               │
│ - Attacks: Memory manipulation, auto-clickers, DevTools│
└────────────────────────────────────────────────────────┘
                           │
       Cryptographic Session Signature (signSession)
       Rate Limiting & Anti-Spam (antiSpamCheck)
       Single-Use Idempotent Codes (store.red)
                           ▼
[ SEMI-TRUSTED ZONE: CASHIER / BRANCH REDEMPTION ]
┌────────────────────────────────────────────────────────┐
│ - Cashier POS Screen (#staff portal)                   │
│ - Staff PIN Verification (Salted FNV-1a Hash)          │
│ - Local Store Ledger of Redeemed Codes                 │
│ - Cashier Visual Voucher Verification                  │
└────────────────────────────────────────────────────────┘
```

### 2.1 Threat Vector Matrix
| Threat ID | Threat Description | Attack Vector | Severity | Implemented Mitigation |
| :--- | :--- | :--- | :---: | :--- |
| **TH-01** | Arbitrary Score Forgery | Editing `S.best` in `localStorage` or browser console | **High** | Multi-pass Fowler-Noll-Vo cryptographic signature (`signSession`) bound to phone, order, and score. Tampering purges session. |
| **TH-02** | Auto-Clicker & Macro Exploits | Automated touch events clicking 50+ times/sec | **High** | `antiSpamCheck()` clamps input to human threshold (max 12 taps/sec, min 45ms delta). Target click reaction minimum enforced (>100ms). |
| **TH-03** | Cashier PIN Brute-Force | Automated script testing PIN combinations on `#staff` | **High** | 32-bit salted PIN hash (`CFG.staffPinHash = 1241566683`) with persistent 60-second lockout after 3 consecutive failures. |
| **TH-04** | Voucher Replay Attacks | Customer using the same voucher code on multiple orders | **Medium** | Single-use idempotent redemption ledger (`store.red[code] = timestamp`) checked before discount application. |
| **TH-05** | Daily Reward Farming | Replaying games repeatedly to hoard multiple daily vouchers | **Medium** | Device-level daily cap (maximum 2 rewarded sessions per device fingerprint per calendar day). |
| **TH-06** | Invalid / Foreign Phone Entry | Inputting fake, international, or landline phone numbers | **Low** | Strict CITC Saudi mobile numbering validation and canonical normalization (`+9665XXXXXXXX`). |
| **TH-07** | Patron PII Exposure | Customer phone numbers visible on public counter displays | **Low** | Privacy masking implemented (`+966 50 *** 4567`) across all administrative and logging views. |

---

## 3. Cryptographic Anti-Cheat Engineering

### 3.1 Session Tampering Signature (`signSession`)
The application computes a multi-pass salted cryptographic checksum prior to saving state:

```javascript
function signSession(s){
  let acc = hash(CFG.salt + '|' + s.phone + '|' + s.order + '|' + s.best + '|' + s.startedAt + '|' + (s.completedAt || 0));
  for(let i = 0; i < 3; i++) acc = hash(acc + '|' + CFG.salt + '|' + s.phone);
  return acc;
}
```

- If an attacker opens Developer Tools and executes `S.best = 9999`, the next session verification fails because `signSession(S) !== S.sig`.
- Any signature mismatch immediately resets the session and invalidates claim attempts.

### 3.2 Single-Use Voucher Generation (`mintCode`)
Voucher codes are minted dynamically without external network calls:
- Format: `DAA-9X4F-7K` (9 alphanumeric characters from base-32 alphabet).
- Header: Reward type identifier (`D` = 5% discount, `C` = 10% discount, `F` = Free beverage).
- Payload: Encoded calendar day of issue (`enc(dayNow(), 2)`) + 4 random nonce characters.
- Checksum: 2-character trailing cryptographic checksum computed over `(salt + body) % 961`.
- Counterfeit Protection: Cashiers cannot enter arbitrary strings; un-checksummed codes are instantly rejected by `parseCode()`.

---

## 4. Saudi Phone Validation & Privacy Architecture

Per the project mandate, phone validation is strictly format-based without third-party OTP or SMS dependencies.

### 4.1 Strict Validation Rules
1. **Input Normalization:** Automatically converts Eastern Arabic numerals (`٠١٢٣٤٥٦٧٨٩` to `0123456789`) and strips spaces, hyphens, and brackets.
2. **Canonical Format:** Converts all valid inputs (`05XXXXXXXX`, `5XXXXXXXX`, `9665XXXXXXXX`) to `+9665XXXXXXXX`.
3. **Mobile Prefix Verification:** Enforces that the national number is exactly 9 digits, begins with `5`, and has a valid operator allocation (`0, 1, 3, 4, 5, 6, 7, 8, 9`).
4. **Rejection Policy:** Rejects landlines (`011`, `012`, etc.), invalid prefixes (`04...`, `052...`), non-Saudi international country codes (`+971...`), and incorrect lengths.
5. **No False Claims:** The UI clearly notes that format validation does not prove phone ownership or SIM activity.
6. **Privacy Masking:** Full phone numbers are never rendered on public result screens or cashier logs. They are masked as `+966 5X *** 1234`.

---

## 5. Vehicle Safety Feature Excision Verification

The vehicle stationary detection feature (`SafetySensor`) and all associated GPS `watchPosition`, `DeviceMotionEvent` listeners, speed lockouts, and stationary checkboxes were **completely removed**. 

**Security Implication of Removal:**
- Eliminates browser permission prompts (`Geolocation API` and `Motion Permission`) that previously created customer friction and drop-off.
- Removes false-positive game locks caused by GPS signal drift between tall buildings in urban Medina.
- Eliminates mock/simulated sensor bypass vectors.

---

## 6. Residual Risks & Production Hardening Recommendations

While the client-side cryptographic controls deter casual patrons and amateur tampering, the following inherent limitations remain:

1. **Client-Side Obfuscation Limitation:** A sophisticated reverse-engineer inspecting client JavaScript could extract `CFG.salt` and forge arbitrary signatures offline.
2. **Device Cap Storage:** Daily caps are persisted in browser `localStorage`. A patron clearing their browser cache or opening an Incognito session can reset their device claim counter.

### Recommended Phase 2 Hardening (Backend Integration)
When a backend server or Supabase/Firebase instance is connected:
1. Issue game sessions with server-signed JWTs containing session nonces.
2. Submit raw input timestamp logs at game completion for server-side score calculation.
3. Maintain an authoritative PostgreSQL redemption ledger for staff vouchers.
