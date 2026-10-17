# A&A Cafe Games — Hearts and Social Integration Report (Deliverable F)

## 1. Three-Heart Lifecycle System

### 1.1 Architecture & Rules
A standardized **Three-Heart System** provides tangible stakes and eliminates arbitrary failure states across the platform.

- **Initial State**: Every eligible round initializes with **3 Hearts** (`run.hearts = 3; run.maxHearts = 3`).
- **HUD Representation**: Rendered in `#gHearts` as visual emojis (`❤️❤️❤️`). As hearts are lost, empty hearts are styled with the `.lost` CSS class (`filter: grayscale(1); opacity: 0.3`).
- **Deduction Rule**:
  - Qualifying mistakes (tapping a burnt target in Reflex Rush, entering an incorrect node in Pattern Lock) invoke `c.loseHeart()`.
  - `c.loseHeart()` executes an atomic deduction:
    ```javascript
    r.hearts = Math.max(0, r.hearts - 1);
    hud();
    SFX.miss();
    ```
  - Double-deduction prevention: A single user action can only trigger one deduction due to immediate event debouncing and stage locking.
- **Terminal State**:
  - When `r.hearts <= 0`, `r.over = true` is set immediately.
  - A banner displays: `نفدت القلوب! 💔`.
  - The round finishes cleanly, preserving accumulated points up to the failure moment and advancing to the result screen `#result`.

---

## 2. Instagram Extra-Heart Integration

### 2.1 Realistic Assessment of Instagram API Capabilities
- **Technical Reality**: Meta's Graph API / Instagram Basic Display API does **not** provide client-side JavaScript apps with real-time verification of whether an arbitrary user account has followed a brand profile without full OAuth user login, complex App Review approvals, and user token exchange.
- **Security & Privacy Commitment**:
  - The application **never** requests Instagram credentials, passwords, or unauthorized tokens.
  - The application **does not falsely claim** to have cryptographically verified an external follow action.
  - Instead, it implements a transparent, customer-friendly **Honor-and-Engage Flow**: it invites the customer to visit and follow `@theaa.cafe`, opening the official account in a new tab, and grants +1 heart as a promotional perk.

### 2.2 Claim Flow & Abuse Prevention
```mermaid
sequenceDiagram
    autonumber
    actor Customer
    participant PreScreen as Pre-Game Screen (#pre)
    participant Engine as Game Session Engine
    participant Insta as Instagram (@theaa.cafe)

    Customer->>PreScreen: Clicks "استلام +1 ❤️"
    alt S.extraHeartClaimed == true
        PreScreen-->>Customer: Alert: Max 1 extra heart per session
    else First Claim
        Engine->>Engine: S.extraHeartClaimed = true; save()
        Engine->>Insta: window.open(CFG.social.instagram, '_blank', 'noopener,noreferrer')
        Engine->>Engine: Award +1 heart (clamped to maxHearts)
        PreScreen-->>Customer: Confirmed +1 Heart!
    end
```

- **Single Claim Cap**: `S.extraHeartClaimed` is permanently flagged upon the first click. Subsequent attempts are rejected with a clear notification.
- **Safe Tab Isolation**: Uses `'noopener,noreferrer'` to ensure the external Instagram page cannot access or manipulate the opener window's execution context.

---

## 3. Official Social Media Footer Configuration

### 3.1 Verified URLs & Channels
The official social accounts for **the A&A specialty cafe & sweets** are configured in `CFG.social`:

| Platform | Channel Handle | Verified Target URL | Placement |
| :---: | :--- | :--- | :--- |
| **Instagram** | `@theaa.cafe` | `https://www.instagram.com/theaa.cafe` | `#intro`, `#home`, `#result` |
| **TikTok** | `@theaa.cafe` | `https://www.tiktok.com/@theaa.cafe` | `#intro`, `#home`, `#result` |

### 3.2 UI & UX Integration
- **Branded Footers**: Embedded consistently at the base of the Intro, Home, and Result screens without obscuring primary action buttons (`#preGo`, `#resAgain`, etc.).
- **Accessible Vector Icons**: Embedded crisp SVG glyphs for both Instagram and TikTok with distinct hover gradients.
- **Local Identity Banner**: Displays `شكراً لزيارتكم كافيه the A&A بالمدينة المنورة 🌴` below the links, reinforcing local heritage.
