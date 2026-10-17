# A&A Cafe Games — Game Balancing Report (Deliverable D)

## 1. Unified Difficulty Framework

To eliminate the disparity where some games were trivial and others near impossible, the platform establishes a **Unified Difficulty Framework** based on standard multipliers:

| Level | Name (Arabic) | Multiplier | Target Audience | Primary Mechanics Calibration |
| :---: | :--- | :---: | :--- | :--- |
| **Easy** | **سهل** | **1.0×** | Casual players, young children, or quick plays. | Generous hitboxes, slower target fall/spawn rates, longer observation periods. |
| **Medium** | **متوسط** (Default) | **1.2×** | Regular cafe visitors waiting for drive-thru order. | Standard speed, moderate combo ramp-up, balanced hazard frequency. |
| **Hard** | **صعب** | **1.4×** | Competitive gamers seeking maximum points and top tier. | High-speed hazards, strict timing windows, fast sequence demonstration, aggressive combo multipliers. |

---

## 2. Reward Tier Economics & Calibration

The reward tiers are calibrated against a **60-second gameplay session** ($T = 60\text{s}$) with a 4-stage level ramp ($L = 1 \dots 4$, advancing every 15 seconds):

| Tier | Required Score | Customer Reward | Expected Win Rate (Medium) | Required Player Performance |
| :---: | :---: | :--- | :---: | :--- |
| **Tier 1** | **1,200 pts** | **خصم 5% على الفاتورة** | ~75% | Average play, reaching Level 3 with few misses. |
| **Tier 2** | **2,400 pts** | **خصم 10% أو إضافة مجانية** | ~35% | Skilled play, sustaining a 4× to 6× combo into Level 4. |
| **Tier 3** | **3,400 pts** | **مشروب مجاني بالكامل ☕** | ~8% | Flawless play, high reaction speed, 8+ combo, zero hazard hits. |

*Note: These tiers replace the previous exploit-prone thresholds where a player could exceed 4,000 points in 20 seconds.*

---

## 3. Individual Game Tuning & Levers

### 3.1 Reflex Rush (`reflex`)
- **Base Weight**: $1.5×$
- **Spawn Interval**: Starts at $750\text{ms}$ (Level 1), accelerating to $420\text{ms}$ (Level 4), divided by the difficulty multiplier ($D$).
- **Target Lifetime**: Starts at $1200\text{ms}$, decreasing to $680\text{ms}$ at Level 4.
- **Hazard Probability**: $18\%$ at Level 1, scaling up to $35\%$ at Level 4.
- **Scoring Ceiling**:
  - Maximum theoretical score in 60s (flawless hits under 200ms with max combo): ~3,850 pts.
  - Typical medium player score: 1,800 – 2,500 pts.

### 3.2 Pattern Lock (`pattern`)
- **Base Weight**: $2.5×$
- **Sequence Length**: Stage 1 = 3 nodes, Stage 2 = 4 nodes, Stage 3 = 5 nodes, Stage 4 = 6 nodes, Stage 5+ = 7–8 nodes.
- **Step Speed**: $600\text{ms}$ down to $360\text{ms}$ per illuminated node.
- **Mistake Penalty**: Deducts 1 heart and imposes a $-35$ point penalty. At 3 mistakes, the round ends.
- **Scoring Ceiling**:
  - Completing 5 stages flawlessly in 60s: ~3,600 pts.
  - Typical medium player score: 1,600 – 2,300 pts.

### 3.3 Where Is the Ball? (`shuffle`)
- **Base Weight**: $3.2×$
- **Shuffle Cycles ($N$)**: $\min(8, \text{round}((4 + d \times 3) \times D))$. Easy: 4–5 swaps; Hard: 7–8 rapid swaps.
- **Swap Duration ($sw$)**: $\max(160\text{ms}, \text{round}(\text{lerp}(380, 180, d) / D))$.
- **Scoring Ceiling**:
  - 8 correct rounds in 60s: ~3,500 pts.
  - Typical medium player score: 1,500 – 2,200 pts.

### 3.4 Cup Tower (`stack`)
- **Base Weight**: $1.6×$
- **Oscillation Speed**: $W \times \text{lerp}(0.65, 1.4, d) \times D$.
- **Perfect Match Tolerance**: $\text{lerp}(8\text{px}, 4\text{px}, d)$.
- **Scoring Ceiling**:
  - 18 successfully stacked cups with 6 perfect alignments: ~3,400 pts.
  - Typical medium player score: 1,400 – 2,100 pts.

### 3.5 Catch the Beans (`beans`)
- **Base Weight**: $1.3×$
- **Bean Fall Speed**: $\text{lerp}(180, 320, d) \times \min(H/520, 1.15) \times D$.
- **Burnt Bean Probability**: $14\%$ at start, scaling to $38\%$ at high levels.
- **Scoring Ceiling**:
  - Catching 45 golden beans with no burnt bean touches: ~3,350 pts.
  - Typical medium player score: 1,500 – 2,400 pts.

---

## 4. Controlled Simulation Scenarios

| Scenario | Simulated Player Profile | Target Game | Simulated Score | Awarded Tier | Alignment with Business Goals |
| :---: | :--- | :---: | :---: | :---: | :--- |
| **A** | Casual first-timer | Reflex Rush | 1,420 | Tier 1 (5%) | Satisfying onboarding; guaranteed incentive. |
| **B** | Focused coffee enthusiast | Where Is the Ball? | 2,560 | Tier 2 (10%) | Great engagement while waiting for beverage. |
| **C** | Master gamer (hard mode) | Pattern Lock | 3,520 | Tier 3 (Free Drink) | Rare accomplishment; customer delights and shares on Instagram. |
| **D** | Blind spam-clicker | Reflex Rush | 380 | None | Exploit neutralized; empty clicks penalized. |
| **E** | Careless hazard collector | Catch the Beans | 720 | None | Burnt beans deduct score; combo continuously broken. |
