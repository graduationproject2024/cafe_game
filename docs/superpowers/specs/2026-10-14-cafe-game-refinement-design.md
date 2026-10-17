# the A&A cafe games — v4 Refinement Design Spec

**Date:** 2026-10-14
**Target file:** `index.html` (single-file, ~1584 lines, ~81KB) — stays single-file
**Secondary file:** `cafe-games.html` (byte-identical duplicate) — becomes a redirect
**Constraint:** purely static (GitHub Pages), no backend
**Method:** 8 parallel read-only domain audits (game design, economy, UI, UX, audio,
narrative, frontend, security) → this synthesized plan. One writer implements.

---

## Goal

All-round polish of the whole game while keeping it a single static file:
better gameplay balance and feel, cleaner visuals and mobile ergonomics, honest
UX around the driving-safety sensor, fewer leaks/perf issues, and pragmatic
hardening of a client-only reward system — without adding friction for a rushed
drive-thru customer.

## Non-goals / explicit limits

- **No true security.** Codes are minted client-side and redemption is
  localStorage-only. A backend is the only real fix. This spec hardens the client
  and makes the docs honest; it does not make the reward system forgery-proof.
- No new mini-games, no framework/build step, no file split.

## Decisions

1. **Static only.** Harden client-side; document the server upgrade path in README.
2. **Order number stays required** (better anti-abuse without a backend), but
   validation shows all errors at once and copy explains where to find it.
3. **Trade-off policy:** prefer clarifying copy + silent hardening over adding
   steps. Where a security fix would add friction, favour the driver.
4. Numbers below marked *(tunable)* are provisional; verify by playtest/simulation.

---

## Workstream 1 — Gameplay feel & balance

**1.1 Re-tune game weights for points-per-second parity (High).**
Weights (`GAMES[].weight`, ~L1022–1337) ignore action cadence, so `shuffle`
(weight 2.8) yields the *least* and `simon`/`memory` overpay.
Provisional *(tunable)*: beans 1.1→1.3, pour 1.45→1.9, bubbles 1.15→1.3,
memory 2.2→1.5, quiz 1.9→1.6, simon 2.0→1.3, shuffle 2.8→3.2, sort 1.35→1.5,
stack 1.8→1.6. Target: median round scores within a ~1.5× band.

**1.2 Re-calibrate tiers (High).** `CFG.tiers` [1200,2400,3600] (~L479) →
[1200,2400,3400] so tier-3 is reachable in every game after 1.1. Update
`ladder()` max (L811, 4000→3800) and result messages (L968–970).

**1.3 Remove dead branch (Med).** `CFG.topTierChance:1` + `Math.random()>1`
(L1382) is unreachable; delete the branch and the constant, or give it a real value.

**1.4 Smooth difficulty ramps (Med):**
- beans: `vy=lerp(180,320,d)*Math.min(H/520,1.15)`; `half=lerp(50,38,d)` (L1039).
- shuffle: `n=4+Math.round(d*3)` → 4..7 (L1248).
- quiz: `tmax=lerp(7500,5000,c.d())` (L1168).
- sort: `tmax=lerp(3400,2200,c.d())` (L1275).
- memory: `SZ=[6,8,10,12]` (L1113).
- pour: `tol=lerp(.08,.04,c.d())` (L1065).

**1.5 Fairness & feedback (Med).** Scale miss penalty by level (multiply by
`lm`, ~L919). Add reason labels to miss pops and a "الكومبو انكسر 💥" toast
when `combo→0` (~L915–927).

**1.6 Safety-lock hysteresis (Med).** Lock needs `>7` for ≥1.0s; clear needs
`<5` for ≥1.5s; accelerometer threshold 3.8→4.2 and cap inferred speed
(`SafetySensor.checkThreshold/handleMotion`, ~L651–673).

---

## Workstream 2 — Juice & audio

**2.1 Shared hit juice (High).** Add one `.juiced` keyframe (scale 1→1.18→1 +
ring flash, `--juice` var) applied in `ctx.ok()` to the scored element before
removal (~L906–914). Unifies all 9 games' feel.

**2.2 Audio engine (High):**
- `tap()` randomize freq 300–348Hz, gain 0.09–0.12, dur 0.06, 2 variants (L544).
- `ok(combo)` → pentatonic `[440,494,554,659,740,880,988,1046]` with gain
  rolloff above ~800Hz; stop the climb at 1046 (L548–556).
- 8ms attack envelope (3-point gain ramp) to kill clicks (L536–537).
- Master `GainNode` (0.7) → `DynamicsCompressor` → destination (L539).
- Distinct cadences: `levelUp` short/quiet; `win` low root + held tail;
  `reward` higher sparkle (L569–590).
- `warning()` → triangle two-tone 700/1000Hz, gain 0.20 (L582–584).
- Haptics gated by mute + 250ms throttle (all `navigator.vibrate`, L546–584).
- Re-`resume()` ctx on `visibilitychange` (L947); one-time pointerdown unlock.

---

## Workstream 3 — Visual & brand

**3.1 Dark-mode stage contrast (High).** Add `--stage-ink`/`--cardface`; set
`.m-card{background:var(--ground-deep)}`, `.m-card.up{background:var(--card)}`,
`.s-table` fixed dark fill. Never reuse text tokens as surface fills (L222–229, 259).

**3.2 Unhide the Madinah pattern (High).** body scrim 0.92/0.96 → ~0.80/0.90
(L38–40); optionally echo a low-opacity motif on the header and stage frame.

**3.3 Design-system tokens (Med).** Add `--coffee/--coffee-deep/--cream/--cup/
--bean/--hot/--cold/--gold-grad/--r-sm/--r-md/--r-lg/--logo-h`; replace one-off
hexes (L198–208, 249, 261, 1297) and the 3 golds (L106,114,131) and 4 radii.

**3.4 CLS + logo consistency (Med).** One logo height (36px); intrinsic
`width`/`height` on both `<img>` (L316, 358, 437).

**3.5 Numerals & labels (Med).** `font-variant-numeric:tabular-nums` on HUD
score/time, `.res-score`, `.t-code` (L147,151,273,283). Raise `.stop i`,
`.tile small` to ≥12px; `.stop` opacity→1; footer opacity→.9 (L76–79,129,292).

**3.6 Responsive HUD (Med).** score `clamp(30px,9vw,38px)`, time circle 40px,
`.hud` allow `min-width:0` wrap (L144–153).

---

## Workstream 4 — UX & trust

**4.1 Sensor honesty (High).** Track `sensorStatus` (granted/denied/unavailable/
no-data); after ~4s no-data render neutral "المستشعر غير مُفعّل — اضغط للتفعيل"
with retry; call iOS `DeviceMotionEvent.requestPermission()` from the intro
gesture; explain the request before prompting (L609–622, 694–705).

**4.2 Accessibility (High/Med):** drop `user-scalable=no` (L5); focus the new
screen heading in `show()` (L803); countdown single polite live region (L298);
`#warn` announce only at 60/30/10s (L1458); `aria-label` on home sound button
(L363); ≥44px tap targets (L62,145).

**4.3 Less friction (Med):** validate phone+order+safety together and render all
errors; visually demote the consent checkbox with an "اختياري" tag (L340–343);
reword the safety-modal button so it is a re-check, not a bypass, and require a
fresh 0 km/h reading (L308); move `#simDriveBtn` behind `#demo` (L378–382).

---

## Workstream 5 — Reliability & performance

**5.1 Sensor lifecycle (Med).** Add `SafetySensor.stop()` (clearWatch + remove
motion listener); call on `lock()`, `showReward()`, and `visibilitychange`
hidden; lower `enableHighAccuracy`, raise `maximumAge` (L604–622, 1447).

**5.2 Fix silent input loss (Med).** Add `noThrottle` option to `c.on` and use
it for `pointermove`/`pointerup`; only rate-limit `pointerdown`/`click`
(L897–904, 1028, 1079).

**5.3 Perf (Med).** Cache `W/H` per `launch()` + refresh on resize; move
movers (beans cup, stack block) to `transform: translate3d`; batch reads/writes;
`pop()` uses cached dims (L886, 1027, 1030–1041, 1319).

**5.4 Timer hygiene (Low-Med).** Track `setTimeout` SFX/DOM tails in `run.timers`
and clear in `abortRun`/`finish` (L840–841, 553–588); gate `countdown` `done()`
on `SafetySensor.isMoving` (L843–858).

**5.5 Duplicate file (Med).** `cafe-games.html` → meta-refresh redirect to
`index.html` (canonical).

**5.6 Global error reporter (Low).** `window.addEventListener('error'|
'unhandledrejection')` → `console.warn` + optional CFG hook (L~470).

---

## Workstream 6 — Security & honesty (client-only)

**6.1 Kill plaintext PIN fallback (High).** Remove `&& pinInput !== '2026'` (L1532).

**6.2 Persist staff lockout (Med).** Store `stLockedUntil`/attempt count in
localStorage and honour in `boot()` (L1511, 1525–1544).

**6.3 Cheap integrity hardening (Low).** Multiple mixing rounds in `hash()`
and include a nonce in `signSession()` — marginal, documented as obfuscation only
(L490–502).

**6.4 Per-device claim cap (Med).** Cap claims per device per day (e.g. 2) in
`finishClaim` alongside the phone/order ledger (L1393–1407).

**6.5 Honest docs (Med).** README: remove/qualify "anti-cheat & security
hardening"; add a "client-side limits + server upgrade path" section (server-side
HMAC minting, server redemption ledger, drop `CFG.salt`, staff SSO/MFA).

---

## Verification (no automated test suite exists)

Manual matrix, both themes:
1. Light + dark: intro, home, each of 9 games, result, reward, ticket, locked, `#staff`.
2. Viewports 320/360/480px; no horizontal overflow; HUD intact with combo active.
3. Each game: score accrues, tiers reachable, miss shows a reason, combo-break toast.
4. Sensor: demo (`#demo`), denied/no-data state, lock/resume, no console errors.
5. Audio: unlock on first tap, mute persists across reload, no clipping on `win`.
6. Staff portal: correct PIN works, wrong PIN locks out and survives reload, no `'2026'` fallback.
7. Console clean during a full session; no stray timers after exiting a game.

## Risks

- Perf refactor (5.3) and audio rework (2.2) touch shared code used by all 9 games
  → regression risk; verify every game after.
- Rebalancing (1.1) is estimate-driven; may need a second tuning pass post-playtest.
- Removing `user-scalable=no` may reveal layout issues at high zoom → check 3.
- No real security fix; operators must not treat this as fraud-proof.
