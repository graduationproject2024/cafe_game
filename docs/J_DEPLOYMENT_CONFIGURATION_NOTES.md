# A&A Cafe Games — Deployment and Configuration Notes (Deliverable J)

## 1. Hosting Architecture & Requirements

The A&A Cafe Games application is a static, zero-runtime-dependency Progressive Web Application. It can be hosted on any modern static web host or CDN:
- Cloudflare Pages / Workers
- Vercel / Netlify
- GitHub Pages
- AWS S3 + CloudFront
- Nginx / Apache on private server

### 1.1 Critical HTTPS Prerequisite
> [!IMPORTANT]
> **HTTPS is strictly required for production deployment.**
> Modern web browsers (Safari, Chrome, Edge) will **block** `navigator.geolocation` and `DeviceMotionEvent` on insecure `http://` origins. The vehicle stability sensor will default to `INVALID_OR_UNAVAILABLE` if served without valid SSL/TLS certificates.

---

## 2. Configuration Parameters (`CFG`)

All operational settings are centralized at the top of the `<script>` tag in `index.html`:

```javascript
var CFG = {
  roundSeconds: 60,             // Round duration in seconds (Default: 60s)
  levelEverySeconds: 15,        // Speed level escalation interval (4 levels)
  basePoints: 18,               // Base score multiplier for balancing
  tiers: [1200, 2400, 3400],    // Tier 1 (5%), Tier 2 (10%), Tier 3 (Free Drink)
  validDays: 3,                 // Voucher validity duration from issuance (3 days)
  maxWaitMinutes: 12,           // Auto-locks session 12 mins after start (order pickup time)
  requireOrder: true,           // Enforces order invoice number entry on intro screen
  webhookUrl: '',               // Optional: Webhook URL to stream claims to POS / Google Sheets
  salt: 'the-aa-madinah-specialty-cafe-2026-secure', // Salt for session signing
  staffPinHash: 1241566683,     // Salted FNV hash for cashier PIN (Default: 2026)
  difficultyMultipliers: {
    easy: 1.0,
    medium: 1.2,
    hard: 1.4
  },
  social: {
    instagram: 'https://www.instagram.com/theaa.cafe',
    tiktok: 'https://www.tiktok.com/@theaa.cafe'
  }
};
```

---

## 3. Cashier & Staff Portal Management (`#staff`)

### 3.1 Accessing the Staff Portal
Cashiers and branch supervisors access the verification portal by visiting:
`https://[your-domain]/index.html#staff`

### 3.2 Default PIN & Changing the PIN
- **Default PIN**: `2026`
- **To update the staff PIN**:
  1. Open the browser console on `index.html`.
  2. Compute the new hash: `hash('salt-staff-2026:' + 'YOUR_NEW_PIN')`.
  3. Replace `staffPinHash: 1241566683` in `index.html` with the output integer.
  4. Never write the raw PIN in plain text in the source code.

### 3.3 Brute-Force Lockout
If an unauthorized person attempts to guess the PIN and fails 3 times, the portal locks for 60 seconds across sessions on that device.

---

## 4. Webhook Integration (Optional)

When a customer successfully selects a reward in `choice`, the app can optionally dispatch an asynchronous `POST` payload to `CFG.webhookUrl`:
```json
{
  "phone": "0501234567",
  "order": "AA-4821",
  "reward": "مشروب مجاني بالكامل ☕",
  "code": "AA-9B3-7K2",
  "score": 3450,
  "branch": "المدينة المنورة",
  "ts": "2026-10-16T01:30:00.000Z"
}
```
This payload can be ingested by Zapier, Make.com, or a custom POS integration without interrupting customer gameplay.

---

## 5. Branch Operational Checklist for Staff
1. **QR Code Placement**: Ensure printed QR codes on drive-thru menus and table tents point to `https://[your-domain]/index.html`.
2. **Voucher Validation**: Cashier enters the customer's 9-character code in `#staff` portal, verifies green confirmation badge, hands over the reward, and taps "صرف المكافأة" to retire the voucher.
3. **Daily Reset**: Devices and accounts automatically reset eligibility at midnight local Saudi time (AST / UTC+3).
