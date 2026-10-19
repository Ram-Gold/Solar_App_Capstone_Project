// frontend/src/lib/solarBotEngine.js
// Client-side decision-tree & technical FAQ engine for JD Solar Assistant

export const FALLBACK_PRODUCTS = [
  { id: 1, name: "Aviation Aluminum Solar Light 200W", type: "Aviation Aluminum Solar Light", watt: 349, price_range: "1500-2500", waterproof_grade: "IP65", battery: "91000mAh Lithium Iron Phosphate", material: "Aviation Aluminum + Optical Lens" },
  { id: 2, name: "Aviation Aluminum Solar Road Light 300W", type: "Aviation Aluminum Solar Road Light", watt: 300, price_range: "1000-2000", waterproof_grade: "IP65", battery: "58500mAh Lithium Iron Phosphate", material: "Aviation Aluminum + Optical Lens" },
  { id: 3, name: "Aviation Aluminum Solar Road Light 400W", type: "Aviation Aluminum Solar Road Light", watt: 400, price_range: "2500-3500", waterproof_grade: "IP65", battery: "65000mAh Lithium Iron Phosphate", material: "Aviation Aluminum + Optical Lens" },
  { id: 4, name: "Aviation Aluminum Solar Road Light 500W", type: "Aviation Aluminum Solar Road Light", watt: 500, price_range: "1500-2500", waterproof_grade: "IP65", battery: "78000mAh Lithium Iron Phosphate", material: "Aviation Aluminum + Optical Lens" },
  { id: 5, name: "Aviation Aluminum Solar Road Light 600W", type: "Aviation Aluminum Solar Road Light", watt: 600, price_range: "3000+", waterproof_grade: "IP65", battery: "91000mAh Lithium Iron Phosphate", material: "Aviation Aluminum + Optical Lens" },
  { id: 6, name: "Aviation Aluminum Solar Street Light 100W", type: "Aviation Aluminum Solar Street Light", watt: 100, price_range: "1000-2000", waterproof_grade: "IP65", battery: "26000mAh Lithium Iron Phosphate", material: "Aviation Aluminum + Optical Lens" },
  { id: 7, name: "Aviation Aluminum Solar Street Light 150W", type: "Aviation Aluminum Solar Street Light", watt: 150, price_range: "2500-3500", waterproof_grade: "IP65", battery: "32500mAh Lithium Iron Phosphate", material: "Aviation Aluminum + Optical Lens" },
  { id: 8, name: "Aviation Aluminum Solar Street Light 200W", type: "Aviation Aluminum Solar Street Light", watt: 200, price_range: "1500-2500", waterproof_grade: "IP65", battery: "39000mAh Lithium Iron Phosphate", material: "Aviation Aluminum + Optical Lens" },
  { id: 9, name: "Aviation Aluminum Solar Street Light 250W", type: "Aviation Aluminum Solar Street Light", watt: 250, price_range: "3000+", waterproof_grade: "IP65", battery: "45500mAh Lithium Iron Phosphate", material: "Aviation Aluminum + Optical Lens" },
  { id: 10, name: "Integrated Solar Street Light 300W", type: "Integrated Solar Street Light", watt: 300, price_range: "1000-2000", waterproof_grade: "IP65", battery: "65000mAh Lithium Iron Phosphate", material: "Aviation Aluminum + Optical Lens" },
  { id: 11, name: "Integrated Solar Street Light 50W", type: "Integrated Solar Street Light", watt: 50, price_range: "2500-3500", waterproof_grade: "IP65", battery: "19500mAh LiFePO4", material: "Aviation Aluminum + Optical Lens" },
  { id: 12, name: "Integrated Solar Street Light 100W", type: "Integrated Solar Street Light", watt: 100, price_range: "1500-2500", waterproof_grade: "IP67", battery: "24000mAh LiFePO4", material: "Aviation Aluminum + Optical Lens" },
  { id: 13, name: "Integrated Solar Street Light 150W", type: "Integrated Solar Street Light", watt: 150, price_range: "3000+", waterproof_grade: "IP67", battery: "30000mAh LiFePO4", material: "Aviation Aluminum + Optical Lens" },
  { id: 14, name: "Integrated Solar Street Light (Warm White) 150W", type: "Integrated Solar Street Light", watt: 150, price_range: "1000-2000", waterproof_grade: "IP67", battery: "30000mAh LiFePO4", material: "Aviation Aluminum + Optical Lens" },
  { id: 15, name: "Integrated Solar Street Light 200W", type: "Integrated Solar Street Light", watt: 200, price_range: "2500-3500", waterproof_grade: "IP67", battery: "39000mAh LiFePO4", material: "Aviation Aluminum + Optical Lens" },
  { id: 16, name: "Aluminum Solar Street Light (Gray) 200W", type: "Aluminum Solar Street Light", watt: 200, price_range: "1500-2500", waterproof_grade: "IP65", battery: "15000mAh Lithium Iron Phosphate", material: "Aluminum + Optical Reflector" },
  { id: 17, name: "Aluminum Solar Street Light (Gray) 300W", type: "Aluminum Solar Street Light", watt: 300, price_range: "3000+", waterproof_grade: "IP65", battery: "20000mAh Lithium Iron Phosphate", material: "Aluminum + Optical Reflector" },
  { id: 18, name: "Solar Streetlight 200W", type: "Solar Streetlight", watt: 200, price_range: "1000-2000", waterproof_grade: "IP65", material: "Aluminum" },
  { id: 19, name: "Solar Streetlight 300W", type: "Solar Streetlight", watt: 300, price_range: "2500-3500", waterproof_grade: "IP65", material: "Aluminum" },
  { id: 20, name: "Solar Streetlight 400W", type: "Solar Streetlight", watt: 400, price_range: "1500-2500", waterproof_grade: "IP65", material: "Aluminum" },
  { id: 21, name: "Solar Streetlight 800W", type: "Solar Streetlight", watt: 800, price_range: "3000+", waterproof_grade: "IP65", battery: "72000mAh LiFePO4", material: "Die Cast Aluminum" },
  { id: 22, name: "Solar Streetlight 500W", type: "Solar Streetlight", watt: 500, price_range: "1000-2000", waterproof_grade: "IP65", material: "Aluminum" },
  { id: 23, name: "Solar Streetlight 600W", type: "Solar Streetlight", watt: 600, price_range: "2500-3500", waterproof_grade: "IP65", battery: "60000mAh LiFePO4", material: "Die Cast Aluminum" },
]

export const DECISION_TREE = {
  ROOT: {
    message: `**Welcome to JD Solar Technical Assistant & FAQ Desk!**

How can I help power your lighting project today? Please select an inquiry topic below or type your question:`,
    options: [
      { label: 'Product Specifications Guide', next: 'SPECS_INFO' },
      { label: 'Pricing & Commercial Packages', next: 'PRICING_INFO' },
      { label: 'Stock Availability & Branches', next: 'BRANCHES_INFO' },
      { label: 'Installation & Mounting Guide', next: 'INSTALLATION_INFO' },
      { label: '1-Year Warranty & Post-Sale Service', next: 'WARRANTY_INFO' },
      { label: 'Electricity Savings & ROI', next: 'SAVINGS_INFO' },
      { label: 'Contact Sales & Inquiries', next: 'CONTACT_INFO' },
      { label: 'Open Product Matcher', url: '/match' },
      { label: 'Browse Full Catalog', url: '/browse' },
    ],
  },

  SPECS_INFO: {
    message: `### Product Specifications & Hardware Standards

JD Solar commercial and industrial lighting fixtures are manufactured according to strict quality and endurance benchmarks:

* **Solar Photovoltaic Panels:** High-efficiency Monocrystalline silicon cells with 21%+ conversion efficiency for rapid battery charging even during overcast weather.
* **Battery Chemistry:** Heavy-duty Lithium Iron Phosphate (LiFePO4) cells rated for over 2,000 deep discharge cycles (3 to 5+ years operational life).
* **Housing & Optics:** Aviation-grade aluminum alloy and die-cast enclosures with optical polycarbonate lenses, engineered for thermal dissipation and wind resistance.
* **Ingress Protection:** Certified IP65 and IP67 waterproof and dustproof ratings designed to withstand Philippine typhoons, continuous downpours, and coastal humidity.
* **Intelligent Controller:** Dusk-to-dawn automated activation with dual-mode radar motion sensing and dimming to conserve energy during late night hours.

For automated multi-criteria product matching tailored to your specific setup, use our dedicated Product Matcher.`,
    options: [
      { label: 'Open Product Matcher', url: '/match' },
      { label: 'Installation & Mounting Guide', next: 'INSTALLATION_INFO' },
      { label: 'Pricing & Commercial Packages', next: 'PRICING_INFO' },
      { label: '1-Year Warranty & Service', next: 'WARRANTY_INFO' },
      { label: 'Main Menu', next: 'ROOT' },
    ],
  },

  PRICING_INFO: {
    message: `### Pricing & Equipment Packages

JD Solar delivers direct trading rates for single-unit retail, subdivision installations, and bulk LGU projects:

* **Entry & Residential (50W – 150W):** ₱1,000 to ₱2,000 per set
* **Commercial & Subdivision (200W – 300W):** ₱1,500 to ₱3,500 per set
* **Heavy-Duty Highway & Industrial (400W – 800W):** ₱2,500 to ₱4,500+ per set

> **Project Procurement & Bulk Wholesale:** Tiered project discounts and customized supply contracts are available for orders of 20 or more units.

All packages include complete fixture assembly, monocrystalline solar panel, built-in LiFePO4 battery pack, wireless remote controller, and mounting hardware.`,
    options: [
      { label: 'Stock Availability & Branches', next: 'BRANCHES_INFO' },
      { label: 'Contact Sales Desk', next: 'CONTACT_INFO' },
      { label: 'Open Product Matcher', url: '/match' },
      { label: 'Browse Full Catalog', url: '/browse' },
      { label: 'Main Menu', next: 'ROOT' },
    ],
  },

  BRANCHES_INFO: {
    message: `### Stock Availability & Branch Locations

JD Solar maintains inventory across two strategic hubs in Metro Manila and Southern Luzon:

#### 1. Quiapo Branch (Manila Showroom)
* **Location:** Quiapo Commercial District, Manila
* **Services:** Retail showroom, on-site live testing, immediate cash pickup, contractor consultations.
* **Operating Hours:** Monday to Saturday: 8:00 AM – 5:30 PM

#### 2. Cavite Hub (Logistics & Distribution)
* **Location:** Cavite Distribution Center
* **Services:** Bulk commercial dispatch, LGU project logistics, warranty diagnostic testing.
* **Operating Hours:** Monday to Saturday: 8:00 AM – 5:00 PM

#### Stock Status
Standard catalog models (100W–300W) are actively stocked for immediate retail and wholesale fulfillment. Heavy-duty units (400W–800W) are warehoused in Cavite for swift site dispatch.`,
    options: [
      { label: 'Contact Sales Desk', next: 'CONTACT_INFO' },
      { label: '1-Year Warranty & Service', next: 'WARRANTY_INFO' },
      { label: 'Browse Full Catalog', url: '/browse' },
      { label: 'Main Menu', next: 'ROOT' },
    ],
  },

  INSTALLATION_INFO: {
    message: `### Installation & Mounting Guidelines

Proper mounting ensures maximum illumination coverage and optimal daily battery charging:

#### Recommended Pole Heights by Wattage
* **50W – 150W:** 3 to 4 meters pole height (suitable for garden perimeters, gates, and residential alleys).
* **200W – 300W:** 4 to 6 meters pole height (suitable for subdivision streets, compound driveways, and parking areas).
* **400W – 800W:** 6 to 9 meters pole height (suitable for multi-lane thoroughfares, industrial lots, and logistics yards).

#### Mounting Best Practices
* **Solar Panel Orientation:** Face the solar panel directly South with a 10° to 15° tilt angle for consistent year-round solar absorption in the Philippines.
* **Shading Clearance:** Ensure the installation point has unobstructed sunlight between 9:00 AM and 3:00 PM without tree canopies or roof overhang shadows.
* **Hardware:** Heavy-duty clamp brackets and stainless fasteners are supplied with each fixture for secure pole or wall fastening.`,
    options: [
      { label: 'Product Specifications Guide', next: 'SPECS_INFO' },
      { label: 'Open Product Matcher', url: '/match' },
      { label: 'Contact Support Desk', next: 'CONTACT_INFO' },
      { label: 'Main Menu', next: 'ROOT' },
    ],
  },

  WARRANTY_INFO: {
    message: `### 1-Year Standard Warranty & Customer Guarantee

Every JD Solar product is supported by our direct manufacturer warranty:

* **12-Month Official Warranty:** Covers factory defects, internal controller malfunctions, solar panel degradation, and battery cell retention.
* **Weatherproof Assurance:** IP65 and IP67 certified housings designed to withstand coastal saline air, heavy typhoons, and tropical heat.
* **LiFePO4 Extended Durability:** High-grade lithium iron phosphate chemistry retains over 80% capacity after 2,000 complete charge-discharge cycles.
* **Local After-Sales Service:** Technical diagnostics, spare parts, and replacement units are serviced directly through our Quiapo and Cavite service centers.`,
    options: [
      { label: 'Stock Availability & Branches', next: 'BRANCHES_INFO' },
      { label: 'Contact Support Desk', next: 'CONTACT_INFO' },
      { label: 'Browse Full Catalog', url: '/browse' },
      { label: 'Main Menu', next: 'ROOT' },
    ],
  },

  SAVINGS_INFO: {
    message: `### Zero Electricity Cost & Financial ROI

Switching outdoor and community lighting to standalone solar fixtures eliminates recurrent grid power expenditures:

| Lighting Specification | Monthly Grid Power Cost | 1-Year Cumulative Cost | 3-Year Cumulative Cost |
|---|---|---|---|
| **150W Grid Streetlight** (12 hrs/day) | ~₱650 / fixture | ~₱7,800 | ~₱23,400 |
| **JD Solar Standalone Light** | **₱0.00** | **₱0.00** | **₱0.00** |

* **Return on Investment (ROI):** Standalone fixtures typically recover their initial capital investment in **4 to 6 months**.
* **Zero Trenching or Cabling:** No electrical permits, underground wiring, or monthly meter surcharges required.
* **Typhoon Resilient:** Autonomous operation continues uninterrupted during city-wide electrical grid brownouts.`,
    options: [
      { label: 'Pricing & Packages', next: 'PRICING_INFO' },
      { label: 'Open Product Matcher', url: '/match' },
      { label: 'Stock Availability & Branches', next: 'BRANCHES_INFO' },
      { label: 'Main Menu', next: 'ROOT' },
    ],
  },

  CONTACT_INFO: {
    message: `### Get in Touch with JD Solar

Our sales and engineering consultants are available to assist with residential purchases, subdivision lighting plans, and government / LGU tenders:

* **Showroom & Pickup:** Quiapo Commercial District, Manila
* **Logistics Distribution:** Cavite Hub
* **Hotline / Sales Desk:** 0917-XXX-XXXX
* **Email Inquiry:** support@jdforsolar.com
* **Operating Hours:** Monday to Saturday, 8:00 AM – 5:30 PM

Formal technical quotations and bill of materials (BOM) are available upon request.`,
    options: [
      { label: 'Branch Details & Hours', next: 'BRANCHES_INFO' },
      { label: 'Open Product Matcher', url: '/match' },
      { label: 'Browse Full Catalog', url: '/browse' },
      { label: 'Main Menu', next: 'ROOT' },
    ],
  },

  PRODUCT_MATCHER_INFO: {
    message: `### Product Matcher Consultation

For automated product calculations and compatibility scoring across your specific project parameters, please use our dedicated **Product Matcher**.

The Product Matcher analyzes:
1. **Target Installation Location** (Roadway, Subdivision, Residential, or Commercial Yard)
2. **Power Requirements & Mounting Height**
3. **Budget Brackets & Sensitivity Thresholds**

It produces an instant compatibility score and allows you to submit a finalized project dossier directly for fulfillment.`,
    options: [
      { label: 'Open Product Matcher', url: '/match' },
      { label: 'Browse Full Catalog', url: '/browse' },
      { label: 'Product Specifications Guide', next: 'SPECS_INFO' },
      { label: 'Pricing & Commercial Packages', next: 'PRICING_INFO' },
      { label: 'Main Menu', next: 'ROOT' },
    ],
  },
}

/**
 * Strips all emoji characters and variation selectors from a string.
 */
export function stripEmojis(str) {
  if (!str) return ''
  return str
    .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2702}-\u{27B0}\u{24C2}-\u{1F251}\u{1F900}-\u{1F9FF}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2B50}-\u{2B55}]/gu, '')
    .replace(/[\uFE00-\uFE0F\u200D]/g, '')
    .trim()
}

/**
 * Match user typed free-text to bot intent, product inquiry, or FAQ response.
 * The chatbot is dedicated to Help & FAQ assistance, while multi-criteria product
 * matching is handled separately on the Product Matcher page (/match).
 */
export function matchUserQuery(query, products = []) {
  const q = (query || '').toLowerCase().trim()
  const list = products.length > 0 ? products : FALLBACK_PRODUCTS

  // 1. Handle incoming Product Matcher Assessment Dossier (from /match page)
  if (
    q.includes('assessment dossier') ||
    q.includes('product matcher assessment') ||
    q.includes('qualified models') ||
    q.includes('sensitivity threshold')
  ) {
    return {
      message: `### Product Matcher Assessment Review

Thank you for providing your project dossier from the Product Matcher. Here is our fulfillment and technical consultation review:

* **Stock Verification:** The evaluated models are regularly stocked at our Quiapo Showroom and Cavite Distribution Hub.
* **Wholesale & Project Discounts:** For multi-unit orders (10+ sets), tiered project pricing and customized quotation terms apply.
* **Logistics & Lead Time:** Store pickup is available same-day in Manila. Bulk regional freight dispatches typically take 1 to 3 business days.
* **Mounting Hardware:** Standard clamp brackets and stainless fasteners are supplied with each luminaire.

Would you like to speak to our sales desk, confirm branch visiting hours, or review warranty guidelines?`,
      options: [
        { label: 'Contact Sales Desk', next: 'CONTACT_INFO' },
        { label: 'Branch Hours & Locations', next: 'BRANCHES_INFO' },
        { label: '1-Year Warranty & Service', next: 'WARRANTY_INFO' },
        { label: 'Browse Full Catalog', url: '/browse' },
        { label: 'Main Menu', next: 'ROOT' },
      ],
    }
  }

  // 2. Direct product inquiry by name (e.g. from ProductInfoPage or typed name)
  const matchedProduct = list.find((p) => q.includes(p.name.toLowerCase()) || p.name.toLowerCase().includes(q))
  if (matchedProduct && (q.includes('tell me more') || q.includes('about') || q.includes('fit') || q.includes('spec') || q.length > 10)) {
    const p = matchedProduct
    const text = `### Technical Overview: [${p.name}](/product/${p.id})

Here are the verified specifications for this model:

* **Power Output:** ${p.watt ? `${p.watt} Watts` : 'Standard Rating'}
* **Estimated Investment:** ₱${p.price_range || 'Inquire for pricing'}
* **Ingress Protection:** ${p.waterproof_grade || 'IP65'} Certified Weatherproof
* **Housing Material:** ${p.material || 'Aviation Aluminum Alloy'}
${p.battery ? `* **Battery Chemistry:** ${p.battery}\n` : ''}${p.solar_panel ? `* **Solar Panel:** ${p.solar_panel}\n` : ''}
**Engineering Advantage:**
Engineered for autonomous all-weather operation, automatic dusk-to-dawn radar illumination, zero grid utility cost, and covered by our 1-year replacement warranty.`

    return {
      message: text,
      options: [
        { label: 'View Product Details', url: `/product/${p.id}` },
        { label: 'Open Product Matcher', url: '/match' },
        { label: 'Pricing & Packages', next: 'PRICING_INFO' },
        { label: 'Stock & Branch Inquiries', next: 'BRANCHES_INFO' },
        { label: 'Main Menu', next: 'ROOT' },
      ],
    }
  }

  // 3. Product matcher / recommendation inquiries -> refer to the dedicated Product Matcher
  if (
    [
      'matcher',
      'match',
      'recommend',
      'recommendation',
      'suggest',
      'suggestion',
      'choose',
      'finder',
      'find light',
      'which light',
      'selection',
      'sizing',
      'best light',
    ].some((k) => q.includes(k))
  ) {
    return DECISION_TREE.PRODUCT_MATCHER_INFO
  }

  // 4. Installation & mounting keywords
  if (
    [
      'install',
      'installation',
      'mount',
      'mounting',
      'pole',
      'height',
      'bracket',
      'clamp',
      'angle',
      'tilt',
      'sunlight',
      'shade',
    ].some((k) => q.includes(k))
  ) {
    return DECISION_TREE.INSTALLATION_INFO
  }

  // 5. Specifications & technical parameters
  if (
    [
      'spec',
      'specs',
      'specification',
      'specifications',
      'lumens',
      'lumen',
      'battery',
      'lifepo4',
      'panel',
      'monocrystalline',
      'waterproof',
      'ip65',
      'ip67',
      'led',
      'controller',
      'radar',
    ].some((k) => q.includes(k))
  ) {
    return DECISION_TREE.SPECS_INFO
  }

  // 6. Branch / Location / Stock keywords
  if (
    [
      'quiapo',
      'cavite',
      'branch',
      'branches',
      'office',
      'where',
      'location',
      'address',
      'store',
      'stock',
      'stocks',
      'available',
      'inventory',
      'pickup',
      'showroom',
    ].some((k) => q.includes(k))
  ) {
    return DECISION_TREE.BRANCHES_INFO
  }

  // 7. Pricing & quote keywords
  if (
    [
      'price',
      'prices',
      'cost',
      'costs',
      'how much',
      'presyo',
      'mura',
      'quote',
      'budget',
      'pricing',
      'package',
      'packages',
      'wholesale',
      'discount',
    ].some((k) => q.includes(k))
  ) {
    return DECISION_TREE.PRICING_INFO
  }

  // 8. Electricity savings & ROI keywords
  if (
    ['save', 'savings', 'meralco', 'electric', 'electricity', 'bill', 'bills', 'kwh', 'roi', 'payback'].some((k) =>
      q.includes(k)
    )
  ) {
    return DECISION_TREE.SAVINGS_INFO
  }

  // 9. Warranty & service keywords
  if (
    [
      'warranty',
      'guarantee',
      'sira',
      'defect',
      'defects',
      'repair',
      'repairs',
      'replace',
      'replacement',
      'after sales',
      'service',
    ].some((k) => q.includes(k))
  ) {
    return DECISION_TREE.WARRANTY_INFO
  }

  // 10. Contact & sales inquiries
  if (
    ['contact', 'call', 'phone', 'email', 'talk', 'sales', 'order', 'buy', 'agent', 'hotline', 'inquire'].some((k) =>
      q.includes(k)
    )
  ) {
    return DECISION_TREE.CONTACT_INFO
  }

  // 11. Clean text / emoji inquiry
  if (['emoji', 'emojis', 'emoticon', 'emoticons'].some((k) => q.includes(k))) {
    return {
      message: `JD Solar Assistant operates strictly in text and icon format without emojis. How may I assist you with product specifications, pricing, store branches, or warranty guidelines?`,
      options: [
        { label: 'Product Specifications Guide', next: 'SPECS_INFO' },
        { label: 'Pricing & Commercial Packages', next: 'PRICING_INFO' },
        { label: 'Stock Availability & Branches', next: 'BRANCHES_INFO' },
        { label: 'Main Menu', next: 'ROOT' },
      ],
    }
  }

  // 12. Greeting / reset keywords
  if (['hi', 'hello', 'hey', 'start', 'restart', 'reset', 'menu', 'help'].some((k) => q === k || q.startsWith(k))) {
    return DECISION_TREE.ROOT
  }

  // 13. Default Help & FAQ response for unhandled queries
  return {
    message: `Thank you for your question. I am the **JD Solar Technical Assistant & FAQ Desk**.

I can answer questions regarding product specifications, pricing packages, Quiapo and Cavite branches, installation heights, and warranty terms. For automated product matching, please open our dedicated Product Matcher.

Please select an option below:`,
    options: [
      { label: 'Product Specifications Guide', next: 'SPECS_INFO' },
      { label: 'Pricing & Packages', next: 'PRICING_INFO' },
      { label: 'Stock Availability & Branches', next: 'BRANCHES_INFO' },
      { label: 'Installation & Mounting Guide', next: 'INSTALLATION_INFO' },
      { label: 'Open Product Matcher', url: '/match' },
      { label: 'Browse Full Catalog', url: '/browse' },
    ],
  }
}

/**
 * Splits markdown and prose text into natural sentence, header, and list segments
 * for simulating an LLM streaming response.
 */
export function splitIntoSentenceSegments(text) {
  if (!text) return []

  const paragraphs = text.split(/\n{2,}/)
  const segments = []

  for (let pIdx = 0; pIdx < paragraphs.length; pIdx++) {
    const para = paragraphs[pIdx]
    const isLastPara = pIdx === paragraphs.length - 1
    const paraSuffix = isLastPara ? '' : '\n\n'

    // If paragraph contains a markdown table, keep whole table intact
    if (para.includes('|---|') || (para.trim().startsWith('|') && para.includes('\n|'))) {
      segments.push(para + paraSuffix)
      continue
    }

    const lines = para.split('\n')
    for (let lIdx = 0; lIdx < lines.length; lIdx++) {
      const line = lines[lIdx]
      const isLastLineInPara = lIdx === lines.length - 1
      const lineSuffix = isLastLineInPara ? paraSuffix : '\n'

      const trimmed = line.trim()
      // If line is a markdown heading, bullet list item, numbered list item, or table row, keep whole line intact
      if (
        trimmed.startsWith('#') ||
        trimmed.startsWith('*') ||
        trimmed.startsWith('-') ||
        trimmed.startsWith('|') ||
        /^\d+\./.test(trimmed)
      ) {
        segments.push(line + lineSuffix)
        continue
      }

      // Match sentence endings (.?! followed by whitespace or line end), avoiding split on decimal numbers like 6.5m or ₱2.5k
      const sentenceRegex = /.*?(?:[.?!](?=\s|$)|$)/g
      const matches = line.match(sentenceRegex)?.filter(Boolean) || [line]
      for (let sIdx = 0; sIdx < matches.length; sIdx++) {
        const sentence = matches[sIdx]
        const isLastSentenceInLine = sIdx === matches.length - 1
        segments.push(sentence + (isLastSentenceInLine ? lineSuffix : ''))
      }
    }
  }

  return segments.filter((s) => s.length > 0)
}
