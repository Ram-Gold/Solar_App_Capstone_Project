// frontend/src/lib/solarBotEngine.js
// Client-side decision-tree engine for JD Solar Assistant
import { matchSolarProducts } from './multiCriteriaMatcher'

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
    message: `**Welcome to JD Solar Assistant!**

How can I help power your lighting project today? Please select an option below:`,
    options: [
      { label: 'Open Multi-Criteria Matcher', url: '/match' },
      { label: 'Find the Right Solar Light', next: 'FIND_LOCATION' },
      { label: 'Pricing & Packages', next: 'PRICING_INFO' },
      { label: 'Quiapo & Cavite Branches', next: 'BRANCHES_INFO' },
      { label: '1-Year Warranty & Service', next: 'WARRANTY_INFO' },
      { label: 'Browse Full Catalog', url: '/browse' },
    ],
  },

  FIND_LOCATION: {
    message: `### Step 1 of 3: Installation Area
Where do you plan to install the solar lighting?`,
    options: [
      { label: 'Main Roads & Thoroughfares', next: 'FIND_POWER_ROAD', filter: { location: 'road' } },
      { label: 'Subdivisions, Alleys & Compounds', next: 'FIND_POWER_STREET', filter: { location: 'street' } },
      { label: 'Home, Gate, Garden & Perimeter', next: 'FIND_POWER_HOME', filter: { location: 'home' } },
      { label: 'Commercial Lot, Warehouse & Parking', next: 'FIND_POWER_COMMERCIAL', filter: { location: 'commercial' } },
      { label: 'Back to Main Menu', next: 'ROOT' },
    ],
  },

  FIND_POWER_ROAD: {
    message: `### Step 2 of 3: Light Output for Road
Roadways typically require high lumen output and wide beam angles (pole heights 6m–9m). What power level do you prefer?`,
    options: [
      { label: '300W – 400W (Medium Road / 5-7m pole)', next: 'FIND_BUDGET', filter: { powerNeeds: 350, minWatt: 300, maxWatt: 400, type: 'Road' } },
      { label: '500W – 600W (Heavy Duty / 7-9m pole)', next: 'FIND_BUDGET', filter: { powerNeeds: 550, minWatt: 500, maxWatt: 800, type: 'Road' } },
      { label: 'Show All Road Lights', next: 'FIND_BUDGET', filter: { powerNeeds: 400, type: 'Road' } },
      { label: 'Change Installation Area', next: 'FIND_LOCATION' },
    ],
  },

  FIND_POWER_STREET: {
    message: `### Step 2 of 3: Light Output for Subdivision / Street
For neighborhood streets, alleys, and community pathways, which power level suits your project?`,
    options: [
      { label: '100W – 150W (Standard alleys & inner paths)', next: 'FIND_BUDGET', filter: { powerNeeds: 150, minWatt: 100, maxWatt: 150, type: 'Street' } },
      { label: '200W – 300W (Subdivision main roads & intersections)', next: 'FIND_BUDGET', filter: { powerNeeds: 250, minWatt: 200, maxWatt: 300, type: 'Street' } },
      { label: 'Show All Street Lights', next: 'FIND_BUDGET', filter: { powerNeeds: 250, type: 'Street' } },
      { label: 'Change Installation Area', next: 'FIND_LOCATION' },
    ],
  },

  FIND_POWER_HOME: {
    message: `### Step 2 of 3: Residential Solar Lighting
What area around your home or property are you lighting?`,
    options: [
      { label: 'Gate & Front Entrance (50W – 150W)', next: 'FIND_BUDGET', filter: { powerNeeds: 100, minWatt: 50, maxWatt: 150, type: 'Residential' } },
      { label: 'Perimeter Fence & Wide Garden (200W – 350W)', next: 'FIND_BUDGET', filter: { powerNeeds: 250, minWatt: 200, maxWatt: 350, type: 'Residential' } },
      { label: 'Show All Residential Outdoor Lights', next: 'FIND_BUDGET', filter: { powerNeeds: 150, type: 'Residential' } },
      { label: 'Change Installation Area', next: 'FIND_LOCATION' },
    ],
  },

  FIND_POWER_COMMERCIAL: {
    message: `### Step 2 of 3: Commercial & Facility Lighting
What is the lighting requirement for your facility?`,
    options: [
      { label: 'Parking Lots & Walkways (200W – 300W)', next: 'FIND_BUDGET', filter: { powerNeeds: 250, minWatt: 200, maxWatt: 300, type: 'Commercial' } },
      { label: 'Heavy-Duty Yards & Warehouses (400W – 800W)', next: 'FIND_BUDGET', filter: { powerNeeds: 500, minWatt: 400, maxWatt: 800, type: 'Commercial' } },
      { label: 'Show All Commercial Grade Lights', next: 'FIND_BUDGET', filter: { powerNeeds: 400, type: 'Commercial' } },
      { label: 'Change Installation Area', next: 'FIND_LOCATION' },
    ],
  },

  FIND_BUDGET: {
    message: `### Step 3 of 3: Budget Range
What is your target budget per unit?`,
    options: [
      { label: '₱1,000 – ₱2,000 (Economy / Best Value)', next: 'GENERATE_RESULTS', filter: { budget: 2000 } },
      { label: '₱2,000 – ₱3,500 (Standard Quality)', next: 'GENERATE_RESULTS', filter: { budget: 3500 } },
      { label: '₱3,500+ (Heavy Duty / Industrial)', next: 'GENERATE_RESULTS', filter: { budget: 5000 } },
      { label: 'Any Budget (Show Best Matches)', next: 'GENERATE_RESULTS', filter: { budget: 'any' } },
      { label: 'Back to Step 2', next: 'FIND_LOCATION' },
    ],
  },

  PRICING_INFO: {
    message: `### JD Solar Pricing Overview

Our solar lighting packages offer premium commercial-grade hardware at direct trading rates:

* **Entry & Residential (50W – 150W):** ₱1,000 to ₱2,000 per set
* **Commercial & Subdivision (200W – 300W):** ₱1,500 to ₱3,500 per set
* **Heavy-Duty Highway (400W – 800W):** ₱2,500 to ₱4,500+ per set

> **LGU & Bulk Wholesale:** Special project discounts and terms are available for orders of 20+ units.

All packages include **Aviation-grade aluminum body**, **Monocrystalline solar panel**, and **LiFePO4 Lithium battery**.`,
    options: [
      { label: 'Find Light Within My Budget', next: 'FIND_LOCATION' },
      { label: 'Browse All Products', url: '/browse' },
      { label: 'Contact Quiapo / Cavite Branch', next: 'BRANCHES_INFO' },
      { label: 'Main Menu', next: 'ROOT' },
    ],
  },

  SAVINGS_INFO: {
    message: `### Zero Electricity Cost with JD Solar

Switching conventional outdoor lighting to solar lights yields immediate savings:

| Lighting Type | Monthly Meralco Cost | 1-Year Cost | 3-Year Cost |
|---|---|---|---|
| **150W Grid Streetlight** (12 hrs/day) | ~₱650 / unit | ~₱7,800 | ~₱23,400 |
| **JD Solar Street Light** | **₱0.00** | **₱0.00** | **₱0.00** |

* **ROI Timeline:** A typical JD Solar unit pays for itself in less than **4 to 6 months**!
* **Dusk-to-Dawn Radar Sensor:** Lights charge 6–8 hrs in sunlight and provide 10–12+ hrs of continuous night illumination.
* **Typhoon & Weather Ready:** IP65 / IP67 certified waterproof construction.`,
    options: [
      { label: 'Help Me Choose a Light', next: 'FIND_LOCATION' },
      { label: 'Check Price Ranges', next: 'PRICING_INFO' },
      { label: 'Main Menu', next: 'ROOT' },
    ],
  },

  BRANCHES_INFO: {
    message: `### JD Solar Branch Locations & Store Hours

We operate two key hubs for store pickup, testing, and wholesale consultations:

#### 1. Quiapo Branch (Manila)
* **Location:** Quiapo Commercial District, Manila
* **Services:** Retail showroom, on-site testing, cash pickup, wholesale ordering.
* **Hours:** Monday to Saturday: 8:00 AM – 5:30 PM

#### 2. Cavite Hub
* **Location:** Cavite Distribution Hub
* **Services:** LGU project deliveries, bulk distribution, logistics dispatch.
* **Hours:** Monday to Saturday: 8:00 AM – 5:00 PM

Feel free to walk in or request a quote online!`,
    options: [
      { label: 'Speak to Sales / Contact', next: 'CONTACT_INFO' },
      { label: 'Find Solar Lights', next: 'FIND_LOCATION' },
      { label: 'View Product Catalog', url: '/browse' },
      { label: 'Main Menu', next: 'ROOT' },
    ],
  },

  WARRANTY_INFO: {
    message: `### 1-Year Standard Warranty & Customer Guarantee

Every JD Solar product is backed by our customer satisfaction commitment:

* **12-Month Official Warranty:** Covers manufacturing defects, battery cell failures, and panel efficiency.
* **IP65 / IP67 Weatherproof Construction:** Die-cast and aviation aluminum built to withstand heavy rains, typhoons, and coastal air.
* **LiFePO4 Long-Life Batteries:** Rated for over 2,000 charge cycles (3–5+ years operating life).
* **Replacement Support:** Direct technical diagnosis and parts replacement handled at our Quiapo and Cavite branches.`,
    options: [
      { label: 'Browse Guaranteed Models', url: '/browse' },
      { label: 'Visit Branch for Service', next: 'BRANCHES_INFO' },
      { label: 'Main Menu', next: 'ROOT' },
    ],
  },

  CONTACT_INFO: {
    message: `### Get in Touch with JD Solar

We are ready to assist you with single-unit orders, community street lighting, or government / LGU procurement:

* **Branches:** Quiapo, Manila & Cavite Hub
* **Phone / Hotline:** Contact our sales desk at **0917-XXX-XXXX**
* **Email:** support@jdforsolar.com
* **Walk-in Hours:** Mon–Sat, 8:00 AM to 5:00 PM

You can also browse our online inventory and submit a quote directly!`,
    options: [
      { label: 'Browse Online Catalog', url: '/browse' },
      { label: 'Start Product Recommendation', next: 'FIND_LOCATION' },
      { label: 'Main Menu', next: 'ROOT' },
    ],
  },
}

/**
 * Filter products from catalog based on decision tree criteria
 */
export function filterProducts(products, criteria = {}) {
  const list = products && products.length > 0 ? products : FALLBACK_PRODUCTS

  return list.filter((p) => {
    // Filter by type or location
    if (criteria.type === 'Road' && !p.name.includes('Road') && !p.type?.includes('Road')) {
      return false
    }
    if (criteria.type === 'Street' && !p.name.includes('Street') && !p.type?.includes('Street')) {
      return false
    }
    if (criteria.type === 'Residential' && p.watt > 400) {
      return false
    }

    // Filter by wattage
    if (criteria.minWatt && p.watt < criteria.minWatt) return false
    if (criteria.maxWatt && p.watt > criteria.maxWatt) return false

    // Filter by budget
    if (criteria.budget && criteria.budget !== 'any') {
      if (!p.price_range?.includes(criteria.budget) && !p.price_range?.includes(criteria.budget.replace('-', ''))) {
        // Soft match: if strictly filtering leaves nothing, keep close matches
      }
    }

    return true
  })
}

/**
 * Generate recommendation message text and cards using Multi-Criteria Decision Analysis
 */
export function generateRecommendations(products, criteria = {}) {
  const result = matchSolarProducts(products, criteria, { threshold: 0.65, limit: 4 })
  const { matches, thresholdUsed, thresholdRelaxed } = result

  let text = `### Multi-Criteria Product Recommendations\n\n`
  if (thresholdRelaxed) {
    text += `*Note: Evaluated against your Budget, Location, and Power Needs. Showing top compatible candidates closest to your target threshold:*\n\n`
  } else {
    text += `Evaluated against your requirements (**Budget, Location, and Power Needs**) with a **${Math.round(thresholdUsed * 100)}% compatibility threshold**:\n\n`
  }

  matches.forEach((item, index) => {
    const p = item.product
    text += `#### ${index + 1}. [${p.name}](/product/${p.id}) — **${item.matchPercentage}% Match**\n`
    text += `* **Match Assessment:** ${item.explanation}\n`
    text += `* **Power Output:** ${p.watt ? `${p.watt}W` : 'Standard'} (Power Fit: ${item.breakdown.powerScore}%)\n`
    text += `* **Price Range:** ₱${p.price_range || 'Inquire for pricing'} (Budget Fit: ${item.breakdown.budgetScore}%)\n`
    text += `* **Location Suitability:** Score: ${item.breakdown.locationScore}%\n`
    text += `* **Waterproof Rating:** ${p.waterproof_grade || 'IP65'} Certified\n`
    if (p.battery) text += `* **Battery Chemistry:** ${p.battery}\n`
    text += `[View Full Product Specifications](/product/${p.id})\n\n`
  })

  text += `Need to explore more or compare models? Click below:`

  const options = [
    { label: 'Browse All Solar Lights', url: '/browse' },
    { label: 'Adjust Multi-Criteria Requirements', next: 'FIND_LOCATION' },
    { label: 'Visit a Branch', next: 'BRANCHES_INFO' },
    { label: 'Main Menu', next: 'ROOT' },
  ]

  return { message: text, options, matches: matches.map((m) => m.product) }
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
 * Match user typed free-text to bot intent or product inquiry
 */
export function matchUserQuery(query, products = []) {
  const q = (query || '').toLowerCase().trim()
  const list = products.length > 0 ? products : FALLBACK_PRODUCTS

  // Multi-criteria natural language extraction (Budget, Location, Power Needs)
  const numBudgetMatch = q.match(/(?:budget|presyo|price|under|below|max)?\s*(?:₱|php)?\s*(\d{3,5})\s*(?:php|pesos)?/i)
  const numWattMatch = q.match(/(\d{2,4})\s*w(?:att|atts)?/i)
  const hasRoad = ['road', 'highway', 'daan'].some((w) => q.includes(w))
  const hasStreet = ['street', 'subdivision', 'alley', 'eskinita'].some((w) => q.includes(w))
  const hasHome = ['home', 'bahay', 'gate', 'garden', 'backyard', 'perimeter'].some((w) => q.includes(w))
  const hasCommercial = ['commercial', 'warehouse', 'parking', 'lot'].some((w) => q.includes(w))

  const detectedCriteria = {}
  if (numBudgetMatch && parseInt(numBudgetMatch[1], 10) >= 500) {
    detectedCriteria.budget = parseInt(numBudgetMatch[1], 10)
  }
  if (numWattMatch) {
    detectedCriteria.powerNeeds = parseInt(numWattMatch[1], 10)
  }
  if (hasRoad) detectedCriteria.location = 'road'
  else if (hasStreet) detectedCriteria.location = 'street'
  else if (hasHome) detectedCriteria.location = 'home'
  else if (hasCommercial) detectedCriteria.location = 'commercial'

  const criteriaCount = (detectedCriteria.budget ? 1 : 0) + (detectedCriteria.powerNeeds ? 1 : 0) + (detectedCriteria.location ? 1 : 0)
  if (criteriaCount >= 2) {
    return generateRecommendations(list, detectedCriteria)
  }

  // Check if user is asking about a specific product (e.g. from ProductInfoPage)
  const matchedProduct = list.find((p) => q.includes(p.name.toLowerCase()) || p.name.toLowerCase().includes(q))
  if (matchedProduct && (q.includes('tell me more') || q.includes('about') || q.includes('fit') || q.length > 10)) {
    const p = matchedProduct
    const text = `### About the [${p.name}](/product/${p.id})

Here is what you need to know about this model:

* **Power Output:** ${p.watt ? `${p.watt} Watts` : 'Standard'}\n` +
      `* **Estimated Price:** ₱${p.price_range || 'Inquire for price'}\n` +
      `* **Waterproof Rating:** ${p.waterproof_grade || 'IP65'} (All-weather typhoon resistant)\n` +
      `* **Housing:** ${p.material || 'Aviation Aluminum Alloy'}\n` +
      (p.battery ? `* **Battery:** ${p.battery}\n` : '') +
      (p.solar_panel ? `* **Solar Panel:** ${p.solar_panel}\n` : '') +
      `\n**Why choose this model?**
Zero electricity costs, automatic dusk-to-dawn operation, and guaranteed 1-year replacement warranty.`

    return {
      message: text,
      options: [
        { label: 'View Product Page', url: `/product/${p.id}` },
        { label: 'Find Other Models', next: 'FIND_LOCATION' },
        { label: 'Branch Inquiries', next: 'BRANCHES_INFO' },
        { label: 'Main Menu', next: 'ROOT' },
      ],
    }
  }

  // Emoji inquiry handling
  if (['emoji', 'emojis', 'emoticon', 'emoticons'].some((k) => q.includes(k))) {
    return {
      message: `JD Solar Assistant operates in a clean, text-only mode without emojis. I can guide you step-by-step to the right solar lighting products, provide pricing packages, or share branch details. How can I assist you?`,
      options: [
        { label: 'Find the Right Solar Light', next: 'FIND_LOCATION' },
        { label: 'Pricing & Packages', next: 'PRICING_INFO' },
        { label: 'Quiapo & Cavite Branches', next: 'BRANCHES_INFO' },
        { label: 'Main Menu', next: 'ROOT' },
      ],
    }
  }

  // Branch / Location keywords
  if (['quiapo', 'cavite', 'branch', 'office', 'where', 'location', 'address', 'store'].some((k) => q.includes(k))) {
    return DECISION_TREE.BRANCHES_INFO
  }

  // Pricing keywords
  if (['price', 'cost', 'how much', 'presyo', 'mura', 'quote', 'budget', 'pricing'].some((k) => q.includes(k))) {
    return DECISION_TREE.PRICING_INFO
  }

  // Savings / Meralco keywords
  if (['save', 'savings', 'meralco', 'electric', 'bill', 'kwh', 'roi'].some((k) => q.includes(k))) {
    return DECISION_TREE.SAVINGS_INFO
  }

  // Warranty keywords
  if (['warranty', 'guarantee', 'sira', 'defect', 'repair', 'replace', 'after sales'].some((k) => q.includes(k))) {
    return DECISION_TREE.WARRANTY_INFO
  }

  // Contact / Sales keywords
  if (['contact', 'call', 'phone', 'email', 'talk', 'sales', 'order', 'buy', 'agent'].some((k) => q.includes(k))) {
    return DECISION_TREE.CONTACT_INFO
  }

  // Product finder keywords
  if (['recommend', 'find', 'suggest', 'help', 'light', 'street', 'road', 'search', 'choose'].some((k) => q.includes(k))) {
    return DECISION_TREE.FIND_LOCATION
  }

  // Greeting / Reset
  if (['hi', 'hello', 'hey', 'start', 'restart', 'reset', 'menu'].some((k) => q === k || q.startsWith(k))) {
    return DECISION_TREE.ROOT
  }

  // Default response for unhandled queries
  return {
    message: `Thank you for asking! I'm the **JD Solar Assistant** bot.

I can guide you step-by-step to the best solar light for your project, show pricing and equipment packages, or help you locate our Quiapo and Cavite branches.

Please pick an option below to proceed:`,
    options: [
      { label: 'Find the Right Solar Light', next: 'FIND_LOCATION' },
      { label: 'View Pricing & Packages', next: 'PRICING_INFO' },
      { label: 'Branch Locations', next: 'BRANCHES_INFO' },
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

    // If paragraph contains a markdown table (e.g. contains |---| or multiple table rows), keep whole table intact
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
