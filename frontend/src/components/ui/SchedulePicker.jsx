import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Calendar, ChevronLeft, ChevronRight, ChevronDown, Clock } from 'lucide-react'
import {
  OPERATING_HOUR_OPTIONS,
  getOperatingMinuteOptions,
  formatTime24To12,
} from '../../lib/branchHours'

const WEEKDAYS_MON_SAT = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

function formatIsoDate(year, monthIndex, day) {
  return `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function formatReadableDate(isoDate) {
  if (!isoDate) return ''
  const parsed = new Date(`${isoDate}T00:00:00`)
  if (Number.isNaN(parsed.getTime())) return isoDate
  return parsed.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

/**
 * Build a 6-column (Mon–Sat) calendar matrix for the given year & month.
 * Sundays are omitted completely so they are never an interactive option.
 */
function buildMonSatWeeks(year, monthIndex) {
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate()
  const weeks = []
  let currentWeek = [null, null, null, null, null, null]

  for (let day = 1; day <= daysInMonth; day += 1) {
    const jsDay = new Date(year, monthIndex, day).getDay() // 0=Sun, 1=Mon..6=Sat
    if (jsDay === 0) {
      // End of week on Sunday — flush if currentWeek has any days
      if (currentWeek.some((c) => c !== null)) {
        weeks.push(currentWeek)
        currentWeek = [null, null, null, null, null, null]
      }
      continue
    }
    currentWeek[jsDay - 1] = {
      day,
      iso: formatIsoDate(year, monthIndex, day),
    }
  }
  if (currentWeek.some((c) => c !== null)) {
    weeks.push(currentWeek)
  }
  return weeks
}

/**
 * Combined Mon–Sat Calendar + 2-Column Scrollable Hour | 5-Minute picker.
 * Responsive: stacked on mobile (<640px), side-by-side on desktop, >=40px tap targets.
 */
export default function SchedulePicker({
  date,
  time,
  minDate,
  onDateChange,
  onTimeChange,
  hasError = false,
  accent = 'amber',
}) {
  const [isOpen, setIsOpen] = useState(false)
  const triggerRef = useRef(null)
  const popupRef = useRef(null)
  const [popupStyle, setPopupStyle] = useState({})

  const updatePosition = useCallback(() => {
    if (typeof window === 'undefined') return
    const vw = window.innerWidth
    const vh = window.innerHeight
    const isMobile = vw < 640

    if (isMobile) {
      setPopupStyle({
        left: '12px',
        right: '12px',
        bottom: '16px',
        maxHeight: `${Math.round(vh * 0.82)}px`,
      })
      return
    }

    const rect = triggerRef.current?.getBoundingClientRect()
    if (!rect) return

    const width = Math.min(480, vw - 24)
    const left = Math.max(12, Math.min(rect.left, vw - width - 12))
    const spaceBelow = vh - rect.bottom - 12
    const estimatedHeight = 360

    if (spaceBelow >= estimatedHeight || spaceBelow >= rect.top) {
      setPopupStyle({
        top: `${Math.round(rect.bottom + 8)}px`,
        left: `${Math.round(left)}px`,
        width: `${width}px`,
        maxHeight: `${Math.max(240, Math.round(spaceBelow))}px`,
      })
    } else {
      setPopupStyle({
        bottom: `${Math.round(vh - rect.top + 8)}px`,
        left: `${Math.round(left)}px`,
        width: `${width}px`,
        maxHeight: `${Math.max(240, Math.round(rect.top - 12))}px`,
      })
    }
  }, [])

  useEffect(() => {
    if (!isOpen) return undefined
    updatePosition()

    const handleOutsideMouseDown = (e) => {
      if (
        triggerRef.current?.contains(e.target) ||
        popupRef.current?.contains(e.target)
      ) {
        return
      }
      setIsOpen(false)
    }

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        setIsOpen(false)
      }
    }

    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)
    document.addEventListener('mousedown', handleOutsideMouseDown)
    document.addEventListener('keydown', handleKeyDown, true)

    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
      document.removeEventListener('mousedown', handleOutsideMouseDown)
      document.removeEventListener('keydown', handleKeyDown, true)
    }
  }, [isOpen, updatePosition])

  const initialAnchor = useMemo(() => {
    const base = date || minDate
    const parsed = base ? new Date(`${base}T00:00:00`) : new Date()
    if (Number.isNaN(parsed.getTime())) return new Date()
    return parsed
  }, [date, minDate])

  const [viewYear, setViewYear] = useState(initialAnchor.getFullYear())
  const [viewMonth, setViewMonth] = useState(initialAnchor.getMonth())

  const [rawHour = '', rawMinute = ''] = (time || '').split(':')
  const hour = rawHour ? String(parseInt(rawHour, 10)).padStart(2, '0') : ''
  const minute = rawMinute ? String(parseInt(rawMinute, 10)).padStart(2, '0') : ''

  const minuteOptions = hour ? getOperatingMinuteOptions(hour) : getOperatingMinuteOptions('08')
  const hasLegacyHour = Boolean(hour) && !OPERATING_HOUR_OPTIONS.some((h) => h.value === hour)
  const hasLegacyMinute = Boolean(minute) && !minuteOptions.some((m) => m.value === minute)

  const weeks = useMemo(() => buildMonSatWeeks(viewYear, viewMonth), [viewYear, viewMonth])
  const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  })

  const accentSelected =
    accent === 'blue'
      ? 'bg-blue-600 text-white font-bold shadow-sm'
      : 'bg-stone-900 text-white font-bold shadow-sm'

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewYear((y) => y - 1)
      setViewMonth(11)
    } else {
      setViewMonth((m) => m - 1)
    }
  }

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewYear((y) => y + 1)
      setViewMonth(0)
    } else {
      setViewMonth((m) => m + 1)
    }
  }

  const handleSelectHour = (nextHour) => {
    const allowedMins = getOperatingMinuteOptions(nextHour)
    const maxAllowed = allowedMins[allowedMins.length - 1].value
    let nextMin = minute || '00'
    if (nextMin > maxAllowed) {
      nextMin = maxAllowed
    }
    onTimeChange(`${nextHour}:${nextMin}`)
  }

  const handleSelectMinute = (nextMin) => {
    const targetHour = hour || '08'
    onTimeChange(`${targetHour}:${nextMin}`)
  }

  const formattedDate = formatReadableDate(date)
  const formattedTime = time ? formatTime24To12(time) : ''
  const summaryText =
    formattedDate && formattedTime
      ? `${formattedDate} · ${formattedTime}`
      : formattedDate || formattedTime || 'Select visit date & time'

  const popupNode = isOpen ? (
    <div
      ref={popupRef}
      data-testid="schedule-floating-popup"
      role="dialog"
      aria-label="Schedule date and time"
      style={popupStyle}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      className="fixed z-[10050] rounded-2xl border border-stone-200 bg-white shadow-[0_20px_50px_rgba(0,0,0,0.22)] overflow-y-auto no-scrollbar"
    >
      <div className="flex flex-col sm:flex-row divide-y sm:divide-y-0 sm:divide-x divide-stone-200">
        {/* Left: 6-Column Mon–Sat Calendar */}
        <div className="p-3 sm:p-3.5 flex-1">
          <div className="flex items-center justify-between mb-2.5">
            <button
              type="button"
              onClick={handlePrevMonth}
              aria-label="Previous month"
              className="min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg border border-stone-200 text-stone-600 hover:bg-stone-100 cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-xs font-bold text-stone-900">{monthLabel}</span>
            <button
              type="button"
              onClick={handleNextMonth}
              aria-label="Next month"
              className="min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg border border-stone-200 text-stone-600 hover:bg-stone-100 cursor-pointer"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Mon–Sat Header (Sunday omitted) */}
          <div className="grid grid-cols-6 gap-1 text-center mb-1">
            {WEEKDAYS_MON_SAT.map((d) => (
              <span key={d} className="text-[11px] font-semibold text-stone-400 py-1">
                {d}
              </span>
            ))}
          </div>

          {/* Weeks */}
          <div className="space-y-1">
            {weeks.map((week, wIdx) => (
              <div key={wIdx} className="grid grid-cols-6 gap-1">
                {week.map((cell, cIdx) => {
                  if (!cell) {
                    return <div key={cIdx} className="min-h-[40px]" />
                  }
                  const isPast = Boolean(minDate && cell.iso < minDate)
                  const isSelected = date === cell.iso
                  if (isPast) {
                    return (
                      <span
                        key={cell.iso}
                        className="min-h-[40px] flex items-center justify-center text-xs text-stone-300 select-none"
                      >
                        {cell.day}
                      </span>
                    )
                  }
                  return (
                    <button
                      key={cell.iso}
                      type="button"
                      onClick={() => onDateChange(cell.iso)}
                      aria-pressed={isSelected}
                      className={`min-h-[40px] rounded-lg text-xs flex items-center justify-center transition-colors cursor-pointer ${
                        isSelected
                          ? accentSelected
                          : 'text-stone-800 hover:bg-stone-100 font-medium'
                      }`}
                    >
                      {cell.day}
                    </button>
                  )
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Right: 2-Column Scrollable Hour | 5-Min Picker */}
        <div className="p-3 sm:p-3.5 sm:w-44 shrink-0 flex flex-col">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-stone-500 mb-2">
            <Clock className="h-3.5 w-3.5" />
            <span>8:00 AM – 5:30 PM</span>
          </div>
          <div className="grid grid-cols-2 gap-1.5 flex-1">
            {/* Hour Column */}
            <div
              role="listbox"
              aria-label="Operating Hour"
              className="max-h-48 sm:max-h-52 overflow-y-auto space-y-1 pr-0.5"
            >
              {hasLegacyHour && (
                <button
                  type="button"
                  onClick={() => handleSelectHour(hour)}
                  className={`w-full min-h-[40px] px-2 rounded-lg text-xs text-center cursor-pointer ${accentSelected}`}
                >
                  {hour}:00
                </button>
              )}
              {OPERATING_HOUR_OPTIONS.map((opt) => {
                const isSelected = hour === opt.value
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleSelectHour(opt.value)}
                    aria-pressed={isSelected}
                    className={`w-full min-h-[40px] px-2 rounded-lg text-xs text-center transition-colors cursor-pointer ${
                      isSelected
                        ? accentSelected
                        : 'text-stone-700 hover:bg-stone-100 font-medium'
                    }`}
                  >
                    {opt.label}
                  </button>
                )
              })}
            </div>

            {/* Minute Column (5-min increments) */}
            <div
              role="listbox"
              aria-label="Operating Minute"
              className="max-h-48 sm:max-h-52 overflow-y-auto space-y-1 pr-0.5"
            >
              {hasLegacyMinute && (
                <button
                  type="button"
                  onClick={() => handleSelectMinute(minute)}
                  className={`w-full min-h-[40px] px-2 rounded-lg text-xs text-center cursor-pointer ${accentSelected}`}
                >
                  :{minute}
                </button>
              )}
              {minuteOptions.map((opt) => {
                const isSelected = minute === opt.value
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleSelectMinute(opt.value)}
                    aria-pressed={isSelected}
                    className={`w-full min-h-[40px] px-2 rounded-lg text-xs text-center transition-colors cursor-pointer ${
                      isSelected
                        ? accentSelected
                        : 'text-stone-700 hover:bg-stone-100 font-medium'
                    }`}
                  >
                    {opt.label}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Summary Bar */}
      <div className="px-3.5 py-2.5 bg-stone-50 border-t border-stone-200 flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-stone-700 truncate">
          {summaryText}
        </span>
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          className="px-3.5 py-1.5 rounded-lg bg-stone-900 text-white text-xs font-bold hover:bg-stone-800 transition-colors shrink-0 cursor-pointer"
        >
          Done
        </button>
      </div>
    </div>
  ) : null

  return (
    <div className="space-y-2">
      {/* Trigger Button */}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        className={`w-full rounded-xl border px-3.5 py-2.5 text-sm flex items-center justify-between gap-2 transition-colors cursor-pointer ${
          hasError
            ? 'border-red-400 bg-red-50/20 text-stone-900'
            : 'border-stone-200 bg-stone-50/40 hover:bg-white text-stone-800'
        }`}
      >
        <span className="flex items-center gap-2 min-w-0">
          <Calendar className="h-4 w-4 text-stone-500 shrink-0" />
          <span className={`truncate font-semibold ${!formattedDate && !formattedTime ? 'text-stone-400 font-normal' : ''}`}>
            {summaryText}
          </span>
        </span>
        <ChevronDown className={`h-4 w-4 text-stone-400 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Floating Portal Popup (No modal backdrop) */}
      {typeof document !== 'undefined' && popupNode
        ? createPortal(popupNode, document.body)
        : popupNode}
    </div>
  )
}
