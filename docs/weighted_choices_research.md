# Understanding Weighted Choices and Scoring in Decision Systems

This document explains the concept, mathematics, and architectural implementation of **Weighted Choices** (specifically Multi-Criteria Decision Analysis / Weighted Scoring Models) for the JD Solar platform capstone project.

---

## 1. Explain It Like I'm 5 (ELI5)

### The Solar Backpack Story
Imagine you are packing a special **Solar Backpack** to power your toys on an outdoor camping trip. You can only pick one solar light from the workshop:

1. **A Tiny Solar Flashlight** (Cheap, but very weak light)
2. **A Giant Stadium Floodlight** (Super bright, but weighs 20 kg and costs all your money)
3. **A Balanced Solar Lantern** (Fair price, just right brightness, fits in your bag)

If you only asked, *"Which one has the biggest number?"*, you would pick the giant stadium light. But that would break your budget and crush your backpack!

So, you give yourself **10 points of importance** to divide up:
- **Price**: 4 points (I only have ₱2,000 in my pocket)
- **Place to put it**: 3 points (It must fit on my camp pole, not a giant highway crane)
- **Brightness**: 3 points (Bright enough to see, but doesn't blind everyone)

When you test each solar light:
- You multiply how well it fits each need by your importance points.
- The giant stadium light gets almost 0 points for price and 0 points for fitting your tent pole.
- The balanced solar lantern gets high marks in all three categories!

When you add up the points, the **Balanced Solar Lantern** wins.

**That is what Weighted Choice means:**
Different features have different importance to the person buying. Instead of picking by just one number (like raw wattage), we assign each feature a "weight" (importance level). The computer calculates:

$$\text{Final Score} = (\text{Price Fit} \times \text{Price Weight}) + (\text{Location Fit} \times \text{Location Weight}) + (\text{Power Fit} \times \text{Power Weight})$$

---

## 2. General Concepts & Mathematical Foundation

In decision science and systems engineering, this algorithm is formally known as **Simple Additive Weighting (SAW)** or **Weighted Linear Combination (WLC)** under **Multi-Attribute Utility Theory (MAUT)**.

### 2.1 The Core Formula

For any candidate product $i$ evaluated across $n$ distinct criteria:

$$\text{Final Score}_i = \sum_{j=1}^{n} w_j \cdot s_{ij} = (w_1 \cdot s_{i1}) + (w_2 \cdot s_{i2}) + \dots + (w_n \cdot s_{in})$$

Where:
- $n$ is the total count of evaluation criteria (e.g., Budget, Location, Wattage/Battery, Ingress Rating).
- $w_j$ is the **normalized weight** of criterion $j$.
- $s_{ij}$ is the **normalized performance score** of candidate $i$ on criterion $j$, strictly scaled to the range $[0.0, 1.0]$.

### 2.2 Weight Normalization Constraint

The sum of all criterion weights must equal $1.0$ (or $100\%$):

$$\sum_{j=1}^{n} w_j = 1.0$$

If customer sliders or business rules provide unnormalized raw weights $W_j$ (e.g., $35, 35, 30$):

$$w_j = \frac{W_j}{\sum_{k=1}^{n} W_k}$$

---

## 3. How Weighted Choices Work in the Solar Capstone

In the JD Solar capstone, the system evaluates standalone solar streetlights and floodlights against customer requirements. The implementation resides in [`frontend/src/lib/multiCriteriaMatcher.js`](file:///home/ram/Projects/Cross-platform/Solar_App_Capstone_Project/frontend/src/lib/multiCriteriaMatcher.js).

### 3.1 The Three Core Pillars

| Pillar / Criterion | Default Weight ($w_j$) | Normalized % | Engineering Purpose in Solar Lighting |
| :--- | :--- | :--- | :--- |
| **Budget Fit** ($s_{\text{budget}}$) | $0.35$ | $35\%$ | Solar luminaires have significant upfront capital expenditure. Evaluates user budget ceiling against product price tier. |
| **Location Fit** ($s_{\text{location}}$) | $0.35$ | $35\%$ | Evaluates mounting pole height ($3\text{m}-9\text{m}$), optical lenses (batwing vs. wide beam), and application area. |
| **Power Fit** ($s_{\text{power}}$) | $0.30$ | $30\%$ | Evaluates whether PV panel rating ($W_p$), battery capacity (mAh LiFePO4), and LED wattage provide required lux levels. |
| **Total** | **$1.00$** | **$100\%$** | |

### 3.2 Gatekeeping & Pre-Qualification Filters
Before weights are calculated:
1. **Solar Pre-filter**: Eliminates AC 220V grid-tied lamps from ranking in an off-grid solar inquiry (`isSolarCandidate`).
2. **Stock Penalty / Exclusion**: If an item is out of stock at the warehouse branch, it receives a $50\%$ penalty multiplier (`compositeScore *= 0.50`) or is filtered out completely when `requireInStock` is enabled.
3. **Threshold Gate**: Products with a composite score below $0.70$ ($70\%$) are not recommended.

---

## 4. Comprehensive Solar Lighting Examples

Here are three real-world capstone scenarios using actual solar products from [`solar_database_full.csv`](file:///home/ram/Projects/Cross-platform/Solar_App_Capstone_Project/solar_database_full.csv).

---

### Example 1: Residential Gate & Courtyard Lighting

#### Customer Profile & Inquiry
- **Target Location**: Residential Entrance / Gate (Pole/Wall mounting height: $3\text{m} - 3.5\text{m}$)
- **Target Power**: Low to medium ($100\text{W} - 150\text{W}$)
- **Customer Budget**: Up to **₱2,200**
- **Criteria Weights**: Budget = $0.35$, Location = $0.35$, Power = $0.30$

#### Product Candidates

1. **Product A — Integrated Solar Street Light 100W**
   - Specs: 100W LED, 5V/18W Monocrystalline PV panel, 24,000mAh LiFePO4 battery, IP67.
   - Price: ₱1,800 (In Stock)
2. **Product B — Aviation Aluminum Solar Road Light 600W**
   - Specs: 600W LED, 5V/90W Monocrystalline PV panel, 91,000mAh LiFePO4 battery, IP65.
   - Price: ₱6,200 (In Stock)
3. **Product C — Solar Floodlight JDL 40W**
   - Specs: 40W LED, 6V/18W PV panel, 12,000mAh battery, IP67.
   - Price: ₱1,200 (In Stock)

#### Step-by-Step Scoring

##### Scoring Product A (100W Integrated Solar Street Light)
- **Budget Score ($s_1$)**: ₱1,800 is comfortably within ₱2,200 budget ceiling $\rightarrow s_1 = 0.98$
- **Location Score ($s_2$)**: 100W street luminaire at 3.5m height is ideal, non-glaring residential coverage $\rightarrow s_2 = 1.00$
- **Power Score ($s_3$)**: 100W perfectly matches target 100W $\rightarrow s_3 = 1.00$

$$\text{Score}_A = (0.35 \times 0.98) + (0.35 \times 1.00) + (0.30 \times 1.00) = 0.343 + 0.350 + 0.300 = 0.993 \implies \mathbf{99\%}$$

##### Scoring Product B (600W Road Luminaire)
- **Budget Score ($s_1$)**: ₱6,200 is 181% over the ₱2,200 budget $\rightarrow s_1 = 0.10$
- **Location Score ($s_2$)**: 600W road luminaire produces extreme blinding glare on a low 3m residential gate $\rightarrow s_2 = 0.30$
- **Power Score ($s_3$)**: 600W vs 100W target (severe overkill; $|600 - 100| / 100 = 5.0$) $\rightarrow s_3 = 0.20$

$$\text{Score}_B = (0.35 \times 0.10) + (0.35 \times 0.30) + (0.30 \times 0.20) = 0.035 + 0.105 + 0.060 = 0.200 \implies \mathbf{20\%}$$

##### Scoring Product C (40W Floodlight JDL)
- **Budget Score ($s_1$)**: ₱1,200 is well within budget $\rightarrow s_1 = 1.00$
- **Location Score ($s_2$)**: Compact floodlight fits gate wall mount nicely $\rightarrow s_2 = 0.85$
- **Power Score ($s_3$)**: 40W vs 100W target ($|40 - 100| / 100 = 0.60 \rightarrow 1.0 - 0.60 = 0.40$) $\rightarrow s_3 = 0.40$

$$\text{Score}_C = (0.35 \times 1.00) + (0.35 \times 0.85) + (0.30 \times 0.40) = 0.350 + 0.2975 + 0.120 = 0.7675 \implies \mathbf{77\%}$$

#### Result & Decision
- **Product A (99%)**: Top recommended match.
- **Product C (77%)**: Good budget-friendly alternative.
- **Product B (20%)**: Rejected by threshold filter ($< 70\%$).

---

### Example 2: Highway Viaduct / Industrial Perimeter (Custom Weighted Profile)

In industrial projects, budget is less important than illumination safety and optical compliance. The customer shifts criteria weights:
- **Budget Weight**: $0.20$
- **Location Weight**: $0.40$ (Needs high-mast $8\text{m}$ mounting and wide batwing beam optics)
- **Power Weight**: $0.40$ (Needs $\ge 400\text{W}$ high-lumen output)

#### Product Candidates

1. **Product X — Aviation Aluminum Solar Road Light 500W**
   - Specs: 500W, 5V/80W Mono PV, 78,000mAh LiFePO4, Batwing $140^\circ$ optical lens, IP65.
   - Price: ₱5,800
2. **Product Y — Solar Streetlight 150W**
   - Specs: 150W, 5V/23W Mono PV, 30,000mAh LiFePO4, Standard $120^\circ$ lens, IP65.
   - Price: ₱2,300
3. **Product Z — Aviation Aluminum Solar Road Light 500W (Out of Stock)**
   - Same specs as Product X, but inventory branch quantity is $0$.

#### Scoring Calculation (Target: Highway, 500W, Budget ₱6,000)

##### Product X (500W Highway Luminaire, In Stock)
- **Budget Score ($s_1$)**: ₱5,800 is within ₱6,000 $\rightarrow s_1 = 0.97$
- **Location Score ($s_2$)**: High-lumen batwing lens for 8m highway pole $\rightarrow s_2 = 1.00$
- **Power Score ($s_3$)**: 500W matches target 500W $\rightarrow s_3 = 1.00$

$$\text{Composite Score}_X = (0.20 \times 0.97) + (0.40 \times 1.00) + (0.40 \times 1.00) = 0.194 + 0.400 + 0.400 = 0.994 \implies \mathbf{99\%}$$

##### Product Y (150W Streetlight)
- **Budget Score ($s_1$)**: ₱2,300 is well under ₱6,000 $\rightarrow s_1 = 1.00$
- **Location Score ($s_2$)**: 150W is severely underpowered for 8m highway poles, insufficient beam throw $\rightarrow s_2 = 0.20$
- **Power Score ($s_3$)**: 150W vs 500W target ($|150 - 500| / 500 = 0.70 \rightarrow 1.0 - 0.70 = 0.30$) $\rightarrow s_3 = 0.30$

$$\text{Composite Score}_Y = (0.20 \times 1.00) + (0.40 \times 0.20) + (0.40 \times 0.30) = 0.200 + 0.080 + 0.120 = 0.400 \implies \mathbf{40\%}$$

*Notice: Even though Product Y was ₱3,500 cheaper, the higher weights on Location ($40\%$) and Power ($40\%$) properly prevented an unsafe product from being recommended.*

##### Product Z (500W Highway Luminaire, Out of Stock)
- Raw composite match is identical to Product X: $0.994$.
- **Stock Penalty**: The warehouse quantity is 0 (`stockTier === 'out'`), triggering the $0.50$ penalty:
  $$\text{Final Score}_Z = 0.994 \times 0.50 = 0.497 \implies \mathbf{50\%}$$
- **Result**: Demoted below threshold to prevent dead sales inquiries.

---

### Example 3: Solar Panel & Battery Sizing Matcher (Engineering Extension)

Weighted scoring can also be applied to match **Solar Panel Wattage ($W_p$)** and **Battery Capacity (Ampere-hours, Ah)** against site autonomy needs (rainy days backup).

#### System Parameters
- Customer wants a solar streetlight that lasts **14 hours nightly** with **2 days of cloudy-weather autonomy**.
- Daily load energy needed = $300\text{Wh}$.
- Target battery capacity needed = $30\text{Ah}$ at $3.2\text{V}$ ($96\text{Wh}$ net reserve).
- Target solar panel needed = $\ge 35\text{W}$ monocrystalline (to recharge in 4.5 peak sun hours).

#### Criteria Weights
- **Battery Autonomy Fit**: $w_1 = 0.40$
- **Solar Panel Sizing Fit**: $w_2 = 0.35$
- **Enclosure IP Weatherproof Rating**: $w_3 = 0.25$

#### Candidates Evaluation

| Metric | Candidate 1: JDL 200W Flood | Candidate 2: HPC 200W Flood | Target Requirement |
| :--- | :--- | :--- | :--- |
| **PV Panel** | 6V / 48W Monocrystalline | 6V / 25W Polycrystalline | $\ge 35\text{W}$ |
| **Battery** | 30,000mAh (30Ah) LiFePO4 | 20,000mAh (20Ah) LiFePO4 | $\ge 30\text{Ah}$ |
| **Ingress Rating** | IP67 (Submersion proof) | IP65 (Water jet proof) | IP65 or higher |

#### Scoring

1. **Candidate 1 (JDL 200W)**:
   - Battery: $30\text{Ah} / 30\text{Ah} = 1.0 \rightarrow s_1 = 1.00$
   - Solar Panel: $48\text{W} \ge 35\text{W} \rightarrow s_2 = 1.00$
   - Weatherproof: IP67 exceeds IP65 $\rightarrow s_3 = 1.00$
   $$\text{Score}_1 = (0.40 \times 1.00) + (0.35 \times 1.00) + (0.25 \times 1.00) = \mathbf{1.00}\ (100\%)$$

2. **Candidate 2 (HPC 200W)**:
   - Battery: $20\text{Ah} / 30\text{Ah} = 0.67 \rightarrow s_1 = 0.67$
   - Solar Panel: $25\text{W} / 35\text{W} = 0.71 \rightarrow s_2 = 0.71$
   - Weatherproof: IP65 meets target $\rightarrow s_3 = 0.90$
   $$\text{Score}_2 = (0.40 \times 0.67) + (0.35 \times 0.71) + (0.25 \times 0.90) = 0.268 + 0.2485 + 0.225 = \mathbf{0.7415}\ (74\%)$$

---

## 5. Alternative Form: Weighted Random Choice (Probabilistic Selection)

While the capstone product matcher uses **Deterministic Scoring** (highest score wins), weighted choices can also refer to **Weighted Random Sampling** (where weights represent relative odds or probabilities).

### Solar Warehouse Example (Stochastic Stock Rotation)
If a warehouse has 3 identical solar luminaires with different remaining shelf-life or batch ages, they might use weighted random selection to distribute wear or showcase items:
- Batch A (Older stock): Weight = 6 (60% pick rate)
- Batch B (Fresh stock): Weight = 3 (30% pick rate)
- Batch C (Brand new release): Weight = 1 (10% pick rate)

```javascript
function pickWeightedSolarBatch(batches) {
  // batches = [{ name: 'Batch A', weight: 6 }, { name: 'Batch B', weight: 3 }, { name: 'Batch C', weight: 1 }]
  const totalWeight = batches.reduce((acc, item) => acc + item.weight, 0);
  let random = Math.random() * totalWeight;

  for (const item of batches) {
    if (random < item.weight) {
      return item;
    }
    random -= item.weight;
  }
  return batches[batches.length - 1];
}
```

---

## 6. Summary Comparison

| Aspect | Deterministic Weighted Scoring (Product Matcher) | Weighted Random Sampling (Probabilistic) |
| :--- | :--- | :--- |
| **Core Question** | "Which solar luminaire is the best technical fit?" | "Which item should be picked with probability proportional to weight?" |
| **Formula** | $\text{Score} = \sum_{j=1}^{n} w_j \cdot s_{ij}$ | $P(\text{choice}_i) = \frac{w_i}{\sum w}$ |
| **Outcome** | Ranked list sorted descending by % match | A single randomly chosen item |
| **Capstone Usage** | [`multiCriteriaMatcher.js`](file:///home/ram/Projects/Cross-platform/Solar_App_Capstone_Project/frontend/src/lib/multiCriteriaMatcher.js) product matching & recommendation wizard | Stock rotation, balanced A/B testing, diagnostic question sampling |
