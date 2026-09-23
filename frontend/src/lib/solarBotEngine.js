// frontend/src/lib/solarBotEngine.js
// Client-side decision-tree engine for JD Solar Assistant

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
    message: `👋 **Welcome to JD Solar Assistant!**

How can I help power your lighting project today? Please select an option below:`,
    options: [
      { label: '🔍 Find the Right Solar Light', next: 'FIND_LOCATION' },
      { label: '💰 Pricing & Packages', next: 'PRICING_INFO' },
      { label: '⚡ Calculate Electricity Savings', next: 'SAVINGS_INFO' },
      { label: '📍 Quiapo & Cavite Branches', next: 'BRANCHES_INFO' },
      { label: '🛡️ 1-Year Warranty & Service', next: 'WARRANTY_INFO' },
      { label: '📦 Browse Full Catalog', url: '/browse' },
    ],
  },

  FIND_LOCATION: {
    message: `### 🧭 Step 1 of 3: Installation Area
Where do you plan to install the solar lighting?`,
    options: [
      { label: '🛣️ Main Roads & Thoroughfares', next: 'FIND_POWER_ROAD', filter: { location: 'road' } },
      { label: '🏘️ Subdivisions, Alleys & Compounds', next: 'FIND_POWER_STREET', filter: { location: 'street' } },
      { label: '🏡 Home, Gate, Garden & Perimeter', next: 'FIND_POWER_HOME', filter: { location: 'home' } },
      { label: '🏢 Commercial Lot, Warehouse & Parking', next: 'FIND_POWER_COMMERCIAL', filter: { location: 'commercial' } },
      { label: '🔙 Back to Main Menu', next: 'ROOT' },
    ],
  },

  FIND_POWER_ROAD: {
    message: `### 💡 Step 2 of 3: Light Output for Road
Roadways typically require high lumen output and wide beam angles (pole heights 6m–9m). What power level do you prefer?`,
    options: [
      { label: '⚡ 300W – 400W (Medium Road / 5-7m pole)', next: 'FIND_BUDGET', filter: { minWatt: 300, maxWatt: 400, type: 'Road' } },
      { label: '🚀 500W – 600W (Heavy Duty / 7-9m pole)', next: 'FIND_BUDGET', filter: { minWatt: 500, maxWatt: 800, type: 'Road' } },
      { label: '🎯 Show All Road Lights', next: 'FIND_BUDGET', filter: { type: 'Road' } },
      { label: '🔙 Change Installation Area', next: 'FIND_LOCATION' },
    ],
  },

  FIND_POWER_STREET: {
    message: `### 💡 Step 2 of 3: Light Output for Subdivision / Street
For neighborhood streets, alleys, and community pathways, which power level suits your project?`,
    options: [
      { label: '💡 100W – 150W (Standard alleys & inner paths)', next: 'FIND_BUDGET', filter: { minWatt: 100, maxWatt: 150, type: 'Street' } },
      { label: '⚡ 200W – 300W (Subdivision main roads & intersections)', next: 'FIND_BUDGET', filter: { minWatt: 200, maxWatt: 300, type: 'Street' } },
      { label: '🎯 Show All Street Lights', next: 'FIND_BUDGET', filter: { type: 'Street' } },
      { label: '🔙 Change Installation Area', next: 'FIND_LOCATION' },
    ],
  },

  FIND_POWER_HOME: {
    message: `### 💡 Step 2 of 3: Residential Solar Lighting
What area around your home or property are you lighting?`,
    options: [
      { label: '💡 Gate & Front Entrance (50W – 150W)', next: 'FIND_BUDGET', filter: { minWatt: 50, maxWatt: 150, type: 'Residential' } },
      { label: '⚡ Perimeter Fence & Wide Garden (200W – 350W)', next: 'FIND_BUDGET', filter: { minWatt: 200, maxWatt: 350, type: 'Residential' } },
      { label: '🎯 Show All Residential Outdoor Lights', next: 'FIND_BUDGET', filter: { type: 'Residential' } },
      { label: '🔙 Change Installation Area', next: 'FIND_LOCATION' },
    ],
  },

  FIND_POWER_COMMERCIAL: {
    message: `### 💡 Step 2 of 3: Commercial & Facility Lighting
What is the lighting requirement for your facility?`,
    options: [
      { label: '⚡ Parking Lots & Walkways (200W – 300W)', next: 'FIND_BUDGET', filter: { minWatt: 200, maxWatt: 300, type: 'Commercial' } },
      { label: '🚀 Heavy-Duty Yards & Warehouses (400W – 800W)', next: 'FIND_BUDGET', filter: { minWatt: 400, maxWatt: 800, type: 'Commercial' } },
      { label: '🎯 Show All Commercial Grade Lights', next: 'FIND_BUDGET', filter: { type: 'Commercial' } },
      { label: '🔙 Change Installation Area', next: 'FIND_LOCATION' },
    ],
  },

  FIND_BUDGET: {
    message: `### 🏷️ Step 3 of 3: Budget Range
What is your target budget per unit?`,
    options: [
      { label: '🏷️ ₱1,000 – ₱2,000 (Economy / Best Value)', next: 'GENERATE_RESULTS', filter: { budget: '1000-2000' } },
      { label: '💎 ₱2,000 – ₱3,500 (Standard Quality)', next: 'GENERATE_RESULTS', filter: { budget: '2500-3500' } },
      { label: '👑 ₱3,500+ (Heavy Duty / Industrial)', next: 'GENERATE_RESULTS', filter: { budget: '3000+' } },
      { label: '✨ Any Budget (Show Best Matches)', next: 'GENERATE_RESULTS', filter: { budget: 'any' } },
      { label: '🔙 Back to Step 2', next: 'FIND_LOCATION' },
    ],
  },

  PRICING_INFO: {
    message: `### 💰 JD Solar Pricing Overview

Our solar lighting packages offer premium commercial-grade hardware at direct trading rates:

* **Entry & Residential (50W – 150W):** ₱1,000 to ₱2,000 per set
* **Commercial & Subdivision (200W – 300W):** ₱1,500 to ₱3,500 per set
* **Heavy-Duty Highway (400W – 800W):** ₱2,500 to ₱4,500+ per set

> **LGU & Bulk Wholesale:** Special project discounts and terms are available for orders of 20+ units.

All packages include **Aviation-grade aluminum body**, **Monocrystalline solar panel**, and **LiFePO4 Lithium battery**.`,
    options: [
      { label: '🔍 Find Light Within My Budget', next: 'FIND_LOCATION' },
      { label: '📦 Browse All Products', url: '/browse' },
      { label: '📍 Contact Quiapo / Cavite Branch', next: 'BRANCHES_INFO' },
      { label: '🏠 Main Menu', next: 'ROOT' },
    ],
  },

  SAVINGS_INFO: {
    message: `### ⚡ Zero Electricity Cost with JD Solar

Switching conventional outdoor lighting to solar lights yields immediate savings:

| Lighting Type | Monthly Meralco Cost | 1-Year Cost | 3-Year Cost |
|---|---|---|---|
| **150W Grid Streetlight** (12 hrs/day) | ~₱650 / unit | ~₱7,800 | ~₱23,400 |
| **JD Solar Street Light** | **₱0.00** | **₱0.00** | **₱0.00** |

* **ROI Timeline:** A typical JD Solar unit pays for itself in less than **4 to 6 months**!
* **Dusk-to-Dawn Radar Sensor:** Lights charge 6–8 hrs in sunlight and provide 10–12+ hrs of continuous night illumination.
* **Typhoon & Weather Ready:** IP65 / IP67 certified waterproof construction.`,
    options: [
      { label: '🔍 Help Me Choose a Light', next: 'FIND_LOCATION' },
      { label: '💰 Check Price Ranges', next: 'PRICING_INFO' },
      { label: '🏠 Main Menu', next: 'ROOT' },
    ],
  },

  BRANCHES_INFO: {
    message: `### 📍 JD Solar Branch Locations & Store Hours

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
      { label: '📞 Speak to Sales / Contact', next: 'CONTACT_INFO' },
      { label: '🔍 Find Solar Lights', next: 'FIND_LOCATION' },
      { label: '📦 View Product Catalog', url: '/browse' },
      { label: '🏠 Main Menu', next: 'ROOT' },
    ],
  },

  WARRANTY_INFO: {
    message: `### 🛡️ 1-Year Standard Warranty & Customer Guarantee

Every JD Solar product is backed by our customer satisfaction commitment:

* **12-Month Official Warranty:** Covers manufacturing defects, battery cell failures, and panel efficiency.
* **IP65 / IP67 Weatherproof Construction:** Die-cast and aviation aluminum built to withstand heavy rains, typhoons, and coastal air.
* **LiFePO4 Long-Life Batteries:** Rated for over 2,000 charge cycles (3–5+ years operating life).
* **Replacement Support:** Direct technical diagnosis and parts replacement handled at our Quiapo and Cavite branches.`,
    options: [
      { label: '🔍 Browse Guaranteed Models', url: '/browse' },
      { label: '📍 Visit Branch for Service', next: 'BRANCHES_INFO' },
      { label: '🏠 Main Menu', next: 'ROOT' },
    ],
  },

  CONTACT_INFO: {
    message: `### 📞 Get in Touch with JD Solar

We are ready to assist you with single-unit orders, community street lighting, or government / LGU procurement:

* **Branches:** Quiapo, Manila & Cavite Hub
* **Phone / Hotline:** Contact our sales desk at **0917-XXX-XXXX**
* **Email:** support@jdforsolar.com
* **Walk-in Hours:** Mon–Sat, 8:00 AM to 5:00 PM

You can also browse our online inventory and submit a quote directly!`,
    options: [
      { label: '📦 Browse Online Catalog', url: '/browse' },
      { label: '🔍 Start Product Recommendation', next: 'FIND_LOCATION' },
      { label: '🏠 Main Menu', next: 'ROOT' },
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
 * Generate recommendation message text and cards
 */
export function generateRecommendations(products, criteria = {}) {
  let matches = filterProducts(products, criteria)

  if (matches.length === 0) {
    // Fallback to top products in general
    matches = (products && products.length > 0 ? products : FALLBACK_PRODUCTS).slice(0, 3)
  } else {
    matches = matches.slice(0, 4)
  }

  let text = `### 🌟 Recommended Solar Lights for Your Project\n\n`
  text += `Based on your selection, here are top-rated JD Solar models that match your requirements:\n\n`

  matches.forEach((p, index) => {
    text += `#### ${index + 1}. [${p.name}](/product/${p.id})\n`
    text += `* **Power:** ${p.watt ? `${p.watt}W` : 'High Output'}\n`
    text += `* **Price Range:** ₱${p.price_range || 'Inquire for pricing'}\n`
    text += `* **Protection:** ${p.waterproof_grade || 'IP65'} Waterproof\n`
    if (p.battery) text += `* **Battery:** ${p.battery}\n`
    text += `👉 [View Full Product Specifications](/product/${p.id})\n\n`
  })

  text += `Need to explore more or compare models? Click below:`

  const options = [
    { label: '📦 Browse All Solar Lights', url: '/browse' },
    { label: '🔄 Find Another Light', next: 'FIND_LOCATION' },
    { label: '📍 Visit a Branch', next: 'BRANCHES_INFO' },
    { label: '🏠 Main Menu', next: 'ROOT' },
  ]

  return { message: text, options, matches }
}

/**
 * Match user typed free-text to bot intent or product inquiry
 */
export function matchUserQuery(query, products = []) {
  const q = (query || '').toLowerCase().trim()
  const list = products.length > 0 ? products : FALLBACK_PRODUCTS

  // Check if user is asking about a specific product (e.g. from ProductInfoPage)
  const matchedProduct = list.find((p) => q.includes(p.name.toLowerCase()) || p.name.toLowerCase().includes(q))
  if (matchedProduct && (q.includes('tell me more') || q.includes('about') || q.includes('fit') || q.length > 10)) {
    const p = matchedProduct
    const text = `### ☀️ About the [${p.name}](/product/${p.id})

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
        { label: `👉 View Product Page`, url: `/product/${p.id}` },
        { label: '🔍 Find Other Models', next: 'FIND_LOCATION' },
        { label: '📍 Branch Inquiries', next: 'BRANCHES_INFO' },
        { label: '🏠 Main Menu', next: 'ROOT' },
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

I can guide you step-by-step to the best solar light for your project, show pricing and savings estimates, or help you locate our Quiapo and Cavite branches.

Please pick an option below to proceed:`,
    options: [
      { label: '🔍 Find the Right Solar Light', next: 'FIND_LOCATION' },
      { label: '💰 View Pricing & Packages', next: 'PRICING_INFO' },
      { label: '⚡ Calculate Savings', next: 'SAVINGS_INFO' },
      { label: '📍 Branch Locations', next: 'BRANCHES_INFO' },
      { label: '📦 Browse Full Catalog', url: '/browse' },
    ],
  }
}
