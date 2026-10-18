import phAddressPkg from 'latest-ph-address-thanks-to-anehan'

// Resolve potential ESM/CJS interop differences
const ph = phAddressPkg?.default || phAddressPkg || {}

/**
 * Official administrative and historical districts of the City of Manila.
 */
export const MANILA_DISTRICTS = [
  { code: 'MNL-BINONDO', name: 'Binondo' },
  { code: 'MNL-ERMITA', name: 'Ermita' },
  { code: 'MNL-INTRAMUROS', name: 'Intramuros' },
  { code: 'MNL-MALATE', name: 'Malate' },
  { code: 'MNL-PACO', name: 'Paco' },
  { code: 'MNL-PANDACAN', name: 'Pandacan' },
  { code: 'MNL-PORTAREA', name: 'Port Area' },
  { code: 'MNL-QUIAPO', name: 'Quiapo' },
  { code: 'MNL-SAMPALOC', name: 'Sampaloc' },
  { code: 'MNL-SANANDRES', name: 'San Andres' },
  { code: 'MNL-SANMIGUEL', name: 'San Miguel' },
  { code: 'MNL-SANNICOLAS', name: 'San Nicolas' },
  { code: 'MNL-SANTAANA', name: 'Santa Ana' },
  { code: 'MNL-SANTACRUZ', name: 'Santa Cruz' },
  { code: 'MNL-SANTAMESA', name: 'Santa Mesa' },
  { code: 'MNL-TONDO', name: 'Tondo' },
]

/**
 * Checks whether a given city code or name corresponds to the City of Manila.
 */
export function isManilaCity(cityCodeOrName) {
  if (!cityCodeOrName) return false
  const str = String(cityCodeOrName).trim().toLowerCase()
  return (
    str === '1380600000' ||
    str === 'city of manila' ||
    str === 'manila' ||
    (str.includes('manila') && !str.includes('valenzuela'))
  )
}

/**
 * Returns an alphabetically sorted list of Philippine provinces,
 * with "-NO PROVINCE-" mapped to "Metro Manila (NCR)".
 */
export function getProvinces() {
  try {
    const rawProvinces = ph.getProvincesByRegion ? ph.getProvincesByRegion() : []
    return rawProvinces
      .map((p) => {
        const isNCR = p.psgc === '-NO PROVINCE-' || p.name === '-NO PROVINCE-'
        return {
          code: p.psgc,
          name: isNCR ? 'Metro Manila (NCR)' : p.name,
          isNCR,
        }
      })
      .sort((a, b) => a.name.localeCompare(b.name))
  } catch (err) {
    console.error('Error fetching provinces:', err)
    return []
  }
}

/**
 * Returns all cities and municipalities for a given province PSGC code.
 * If provinceCode is '-NO PROVINCE-', returns all 17 cities/municipalities in NCR.
 */
export function getCitiesByProvince(provinceCode) {
  if (!provinceCode) return []
  try {
    const rawCities = ph.getCitiesAndMunsByProvince ? ph.getCitiesAndMunsByProvince(provinceCode) : []
    return rawCities
      .map((c) => ({
        code: c.psgc,
        name: c.name,
        geographicLevel: c.geographicLevel,
        cityClass: c.cityClass || null,
      }))
      .sort((a, b) => a.name.localeCompare(b.name))
  } catch (err) {
    console.error(`Error fetching cities for province ${provinceCode}:`, err)
    return []
  }
}

/**
 * Returns all barangays or districts for a given city or municipality.
 * For City of Manila, returns the 16 recognized districts.
 */
export function getBarangaysByCity(cityCode, cityName = '') {
  if (!cityCode && !cityName) return []
  
  if (isManilaCity(cityCode) || isManilaCity(cityName)) {
    return [...MANILA_DISTRICTS]
  }

  try {
    const rawBarangays = ph.getBarangaysByCityOrMun ? ph.getBarangaysByCityOrMun(cityCode) : []
    return rawBarangays.map((b) => ({
      code: b.psgc,
      name: b.name,
    }))
  } catch (err) {
    console.error(`Error fetching barangays for city ${cityCode}:`, err)
    return []
  }
}

/**
 * Formats a clean full Philippine address line including house/street address.
 */
export function formatFullAddress({ province, city, barangay, street } = {}) {
  const parts = []
  if (street && street.trim()) {
    parts.push(street.trim())
  }
  
  if (barangay && barangay.trim()) {
    const bgyTrimmed = barangay.trim()
    const isManila = isManilaCity(city)
    const isManilaDistrict = MANILA_DISTRICTS.some(
      (d) => d.name.toLowerCase() === bgyTrimmed.toLowerCase()
    )

    if (isManila || isManilaDistrict) {
      parts.push(bgyTrimmed)
    } else {
      parts.push(`Brgy. ${bgyTrimmed.replace(/^brgy\.?\s*/i, '')}`)
    }
  }

  if (city && city.trim()) {
    parts.push(city.trim())
  }

  if (province && province.trim() && province.trim() !== 'Metro Manila (NCR)') {
    parts.push(province.trim())
  } else if (province && province.trim() === 'Metro Manila (NCR)') {
    parts.push('Metro Manila')
  }

  return parts.join(', ')
}
