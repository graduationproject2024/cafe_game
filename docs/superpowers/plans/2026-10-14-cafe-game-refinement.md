# the A&A cafe games — v4 Refinement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** All-round polish of the single-file Arabic RTL arcade game (`index.html`) — balance, feel, visuals, UX honesty, reliability, and client-side hardening — staying one static file for GitHub Pages.

**Architecture:** No build step, no framework. One IIFE in `index.html` (CSS `14–294`, JS `471–1581`) plus a shared `SFX` audio engine, a `SafetySensor`, and a `makeCtx` game harness that all 9 games in `GAMES` consume. Changes are surgical edits to those shared pieces and to per-game tuning constants.

**Tech Stack:** Vanilla ES5-ish JavaScript, CSS custom properties, Web Audio API, Geolocation + DeviceMotion, localStorage. No test runner — verification is static assertions (PowerShell `Select-String`) plus a manual browser matrix.

**Spec:** `docs/superpowers/specs/2026-10-14-cafe-game-refinement-design.md`

## Global Constraints

- **Single file.** All work goes in `index.html`. Do not split files or add a build step.
- **Static only.** No backend, no network calls. `CFG.webhookUrl` stays `''`.
- **No new dependencies.** No external JS/CSS libraries.
- **RTL Arabic UI.** All user-facing strings stay Arabic; keep existing wording unless a task explicitly changes it.
- **No comments** added to code unless a task's snippet includes one.
- **Commits are optional gates.** The repo convention is to not commit unless the user explicitly authorizes it. Run the listed `git commit` step only if the user has said to commit; otherwise leave changes staged/unstaged and skip the commit step.
- **Provisional numbers are tunable.** Values introduced below (weights, tiers, timers) should ship as written, then be revisited once during a playtest pass.
- **Regression scope.** Any change inside `makeCtx`, the rAF `tick`, `SFX`, or `SafetySensor` affects all 9 games — after Tasks 3, 4, 5, 7, 8 re-check every game in the manual matrix (Task 13).

## File Structure

- `index.html` — the only file edited. Relevant regions:
  - CSS tokens & theme: `15–33`
  - Brand header / HUD / stage / game CSS: `57–269`
  - Body screens markup: `296–468`
  - `CFG` + hashing: `475–502`
  - `SFX` audio engine: `505–591`
  - `SafetySensor`: `594–716`
  - App helpers + reward crypto (`hash`, `signSession`, `mkCode`, `parseCode`): `718–790`
  - `makeCtx` game harness + `tick`/`launch`/`countdown`: `843–946`
  - `QUIZ` / `DRINKS` content: `980–1018`
  - `GAMES` (9 games): `1020–1338`
  - Flow, claim, staff portal, boot: `1340–1581`
- `cafe-games.html` — byte-identical duplicate; becomes a redirect (Task 11).
- `README.md` — security claims qualified (Task 12).
- `docs/superpowers/specs/2026-10-14-cafe-game-refinement-design.md` — the spec.

---

### Task 1: Design-system tokens + dark-mode stage contrast

**Files:** Modify `index.html` (`:root` `15–23`, `.m-card` `222–229`, `.sh-table` `259`, `.bean` `198–199`, `.p-fill` `208`, `.s-cup .shape` `261`, `.btn` `106`, `.btn.gold` `114`, `.claimbar` `131`).

**Interfaces:** Produces CSS custom properties consumed by Tasks 2–3: `--stage-ink`, `--cardface`, `--gold-grad`, `--gold-grad-light`, `--r-sm/--r-md/--r-lg/--r-xl`, `--logo-h`, `--bean/--bean-deep`, `--cream/--coffee`, `--cup/--cup-deep`.

- [ ] **Step 1: Add tokens to `:root`**

Replace the `:root{...}` block lines `15–23` with:

```css
:root{
  --ground:#0a3a37; --ground-deep:#062624; --card:#ffffff; --card-soft:#fbfaf7;
  --ink:#0f2e2b; --ink-soft:#4a6864; --gold:#d4a017; --gold-light:#f5cf68;
  --gold-edge:#a0780f; --gold-ink:#261d03; --coral:#e85044; --ok:#199e68;
  --mint:#e2f3ee; --line:#d0e6e0; --asphalt:#112d2b; --on-ground:#ffffff;
  --stage-ink:#0e2b28; --cardface:#0e2b28;
  --gold-grad:linear-gradient(180deg,#ffd452 0%,#e0a517 100%);
  --gold-grad-light:linear-gradient(180deg,#ffdf79,#d89e1a);
  --bean:#6b3f26; --bean-deep:#3d2214; --cream:#c8a17a; --coffee:#7a4a2a;
  --cup:#a5683f; --cup-deep:#6f3f22;
  --r-sm:16px; --r-md:18px; --r-lg:22px; --r-xl:24px; --logo-h:36px;
  box-sizing:border-box;
  padding-top:env(safe-area-inset-top,0px);
  padding-bottom:env(safe-area-inset-bottom,0px);
}
```

- [ ] **Step 2: Fix `.m-card` contrast (dark mode)**

Replace lines `222–229` block:

```css
.m-card{
  width:100%;height:100%;max-height:85px;border-radius:12px;border:0;background:var(--stage-ink);
  color:var(--gold-light);display:grid;place-items:center;font-size:clamp(20px, 4.5vh, 32px);
  cursor:pointer;padding:0;transition:transform .15s;
}
.m-card:active{transform:scale(.95)}
.m-card.up{background:var(--card);color:var(--ink)}
.m-card.done{background:var(--ok);color:#fff}
```

- [ ] **Step 3: Fix `.sh-table` (dark mode)**

Replace line `259`:

```css
.sh-table{position:absolute;left:12px;right:12px;bottom:calc(34% - 10px);height:10px;border-radius:5px;background:var(--cardface);opacity:.6}
```

- [ ] **Step 4: Replace one-off hexes with tokens**

- Line `198`: `background:#6b3f26` → `background:var(--bean)`
- Line `199`: `background:#3d2214` → `background:var(--bean-deep)`
- Line `208`: `background:linear-gradient(#c8a17a,#7a4a2a)` → `background:linear-gradient(var(--cream),var(--coffee))`
- Line `261`: `background:linear-gradient(#a5683f,#6f3f22)` → `background:linear-gradient(var(--cup),var(--cup-deep))`
- Line `106`: `background:linear-gradient(180deg,#ffd452 0%,#e0a517 100%)` → `background:var(--gold-grad)`
- Line `114`: `background:linear-gradient(180deg,#ffdf79,#d89e1a)` → `background:var(--gold-grad-light)`
- Line `131`: `background:linear-gradient(90deg,#ffd452,#e0a517)` → `background:var(--gold-grad)`
- Line `84`: `border-radius:22px` → `border-radius:var(--r-lg)`
- Line `158`: `border-radius:24px` → `border-radius:var(--r-xl)`
- Line `185`: `border-radius:24px` → `border-radius:var(--r-xl)`
- Line `275`: `border-radius:24px` → `border-radius:var(--r-xl)`

- [ ] **Step 5: Verify (static)**

Run: `Select-String -Path index.html -Pattern '--stage-ink','--gold-grad','background:var\(--bean\)' -SimpleMatch`
Expected: matches on the new tokens; no remaining `background:#6b3f26` (run `Select-String -Path index.html -Pattern '#6b3f26'` → expect no match).

- [ ] **Step 6: Verify (browser)**

Open `index.html`, force dark mode (`<html data-theme="dark">` via devtools or OS), open the **ذاكرة الكافيه** game. Memory card backs must be dark with readable gold glyphs (not gold-on-white).

- [ ] **Step 7: Commit** *(only if authorized)*

```bash
git add index.html
git commit -m "style: add design tokens and fix dark-mode stage contrast"
```

---

### Task 2: Visual polish — pattern, logo/CLS, numerals, labels, HUD

**Files:** Modify `index.html` (body bg `38–40`, `.brand-logo-img` `59`, `.stop` `76–79`, `.tile small` `129`, `.hud*` `144–153`, `.res-score` `273`, `.t-code` `283`, `.madinah-footer` `292`, logo `<img>` `316`,`358`,`437`; add `id` to demo wrapper `378`).

**Interfaces:** Consumes `--logo-h` (Task 1).

- [ ] **Step 1: Unhide the Madinah pattern**

Replace lines `38–40`:

```css
  background:
    linear-gradient(180deg, rgba(10,58,55,0.82) 0%, rgba(6,38,36,0.90) 100%),
    url('assets/madinah_pattern.jpg') center/cover fixed;
```

- [ ] **Step 2: Unify logo height + intrinsic dims**

Line `59` → `.brand-logo-img{height:var(--logo-h);width:auto;object-fit:contain;filter:drop-shadow(0 2px 6px rgba(0,0,0,.3))}`

Line `358` markup → remove the inline `style="height:34px"` so it uses the shared class:
`<img src="assets/logo_transparent.png" alt="the A&A" class="brand-logo-img">`

Line `316` → add intrinsic attributes (asset is 726×337):
`<img src="assets/logo_transparent.png" alt="the A&A specialty cafe & sweets" class="brand-logo-img" width="726" height="337" decoding="async">`

Line `437` → `<img src="assets/logo_transparent.png" alt="the A&A" class="t-brand-img" width="726" height="337" decoding="async">`

Line `278` → `.t-brand-img{height:var(--logo-h);margin-bottom:8px;object-fit:contain;width:auto}`

- [ ] **Step 3: Labels + contrast**

- Line `76`: `.stop{position:absolute;top:0;width:66px;margin-inline-start:-33px;text-align:center;color:#fff;opacity:1}`
- Line `79`: `.stop i{position:absolute;top:60px;inset-inline:0;font-style:normal;font-size:12px}`
- Line `129`: `.tile small{color:var(--ink-soft);font-size:12px}`
- Line `292`: `.madinah-footer{text-align:center;margin-top:28px;opacity:.9;font-size:12px;display:flex;align-items:center;justify-content:center;gap:6px}`

- [ ] **Step 4: Tabular numerals**

Add after line `42` (inside `body{...}` is not appropriate; append as a new rule after line `46`):

```css
.hud-score b,.hud-time b,.res-score,.t-code{font-variant-numeric:tabular-nums}
```

- [ ] **Step 5: Responsive HUD**

Line `147` → `.hud-score b{font-family:'Lalezar',sans-serif;font-weight:400;font-size:clamp(30px,9vw,38px);line-height:1}`

Line `150–153` → `.hud-time b{display:grid;place-items:center;width:42px;height:42px;border-radius:50%;background:var(--gold);color:var(--gold-ink);font-family:'Lalezar',sans-serif;font-weight:400;font-size:22px}`

Line `144` → `.hud{display:grid;grid-template-columns:auto 1fr auto auto;gap:8px;align-items:center;min-width:0}`

- [ ] **Step 6: Verify (static)**

Run: `Select-String -Path index.html -Pattern 'height:34px','font-variant-numeric'`
Expected: `height:34px` gone; `font-variant-numeric` present.

- [ ] **Step 7: Verify (browser)**

At 320px and 360px device width, run any game with an active combo (`×1.4`): the HUD must fit on one row, no horizontal scroll; pattern texture faintly visible behind cards; countdown numerals aligned (no jitter).

- [ ] **Step 8: Commit** *(only if authorized)*

```bash
git add index.html
git commit -m "style: brand pattern visibility, logo CLS, numerals, responsive HUD"
```

---

### Task 3: Shared hit-juice ring

**Files:** Modify `index.html` (CSS after `.lvl-banner` `176`; `makeCtx.ok`/`miss` `906–927`).

**Interfaces:** Consumes stage-local `x,y` already passed to `ok`/`miss`. Produces no new public API — visual only.

- [ ] **Step 1: Add ring CSS** (insert after line `176`)

```css
.ring{position:absolute;width:14px;height:14px;margin:-7px 0 0 -7px;border-radius:50%;border:3px solid var(--gold);pointer-events:none;z-index:4;animation:ringOut .42s ease-out forwards}
.ring.bad{border-color:var(--coral)}
@keyframes ringOut{0%{transform:scale(.35);opacity:.95}100%{transform:scale(3.4);opacity:0}}
```

- [ ] **Step 2: Emit the ring in `ok`/`miss`**

Inside `makeCtx`, add a helper just before the `return {` at line `890`:

```js
  function ring(x, y, bad){
    if(x == null || y == null) return;
    const s = el('span', 'ring' + (bad ? ' bad' : ''));
    s.style.left = x + 'px'; s.style.top = y + 'px';
    stage.append(s); setTimeout(() => s.remove(), 460);
  }
```

In `ok(...)` after `pop('+' + pts, x, y, 'good');` (line `912`) add `ring(x, y, false);`.
In `miss(...)` after each `pop(...)` (lines `921` and `923`) add `ring(x, y, true);`.

- [ ] **Step 3: Verify (browser)**

Play **اصطياد الحبوب**, **فقاعات البخار**, **آين الحبة؟**: each successful hit flashes an expanding gold ring; each miss flashes a coral ring. Confirm on all 9 games that no ring appears during the pre-game countdown.

- [ ] **Step 4: Commit** *(only if authorized)*

```bash
git add index.html
git commit -m "feat: shared hit-juice ring across all games"
```

---

### Task 4: Audio engine rework

**Files:** Modify `index.html` (`SFX` object `505–591`; visibility handler `947`).

**Interfaces:** `SFX.init/toggle/playTone/tap/ok/miss/countdown/go/levelUp/reward/warning/win` keep their names and call signatures so no game code changes. Adds `SFX.master`, `SFX.haptic(ms)`.

- [ ] **Step 1: Add master bus + compressor + haptic helper**

Replace `init()` and `playTone()` (lines `508–543`) with:

```js
  init(){
    if(!this.ctx){
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if(AudioCtx){
        this.ctx = new AudioCtx();
        this.master = this.ctx.createGain();
        this.master.gain.value = 0.7;
        if(this.ctx.createDynamicsCompressor){
          const comp = this.ctx.createDynamicsCompressor();
          this.master.connect(comp); comp.connect(this.ctx.destination);
        } else {
          this.master.connect(this.ctx.destination);
        }
      }
    }
    if(this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  },
  haptic(ms){
    if(this.muted) return;
    const now = performance.now();
    if(now - (this._h || 0) < 250) return;
    this._h = now;
    try { if(navigator.vibrate) navigator.vibrate(ms); } catch(e){}
  },
  playTone(freq, type, duration, gainVal, rampTo){
    if(this.muted) return;
    try {
      this.init();
      if(!this.ctx) return;
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type || 'sine';
      osc.frequency.setValueAtTime(freq, t);
      if(rampTo) osc.frequency.exponentialRampToValueAtTime(rampTo, t + duration);
      const peak = Math.max(0.0002, gainVal || 0.16);
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(peak, t + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
      osc.connect(gain);
      gain.connect(this.master || this.ctx.destination);
      osc.start();
      osc.stop(t + duration);
    } catch(e){}
  },
```

- [ ] **Step 2: Replace the per-cue methods** (`tap` `544` through `win` `590`)

```js
  tap(){
    this.playTone(300 + Math.random() * 48, 'triangle', 0.07, 0.10 + Math.random() * 0.03, 180);
    this.haptic(8);
  },
  ok(combo){
    const NOTES = [440, 494, 554, 659, 740, 880, 988, 1046];
    const i = Math.min(Math.max((combo || 1) - 1, 0), NOTES.length - 1);
    const n = NOTES[i];
    const g = 0.22 - Math.min(0.08, (n - 440) / 600 * 0.08);
    this.playTone(n, 'sine', 0.18, g);
    if((combo || 0) >= 3) setTimeout(() => this.playTone(n * 1.5, 'triangle', 0.12, 0.09), 40);
    this.haptic(14);
  },
  miss(){
    this.playTone(160, 'sawtooth', 0.26, 0.25, 90);
    this.haptic([35, 40, 35]);
  },
  countdown(){
    this.playTone(600, 'sine', 0.09, 0.2);
  },
  go(){
    [587, 740, 880].forEach((f, i) => setTimeout(() => this.playTone(f, 'sine', 0.2, 0.22), i * 70));
  },
  levelUp(){
    [523, 659, 783].forEach((f, i) => setTimeout(() => this.playTone(f, 'triangle', 0.16, 0.14), i * 80));
  },
  reward(){
    [659, 880, 1175, 1568].forEach((f, i) => setTimeout(() => this.playTone(f, 'sine', 0.28, 0.2), i * 90));
    this.haptic([40, 50, 90]);
  },
  warning(){
    this.playTone(700, 'triangle', 0.16, 0.2, 500);
    setTimeout(() => this.playTone(1000, 'triangle', 0.16, 0.2, 700), 200);
    this.haptic([100, 100, 100, 100]);
  },
  win(){
    this.playTone(392, 'sine', 0.6, 0.2);
    [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => this.playTone(f, 'sine', 0.26, 0.2), 120 + i * 110));
  }
```

- [ ] **Step 3: Resume audio when the tab returns**

Replace line `947`:

```js
document.addEventListener('visibilitychange', () => {
  if(run && !run.over) run.paused = document.hidden;
  if(!document.hidden) SFX.init();
});
```

- [ ] **Step 4: Verify (browser)**

Rapid-tap a game: blips vary in pitch (no identical monotone); no audible click/pop at note onset. Reach a 9+ combo: pitch stops climbing at ~1046Hz. Trigger the safety warning (`#demo`) and finish a round: distinct warning vs win sounds. Mute, then tap: no sound, no vibration.

- [ ] **Step 5: Commit** *(only if authorized)*

```bash
git add index.html
git commit -m "feat: rework audio engine (bus, envelopes, pentatonic combo, cues)"
```

---

### Task 5: Gameplay balance — weights, tiers, ramps, dead branch

**Files:** Modify `index.html` (`CFG` `479–480`, `ladder` `811`, `GAMES` weights + ramps `1022–1337`, `claimFlow` `1382`).

**Interfaces:** `tierOf`, `TIER_TXT`, `renderResult` messages read `CFG.tiers` dynamically → no other change needed.

- [ ] **Step 1: Tiers + remove dead `topTierChance`**

Line `479`: `tiers: [1200, 2400, 3400],`
Line `480`: delete the `topTierChance:` line entirely.
Line `811`: `const max = 3800, p = Math.min(score / max, 1) * 100;`
Line `1382`: replace the whole `if(t===3&&Math.random()>CFG.topTierChance){...}` line with nothing (remove it) — keep `let t=tierOf(S.best);if(!t)return;` and the following lines.

- [ ] **Step 2: Re-tune weights** (each is the `weight:` token on these lines)

| Line | Game | Old | New |
|---|---|---|---|
| 1022 | beans | `weight:1.1` | `weight:1.3` |
| 1057 | pour | `weight:1.45` | `weight:1.9` |
| 1089 | bubbles | `weight:1.15` | `weight:1.3` |
| 1110 | memory | `weight:2.2` | `weight:1.5` |
| 1151 | quiz | `weight:1.9` | `weight:1.6` |
| 1184 | simon | `weight:2.0` | `weight:1.3` |
| 1224 | shuffle | `weight:2.8` | `weight:3.2` |
| 1265 | sort | `weight:1.35` | `weight:1.5` |
| 1293 | stack | `weight:1.8` | `weight:1.6` |

- [ ] **Step 3: Smooth ramps**

- Line `1039`: `const vy=lerp(180,320,d)*Math.min(H/520,1.15),half=lerp(50,38,d),cupTop=H-60;`
- Line `1065`: `f=0;fill.style.height='0%';target=rnd(.5,.88);tol=lerp(.08,.045,c.d());`
- Line `1113`: `const st=c.stage,EM=['☕','🥐','🍰','🧊','🍫','🍩','🥤','🍪'],SZ=[6,8,10,12];`
- Line `1168`: `tmax=lerp(7500,5000,c.d());tleft=tmax;lock=false;`
- Line `1248`: `const d=c.d(),n=4+Math.round(d*3),sw=lerp(380,180,d);`
- Line `1275`: `card.className='so-card';tmax=lerp(3400,2200,c.d());tleft=tmax;lock=false;`

- [ ] **Step 4: Verify (browser)**

Play each game for a full 60s as an average player. Confirm tier-1 (1200) is reachable in every game and tier-3 (3400) is not trivially impossible in `shuffle`/`simon`/`memory`. Confirm the lane shows three stops at 1200/2400/3400 and the result screen's "remaining points" messages match.

- [ ] **Step 5: Commit** *(only if authorized)*

```bash
git add index.html
git commit -m "balance: re-tune weights, tiers, and difficulty ramps"
```

---

### Task 6: Fairness feedback — scaled penalty, miss reasons, combo-break toast

**Files:** Modify `index.html` (`makeCtx.miss` `915–927`, CSS after `.pop` `171`).

**Interfaces:** `miss(x, y, p, msg)` — new optional 4th arg (reason label). Existing calls unaffected.

- [ ] **Step 1: Add combo-break CSS** (after line `171`)

```css
.combo-break{position:absolute;left:50%;top:38%;transform:translate(-50%,-50%);z-index:7;pointer-events:none;font-weight:700;color:var(--coral);background:rgba(0,0,0,.35);padding:4px 12px;border-radius:999px;font-size:16px;animation:pop .9s ease-out forwards}
```

- [ ] **Step 2: Replace `miss`** (lines `915–927`)

```js
    miss(x, y, p, msg){
      if(r.over || r.paused) return;
      const broke = r.combo >= 2;
      r.combo = 0;
      const lm = 1 + 0.15 * (r.level - 1);
      if(p){
        const pen = Math.round(CFG.basePoints * g.weight * p * lm / 5) * 5;
        r.score = Math.max(0, r.score - pen);
        pop('-' + pen + (msg ? ' ' + msg : ''), x, y, 'bad');
      } else {
        pop(msg || '✕', x, y, 'bad');
      }
      if(broke){
        const t = el('div', 'combo-break', 'انكسر الكومبو 💥');
        stage.append(t); setTimeout(() => t.remove(), 920);
      }
      hud();
      SFX.miss();
    }
```

- [ ] **Step 3: Add reasons at the key call sites**

- Beans burnt, line `1044`: `if(it.burnt){ c.miss(it.x,H-90,1.2,'حبة محروقة!'); }`
- Beans miss, line `1050`: `if(!it.burnt) c.miss(it.x,H-30,0,'فاتتك حبة!');`
- Pour overflow, line `1072`: `if(f>=1){ c.miss(W/2,80,1.5,'فاض الكوب!'); }`
- Bubble empty tap, line `1093`: `c.on(st,'pointerdown',e=>{if(e.target===st){const p=c.pos(e);c.miss(p.x,p.y,0.6,'لمسة خطأ');}});`
- Quiz wrong, line `1174`: `else{b.classList.add('bad');reveal();c.miss(c.W()/2,90,1.2,'إجابة خاطئة');}`
- Sort wrong-timeout, line `1289`: `if(tleft<=0){lock=true;card.classList.add('bad');c.miss(c.W()/2,70,0.8,'انتهى الوقت');c.after(700,next);}`

- [ ] **Step 4: Verify (browser)**

Take any miss: the floating text shows a reason. Break a combo of ≥2: an "انكسر الكومبو 💥" chip appears once. Confirm penalty grows with level (level 4 miss costs more than level 1).

- [ ] **Step 5: Commit** *(only if authorized)*

```bash
git add index.html
git commit -m "feat: scaled miss penalty, reason labels, combo-break feedback"
```

---

### Task 7: Safety sensor — hysteresis, honest status, lifecycle

**Files:** Modify `index.html` (`SafetySensor` `594–716`; resume button `1491–1496`; `lock` `1447`; launch gating `867–880` maybe; iOS permission in `goBtn` `1467–1479`).

**Interfaces:** Adds `SafetySensor.status`, `SafetySensor.stop()`, `SafetySensor.handleGeoError(err)`, `SafetySensor.requestMotion()`. `checkThreshold/renderHUD/triggerLock/clearLock/simulateToggle` keep names.

- [ ] **Step 1: Add state + bound handlers + timer fields**

In the object literal, after `accelLog: [],` (line `602`) add:

```js
  status: 'unknown',
  _motion: null,
  _overAt: 0,
  _underAt: 0,
  _noDataTimer: 0,
  simulated: false,
```

- [ ] **Step 2: Replace `init()` (lines `604–623`)**

```js
  init(){
    if(this.active) return;
    this.active = true;
    if(!this._motion) this._motion = e => this.handleMotion(e);

    if('geolocation' in navigator){
      try {
        this.watchId = navigator.geolocation.watchPosition(
          pos => this.handleGeo(pos),
          err => this.handleGeoError(err),
          { enableHighAccuracy: false, maximumAge: 3000, timeout: 10000 }
        );
      } catch(e){ this.handleGeoError(e); }
    } else {
      this.status = 'unsupported';
    }

    if(window.DeviceMotionEvent){
      window.addEventListener('devicemotion', this._motion, { passive: true });
    }

    clearTimeout(this._noDataTimer);
    this._noDataTimer = setTimeout(() => {
      if(this.status !== 'granted' && !this.isMoving) this.renderHUD();
    }, 4000);
  },

  stop(){
    this.active = false;
    clearTimeout(this._noDataTimer);
    try { if(this.watchId != null) navigator.geolocation.clearWatch(this.watchId); } catch(e){}
    this.watchId = null;
    if(this._motion && window.DeviceMotionEvent){
      window.removeEventListener('devicemotion', this._motion);
    }
    if(this.isMoving) this.clearLock();
  },

  requestMotion(){
    if(window.DeviceMotionEvent && typeof DeviceMotionEvent.requestPermission === 'function'){
      try { DeviceMotionEvent.requestPermission().then(s => { this.status = (s === 'granted') ? 'granted' : 'denied'; }).catch(()=>{}); } catch(e){}
    }
    if(!this.active) this.init();
  },

  handleGeoError(){
    if(this.status !== 'granted') this.status = 'denied';
    this.renderHUD();
  },
```

- [ ] **Step 3: Mark granted in `handleGeo`**

After line `639` (`this.lastTime = now;`) add:

```js
    if(this.status !== 'granted'){ this.status = 'granted'; this._noDataTimer && clearTimeout(this._noDataTimer); }
```

- [ ] **Step 4: Replace `checkThreshold` (lines `665–673`) with hysteresis**

```js
  checkThreshold(){
    const now = performance.now();
    const over = this.speedKmh > 7.0;
    if(over){
      if(!this._overAt) this._overAt = now;
      this._underAt = 0;
      if(!this.isMoving && now - this._overAt >= 1000) this.triggerLock();
    } else {
      if(!this._underAt) this._underAt = now;
      this._overAt = 0;
      if(this.isMoving && now - this._underAt >= 1500) this.clearLock();
    }
    this.renderHUD();
  },
```

- [ ] **Step 5: Tune the accelerometer inference** (line `658`)

`if(avg > 4.2 && this.speedKmh < 8){ this.speedKmh = Math.max(this.speedKmh, Math.min(avg * 2.8, 25)); }`

- [ ] **Step 6: Honest `renderHUD` (lines `694–706`)**

```js
  renderHUD(){
    const warn = this.isMoving ? 'danger' : '';
    const label = this.isMoving
      ? '⚠️ السيارة تتحرك (' + Math.round(this.speedKmh) + ' كم/س)'
      : (this.status === 'granted' ? 'السيارة متوقفة (0 كم/س)'
        : this.status === 'denied' ? 'المستشعر مرفوض — اضغط للتفعيل'
        : this.status === 'unsupported' ? 'المستشعر غير مدعوم على هذا الجهاز'
        : 'المستشعر غير مُفعّل — اضغط للتفعيل');
    ['#homeSensorStatus', '#gameSensorStatus'].forEach(sel => {
      const el2 = document.querySelector(sel);
      if(!el2) return;
      el2.className = 'sensor-pill' + (warn ? ' danger' : '');
      el2.innerHTML = '<span class="live-dot' + (warn ? ' warn' : '') + '"></span> ' + label;
      el2.style.cursor = (this.status === 'granted') ? 'default' : 'pointer';
    });
  },
```

- [ ] **Step 7: `clearLock` also clears the sim flag** (line `685` area)

Add `this.simulated = false;` at the top of `clearLock()`.

- [ ] **Step 8: Demo-aware resume + demo gating**

Replace `$('#btnDriveResumeSim')` handler (lines `1491–1493`):

```js
$('#btnDriveResumeSim').addEventListener('click',()=>{
  if(SafetySensor.simulated || SafetySensor.speedKmh <= 0.5){
    SafetySensor.clearLock();
  } else {
    const t=$('#driveSpeedTxt');
    if(t) t.textContent='لا يزال المستشعر يرصد حركة (' + Math.round(SafetySensor.speedKmh) + ' كم/س) — توقف تماماً أولاً.';
  }
});
```

Line `712` (inside `simulateToggle`) → add `this.simulated = true;` before `this.triggerLock();`.

- [ ] **Step 9: Stop sensor on lock**

In `lock()` (line `1447`), after `abortRun();` add `SafetySensor.stop();`.

- [ ] **Step 10: Surface the enable tap + iOS permission**

In `goBtn` handler after `SafetySensor.init();` (line `1469`) add `SafetySensor.requestMotion();`.

Add a delegated click on the sensor pills (after line `1496`):

```js
document.addEventListener('click', e => {
  if(e.target.closest && e.target.closest('#homeSensorStatus,#gameSensorStatus')) SafetySensor.requestMotion();
});
```

Change the safety-modal resume button text (line `308`) to `إعادة الفحص — أنا متوقف تماماً ✓`.

- [ ] **Step 11: Verify (browser)**

- Desktop with location blocked: pills read "المستشعر مرفوض/غير مُفعّل — اضغط للتفعيل", not a false green "متوقف".
- With `#demo`: tap the sim button → modal appears with a live speed; the "إعادة الفحص" button only dismisses after clearing (sim path clears immediately). No console errors.
- Drag the car marker / rapid-device motion does not spuriously lock within <1s.

- [ ] **Step 12: Commit** *(only if authorized)*

```bash
git add index.html
git commit -m "fix: honest sensor status, hysteresis, and lifecycle (stop/stop-on-lock)"
```

---

### Task 8: Input fidelity + movement performance

**Files:** Modify `index.html` (`makeCtx.on` `897–904`; `makeCtx.W/H` `892`; beans `1026–1041`; stack `1299,1311,1319`).

**Interfaces:** `c.on(t, ev, fn, o)` — `o` becomes an options object; supports `o.noThrottle` and `o.passive`. Game call sites updated for move/up.

- [ ] **Step 1: Cache stage dimensions**

Replace line `892` (`W: () => stage.clientWidth, H: () => stage.clientHeight,`) — first, just above the `return {` at line `890`, add:

```js
  const dim = { w: stage.clientWidth, h: stage.clientHeight };
  function measure(){ dim.w = stage.clientWidth; dim.h = stage.clientHeight; }
  const onResize = () => measure();
  window.addEventListener('resize', onResize);
  r.cleanups.push(() => window.removeEventListener('resize', onResize));
```

Then line `892` → `W: () => dim.w, H: () => dim.h,`

- [ ] **Step 2: `on` with no-throttle option** (lines `897–904`)

```js
    on(t, ev, fn, o){
      o = o || {};
      const passive = o.passive !== false;
      const handler = o.noThrottle ? (e => fn(e)) : (e => { if(!antiSpamCheck()) return; fn(e); });
      const opts = { passive: passive };
      t.addEventListener(ev, handler, opts);
      r.cleanups.push(() => t.removeEventListener(ev, handler, opts));
    },
```

- [ ] **Step 3: Un-throttle move/release calls**

- Beans (`1028`): `c.on(st,'pointermove',setX,{noThrottle:true});`
- Pour (`1079`): `c.on(window,'pointerup',end,{noThrottle:true});c.on(window,'pointercancel',end,{noThrottle:true});`

- [ ] **Step 4: Transform-based beaters**

Beans cup (lines `1026–1027`): replace
`const cup=el('div','b-cup','☕');cup.style.left=cx+'px';st.append(cup);`
and the `setX` that writes `left`, with transform:
```js
  const cup=el('div','b-cup','☕');cup.style.left='0';cup.style.transform='translateX('+cx+'px) translateX(-50%)';st.append(cup);
  const setX=e=>{cx=Math.max(30,Math.min(c.W()-30,c.pos(e).x));cup.style.transform='translateX('+cx+'px) translateX(-50%)'};
```
Beans items (lines `1036–1037` and `1041`): create with `e.style.top='0'` and `it.e.style.transform='translateY(-44px)'`; each frame use `it.e.style.transform='translateY('+it.y+'px)'` instead of `it.e.style.top=it.y+'px'`.

Stack mover: line `1299` add `mv.style.left='0';` after `const mv=...`; line `1319` → `mv.style.transform='translateX('+mx+'px)';`

- [ ] **Step 5: Verify (browser)**

Drag the beans cup: motion tracks the finger smoothly (no stutter/1s freeze). In **صبّة الكابتشينو**, releasing quickly after tapping always ends the pour. **برج الكوبايات** mover still animates and stays oscreen. Confirm all 9 games still respond and none throw in console.

- [ ] **Step 6: Commit** *(only if authorized)*

```bash
git add index.html
git commit -m "perf: no-throttle input, cached stage dims, transform-based movers"
```

---

### Task 9: UX & accessibility

**Files:** Modify `index.html` (viewport `5`; `show` `803–807`; `#cd` `298`; `#warn` updating `1452–1460`; sound buttons `320,363`; `.sound-btn` `62`, `.hud .x` `145`; consent `340–343`; `goBtn` validation `1470–1474`; demo wrapper `378`).

**Interfaces:** `show(id)` behavior extended (focus). No API changes.

- [ ] **Step 1: Allow zoom**

Line `5` → `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">`

- [ ] **Step 2: Focus management in `show`** (lines `803–807`)

```js
function show(id){
  $$('.screen').forEach(s => s.classList.toggle('on', s.id === id));
  window.scrollTo(0, 0);
  watch();
  const scr = document.getElementById(id);
  const h = scr && scr.querySelector('h1,h2');
  if(h){ h.setAttribute('tabindex','-1'); try { h.focus({preventScroll:true}); } catch(e){} }
}
```

- [ ] **Step 3: Announce countdown start once** (`#cd` line `298` stays `aria-hidden="true"`; add a polite region)

Add after line `298`: `<div id="a11y" role="status" aria-live="polite" style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)"></div>`

In `countdown` (`843–858`), in the `else` branch after `SFX.go();` add `$('#a11y').textContent='بدأت الجولة!';`

- [ ] **Step 4: Quiet the warning region**

Replace the `watch()` text logic (lines `1457–1459`) with threshold-only updates by tracking a `lastWarnBucket`:

```js
  if(left<=60000){
    const bucket = Math.ceil(left/1000) <= 10 ? 10 : Math.ceil(left/1000) <= 30 ? 30 : 60;
    if(bucket !== watch._b){ watch._b = bucket; w.style.display='block'; w.textContent='🚗 اقتربت نافذة الاستلام! تُغلق الألعاب خلال '+bucket+' ثانية أو أقل.'; }
  }
  else { watch._b = 0; w.style.display='none'; }
```

- [ ] **Step 5: Trap targets + labels**

- Line `62`: `.sound-btn{background:rgba(255,255,255,.16);border:0;border-radius:999px;min-height:44px;padding:6px 12px;color:#fff;cursor:pointer;font-size:13px;display:flex;align-items:center;gap:5px}`
- Line `145`: `.hud .x{width:44px;height:44px;border-radius:50%;border:0;background:rgba(255,255,255,.16);color:#fff;font-size:18px;cursor:pointer}`
- Line `363`: `<button id="sndToggleHome" class="sound-btn" type="button" aria-label="تبديل الصوت"><span>🔊</span></button>`
- Line `378`: add `id="demoWrap" style="display:none;margin-top:20px;text-align:center"`; then after the `#simDriveBtn` handler (line `1496`) add `if(location.hash.indexOf('demo') >= 0) $('#demoWrap').style.display='block';`
- Line `340`: `<label class="chk" for="consent" style="opacity:.85">`

- [ ] **Step 6: Validate all fields at once** (lines `1470–1474`)

```js
  const phone=normDigits($('#phone').value),order=($('#order').value||'').trim(),err=$('#err');
  const problems=[];
  if(phone.length<9||phone.length>15) problems.push('رقم جوال صحيح (مثال: 05XXXXXXXX)');
  if(CFG.requireOrder&&!order) problems.push('رقم الطلب من فاتورة the A&A');
  if(!$('#safe').checked) problems.push('تأكيد أن السيارة متوقفة تماماً');
  if(problems.length){ err.textContent='يرجى إكمال: ' + problems.join(' • '); return; }
```

- [ ] **Step 7: Verify (browser)**

- Pinch-zoom works on mobile (meta change).
- Tab/Enter focuses the heading when switching screens; screen reader announces "بدأت الجولة!" once.
- Sound button and exit button are ≥44px; demo button only appears with `#demo`.
- Submit the intro empty: all three errors listed together.

- [ ] **Step 8: Commit** *(only if authorized)*

```bash
git add index.html
git commit -m "feat: accessibility, focus, zoom, and friction fixes"
```

---

### Task 10: Client-side security hardening

**Files:** Modify `index.html` (hashing `490–502`; `finishClaim` `1393–1407`; staff lockout `1511,1524–1544`).

**Interfaces:** `hash(s)` unchanged signature (stronger mixing). `signSession(s)` unchanged signature. Adds persisted staff lockout keys.

- [ ] **Step 1: Remove the plaintext PIN fallback** (line `1532`)

Replace:
`if(hash('salt-staff-2026:' + pinInput) !== CFG.staffPinHash && pinInput !== '2026'){`
with:
`if(hash('salt-staff-2026:' + pinInput) !== CFG.staffPinHash){`

- [ ] **Step 2: Persist the staff lockout across reloads**

Replace line `1511` with:
```js
let stCur=null, stFailCount=0, stLockedUntil=0;
try { const o=store.get(); stFailCount=o.stFailCount||0; stLockedUntil=o.stLockedUntil||0; } catch(e){}
function stickyStaff(o){ o=o||store.get(); o.stFailCount=stFailCount; o.stLockedUntil=stLockedUntil; store.set(o); }
```

In the wrong-PIN branch (lines `1533–1543`), after each mutation of `stFailCount`/`stLockedUntil` add `stickyStaff();`; in the success path add `stFailCount=0; stLockedUntil=0; stickyStaff();` before `const p=parseCode(...)` (line `1546`).

- [ ] **Step 3: Stronger session signature mixing** (lines `490–502`)

```js
function hash(s){
  let h = 2166136261;
  for(let i = 0; i < s.length; i++){
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
    h ^= (h >>> 13);
    h = Math.imul(h, 2654435761);
  }
  return (h >>> 0);
}
function signSession(s){
  let acc = hash(CFG.salt + '|' + s.phone + '|' + s.order + '|' + s.best + '|' + s.startedAt);
  for(let i = 0; i < 3; i++) acc = hash(acc + '|' + CFG.salt + '|' + s.phone);
  return acc;
}
```

Note: existing saved sessions (`o.S.sig`) will mismatch after this change → they are treated as tampered and reset on next claim. Acceptable (dev-stage); mention in the commit body.

- [ ] **Step 4: Per-device daily claim cap**

In `finishClaim` after line `1398` (`o.used['o:'+...]=S.claim;`) add:

```js
  const devKey = 'd:' + dayNow();
  o.dev = o.dev || {};
  o.dev[devKey] = (o.dev[devKey] || 0) + 1;
  store.set(o);
```

In `goBtn` before assigning `S` (line `1477`), add a soft gate:

```js
  const devCount = (store.get().dev || {})['d:' + day];
  if(devCount >= 2){ err.textContent='تم بلوغ الحد اليومي لهذا الجهاز (٢ جولات مكافأة). نراك غداً 🌴'; return; }
```

- [ ] **Step 5: Verify (browser)**

- PIN `2026` is rejected (only the hash accepted).
- Three wrong PINs lock for 60s; reload the page — still locked.
- Second claim on the same device the same day is blocked with the Arabic message.

- [ ] **Step 6: Commit** *(only if authorized)*

```bash
git add index.html
git commit -m "harden: remove PIN fallback, persist lockout, stronger signature, device cap"
```

---

### Task 11: Duplicate-file redirect + global error reporter

**Files:** Modify `cafe-games.html` (replace contents); `index.html` (add error handler near `471`).

- [ ] **Step 1: Redirect the duplicate**

Replace the entire contents of `cafe-games.html` with:

```html
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="refresh" content="0; url=index.html">
<link rel="canonical" href="index.html">
<title>the A&A specialty cafe & sweets</title>
</head>
<body>
<p style="font-family:sans-serif;text-align:center;padding:40px">جارٍ التحويل… <a href="index.html">اضغط هنا إذا لم يعمل التحويل</a></p>
<script>location.replace('index.html' + location.hash);</script>
</body>
</html>
```

- [ ] **Step 2: Global error reporter** (insert after line `472` `'use strict';`)

```js
window.addEventListener('error', e => { try { console.warn('[cafe]', e.message); } catch(x){} });
window.addEventListener('unhandledrejection', e => { try { console.warn('[cafe]', e.reason); } catch(x){} });
```

- [ ] **Step 3: Verify (browser)**

Open `cafe-games.html` → lands on `index.html` (hash preserved). Move the error handler to throw temporarily is not required; just confirm a normal session logs no `[cafe]` warnings.

- [ ] **Step 4: Commit** *(only if authorized)*

```bash
git add index.html cafe-games.html
git commit -m "chore: redirect duplicate entry file, add global error reporter"
```

---

### Task 12: Content corrections + honest README

**Files:** Modify `index.html` (`QUIZ` `981–982`); `README.md`.

**Interfaces:** None.

- [ ] **Step 1: Fix the mint/dates questions** (lines `981–982`)

Replace line `981` with:
`['ما هو النبات العطري الذي تشتهر به مشروبات المدينة المنورة التقليدية إلى جانب الدوش؟','النعناع المديني والدوش والنمام','الريحان الجبلي فقط','الكرفس البري'],`

Replace line `982` with:
`['من أشهر تمور المدينة المنورة الفاخرة التي تُقدَّم مع القهوة السعودية؟','تمر العجوة المبارك','تمر الخلاص والسكري','تمر التين الجاف'],`

- [ ] **Step 2: Qualify README security claims**

In `README.md`, replace any "anti-cheat / tamper-proof / security hardening" wording with a short section:

```markdown
## Security scope (important)
This is a **static, client-only** app. Reward codes are minted and validated in the
browser; redemption is stored in the customer's `localStorage`. That is enough to
deter casual tampering but is **not** forgery-proof and does **not** enforce
single-use across devices.

Current mitigations: obfuscated code minting, a hashed staff PIN, a persisted
staff lockout, a client-side session signature, and a per-device daily claim cap.

For real protection, move minting/validation server-side: issue codes with an
HMAC over `(type, day, nonce)` using a server secret, keep a server redemption
ledger keyed by code body, and authenticate staff via SSO/MFA. `CFG.salt` and all
client checks should then be removed.
```

- [ ] **Step 3: Verify (static)**

Run: `Select-String -Path index.html -Pattern 'تمر المجدول الأمريكي'` → expect no match. Confirm README contains "Security scope".

- [ ] **Step 4: Commit** *(only if authorized)*

```bash
git add index.html README.md
git commit -m "docs: correct quiz facts and qualify security claims"
```

---

### Task 13: Full regression pass

**Files:** No edits (verification only).

- [ ] **Step 1: Run the spec's manual matrix**

Light + dark theme: intro, home, all 9 games, result, choice, ticket, locked, `#staff`, `#demo`.

- [ ] **Step 2: Breakpoint checks**

320 / 360 / 480px: no horizontal overflow; HUD fits with an active combo.

- [ ] **Step 3: Cross-cutting checks**

- Console clean (no `[cafe]` warnings, no exceptions) during a full session and after exiting/aborting games.
- Sensor states render honestly when location is blocked/granted.
- Mute persists across reload; audio resumes after tab switch.
- Staff: correct PIN works, wrong PIN locks and survives reload, `2026` rejected.
- Second same-device claim is capped.

- [ ] **Step 4: If any regression found**

Return to the owning task above, fix, and re-run the affected checks before proceeding.

---

## Self-Review

- **Spec coverage:** WS1→Tasks 5,6; WS2→Tasks 3,4; WS3→Tasks 1,2; WS4→Tasks 7,9; WS5→Tasks 7,8,11; WS6→Tasks 10,12. Narrative corrections (found by the Narrative audit, not in the spec) added as Task 12 and flagged.
- **Placeholders:** none — every step carries exact old→new code or an explicit static/browser assertion.
- **Type consistency:** `miss(x,y,p,msg)` extended in Task 6 and consumed by the reason call sites in the same task; `c.on(t,ev,fn,o)` reshaped in Task 8 with its call sites updated in the same task; `SafetySensor.stop/requestMotion/status` defined in Task 7 before use in Task 7 Step 9–10. `--stage-ink`/`--cardface` defined in Task 1, consumed in Task 1 only. No symbol is referenced before its defining task.
- **Ordering:** shared-harness tasks (3,4,5,7,8) precede the full regression pass (13); low-risk isolated edits (1,2,12) front-loaded.
