import {
  OPERATING_HOUR_OPTIONS,
  getOperatingMinuteOptions,
} from '../../lib/branchHours'

/**
 * Two-part Hour + 5-Minute selector restricted to showroom operating hours
 * (8:00 AM – 5:30 PM). Out-of-hours times are omitted from the DOM.
 */
export default function OperatingTimeSelect({
  value,
  onChange,
  selectClassName = '',
  hourAriaLabel = 'Preferred Time Hour',
  minuteAriaLabel = 'Preferred Time Minute',
}) {
  const [rawHour = '', rawMinute = ''] = (value || '').split(':')
  const hour = rawHour ? String(parseInt(rawHour, 10)).padStart(2, '0') : ''
  const minute = rawMinute ? String(parseInt(rawMinute, 10)).padStart(2, '0') : ''

  const minuteOptions = hour ? getOperatingMinuteOptions(hour) : getOperatingMinuteOptions('08')
  const hasLegacyHour = Boolean(hour) && !OPERATING_HOUR_OPTIONS.some((h) => h.value === hour)
  const hasLegacyMinute = Boolean(minute) && !minuteOptions.some((m) => m.value === minute)

  const handleHourChange = (e) => {
    const nextHour = e.target.value
    if (!nextHour) {
      onChange('')
      return
    }
    const allowedMins = getOperatingMinuteOptions(nextHour)
    const maxAllowed = allowedMins[allowedMins.length - 1].value
    let nextMin = minute || '00'
    if (nextMin > maxAllowed) {
      nextMin = maxAllowed
    }
    onChange(`${nextHour}:${nextMin}`)
  }

  const handleMinuteChange = (e) => {
    const nextMin = e.target.value
    if (!nextMin || !hour) {
      onChange('')
      return
    }
    onChange(`${hour}:${nextMin}`)
  }

  return (
    <div className="grid grid-cols-2 gap-2">
      <select
        aria-label={hourAriaLabel}
        required
        value={hour}
        onChange={handleHourChange}
        className={selectClassName}
      >
        <option value="">Hour</option>
        {hasLegacyHour && (
          <option value={hour}>{hour}:00 (Legacy)</option>
        )}
        {OPERATING_HOUR_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      <select
        aria-label={minuteAriaLabel}
        required
        disabled={!hour}
        value={hour ? minute : ''}
        onChange={handleMinuteChange}
        className={selectClassName}
      >
        <option value="">Min</option>
        {hasLegacyMinute && (
          <option value={minute}>:{minute}</option>
        )}
        {minuteOptions.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  )
}
