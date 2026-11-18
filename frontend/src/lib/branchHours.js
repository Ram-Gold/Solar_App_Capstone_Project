export const BRANCH_OPERATING_HOURS = {
  timezone: 'Asia/Manila',
  startHour: 8,
  startMinute: 0,
  endHour: 17,
  endMinute: 30,
  startStr: '08:00',
  endStr: '17:30',
  daysDescription: 'Monday through Saturday',
  hoursDescription: '8:00 AM – 5:30 PM',
  summary: 'Mon – Sat, 8:00 AM – 5:30 PM · Closed Sun',
}

/** Format 24-hour "HH:MM" into 12-hour display (e.g. "8:00 AM", "5:30 PM"). */
export function formatTime24To12(timeStr) {
  if (!timeStr) return ''
  const [hStr, mStr] = timeStr.split(':')
  const hour = parseInt(hStr, 10)
  if (Number.isNaN(hour)) return timeStr
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const displayH = hour % 12 || 12
  return `${displayH}:${mStr || '00'} ${ampm}`
}

/** 30-minute operating-hour slots from 08:00 to 17:30 inclusive. */
export const OPERATING_TIME_SLOTS = (() => {
  const slots = []
  const startMinutes = BRANCH_OPERATING_HOURS.startHour * 60 + BRANCH_OPERATING_HOURS.startMinute
  const endMinutes = BRANCH_OPERATING_HOURS.endHour * 60 + BRANCH_OPERATING_HOURS.endMinute
  for (let m = startMinutes; m <= endMinutes; m += 30) {
    const h = String(Math.floor(m / 60)).padStart(2, '0')
    const min = String(m % 60).padStart(2, '0')
    const value = `${h}:${min}`
    slots.push({ value, label: formatTime24To12(value) })
  }
  return slots
})()

/** Operating hours (08 through 17) for the two-part Hour + Minute selector. */
export const OPERATING_HOUR_OPTIONS = (() => {
  const hours = []
  for (let h = BRANCH_OPERATING_HOURS.startHour; h <= BRANCH_OPERATING_HOURS.endHour; h += 1) {
    const value = String(h).padStart(2, '0')
    const ampm = h >= 12 ? 'PM' : 'AM'
    const displayH = h % 12 || 12
    hours.push({ value, label: `${displayH} ${ampm}` })
  }
  return hours
})()

/**
 * 5-minute options for a given 24-hour string ("08".."17").
 * Clamps at :30 when hour === "17" so times past 5:30 PM are never selectable.
 */
export function getOperatingMinuteOptions(hourStr) {
  const maxMin = Number(hourStr) === BRANCH_OPERATING_HOURS.endHour
    ? BRANCH_OPERATING_HOURS.endMinute
    : 55
  const mins = []
  for (let m = 0; m <= maxMin; m += 5) {
    const value = String(m).padStart(2, '0')
    mins.push({ value, label: `:${value}` })
  }
  return mins
}

/**
 * Returns true if a showroom branch is currently open in Asia/Manila time
 * (Monday–Saturday, 08:00–17:30 inclusive).
 */
export function isBranchOpenNow(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: BRANCH_OPERATING_HOURS.timezone,
    weekday: 'short',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  }).formatToParts(now)

  const getPart = (type) => parts.find((p) => p.type === type)?.value
  const weekday = getPart('weekday')
  if (weekday === 'Sun') return false

  const hour = parseInt(getPart('hour'), 10) % 24
  const minute = parseInt(getPart('minute'), 10)
  if (Number.isNaN(hour) || Number.isNaN(minute)) return false

  const totalMins = hour * 60 + minute
  const startMins = BRANCH_OPERATING_HOURS.startHour * 60 + BRANCH_OPERATING_HOURS.startMinute
  const endMins = BRANCH_OPERATING_HOURS.endHour * 60 + BRANCH_OPERATING_HOURS.endMinute
  return totalMins >= startMins && totalMins <= endMins
}

/**
 * Returns OPERATING_TIME_SLOTS, prepending a temporary legacy option if
 * currentValue is non-empty and not on the 30-minute operating-hours grid.
 */
export function getTimeSlotOptions(currentValue) {
  if (!currentValue) return OPERATING_TIME_SLOTS
  const exists = OPERATING_TIME_SLOTS.some((s) => s.value === currentValue)
  if (exists) return OPERATING_TIME_SLOTS
  return [
    {
      value: currentValue,
      label: `${formatTime24To12(currentValue)} (Legacy)`,
      isLegacy: true,
    },
    ...OPERATING_TIME_SLOTS,
  ]
}
