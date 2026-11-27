// Plain-language options and price helpers for the Product Matcher.
// No technical jargon, no em dashes, no emojis.

export const LOCATIONS = [
  {
    id: 'road',
    label: 'Main road or highway',
    shortLabel: 'Main road',
    desc: 'Tall poles along wide roads and highways (6m to 9m high).',
    basis: 'Tall poles, wide road coverage',
    recommendedWatt: 500,
    bracket: 'Pole mount',
  },
  {
    id: 'street',
    label: 'Street or subdivision',
    shortLabel: 'Street',
    desc: 'Neighborhood streets, barangay roads, and alleys (4m to 6m high).',
    basis: 'Medium poles, street coverage',
    recommendedWatt: 300,
    bracket: 'Pole mount',
  },
  {
    id: 'home',
    label: 'Home, gate, or yard',
    shortLabel: 'Home / yard',
    desc: 'Gates, fences, driveways, and pathways (3m to 4m high).',
    basis: 'Low height, close-range light',
    recommendedWatt: 150,
    bracket: 'Wall or gate',
  },
  {
    id: 'commercial',
    label: 'Parking lot or open yard',
    shortLabel: 'Open yard',
    desc: 'Wide areas like parking lots, courts, and compounds.',
    basis: 'Wide area coverage',
    recommendedWatt: 400,
    bracket: 'Pole or wall',
  },
]

export const FORM_FACTORS = [
  {
    id: 'any',
    label: 'Show both',
    shortLabel: 'Either',
    sunPrompt: 'Not sure yet',
    desc: 'Compare both one-piece and separate-panel lights.',
  },
  {
    id: 'integrated',
    label: 'All-in-One',
    shortLabel: 'All-in-One',
    sunPrompt: 'Full sun directly above the light',
    desc: 'Panel and light are in one piece. Easy to install with no extra wires.',
  },
  {
    id: 'split',
    label: 'Split-Type',
    shortLabel: 'Split-Type',
    sunPrompt: 'Under a roof, trees, or shade',
    desc: 'Solar panel sits outside in the sun with a cable to the light.',
  },
]

export const MOUNTING_OPTIONS = [
  {
    id: 'any',
    label: 'Either',
    shortLabel: 'Either',
    desc: 'Show lights for poles, walls, and gates.',
  },
  {
    id: 'pole',
    label: 'On a pole',
    shortLabel: 'With pole',
    desc: 'For street poles, posts, or new pole setups.',
  },
  {
    id: 'wall',
    label: 'On a wall or gate',
    shortLabel: 'Wall / gate',
    desc: 'No pole needed. Mounts on a wall, fence, roof edge, or gate.',
  },
]

export const POWER_PRESETS = [100, 150, 200, 300, 400, 500, 600, 800, 1000]
export const QUANTITY_PRESETS = [1, 5, 10, 20, 50]

export const BUDGET_PRESETS = [
  { label: '₱1,500', value: 1500 },
  { label: '₱2,500', value: 2500 },
  { label: '₱3,500', value: 3500 },
  { label: '₱5,000', value: 5000 },
  { label: 'Any', value: 'any' },
]

export function formatPeso(amount) {
  const num = Number(amount)
  if (isNaN(num) || num <= 0) return 'Ask for price'
  return `₱${Math.round(num).toLocaleString()}`
}

export function formatPriceRange(raw) {
  if (!raw) return 'Ask for price'
  const str = String(raw).trim()
  const cleaned = str.replace(/₱/g, '').trim()
  if (cleaned.includes('-')) {
    const parts = cleaned.split('-').map((s) => s.trim())
    const min = Number(parts[0]?.replace(/[^0-9]/g, ''))
    const max = Number(parts[1]?.replace(/[^0-9]/g, ''))
    if (!isNaN(min) && !isNaN(max) && min > 0 && max > 0) {
      return `₱${min.toLocaleString()} to ₱${max.toLocaleString()}`
    }
    return `₱${parts[0]} to ₱${parts[1]}`
  }
  if (cleaned.endsWith('+')) {
    const num = Number(cleaned.replace(/[^0-9]/g, ''))
    if (!isNaN(num) && num > 0) {
      return `From ₱${num.toLocaleString()}`
    }
  }
  const singleNum = Number(cleaned.replace(/[^0-9]/g, ''))
  if (!isNaN(singleNum) && singleNum > 0) {
    return `₱${singleNum.toLocaleString()}`
  }
  return `₱${cleaned}`
}

export function formatEstimatedTotal(totalPriceInfo) {
  if (!totalPriceInfo || !totalPriceInfo.hasPrice || !totalPriceInfo.min) {
    return 'Ask for quote'
  }
  if (totalPriceInfo.max && totalPriceInfo.max !== totalPriceInfo.min) {
    return `₱${totalPriceInfo.min.toLocaleString()} to ₱${totalPriceInfo.max.toLocaleString()}`
  }
  return `₱${totalPriceInfo.min.toLocaleString()}`
}

export function getBudgetValidationError(value) {
  if (value === 'any' || value === '' || value === null || value === undefined) {
    return ''
  }
  const num = Number(value)
  if (!isNaN(num) && num <= 0) {
    return 'Enter an amount above ₱0, or leave blank for Any.'
  }
  return ''
}

export function getWattageValidationError(value) {
  if (value === 'any' || value === '' || value === null || value === undefined) {
    return ''
  }
  const num = Number(value)
  if (!isNaN(num) && num <= 0) {
    return 'Enter a wattage above 0W, or leave blank for Any.'
  }
  return ''
}
