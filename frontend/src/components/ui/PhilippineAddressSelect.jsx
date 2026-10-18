import { useMemo } from 'react'
import {
  getProvinces,
  getCitiesByProvince,
  getBarangaysByCity,
  isManilaCity,
} from '../../lib/philippineAddresses'
import { MapPin } from 'lucide-react'

/**
 * Reusable 4-stage cascading Philippine address selector.
 * 1. Select a Province
 * 2. City / Municipality (becomes active after province selection)
 * 3. Barangay / District (becomes active after city selection, shows Manila districts for City of Manila)
 * 4. Address (House / Unit No., Street, Subdivision)
 */
export default function PhilippineAddressSelect({
  provinceCode = '',
  cityCode = '',
  barangayCode = '',
  provinceName = '',
  cityName = '',
  barangayName = '',
  streetAddress = '',
  onLocationChange,
  errors = {},
  variant = 'modal', // 'modal' | 'admin'
  required = true,
}) {
  // Memoize all provinces
  const provinces = useMemo(() => getProvinces(), [])

  // Memoize cities for currently selected province
  const cities = useMemo(() => {
    if (!provinceCode) return []
    return getCitiesByProvince(provinceCode)
  }, [provinceCode])

  // Memoize barangays / districts for currently selected city
  const barangays = useMemo(() => {
    if (!cityCode && !cityName) return []
    return getBarangaysByCity(cityCode, cityName)
  }, [cityCode, cityName])

  const isManila = isManilaCity(cityName || cityCode)

  const handleProvinceSelect = (e) => {
    const selectedPsgc = e.target.value
    const found = provinces.find((p) => p.code === selectedPsgc)
    onLocationChange({
      provinceCode: selectedPsgc,
      provinceName: found ? found.name : '',
      cityCode: '',
      cityName: '',
      barangayCode: '',
      barangayName: '',
      streetAddress: '',
    })
  }

  const handleCitySelect = (e) => {
    const selectedPsgc = e.target.value
    const found = cities.find((c) => c.code === selectedPsgc)
    onLocationChange({
      provinceCode,
      provinceName,
      cityCode: selectedPsgc,
      cityName: found ? found.name : '',
      barangayCode: '',
      barangayName: '',
      streetAddress,
    })
  }

  const handleBarangaySelect = (e) => {
    const selectedPsgc = e.target.value
    const found = barangays.find((b) => b.code === selectedPsgc)
    onLocationChange({
      provinceCode,
      provinceName,
      cityCode,
      cityName,
      barangayCode: selectedPsgc,
      barangayName: found ? found.name : '',
      streetAddress,
    })
  }

  const handleStreetChange = (e) => {
    onLocationChange({
      provinceCode,
      provinceName,
      cityCode,
      cityName,
      barangayCode,
      barangayName,
      streetAddress: e.target.value,
    })
  }

  const isModal = variant === 'modal'

  const fieldBaseClass = isModal
    ? 'w-full rounded-xl border px-3.5 py-2.5 text-sm outline-none transition-all'
    : 'w-full text-xs p-2.5 rounded-xl border bg-jds-surface text-jds-on-surface focus:outline-none transition-all'

  const activeFieldClass = (hasError) => {
    if (isModal) {
      return hasError
        ? 'border-red-400 bg-red-50/20 text-stone-900'
        : 'border-stone-200 bg-stone-50/40 text-stone-800 focus:border-amber-500 focus:bg-white'
    } else {
      return hasError
        ? 'border-red-400 bg-red-50/20 text-red-900'
        : 'border-jds-outline-variant/40 focus:border-jds-primary'
    }
  }

  const disabledFieldClass = isModal
    ? 'border-stone-200/60 bg-stone-100/60 text-stone-400 cursor-not-allowed opacity-75'
    : 'border-jds-outline-variant/20 bg-jds-surface-container-low/50 text-jds-on-surface-variant/50 cursor-not-allowed opacity-75'

  const labelClass = isModal
    ? 'block text-xs font-semibold text-stone-700 mb-1'
    : 'block text-xs font-semibold text-jds-on-surface mb-1'

  const requiredMarker = required && (
    <span className={isModal ? 'text-amber-600' : 'text-amber-500'}> *</span>
  )

  const isCityActive = Boolean(provinceCode)
  const isBarangayActive = Boolean(cityCode)
  const isAddressActive = Boolean(cityCode)

  return (
    <div className="space-y-3.5">
      {/* 1. Province Selector */}
      <div>
        <label className={labelClass}>
          Select a Province{requiredMarker}
        </label>
        <select
          value={provinceCode}
          onChange={handleProvinceSelect}
          className={`${fieldBaseClass} cursor-pointer ${activeFieldClass(Boolean(errors.province))}`}
        >
          <option value="">Select a Province</option>
          {provinces.map((prov) => (
            <option key={prov.code} value={prov.code}>
              {prov.name}
            </option>
          ))}
        </select>
        {errors.province && (
          <p className="text-[11px] text-red-500 mt-1">{errors.province}</p>
        )}
      </div>

      {/* 2. City / Municipality Selector (Activated once Province is picked) */}
      <div>
        <label className={labelClass}>
          City / Municipality{requiredMarker}
        </label>
        <select
          value={cityCode}
          onChange={handleCitySelect}
          disabled={!isCityActive}
          className={`${fieldBaseClass} ${
            isCityActive
              ? `cursor-pointer ${activeFieldClass(Boolean(errors.city))}`
              : disabledFieldClass
          }`}
        >
          <option value="">
            {isCityActive ? 'Select City / Municipality' : 'Select a province first'}
          </option>
          {cities.map((city) => (
            <option key={city.code} value={city.code}>
              {city.name}
            </option>
          ))}
        </select>
        {errors.city && (
          <p className="text-[11px] text-red-500 mt-1">{errors.city}</p>
        )}
      </div>

      {/* 3. Barangay / District Selector (Shows Manila Districts for City of Manila) */}
      <div>
        <label className={labelClass}>
          {isManila ? 'District (Manila)' : 'Barangay / District'}{requiredMarker}
        </label>
        <select
          value={barangayCode}
          onChange={handleBarangaySelect}
          disabled={!isBarangayActive}
          className={`${fieldBaseClass} ${
            isBarangayActive
              ? `cursor-pointer ${activeFieldClass(Boolean(errors.barangay))}`
              : disabledFieldClass
          }`}
        >
          <option value="">
            {isBarangayActive
              ? isManila
                ? 'Select a District (e.g. Binondo, Malate, Quiapo)'
                : 'Select Barangay / District'
              : 'Select a city first'}
          </option>
          {barangays.map((bgy) => (
            <option key={bgy.code} value={bgy.code}>
              {bgy.name}
            </option>
          ))}
        </select>
        {errors.barangay && (
          <p className="text-[11px] text-red-500 mt-1">{errors.barangay}</p>
        )}
      </div>

      {/* 4. House / Street Address Text Input */}
      <div>
        <label className={labelClass}>
          Address{requiredMarker}
        </label>
        <input
          type="text"
          placeholder="House / Unit No., Street, Subdivision / Building"
          value={streetAddress}
          onChange={handleStreetChange}
          disabled={!isAddressActive}
          className={`${fieldBaseClass} ${
            isAddressActive
              ? activeFieldClass(Boolean(errors.streetAddress))
              : disabledFieldClass
          }`}
        />
        {errors.streetAddress && (
          <p className="text-[11px] text-red-500 mt-1">{errors.streetAddress}</p>
        )}
      </div>

      {/* Verified Location Preview Badge when complete */}
      {provinceName && cityName && barangayName && (
        <div className="flex items-center gap-2 p-2.5 rounded-xl bg-stone-100/70 border border-stone-200/80 text-[11px] text-stone-700">
          <MapPin className="h-3.5 w-3.5 text-stone-500 shrink-0" />
          <span className="truncate">
            {streetAddress ? `${streetAddress}, ` : ''}
            {isManila ? barangayName : `Brgy. ${barangayName.replace(/^brgy\.?\s*/i, '')}`}, {cityName}, {provinceName}
          </span>
        </div>
      )}
    </div>
  )
}
