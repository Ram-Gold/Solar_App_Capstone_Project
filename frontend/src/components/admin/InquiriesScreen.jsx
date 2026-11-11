import { useState, useEffect, useMemo, useRef } from 'react'
import {
  CalendarDays,
  Calendar as CalendarIcon,
  Clock,
  Mail,
  Building2,
  Tag,
  Check,
  CheckCircle2,
  AlertCircle,
  X,
  ChevronLeft,
  ChevronRight,
  Filter,
  Search,
  RefreshCw,
  ShoppingBag,
  Ticket,
  MapPin,
  Plus,
  List,
  Copy,
  ExternalLink,
  Trash2,
  AlertTriangle
} from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import {
  INQUIRY_STATUSES,
  normalizeInquiryStatus,
  getInquiryStatusConfig,
  getInactiveInquiriesSummary,
  isEligibleForAutoPurge } from '../../lib/inquiryStatusUtils'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '../ui/table'
import useModalBehavior from '../../hooks/useModalBehavior'
import PhilippineAddressSelect from '../ui/PhilippineAddressSelect'
import { formatFullAddress } from '../../lib/philippineAddresses'
import { FaFacebook } from 'react-icons/fa'
import { extractFacebookHandle, formatFacebookUrl } from '../../lib/facebookUtils'
import { sanitizeEmail, isValidEmail } from '../../lib/sanitize.js'
import AnimatedConfirmation from '../ui/AnimatedConfirmation'
import { sendInquiryTicketEmail } from '../../lib/customerService'

export const CALENDAR_START_HOUR = 7 // 07:00 AM
export const CALENDAR_END_HOUR = 20  // 08:00 PM (13 hours: 7 to 19 inclusive)
export const HOUR_HEIGHT = 120      // 120px per hour
export const PIXELS_PER_MINUTE = 120 / 60 // 2px per minute
export const SUB_SLOT_MINUTES = 10  // 10 minutes per sub-slot
export const SUB_SLOT_HEIGHT = 20   // 20px per 10-min sub-slot
export const SUB_SLOT_COUNT = 6     // 6 slots per hour (:00, :10, :20, :30, :40, :50)
export const TOTAL_CALENDAR_HEIGHT = (CALENDAR_END_HOUR - CALENDAR_START_HOUR) * HOUR_HEIGHT // 1560px

// Operating hours from 7:00 AM to 8:00 PM (13 hour rows)
export const BUSINESS_HOURS = Array.from(
  { length: CALENDAR_END_HOUR - CALENDAR_START_HOUR },
  (_, i) => {
    const hour = CALENDAR_START_HOUR + i
    const hour12 = hour % 12 === 0 ? 12 : hour % 12
    const meridian = hour >= 12 ? 'PM' : 'AM'
    const label = `${String(hour12).padStart(2, '0')}:00 ${meridian}`
    return {
      hour,
      hour12,
      meridian,
      label,
      slotText: `${label} - ${String(hour12).padStart(2, '0')}:30 ${meridian}`
    }
  }
)

export const TIME_SLOT_PRESETS = [
  '08:00 AM - 08:30 AM',
  '08:10 AM - 08:50 AM',
  '08:30 AM - 09:10 AM',
  '08:50 AM - 09:30 AM',
  '09:00 AM - 09:40 AM',
  '09:10 AM - 09:50 AM',
  '09:20 AM - 10:00 AM',
  '09:40 AM - 10:20 AM',
  '10:00 AM - 10:30 AM',
  '10:10 AM - 10:50 AM',
  '10:30 AM - 11:10 AM',
  '10:50 AM - 11:30 AM',
  '11:00 AM - 11:40 AM',
  '11:10 AM - 11:50 AM',
  '01:00 PM - 01:30 PM',
  '01:10 PM - 01:50 PM',
  '01:20 PM - 02:00 PM',
  '01:30 PM - 02:10 PM',
  '01:50 PM - 02:30 PM',
  '02:00 PM - 02:40 PM',
  '02:10 PM - 02:50 PM',
  '02:20 PM - 03:00 PM',
  '02:40 PM - 03:20 PM',
  '02:50 PM - 03:30 PM',
  '03:00 PM - 03:30 PM',
  '03:10 PM - 03:50 PM',
  '03:30 PM - 04:10 PM',
  '03:40 PM - 04:20 PM',
  '03:50 PM - 04:30 PM',
  '04:00 PM - 04:30 PM',
  '04:10 PM - 04:50 PM',
  '04:20 PM - 05:00 PM',
  '04:40 PM - 05:20 PM',
  '04:50 PM - 05:30 PM',
  '05:00 PM - 05:30 PM',
  '05:10 PM - 05:50 PM',
  '05:30 PM - 06:10 PM',
  '06:30 PM - 07:15 PM'
]

export const isPickupTicket = (q) => {
  if (!q) return false
  if (q.ticket_code?.startsWith('JDS-RES-')) return true
  if (q.ticket_code?.startsWith('JDS-INQ-')) return false
  const purpose = (q.purpose_of_visitation || '').toLowerCase()
  return (
    purpose.includes('purchase') ||
    purpose.includes('pickup') ||
    purpose.includes('cash & carry') ||
    purpose.includes('reservation')
  )
}

export const getNextBusinessDay = () => {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  if (d.getDay() === 0) {
    d.setDate(d.getDate() + 1)
  }
  return d.toISOString().split('T')[0]
}

export function parseTimeTo24Hour(timeStr) {
  if (!timeStr) return '09:00'
  const str = String(timeStr).trim().toLowerCase()
  const match12 = str.match(/(\d{1,2}):?(\d{2})?\s*(am|pm)/i)
  if (match12) {
    let h = parseInt(match12[1], 10)
    const m = match12[2] ? parseInt(match12[2], 10) : 0
    const isPm = match12[3].toLowerCase() === 'pm'
    if (isPm && h < 12) h += 12
    if (!isPm && h === 12) h = 0
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
  }
  const match24 = str.match(/^(\d{1,2}):(\d{2})/)
  if (match24) {
    const h = parseInt(match24[1], 10)
    const m = parseInt(match24[2], 10)
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
  }
  return '09:00'
}

export function format24HourToDisplay(time24) {
  if (!time24) return '09:00 AM'
  const [hStr, mStr] = time24.split(':')
  let h = parseInt(hStr, 10)
  const m = parseInt(mStr || '0', 10)
  if (isNaN(h)) return time24
  const ampm = h >= 12 ? 'PM' : 'AM'
  const displayH = h % 12 || 12
  const displayM = String(m).padStart(2, '0')
  return `${displayH}:${displayM} ${ampm}`
}

export const isWithinBusinessHours = (timeStr) => {
  if (!timeStr) return false
  const time24 = parseTimeTo24Hour(timeStr)
  const [hStr, mStr] = time24.split(':')
  const h = parseInt(hStr, 10)
  const m = parseInt(mStr || '0', 10)
  if (isNaN(h)) return false
  const minutes = h * 60 + m
  const startMin = 9 * 60
  const endMin = 17 * 60
  return minutes >= startMin && minutes <= endMin
}

// Exact minute parser for arbitrary times (e.g. 4:20 PM, 6:30 PM, 2:20 PM, 3:40 PM)
export function parseTimeSlotMinutes(slotStr, defaultDuration = 45) {
  if (!slotStr) return null
  const str = String(slotStr).trim().toLowerCase()
  const firstMatch = str.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i)
  if (!firstMatch) return null

  let hour = parseInt(firstMatch[1], 10)
  let minute = firstMatch[2] ? parseInt(firstMatch[2], 10) : 0
  let meridian = firstMatch[3] ? firstMatch[3].toLowerCase() : null

  if (!meridian) {
    if (str.includes('pm') || hour < 7) {
      if (hour < 12) hour += 12
      meridian = 'pm'
    } else {
      meridian = 'am'
    }
  } else {
    if (meridian === 'pm' && hour < 12) hour += 12
    if (meridian === 'am' && hour === 12) hour = 0
  }

  const startMinutes = hour * 60 + minute
  const parts = str.split(/[-–to]/i)
  let endMinutes = startMinutes + defaultDuration
  if (parts.length > 1 && parts[1].trim()) {
    const secondPart = parts[1].trim()
    const secondMatch = secondPart.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i)
    if (secondMatch) {
      let endHour = parseInt(secondMatch[1], 10)
      let endMinute = secondMatch[2] ? parseInt(secondMatch[2], 10) : 0
      let endMeridian = secondMatch[3] ? secondMatch[3].toLowerCase() : meridian
      if (endMeridian === 'pm' && endHour < 12) endHour += 12
      if (endMeridian === 'am' && endHour === 12) endHour = 0
      const parsedEnd = endHour * 60 + endMinute
      if (parsedEnd > startMinutes) {
        endMinutes = parsedEnd
      }
    }
  }

  return {
    startMinutes,
    endMinutes,
    durationMinutes: endMinutes - startMinutes,
    hour,
    minute
  }
}

// Format total minutes to 12-hour formatted time string
export function formatMinutesToTime(totalMinutes) {
  const h24 = Math.floor(totalMinutes / 60)
  const mins = totalMinutes % 60
  const isPm = h24 >= 12
  let h12 = h24 % 12
  if (h12 === 0) h12 = 12
  const minStr = String(mins).padStart(2, '0')
  const meridian = isPm ? 'PM' : 'AM'
  return `${String(h12).padStart(2, '0')}:${minStr} ${meridian}`
}

// Format range for display
export function formatSlotRange(startMinutes, duration = 40) {
  return `${formatMinutesToTime(startMinutes)} - ${formatMinutesToTime(startMinutes + duration)}`
}

// Backward compatible helper
export function parseHourFromTimeSlot(slotStr) {
  const parsed = parseTimeSlotMinutes(slotStr)
  return parsed ? parsed.hour : null
}

// Google Calendar style side-by-side overlap clustering layout algorithm
export function layoutDayEvents(events, startHour = CALENDAR_START_HOUR, hourHeight = HOUR_HEIGHT) {
  const pxPerMin = hourHeight / 60
  const dayStartMin = startHour * 60

  const enriched = events.map((ev) => {
    const parsed = parseTimeSlotMinutes(ev.effectiveTimeSlot)
    const startMin = parsed ? parsed.startMinutes : 9 * 60
    const endMin = parsed ? parsed.endMinutes : startMin + 45
    return {
      ...ev,
      startMin,
      endMin,
      durationMin: Math.max(endMin - startMin, 30)
    }
  })

  // Sort by start time, then longer duration first
  enriched.sort((a, b) => a.startMin - b.startMin || b.durationMin - a.durationMin)

  // Find overlap clusters
  const clusters = []
  let currentCluster = []
  let clusterEnd = -1

  for (const ev of enriched) {
    if (currentCluster.length === 0) {
      currentCluster.push(ev)
      clusterEnd = ev.endMin
    } else if (ev.startMin < clusterEnd) {
      currentCluster.push(ev)
      clusterEnd = Math.max(clusterEnd, ev.endMin)
    } else {
      clusters.push(currentCluster)
      currentCluster = [ev]
      clusterEnd = ev.endMin
    }
  }
  if (currentCluster.length > 0) clusters.push(currentCluster)

  // Within each cluster, greedy column coloring
  const positioned = []
  for (const cluster of clusters) {
    const colEndTimes = []

    for (const ev of cluster) {
      let assignedCol = -1
      for (let c = 0; c < colEndTimes.length; c++) {
        if (colEndTimes[c] <= ev.startMin) {
          assignedCol = c
          colEndTimes[c] = ev.endMin
          break
        }
      }
      if (assignedCol === -1) {
        assignedCol = colEndTimes.length
        colEndTimes.push(ev.endMin)
      }
      ev.colIndex = assignedCol
    }

    const maxCols = colEndTimes.length

    for (const ev of cluster) {
      const top = (ev.startMin - dayStartMin) * pxPerMin
      const rawHeight = (ev.endMin - ev.startMin) * pxPerMin
      const height = Math.max(rawHeight - 2, 40)
      const widthPercent = 100 / maxCols
      const leftPercent = ev.colIndex * widthPercent

      positioned.push({
        ...ev,
        colIndex: ev.colIndex,
        maxCols,
        layout: {
          top,
          height,
          leftPercent,
          widthPercent,
          style: {
            top: `${top}px`,
            height: `${height}px`,
            left: `calc(${leftPercent}% + 2px)`,
            width: `calc(${widthPercent}% - 4px)`
          }
        }
      })
    }
  }

  return positioned
}

// Format Date to YYYY-MM-DD
function formatIsoDate(date) {
  if (!date || isNaN(new Date(date).getTime())) return ''
  const d = new Date(date)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// Get array of 7 dates for the week of `targetDate` (Monday to Sunday)
function getWeekDates(targetDate) {
  const current = new Date(targetDate)
  const day = current.getDay()
  const diffToMonday = day === 0 ? -6 : 1 - day
  const monday = new Date(current)
  monday.setDate(current.getDate() + diffToMonday)
  monday.setHours(0, 0, 0, 0)

  const week = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    week.push(d)
  }
  return week
}

// Get all calendar days for a month view (including padding from adjacent months)
function getMonthDays(targetDate) {
  const year = targetDate.getFullYear()
  const month = targetDate.getMonth()
  const firstDayOfMonth = new Date(year, month, 1)
  const lastDayOfMonth = new Date(year, month + 1, 0)

  // Starting on Monday
  const startDay = firstDayOfMonth.getDay()
  const diffToMonday = startDay === 0 ? -6 : 1 - startDay
  const calendarStart = new Date(firstDayOfMonth)
  calendarStart.setDate(firstDayOfMonth.getDate() + diffToMonday)

  const days = []
  const cursor = new Date(calendarStart)
  while (days.length < 35 || cursor <= lastDayOfMonth || cursor.getDay() !== 1) {
    days.push(new Date(cursor))
    cursor.setDate(cursor.getDate() + 1)
    if (days.length >= 42) break
  }
  return days
}

export default function InquiriesScreen({ initialViewMode = 'calendar' }) {
  const [inquiries, setInquiries] = useState([])
  const [loading, setLoading] = useState(true)

  // View state: 'calendar' (default) vs 'table'
  const [viewMode, setViewMode] = useState(initialViewMode)
  // Calendar sub-view: 'week' (default) vs 'month' vs 'day'
  const [calendarSubView, setCalendarSubView] = useState('week')

  const [currentDate, setCurrentDate] = useState(new Date())
  const [branchFilter, setBranchFilter] = useState('ALL')
  const [typeFilter, setTypeFilter] = useState('ALL')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [searchQuery, setSearchQuery] = useState('')

  // Drag and drop state
  const [draggingTicketId, setDraggingTicketId] = useState(null)
  const [dragOverSlot, setDragOverSlot] = useState(null)

  // Inquiry detail/edit modal
  const [selectedInquiry, setSelectedInquiry] = useState(null)
  const [modalDate, setModalDate] = useState('')
  const [modalTime, setModalTime] = useState('09:00')
  const [modalStatus, setModalStatus] = useState('Pending')
  const [modalBranch, setModalBranch] = useState('')
  const [modalStaffNotes, setModalStaffNotes] = useState('')
  const [modalSaving, setModalSaving] = useState(false)
  const [modalError, setModalError] = useState('')
  const [modalSuccess, setModalSuccess] = useState('')
  const [copiedCode, setCopiedCode] = useState(false)

  // Single ticket deletion modal state
  const [ticketToDelete, setTicketToDelete] = useState(null)
  const [isDeletingTicket, setIsDeletingTicket] = useState(false)

  // Bulk inactive purge modal state
  const [isPurgeModalOpen, setIsPurgeModalOpen] = useState(false)
  const [isPurging, setIsPurging] = useState(false)

  // New inquiry walk-in modal
  const [isNewModalOpen, setIsNewModalOpen] = useState(false)
  const [newSuccessTicket, setNewSuccessTicket] = useState(null)
  const [newCustName, setNewCustName] = useState('')
  const [newCustPhone, setNewCustPhone] = useState('')
  const [newCustEmail, setNewCustEmail] = useState('')
  const [newCustFacebook, setNewCustFacebook] = useState('')
  const [newCustProvince, setNewCustProvince] = useState('')
  const [newCustProvinceCode, setNewCustProvinceCode] = useState('')
  const [newCustCity, setNewCustCity] = useState('')
  const [newCustCityCode, setNewCustCityCode] = useState('')
  const [newCustBarangay, setNewCustBarangay] = useState('')
  const [newCustBarangayCode, setNewCustBarangayCode] = useState('')
  const [newCustStreetAddress, setNewCustStreetAddress] = useState('')
  const [newLocationErrors, setNewLocationErrors] = useState({})
  const [newBranch, setNewBranch] = useState('Cavite Distribution Hub')
  const [newType, setNewType] = useState('INQUIRY')
  const [newProduct, setNewProduct] = useState('')
  const [newWatt, setNewWatt] = useState('')
  const [newQuantity, setNewQuantity] = useState(1)
  const [newVisitDate, setNewVisitDate] = useState(getNextBusinessDay)
  const [newVisitTime, setNewVisitTime] = useState('09:00')
  const [newStaffNotes, setNewStaffNotes] = useState('')
  const [newCreating, setNewCreating] = useState(false)
  const [newError, setNewError] = useState('')

  const handleCloseModal = () => {
    setSelectedInquiry(null)
    setModalError('')
    setModalSuccess('')
  }

  const anyInquiryModalOpen = Boolean(
    selectedInquiry ||
    isNewModalOpen ||
    ticketToDelete ||
    isPurgeModalOpen
  )

  useModalBehavior({
    isOpen: anyInquiryModalOpen,
    onClose: () => {
      if (isPurgeModalOpen && !isPurging) setIsPurgeModalOpen(false)
      else if (ticketToDelete && !isDeletingTicket) setTicketToDelete(null)
      else if (isNewModalOpen && !newCreating) {
        setIsNewModalOpen(false)
        setNewSuccessTicket(null)
      }
      else if (selectedInquiry && !modalSaving) handleCloseModal()
    },
  })

  // Real-time calendar clock state
  const [currentTime, setCurrentTime] = useState(new Date())
  const calendarScrollRef = useRef(null)

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 60000)
    return () => clearInterval(timer)
  }, [])

  // Live time indicator positioning and metrics
  const currentHour = currentTime.getHours()
  const currentMinute = currentTime.getMinutes()
  const currentMinutesOfDay = currentHour * 60 + currentMinute
  const startOperatingMinutes = CALENDAR_START_HOUR * 60 // 7:00 AM = 420 min
  const endOperatingMinutes = CALENDAR_END_HOUR * 60     // 8:00 PM = 1200 min
  const isBeforeOperatingHours = currentMinutesOfDay < startOperatingMinutes
  const isAfterOperatingHours = currentMinutesOfDay > endOperatingMinutes
  const isOutOfOperatingHours = isBeforeOperatingHours || isAfterOperatingHours

  const timeIndicatorTop = useMemo(() => {
    if (isBeforeOperatingHours) return 0
    if (isAfterOperatingHours) return TOTAL_CALENDAR_HEIGHT
    return (currentMinutesOfDay - startOperatingMinutes) * PIXELS_PER_MINUTE
  }, [currentMinutesOfDay, isBeforeOperatingHours, isAfterOperatingHours])

  const formattedCurrentTime = useMemo(() => {
    return formatMinutesToTime(currentMinutesOfDay)
  }, [currentMinutesOfDay])

  const minBusinessDateStr = getNextBusinessDay()

  const [toastMsg, setToastMsg] = useState('')

  const showToast = (msg) => {
    setToastMsg(msg)
    setTimeout(() => setToastMsg(''), 4000)
  }

  // Load inquiries from Supabase with localStorage backup and automated retention hygiene
  const loadInquiries = async () => {
    try {
      setLoading(true)
      let fetched = []
      const { data, error } = await supabase
        .from('quote_tickets')
        .select('*')
        .order('id', { ascending: false })

      if (!error && data) {
        fetched = data
      }

      // Merge local fallback records if not in database
      try {
        const local = JSON.parse(localStorage.getItem('jds_local_quotes') || '[]')
        const existingCodes = new Set(fetched.map((q) => q.ticket_code))
        const extraLocal = local.filter((q) => !existingCodes.has(q.ticket_code))
        fetched = [...extraLocal, ...fetched]
      } catch (storageErr) {
        console.error('LocalStorage read error:', storageErr)
      }

      // Automated database hygiene: quietly purge expired records per retention rules
      const eligibleOnLoad = fetched.filter((item) => isEligibleForAutoPurge(item))
      if (eligibleOnLoad.length > 0) {
        const eligibleIds = eligibleOnLoad.map((q) => q.id).filter(Boolean)
        const eligibleCodes = new Set(eligibleOnLoad.map((q) => q.ticket_code))

        if (eligibleIds.length > 0) {
          supabase
            .from('quote_tickets')
            .delete()
            .in('id', eligibleIds)
            .then(({ error: delErr }) => {
              if (!delErr) {
                console.info(`Auto-purged ${eligibleIds.length} inactive inquiries from database.`)
              }
            })
            .catch((e) => console.warn('Auto-purge error:', e))
        }

        try {
          const local = JSON.parse(localStorage.getItem('jds_local_quotes') || '[]')
          const sanitized = local.filter(
            (q) => !eligibleCodes.has(q.ticket_code) && !eligibleIds.includes(q.id)
          )
          localStorage.setItem('jds_local_quotes', JSON.stringify(sanitized))
        } catch (storageErr) {
          console.warn('LocalStorage auto-purge sync note:', storageErr)
        }

        fetched = fetched.filter(
          (q) => !eligibleCodes.has(q.ticket_code) && !eligibleIds.includes(q.id)
        )
      }

      setInquiries(fetched)
    } catch (err) {
      console.error('Failed to load inquiries from Supabase:', err)
      showToast('Error loading inquiries from database.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadInquiries()
  }, [])

  // Inactive inquiries summary for manual cleanup button
  const inactiveSummary = useMemo(() => {
    return getInactiveInquiriesSummary(inquiries, currentTime)
  }, [inquiries, currentTime])

  // Confirm single inquiry deletion
  const confirmDeleteInquiry = async () => {
    if (!ticketToDelete) return
    try {
      setIsDeletingTicket(true)
      if (ticketToDelete.id) {
        const { error } = await supabase
          .from('quote_tickets')
          .delete()
          .eq('id', ticketToDelete.id)

        if (error) throw error
      } else if (ticketToDelete.ticket_code) {
        const { error } = await supabase
          .from('quote_tickets')
          .delete()
          .eq('ticket_code', ticketToDelete.ticket_code)

        if (error) throw error
      }

      // Sanitize LocalStorage
      try {
        const local = JSON.parse(localStorage.getItem('jds_local_quotes') || '[]')
        const sanitized = local.filter(
          (q) => q.id !== ticketToDelete.id && q.ticket_code !== ticketToDelete.ticket_code
        )
        localStorage.setItem('jds_local_quotes', JSON.stringify(sanitized))
      } catch (storageErr) {
        console.warn('LocalStorage delete cleanup error:', storageErr)
      }

      // Update state
      setInquiries((prev) =>
        prev.filter(
          (q) => q.id !== ticketToDelete.id && q.ticket_code !== ticketToDelete.ticket_code
        )
      )

      if (
        selectedInquiry?.id === ticketToDelete.id ||
        selectedInquiry?.ticket_code === ticketToDelete.ticket_code
      ) {
        handleCloseModal()
      }

      showToast(`Inquiry ${ticketToDelete.ticket_code} permanently deleted from database.`)
      setTicketToDelete(null)
    } catch (err) {
      console.error('Failed to delete inquiry:', err)
      showToast('Failed to delete inquiry from database.')
    } finally {
      setIsDeletingTicket(false)
    }
  }

  // Execute bulk purge of eligible inactive inquiries
  const executePurgeInactive = async () => {
    if (inactiveSummary.count === 0) {
      setIsPurgeModalOpen(false)
      return
    }

    try {
      setIsPurging(true)
      const idsToPurge = inactiveSummary.eligible.map((q) => q.id).filter(Boolean)
      const codesToPurge = new Set(inactiveSummary.eligible.map((q) => q.ticket_code))

      // 1. Attempt Stored Procedure RPC first
      let rpcSuccess = false
      try {
        const { error: rpcErr } = await supabase.rpc('purge_inactive_quote_tickets')
        if (!rpcErr) {
          rpcSuccess = true
        }
      } catch (rpcEx) {
        console.info('RPC purge fallback:', rpcEx)
      }

      // 2. Direct delete fallback if needed
      if (!rpcSuccess && idsToPurge.length > 0) {
        const { error: delErr } = await supabase
          .from('quote_tickets')
          .delete()
          .in('id', idsToPurge)
        if (delErr) {
          console.warn('Direct delete error:', delErr)
        }
      }

      // 3. LocalStorage cleanup
      try {
        const local = JSON.parse(localStorage.getItem('jds_local_quotes') || '[]')
        const sanitized = local.filter(
          (q) => !codesToPurge.has(q.ticket_code) && !idsToPurge.includes(q.id)
        )
        localStorage.setItem('jds_local_quotes', JSON.stringify(sanitized))
      } catch (storageErr) {
        console.warn('LocalStorage purge error:', storageErr)
      }

      // 4. Update React state
      setInquiries((prev) =>
        prev.filter((q) => !codesToPurge.has(q.ticket_code) && !idsToPurge.includes(q.id))
      )

      showToast(`Successfully purged ${inactiveSummary.count} inactive inquiries from database.`)
      setIsPurgeModalOpen(false)
    } catch (err) {
      console.error('Failed to purge inactive inquiries:', err)
      showToast('Failed to purge inactive inquiries from database.')
    } finally {
      setIsPurging(false)
    }
  }

  // Today ISO helper
  const todayIso = useMemo(() => formatIsoDate(new Date()), [])

  // Normalized inquiries: Every single inquiry has an effective visit_date
  // If visit_date is null or missing, fallback to created_at date so it appears on the calendar
  const normalizedInquiries = useMemo(() => {
    return inquiries.map((item) => {
      const fallbackDate = item.created_at ? formatIsoDate(new Date(item.created_at)) : todayIso
      const effectiveDate = item.visit_date || fallbackDate
      const effectiveTimeSlot = item.visit_time_slot || '09:00 AM - 10:00 AM'
      const isDateFromFallback = !item.visit_date

      return {
        ...item,
        effectiveDate,
        effectiveTimeSlot,
        isDateFromFallback
      }
    })
  }, [inquiries, todayIso])

  // Filter inquiries based on controls
  const filteredInquiries = useMemo(() => {
    return normalizedInquiries.filter((t) => {
      // Branch filter
      if (branchFilter !== 'ALL') {
        const branch = (t.store_branch || '').toLowerCase()
        if (branchFilter === 'Cavite' && !branch.includes('cavite')) return false
        if (branchFilter === 'Quiapo' && !branch.includes('quiapo')) return false
      }

      // Type filter
      if (typeFilter !== 'ALL') {
        const isPickup = isPickupTicket(t)
        if (typeFilter === 'PICKUP' && !isPickup) return false
        if (typeFilter === 'INQUIRY' && isPickup) return false
      }

      // Status filter
      if (statusFilter !== 'ALL') {
        if (normalizeInquiryStatus(t.status) !== statusFilter) return false
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchesName = (t.customer_name || '').toLowerCase().includes(q)
        const matchesCode = (t.ticket_code || '').toLowerCase().includes(q)
        const matchesProduct = (t.product_name || '').toLowerCase().includes(q)
        const matchesContact = (t.mobile_contact || '').includes(q)
        const matchesCity = (t.city || '').toLowerCase().includes(q)
        const matchesProvince = (t.province || '').toLowerCase().includes(q)
        const matchesBarangay = (t.barangay || '').toLowerCase().includes(q)
        const matchesStreet = (t.street_address || '').toLowerCase().includes(q)
        const matchesAddress = (t.delivery_address || '').toLowerCase().includes(q)
        const matchesFacebook = (t.facebook || '').toLowerCase().includes(q)
        if (!matchesName && !matchesCode && !matchesProduct && !matchesContact && !matchesCity && !matchesProvince && !matchesBarangay && !matchesStreet && !matchesAddress && !matchesFacebook) return false
      }

      return true
    })
  }, [normalizedInquiries, branchFilter, typeFilter, statusFilter, searchQuery])

  // Current view dates
  const weekDates = useMemo(() => getWeekDates(currentDate), [currentDate])
  const monthDays = useMemo(() => getMonthDays(currentDate), [currentDate])
  const currentWeekDateStrings = useMemo(() => new Set(weekDates.map(d => formatIsoDate(d))), [weekDates])

  // Auto-scroll calendar container to center around current time on load
  useEffect(() => {
    if (viewMode !== 'calendar' || !calendarScrollRef.current) return

    let isTodayInView = false
    if (calendarSubView === 'week') {
      isTodayInView = weekDates.some((d) => formatIsoDate(d) === todayIso)
    } else if (calendarSubView === 'day') {
      isTodayInView = formatIsoDate(currentDate) === todayIso
    }

    if (isTodayInView) {
      const targetScroll = Math.max(0, timeIndicatorTop - 200)
      if (typeof calendarScrollRef.current.scrollTo === 'function') {
        calendarScrollRef.current.scrollTo({ top: targetScroll, behavior: 'smooth' })
      } else {
        calendarScrollRef.current.scrollTop = targetScroll
      }
    }
  }, [calendarSubView, viewMode, currentDate, weekDates, todayIso, timeIndicatorTop])

  // Inquiries mapped by date for month view and daily lookups
  const inquiriesByDate = useMemo(() => {
    const map = {}
    filteredInquiries.forEach((ticket) => {
      const dateStr = ticket.effectiveDate
      if (!map[dateStr]) map[dateStr] = []
      map[dateStr].push(ticket)
    })
    return map
  }, [filteredInquiries])

  // Google Calendar style side-by-side positioned layout for each day of the week
  const weekDayLayouts = useMemo(() => {
    const map = {}
    weekDates.forEach((date) => {
      const dateStr = formatIsoDate(date)
      const dayTickets = inquiriesByDate[dateStr] || []
      map[dateStr] = layoutDayEvents(dayTickets, CALENDAR_START_HOUR, HOUR_HEIGHT)
    })
    return map
  }, [weekDates, inquiriesByDate])

  // Inquiries mapped by date and hour (for day view and backward compatibility)
  const inquiriesByDateAndHour = useMemo(() => {
    const map = {}
    filteredInquiries.forEach((ticket) => {
      const dateStr = ticket.effectiveDate
      const parsed = parseTimeSlotMinutes(ticket.effectiveTimeSlot)
      let hour = parsed ? parsed.hour : 9
      const key = `${dateStr}_${hour}`
      if (!map[key]) map[key] = []
      map[key].push(ticket)
    })
    return map
  }, [filteredInquiries])

  // Summary Metrics
  const metrics = useMemo(() => {
    const total = filteredInquiries.length
    const todayCount = filteredInquiries.filter(t => t.effectiveDate === todayIso).length
    const pendingCount = filteredInquiries.filter(t => normalizeInquiryStatus(t.status) === 'Pending').length
    const confirmedCount = filteredInquiries.filter(t => normalizeInquiryStatus(t.status) === 'Confirmed').length
    const pickupCount = filteredInquiries.filter(t => isPickupTicket(t)).length
    return { total, todayCount, pendingCount, confirmedCount, pickupCount }
  }, [filteredInquiries, todayIso])

  // Navigation handlers
  const handlePrev = () => {
    const next = new Date(currentDate)
    if (calendarSubView === 'week') next.setDate(next.getDate() - 7)
    else if (calendarSubView === 'month') next.setMonth(next.getMonth() - 1)
    else next.setDate(next.getDate() - 1)
    setCurrentDate(next)
  }

  const handleNext = () => {
    const next = new Date(currentDate)
    if (calendarSubView === 'week') next.setDate(next.getDate() + 7)
    else if (calendarSubView === 'month') next.setMonth(next.getMonth() + 1)
    else next.setDate(next.getDate() + 1)
    setCurrentDate(next)
  }

  const handleToday = () => {
    setCurrentDate(new Date())
  }

  // Open inquiry detail modal
  const handleOpenInquiry = (inquiry) => {
    setSelectedInquiry(inquiry)
    setModalDate(inquiry.effectiveDate || getNextBusinessDay())
    setModalTime(parseTimeTo24Hour(inquiry.effectiveTimeSlot || inquiry.visit_time_slot))
    setModalStatus(normalizeInquiryStatus(inquiry.status))
    setModalBranch(inquiry.store_branch || 'Cavite Distribution Hub')
    setModalStaffNotes(inquiry.staff_notes || inquiry.notes || '')
    setModalError('')
    setModalSuccess('')
    setCopiedCode(false)
  }

  // Save changes to database
  const handleSaveModal = async () => {
    if (!selectedInquiry) return

    setModalError('')

    if (!modalDate) {
      setModalError('Please select a visit date.')
      return
    }
    const selectedDateObj = new Date(modalDate + 'T00:00:00')
    if (isNaN(selectedDateObj.getTime())) {
      setModalError('Please choose a valid calendar date.')
      return
    }
    if (selectedDateObj.getDay() === 0) {
      setModalError('Our showrooms are closed on Sundays. Please choose Monday through Saturday.')
      return
    }

    if (!modalTime) {
      setModalError('Please select a visit time.')
      return
    }
    if (!isWithinBusinessHours(modalTime)) {
      setModalError('Showroom visits must be scheduled within business hours: 9:00 AM to 5:00 PM.')
      return
    }

    const formattedTime = format24HourToDisplay(modalTime)

    try {
      setModalSaving(true)
      const updates = {
        visit_date: modalDate,
        visit_time_slot: formattedTime,
        status: modalStatus,
        store_branch: modalBranch,
        staff_notes: modalStaffNotes,
        updated_at: new Date().toISOString()
      }

      if (selectedInquiry.id) {
        const { error } = await supabase
          .from('quote_tickets')
          .update(updates)
          .eq('id', selectedInquiry.id)

        if (error) throw error
      }

      // Update local state
      setInquiries((prev) =>
        prev.map((t) =>
          t.ticket_code === selectedInquiry.ticket_code || t.id === selectedInquiry.id
            ? { ...t, ...updates }
            : t
        )
      )

      setModalSuccess('Inquiry schedule and status updated.')
      showToast(`Inquiry ${selectedInquiry.ticket_code} updated successfully.`)
    } catch (err) {
      console.error('Failed to update inquiry in Supabase:', err)
      setModalError('Failed to save changes to database.')
    } finally {
      setModalSaving(false)
    }
  }

  // Drag and drop reschedule
  const handleDragStart = (e, ticketId) => {
    e.dataTransfer.setData('text/plain', String(ticketId))
    e.dataTransfer.effectAllowed = 'move'
    setDraggingTicketId(ticketId)
  }

  const handleDragEnd = () => {
    setDraggingTicketId(null)
    setDragOverSlot(null)
  }

  const handleDragOver = (e, dateStr, hour, minute = 0) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (
      !dragOverSlot ||
      dragOverSlot.dateStr !== dateStr ||
      dragOverSlot.hour !== hour ||
      dragOverSlot.minute !== minute
    ) {
      setDragOverSlot({ dateStr, hour, minute })
    }
  }

  const handleDrop = async (e, dateStr, hour, minute = 0) => {
    e.preventDefault()
    setDragOverSlot(null)
    const ticketIdStr = e.dataTransfer.getData('text/plain') || draggingTicketId
    if (!ticketIdStr) return

    const ticketId = parseInt(ticketIdStr, 10)
    const ticket = inquiries.find((t) => t.id === ticketId)
    if (!ticket) return

    const startTotalMin = hour * 60 + minute
    const currentParsed = parseTimeSlotMinutes(ticket.effectiveTimeSlot)
    const duration = currentParsed ? currentParsed.durationMinutes : 40
    const newTimeSlot = formatSlotRange(startTotalMin, duration)

    if (ticket.visit_date === dateStr && ticket.visit_time_slot === newTimeSlot) {
      setDraggingTicketId(null)
      return
    }

    const prevDate = ticket.visit_date
    const prevTime = ticket.visit_time_slot

    // Optimistic UI update
    setInquiries((prev) =>
      prev.map((t) =>
        t.id === ticketId ? { ...t, visit_date: dateStr, visit_time_slot: newTimeSlot } : t
      )
    )
    setDraggingTicketId(null)
    showToast(`Rescheduled ${ticket.customer_name} to ${dateStr} at ${newTimeSlot}`)

    try {
      const { error } = await supabase
        .from('quote_tickets')
        .update({
          visit_date: dateStr,
          visit_time_slot: newTimeSlot,
          updated_at: new Date().toISOString()
        })
        .eq('id', ticketId)

      if (error) throw error
    } catch (err) {
      console.error('Failed to reschedule ticket via drag-drop:', err)
      setInquiries((prev) =>
        prev.map((t) =>
          t.id === ticketId ? { ...t, visit_date: prevDate, visit_time_slot: prevTime } : t
        )
      )
      showToast('Failed to save reschedule to database. Reverting.')
    }
  }

  // Create Walk-in / Phone inquiry
  const handleCreateInquiry = async (e) => {
    e.preventDefault()
    if (!newCustName.trim() || !newCustPhone.trim()) {
      setNewError('Customer name and contact number are required.')
      return
    }
    const cleanWalkInEmail = sanitizeEmail(newCustEmail)
    if (!cleanWalkInEmail || !isValidEmail(cleanWalkInEmail)) {
      setNewError('A valid customer email address is required.')
      return
    }
    if (!newVisitDate) {
      setNewError('Please select a visit date.')
      return
    }
    const selectedDateObj = new Date(newVisitDate + 'T00:00:00')
    if (isNaN(selectedDateObj.getTime())) {
      setNewError('Please choose a valid calendar date.')
      return
    }
    if (selectedDateObj.getDay() === 0) {
      setNewError('Our showrooms are closed on Sundays. Please choose Monday through Saturday.')
      return
    }

    if (!newVisitTime) {
      setNewError('Please select a visit time.')
      return
    }
    if (!isWithinBusinessHours(newVisitTime)) {
      setNewError('Showroom visits must be scheduled within business hours: 9:00 AM to 5:00 PM.')
      return
    }

    const formattedTime = format24HourToDisplay(newVisitTime)

    try {
      setNewCreating(true)
      setNewError('')

      const randomHex = Math.floor(100000 + Math.random() * 900000)
      const ticketCode = `JDS-${newType === 'PICKUP' ? 'RES' : 'INQ'}-${new Date().getFullYear()}-${randomHex}`
      const effectiveProvince = newCustProvince.trim() || 'Metro Manila (NCR)'
      const effectiveCity = newCustCity.trim() || 'Walk-in / Showroom'
      const effectiveBarangay = newCustBarangay.trim() || ''
      const effectiveStreet = newCustStreetAddress.trim() || ''
      const effectiveFacebook = formatFacebookUrl(newCustFacebook)
      const formattedAddress = formatFullAddress({
        street: effectiveStreet,
        province: effectiveProvince,
        city: effectiveCity,
        barangay: effectiveBarangay
      })

      const payload = {
        ticket_code: ticketCode,
        product_name: newProduct.trim() || 'Solar System Package',
        product_watt: newWatt ? Number(newWatt) : null,
        quantity: Number(newQuantity) || 1,
        customer_name: newCustName.trim(),
        mobile_contact: newCustPhone.trim(),
        email: cleanWalkInEmail,
        facebook: effectiveFacebook || null,
        street_address: effectiveStreet,
        province: effectiveProvince,
        city: effectiveCity,
        barangay: effectiveBarangay,
        delivery_address: formattedAddress,
        purpose_of_visitation: newType === 'PICKUP' ? 'Store Pickup & Reservation' : 'Showroom Consultation',
        will_visit: true,
        store_branch: newBranch,
        visit_date: newVisitDate,
        visit_time_slot: formattedTime,
        status: 'Confirmed',
        staff_notes: newStaffNotes.trim() || 'Created via Staff Calendar',
        created_at: new Date().toISOString()
      }

      let { data, error } = await supabase
        .from('quote_tickets')
        .insert([payload])
        .select()

      if (error && (error.code === '42703' || error.message?.includes('street_address') || error.message?.includes('province') || error.message?.includes('barangay') || error.message?.includes('facebook'))) {
        const fallbackPayload = { ...payload }
        if (error.message?.includes('street_address')) delete fallbackPayload.street_address
        if (error.message?.includes('province')) delete fallbackPayload.province
        if (error.message?.includes('barangay')) delete fallbackPayload.barangay
        if (error.message?.includes('facebook')) delete fallbackPayload.facebook
        fallbackPayload.city = `${effectiveCity}, ${effectiveProvince}`
        const fallbackRes = await supabase
          .from('quote_tickets')
          .insert([fallbackPayload])
          .select()
        data = fallbackRes.data
        error = fallbackRes.error
      }

      if (error) {
        console.warn('Supabase insert fallback:', error.message)
      }

      const finalRecord = data && data[0] ? data[0] : payload
      setInquiries((prev) => [finalRecord, ...prev])

      showToast(`Inquiry ${ticketCode} scheduled successfully.`)
      setNewSuccessTicket(finalRecord)

      // Dispatch confirmation email to customer
      if (finalRecord.email) {
        sendInquiryTicketEmail(finalRecord).catch(emailErr => {
          console.warn('Inquiry confirmation email dispatch warning:', emailErr)
        })
      }
    } catch (err) {
      console.error('Failed to create walk-in inquiry:', err)
      setNewError('Failed to record inquiry. Please check database connection.')
    } finally {
      setNewCreating(false)
    }
  }

  // Copy ticket code
  const handleCopyCode = (code) => {
    navigator.clipboard.writeText(code)
    setCopiedCode(true)
    setTimeout(() => setCopiedCode(false), 2000)
  }

  // Format header display date string
  const currentRangeLabel = useMemo(() => {
    if (calendarSubView === 'week') {
      const start = weekDates[0]
      const end = weekDates[6]
      return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
    } else if (calendarSubView === 'month') {
      return currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    } else {
      return currentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })
    }
  }, [calendarSubView, weekDates, currentDate])

  return (
    <div className="space-y-6 max-w-full overflow-x-hidden font-inter pb-12">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-[110] bg-jds-on-surface text-jds-surface px-4 py-3 rounded-xl shadow-xl flex items-center gap-3 text-xs font-semibold animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMsg}</span>
          <button onClick={() => setToastMsg('')} className="p-1 hover:opacity-70 ml-2">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Screen Header & Top Action Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-jds-on-surface flex items-center gap-2.5">
            <CalendarDays className="w-6 h-6 text-jds-primary" />
            <span>Inquiries & Showroom Schedule</span>
          </h1>
        </div>

        {/* View Switcher & Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Main View Toggle: Calendar vs Table */}
          <div className="flex items-center bg-jds-surface-container-low/70 p-1 rounded-xl border border-jds-outline-variant/30 text-xs">
            <button
              type="button"
              onClick={() => setViewMode('calendar')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${viewMode === 'calendar'
                  ? 'bg-white dark:bg-zinc-800 text-jds-primary shadow-2xs'
                  : 'text-jds-on-surface-variant hover:text-jds-on-surface'
                }`}
            >
              <CalendarDays className="w-3.5 h-3.5" />
              <span>Calendar</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${viewMode === 'table'
                  ? 'bg-white dark:bg-zinc-800 text-jds-primary shadow-2xs'
                  : 'text-jds-on-surface-variant hover:text-jds-on-surface'
                }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>Table</span>
            </button>
          </div>

          {/* Sync / Refresh Button */}
          <button
            type="button"
            onClick={loadInquiries}
            disabled={loading}
            className="px-3.5 py-2 rounded-xl border border-jds-outline-variant/40 bg-jds-surface text-xs font-bold text-jds-on-surface hover:bg-jds-surface-container transition-colors flex items-center gap-2 shadow-2xs cursor-pointer"
            title="Refresh database inquiries"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          {/* Clean Up Inactive Button */}
          <button
            type="button"
            onClick={() => setIsPurgeModalOpen(true)}
            className={`px-3.5 py-2 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs ${inactiveSummary.count > 0
                ? 'border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 hover:bg-amber-100'
                : 'border-jds-outline-variant/40 bg-jds-surface text-jds-on-surface hover:bg-jds-surface-container'
              }`}
            title="Purge obsolete and inactive inquiries from database"
          >
            <Trash2 className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span>Clean Up Inactive</span>
            {inactiveSummary.count > 0 && (
              <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-extrabold bg-amber-600 text-white">
                {inactiveSummary.count}
              </span>
            )}
          </button>

          {/* + New Inquiry Button */}
          <button
            type="button"
            onClick={() => {
              setNewVisitDate(getNextBusinessDay())
              setNewVisitTime('09:00')
              setNewError('')
              setIsNewModalOpen(true)
            }}
            className="px-4 py-2 rounded-xl bg-jds-primary hover:bg-jds-primary/90 text-white text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Inquiry</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
        <div className="bg-jds-surface-container-lowest dark:bg-white/[0.03] p-3.5 rounded-2xl shadow-xs border border-jds-outline-variant/20 space-y-1">
          <span className="text-[11px] font-semibold text-jds-on-surface-variant flex items-center gap-1.5">
            <Ticket className="w-3.5 h-3.5 text-jds-primary" /> Total Records
          </span>
          <div className="text-xl font-bold text-jds-on-surface">{metrics.total}</div>
        </div>

        <div className="bg-jds-surface-container-lowest dark:bg-white/[0.03] p-3.5 rounded-2xl shadow-xs border border-jds-outline-variant/20 space-y-1">
          <span className="text-[11px] font-semibold text-jds-on-surface-variant flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-amber-600" /> Today's Visits
          </span>
          <div className="text-xl font-bold text-jds-on-surface">{metrics.todayCount}</div>
        </div>

        <div className="bg-jds-surface-container-lowest dark:bg-white/[0.03] p-3.5 rounded-2xl shadow-xs border border-jds-outline-variant/20 space-y-1">
          <span className="text-[11px] font-semibold text-jds-on-surface-variant flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 text-slate-500" /> Pending Review
          </span>
          <div className="text-xl font-bold text-slate-700 dark:text-zinc-300">{metrics.pendingCount}</div>
        </div>

        <div className="bg-jds-surface-container-lowest dark:bg-white/[0.03] p-3.5 rounded-2xl shadow-xs border border-jds-outline-variant/20 space-y-1">
          <span className="text-[11px] font-semibold text-jds-on-surface-variant flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Confirmed
          </span>
          <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{metrics.confirmedCount}</div>
        </div>

        <div className="bg-jds-surface-container-lowest dark:bg-white/[0.03] p-3.5 rounded-2xl shadow-xs border border-jds-outline-variant/20 space-y-1 col-span-2 sm:col-span-1">
          <span className="text-[11px] font-semibold text-jds-on-surface-variant flex items-center gap-1.5">
            <ShoppingBag className="w-3.5 h-3.5 text-blue-600" /> Store Pickups
          </span>
          <div className="text-xl font-bold text-blue-600 dark:text-blue-400">{metrics.pickupCount}</div>
        </div>
      </div>

      {/* Control Toolbar: Date Navigation + Filters + Search */}
      <div className="bg-jds-surface-container-lowest dark:bg-white/[0.03] p-4 rounded-2xl shadow-xs border border-jds-outline-variant/20 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Navigation Controls */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrev}
            className="p-2 rounded-xl border border-jds-outline-variant/40 hover:bg-jds-surface-container transition-colors text-jds-on-surface cursor-pointer"
            title="Previous"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={handleToday}
            className="px-3 py-1.5 rounded-xl border border-jds-outline-variant/40 bg-jds-surface hover:bg-jds-surface-container text-xs font-bold text-jds-on-surface transition-colors cursor-pointer"
          >
            Today
          </button>

          <button
            type="button"
            onClick={handleNext}
            className="p-2 rounded-xl border border-jds-outline-variant/40 hover:bg-jds-surface-container transition-colors text-jds-on-surface cursor-pointer"
            title="Next"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <div className="ml-2 font-bold text-xs sm:text-sm text-jds-on-surface">
            {currentRangeLabel}
          </div>

          {/* Calendar Sub-views toggle: Week / Month / Day */}
          {viewMode === 'calendar' && (
            <div className="ml-3 hidden sm:flex items-center bg-jds-surface-container-low/70 p-0.5 rounded-xl border border-jds-outline-variant/30 text-[11px]">
              <button
                type="button"
                onClick={() => setCalendarSubView('week')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${calendarSubView === 'week'
                    ? 'bg-white dark:bg-zinc-800 text-jds-primary shadow-2xs'
                    : 'text-jds-on-surface-variant hover:text-jds-on-surface'
                  }`}
              >
                Week
              </button>
              <button
                type="button"
                onClick={() => setCalendarSubView('month')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${calendarSubView === 'month'
                    ? 'bg-white dark:bg-zinc-800 text-jds-primary shadow-2xs'
                    : 'text-jds-on-surface-variant hover:text-jds-on-surface'
                  }`}
              >
                Month
              </button>
              <button
                type="button"
                onClick={() => setCalendarSubView('day')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${calendarSubView === 'day'
                    ? 'bg-white dark:bg-zinc-800 text-jds-primary shadow-2xs'
                    : 'text-jds-on-surface-variant hover:text-jds-on-surface'
                  }`}
              >
                Day
              </button>
            </div>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Branch Filter */}
          <div className="flex items-center gap-1 bg-jds-surface-container-low/60 rounded-xl px-2.5 py-1.5 border border-jds-outline-variant/30 text-xs">
            <Building2 className="w-3.5 h-3.5 text-jds-primary shrink-0" />
            <select
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              className="bg-transparent font-semibold text-jds-on-surface focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Branches</option>
              <option value="Cavite">Cavite Hub</option>
              <option value="Quiapo">Quiapo Showroom</option>
            </select>
          </div>

          {/* Type Filter */}
          <div className="flex items-center gap-1 bg-jds-surface-container-low/60 rounded-xl px-2.5 py-1.5 border border-jds-outline-variant/30 text-xs">
            <Tag className="w-3.5 h-3.5 text-jds-primary shrink-0" />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="bg-transparent font-semibold text-jds-on-surface focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Types</option>
              <option value="PICKUP">Store Pickups</option>
              <option value="INQUIRY">Consultations</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1 bg-jds-surface-container-low/60 rounded-xl px-2.5 py-1.5 border border-jds-outline-variant/30 text-xs">
            <Filter className="w-3.5 h-3.5 text-jds-primary shrink-0" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent font-semibold text-jds-on-surface focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              {INQUIRY_STATUSES.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>

          {/* Search Input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-jds-on-surface-variant/60 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search customer, ticket code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs rounded-xl bg-jds-surface-container-low/60 border border-jds-outline-variant/30 text-jds-on-surface placeholder:text-jds-on-surface-variant/40 focus:outline-none focus:border-jds-primary w-44 sm:w-56"
            />
          </div>
        </div>
      </div>

      {/* VIEW MODE: CALENDAR */}
      {viewMode === 'calendar' && (
        <div className="space-y-4">
          {/* 1. WEEK VIEW: Google Calendar Style Timeline */}
          {calendarSubView === 'week' && (
            <div className="bg-jds-surface-container-lowest dark:bg-white/[0.03] rounded-2xl shadow-xs border border-jds-outline-variant/20 overflow-hidden">
              <div ref={calendarScrollRef} className="overflow-x-auto max-h-[780px] overflow-y-auto">
                <div className="min-w-[1050px] w-full">
                  {/* Calendar Grid Header: Days of Week (Fixed Width & Sticky) */}
                  <div className="sticky top-0 z-20 grid grid-cols-[80px_repeat(7,minmax(0,1fr))] border-b border-jds-outline-variant/30 bg-jds-surface shadow-xs">
                    <div className="p-3 text-[11px] font-bold text-jds-on-surface-variant/70 border-r border-jds-outline-variant/20 flex items-center justify-center">
                      Time
                    </div>
                    {weekDates.map((date) => {
                      const dateStr = formatIsoDate(date)
                      const isToday = dateStr === todayIso
                      const isSunday = date.getDay() === 0
                      const dayCount = (inquiriesByDate[dateStr] || []).length

                      return (
                        <div
                          key={dateStr}
                          className={`p-3 text-center border-r border-jds-outline-variant/20 last:border-r-0 ${isToday ? 'bg-jds-primary/5' : ''
                            } ${isSunday ? 'bg-stone-100/50 dark:bg-zinc-900/40' : ''}`}
                        >
                          <div className="text-[11px] font-bold uppercase tracking-wider text-jds-on-surface-variant/70">
                            {date.toLocaleDateString('en-US', { weekday: 'short' })}
                          </div>
                          <div
                            className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold mt-1 ${isToday
                                ? 'bg-jds-primary text-white shadow-xs'
                                : 'text-jds-on-surface'
                              }`}
                          >
                            {date.getDate()}
                          </div>
                          {dayCount > 0 && (
                            <div className="mt-1">
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-jds-surface-container text-jds-on-surface-variant border border-jds-outline-variant/40">
                                {dayCount} {dayCount === 1 ? 'inquiry' : 'inquiries'}
                              </span>
                            </div>
                          )}
                          {isSunday && (
                            <div className="text-[9px] text-stone-400 font-semibold mt-0.5">
                              Closed
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>

                  {/* Continuous Timeline Grid Body (Strictly Fixed Geometry) */}
                  <div className="grid grid-cols-[80px_repeat(7,minmax(0,1fr))] relative select-none">
                    {/* Time Gutter Column */}
                    <div className="border-r border-jds-outline-variant/20 bg-jds-surface-container-low/20 divide-y divide-jds-outline-variant/20">
                      {BUSINESS_HOURS.map((hourObj) => {
                        return (
                          <div
                            key={hourObj.hour}
                            className="h-[120px] px-2 py-1.5 flex flex-col justify-start"
                          >
                            <span className="text-[11px] font-bold text-jds-on-surface">
                              {hourObj.label}
                            </span>
                          </div>
                        )
                      })}
                    </div>

                    {/* 7 Day Columns with 10-minute Sub-grids and Side-by-Side Cards */}
                    {weekDates.map((date) => {
                      const dateStr = formatIsoDate(date)
                      const isToday = dateStr === todayIso
                      const isSunday = date.getDay() === 0
                      const dayLayouts = weekDayLayouts[dateStr] || []

                      return (
                        <div
                          key={dateStr}
                          className={`relative h-[1560px] border-r border-jds-outline-variant/20 last:border-r-0 ${isToday ? 'bg-jds-primary/[0.02]' : ''
                            } ${isSunday ? 'bg-stone-50/60 dark:bg-zinc-900/20' : ''}`}
                        >
                          {/* Background 10-minute Sub-grid lines (droppable) */}
                          <div className="absolute inset-0 flex flex-col divide-y divide-jds-outline-variant/20 pointer-events-auto">
                            {BUSINESS_HOURS.map((hourObj) => {
                              return (
                                <div key={hourObj.hour} className="h-[120px] flex flex-col">
                                  {[0, 10, 20, 30, 40, 50].map((subMin) => {
                                    const isHalfHour = subMin === 30
                                    const isSlotEnd = subMin === 50
                                    return (
                                      <div
                                        key={subMin}
                                        onDragOver={(e) => handleDragOver(e, dateStr, hourObj.hour, subMin)}
                                        onDrop={(e) => handleDrop(e, dateStr, hourObj.hour, subMin)}
                                        title={`${formatMinutesToTime(hourObj.hour * 60 + subMin)} - Drag here to schedule`}
                                        className={`h-[20px] transition-colors ${!isSlotEnd
                                            ? isHalfHour
                                              ? 'border-b border-jds-outline-variant/30'
                                              : 'border-b border-dashed border-jds-outline-variant/15'
                                            : ''
                                          } ${dragOverSlot?.dateStr === dateStr &&
                                            dragOverSlot?.hour === hourObj.hour &&
                                            dragOverSlot?.minute === subMin
                                            ? 'bg-jds-primary/20 ring-1 ring-jds-primary/40 ring-inset'
                                            : 'hover:bg-jds-primary/[0.04]'
                                          }`}
                                      />
                                    )
                                  })}
                                </div>
                              )
                            })}
                          </div>

                          {/* Real-time Current Time Indicator for Today */}
                          {isToday && (
                            <div
                              style={{ top: `${timeIndicatorTop}px` }}
                              className="absolute left-0 right-0 z-30 pointer-events-none flex items-center -translate-y-1/2"
                            >
                              <div
                                className={`w-3 h-3 rounded-full ${isOutOfOperatingHours
                                    ? 'bg-amber-600 ring-2 ring-amber-300 dark:ring-amber-900'
                                    : 'bg-red-500 ring-2 ring-red-200 dark:ring-red-950'
                                  } shadow-sm -ml-1.5 shrink-0`}
                              />
                              <div
                                className={`h-[2px] flex-1 ${isOutOfOperatingHours ? 'bg-amber-500/80' : 'bg-red-500/90'
                                  } shadow-xs`}
                              />
                              <span
                                className={`shrink-0 px-2 py-0.5 rounded text-[10px] font-extrabold tracking-tight text-white shadow-xs ml-1 whitespace-nowrap ${isOutOfOperatingHours ? 'bg-amber-600' : 'bg-red-600'
                                  }`}
                              >
                                {isOutOfOperatingHours
                                  ? `Outside Hours (${formattedCurrentTime})`
                                  : formattedCurrentTime}
                              </span>
                            </div>
                          )}

                          {/* Foreground Appointments Layer (Side-by-side Google Calendar stacking) */}
                          {dayLayouts.map((ticket) => {
                            const statusConfig = getInquiryStatusConfig(ticket.status)
                            const isPickup = isPickupTicket(ticket)
                            const isDragging = draggingTicketId === ticket.id
                            const timeDisplay = ticket.effectiveTimeSlot || '09:00 AM'

                            return (
                              <div
                                key={ticket.id || ticket.ticket_code}
                                draggable
                                onDragStart={(e) => handleDragStart(e, ticket.id)}
                                onDragEnd={handleDragEnd}
                                onClick={() => handleOpenInquiry(ticket)}
                                style={ticket.layout.style}
                                title={`${ticket.customer_name} (${ticket.ticket_code})\nLocation: ${ticket.barangay ? 'Brgy. ' + ticket.barangay + ', ' : ''}${ticket.city || ''}${ticket.province ? ', ' + ticket.province : ''}\n${timeDisplay}\nStatus: ${statusConfig.label}`}
                                className={`absolute p-2 rounded-xl text-left border cursor-pointer transition-all group overflow-hidden ${statusConfig.calendarClass} ${isDragging
                                    ? 'opacity-30 scale-95 pointer-events-none'
                                    : 'hover:z-30 hover:shadow-lg hover:ring-2 hover:ring-jds-primary/40'
                                  }`}
                              >
                                {/* Header: Ticket Code & Status */}
                                <div className="flex items-center justify-between gap-1 mb-0.5">
                                  <span className="text-[10px] font-bold text-jds-on-surface truncate">
                                    {ticket.ticket_code}
                                  </span>
                                  <span
                                    className={`text-[8.5px] font-bold px-1 py-0.2 rounded border shrink-0 ${statusConfig.badgeClass}`}
                                  >
                                    {statusConfig.label}
                                  </span>
                                </div>

                                {/* Customer Name */}
                                <div className="font-bold text-xs text-jds-on-surface truncate group-hover:text-jds-primary transition-colors leading-tight">
                                  {ticket.customer_name}
                                </div>

                                {/* Time badge with exact minutes */}
                                <div className="flex items-center gap-1 text-[9.5px] font-semibold text-jds-on-surface-variant/90 mt-0.5 truncate">
                                  <Clock className="w-2.5 h-2.5 shrink-0 text-jds-primary" />
                                  <span className="truncate">{timeDisplay}</span>
                                </div>

                                {/* Details: Product & Branch */}
                                {ticket.layout.height >= 52 && (
                                  <div className="mt-1 pt-1 border-t border-black/5 dark:border-white/5 flex items-center justify-between text-[9px] text-jds-on-surface-variant truncate">
                                    <span className="truncate">{ticket.product_name || 'Inquiry'}</span>
                                    <span className="font-semibold shrink-0 ml-1">
                                      {ticket.store_branch?.includes('Quiapo') ? 'Quiapo' : 'Cavite'}
                                    </span>
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 2. MONTH VIEW */}
          {calendarSubView === 'month' && (
            <div className="bg-jds-surface-container-lowest dark:bg-white/[0.03] rounded-2xl shadow-xs border border-jds-outline-variant/20 overflow-hidden">
              {/* Day of Week Headers */}
              <div className="grid grid-cols-7 border-b border-jds-outline-variant/30 bg-jds-surface-container-low/40">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
                  <div
                    key={d}
                    className="p-2.5 text-center text-xs font-bold uppercase tracking-wider text-jds-on-surface-variant/70 border-r border-jds-outline-variant/20 last:border-r-0"
                  >
                    {d}
                  </div>
                ))}
              </div>

              {/* Month Grid Cells */}
              <div className="grid grid-cols-7 auto-rows-[110px] divide-x divide-y divide-jds-outline-variant/20">
                {monthDays.map((d) => {
                  const dateStr = formatIsoDate(d)
                  const isCurrentMonth = d.getMonth() === currentDate.getMonth()
                  const isToday = dateStr === todayIso
                  const isSunday = d.getDay() === 0
                  const dayInquiries = inquiriesByDate[dateStr] || []

                  return (
                    <div
                      key={dateStr}
                      onClick={() => {
                        setCurrentDate(d)
                        setCalendarSubView('day')
                      }}
                      className={`p-2 transition-colors cursor-pointer hover:bg-jds-surface-container-low/50 flex flex-col justify-between ${!isCurrentMonth ? 'opacity-40 bg-stone-50/30 dark:bg-zinc-900/30' : ''
                        } ${isToday ? 'bg-jds-primary/5 ring-1 ring-jds-primary/30 ring-inset' : ''} ${isSunday ? 'bg-stone-50/50 dark:bg-zinc-900/20' : ''
                        }`}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-xs font-bold inline-flex items-center justify-center w-6 h-6 rounded-full ${isToday ? 'bg-jds-primary text-white' : 'text-jds-on-surface'
                            }`}
                        >
                          {d.getDate()}
                        </span>
                        {dayInquiries.length > 0 && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-jds-primary/10 text-jds-primary">
                            {dayInquiries.length}
                          </span>
                        )}
                      </div>

                      {/* Mini pill list */}
                      <div className="space-y-1 overflow-hidden mt-1">
                        {dayInquiries.slice(0, 2).map((item) => {
                          const config = getInquiryStatusConfig(item.status)
                          return (
                            <div
                              key={item.id || item.ticket_code}
                              onClick={(e) => {
                                e.stopPropagation()
                                handleOpenInquiry(item)
                              }}
                              className={`px-1.5 py-0.5 rounded text-[10px] font-semibold truncate border ${config.badgeClass}`}
                            >
                              {item.customer_name}
                            </div>
                          )
                        })}
                        {dayInquiries.length > 2 && (
                          <div className="text-[9px] font-bold text-jds-on-surface-variant/70 pl-1">
                            +{dayInquiries.length - 2} more
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* 3. DAY VIEW */}
          {calendarSubView === 'day' && (
            <div className="bg-jds-surface-container-lowest dark:bg-white/[0.03] rounded-2xl shadow-xs border border-jds-outline-variant/20 p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-jds-outline-variant/20 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-jds-on-surface">
                      {currentDate.toLocaleDateString('en-US', {
                        weekday: 'long',
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </h3>
                    {formatIsoDate(currentDate) === todayIso && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-jds-primary/10 text-jds-primary border border-jds-primary/20">
                        <Clock className="w-3 h-3" />
                        <span>Current Time: {formattedCurrentTime}</span>
                        {isOutOfOperatingHours && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-700 dark:text-amber-300">
                            Outside Operating Hours
                          </span>
                        )}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-jds-on-surface-variant">
                    {(inquiriesByDate[formatIsoDate(currentDate)] || []).length} appointments & inquiries scheduled
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setCalendarSubView('week')}
                  className="px-3 py-1.5 rounded-xl border border-jds-outline-variant/40 hover:bg-jds-surface-container text-xs font-bold text-jds-on-surface"
                >
                  Return to Week View
                </button>
              </div>

              {/* Day Time Slots */}
              <div className="space-y-3">
                {BUSINESS_HOURS.map((hourObj) => {
                  const dateStr = formatIsoDate(currentDate)
                  const slotKey = `${dateStr}_${hourObj.hour}`
                  const slotItems = inquiriesByDateAndHour[slotKey] || []
                  const isCurrentHourSlot =
                    formatIsoDate(currentDate) === todayIso &&
                    currentHour === hourObj.hour &&
                    !isOutOfOperatingHours

                  return (
                    <div
                      key={hourObj.hour}
                      className={`flex gap-4 p-3 rounded-xl border transition-all ${isCurrentHourSlot
                          ? 'border-jds-primary/40 ring-1 ring-jds-primary/30 bg-jds-primary/[0.03]'
                          : 'border-jds-outline-variant/20 bg-jds-surface-container-low/20'
                        }`}
                    >
                      <div className="w-24 shrink-0 font-bold text-xs text-jds-on-surface-variant pt-1 flex flex-col items-start gap-1">
                        <span>{hourObj.label}</span>
                        {isCurrentHourSlot && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-red-600 text-white shadow-2xs">
                            NOW
                          </span>
                        )}
                      </div>

                      <div className="flex-1 space-y-2">
                        {slotItems.length === 0 ? (
                          <div className="text-xs text-stone-400 italic py-1">
                            No appointments scheduled for this slot
                          </div>
                        ) : (
                          slotItems.map((item) => {
                            const config = getInquiryStatusConfig(item.status)
                            return (
                              <div
                                key={item.id || item.ticket_code}
                                onClick={() => handleOpenInquiry(item)}
                                className={`p-3 rounded-xl border cursor-pointer hover:shadow-md transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${config.calendarClass}`}
                              >
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-xs text-jds-on-surface">
                                      {item.ticket_code}
                                    </span>
                                    <span
                                      className={`text-[10px] font-bold px-2 py-0.5 rounded border ${config.badgeClass}`}
                                    >
                                      {config.label}
                                    </span>
                                    <span className="text-[11px] font-bold text-jds-secondary bg-jds-secondary-container/20 px-2 py-0.5 rounded">
                                      {item.store_branch?.includes('Quiapo') ? 'Quiapo Showroom' : 'Cavite Hub'}
                                    </span>
                                  </div>
                                  <div className="font-bold text-sm text-jds-on-surface">
                                    {item.customer_name} • {item.mobile_contact}
                                  </div>
                                  <div className="text-xs text-jds-on-surface-variant">
                                    {item.product_name} {item.quantity ? `(Qty: ${item.quantity})` : ''}
                                  </div>
                                </div>

                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleOpenInquiry(item)
                                    }}
                                    className="px-3 py-1.5 rounded-lg bg-white dark:bg-zinc-800 border border-stone-200 dark:border-zinc-700 text-xs font-bold text-jds-on-surface hover:bg-stone-50"
                                  >
                                    Manage
                                  </button>
                                </div>
                              </div>
                            )
                          })
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* VIEW MODE: TABLE */}
      {viewMode === 'table' && (
        <div className="bg-jds-surface-container-lowest dark:bg-white/[0.03] rounded-2xl shadow-xs border border-jds-outline-variant/20 overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-jds-surface-container-low/50">
                <TableRow>
                  <TableHead className="w-[140px] text-xs font-bold">Ticket Code</TableHead>
                  <TableHead className="text-xs font-bold">Customer Details</TableHead>
                  <TableHead className="text-xs font-bold">Product Inquired</TableHead>
                  <TableHead className="text-xs font-bold">Branch & Schedule</TableHead>
                  <TableHead className="text-xs font-bold">Status</TableHead>
                  <TableHead className="text-right text-xs font-bold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInquiries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-xs text-jds-on-surface-variant">
                      No inquiries match the active filters or search query.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredInquiries.map((q) => {
                    const statusConfig = getInquiryStatusConfig(q.status)
                    const isPickup = isPickupTicket(q)

                    return (
                      <TableRow
                        key={q.id || q.ticket_code}
                        onClick={() => handleOpenInquiry(q)}
                        className="cursor-pointer hover:bg-jds-surface-container-low/40 transition-colors"
                      >
                        <TableCell>
                          <div className="font-mono font-bold text-xs text-jds-on-surface">
                            {q.ticket_code}
                          </div>
                          <div className="text-[10px] text-jds-on-surface-variant mt-0.5">
                            {isPickup ? 'Store Pickup' : 'Consultation'}
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className="font-bold text-sm text-jds-on-surface">{q.customer_name}</div>
                          <div className="text-xs text-jds-on-surface-variant flex items-center gap-1.5 mt-0.5">
                            <span>{q.mobile_contact}</span>
                            <span>•</span>
                            <span className="truncate max-w-[220px]" title={q.delivery_address || q.city}>
                              {q.street_address ? `${q.street_address}, ` : ''}{q.barangay ? `${(q.city || '').toLowerCase().includes('manila') && !(q.city || '').toLowerCase().includes('metro') ? '' : 'Brgy. '}${q.barangay.replace(/^brgy\.?\s*/i, '')}, ` : ''}{q.city || 'Metro Manila'}{q.province ? `, ${q.province}` : ''}
                            </span>
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className="font-semibold text-xs text-jds-on-surface max-w-[200px] truncate" title={q.product_name}>
                            {q.product_name}
                          </div>
                          <div className="text-[11px] text-jds-primary font-bold mt-0.5">
                            Qty: {q.quantity || 1} {q.product_watt ? `(${q.product_watt}W)` : ''}
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className="space-y-1">
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-jds-secondary bg-jds-secondary-container/20 px-2 py-0.5 rounded">
                              <Building2 className="h-3 w-3" />
                              <span>{q.store_branch?.includes('Quiapo') ? 'Quiapo Showroom' : 'Cavite Hub'}</span>
                            </span>
                            <div
                              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-semibold border ${statusConfig.calendarClass}`}
                            >
                              <CalendarIcon className={`h-3.5 w-3.5 shrink-0 ${statusConfig.calendarIconClass}`} />
                              <span>{q.effectiveDate}</span>
                              <span className="opacity-40">•</span>
                              <span>{q.effectiveTimeSlot?.split(' ')[0] || '09:00 AM'}</span>
                            </div>
                          </div>
                        </TableCell>

                        <TableCell>
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold border ${statusConfig.badgeClass}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.dotClass}`} />
                            <span>{statusConfig.label}</span>
                          </span>
                        </TableCell>

                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenInquiry(q)}
                              className="px-3 py-1.5 rounded-lg border border-jds-outline-variant/60 text-xs font-bold text-jds-on-surface hover:bg-jds-surface-container transition-colors"
                            >
                              Manage
                            </button>
                            <button
                              type="button"
                              onClick={() => setTicketToDelete(q)}
                              className="p-1.5 rounded-lg border border-rose-200 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                              title="Delete inquiry"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* DETAIL & EDIT MODAL */}
      {selectedInquiry && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget && !modalSaving) handleCloseModal()
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-jds-surface rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-jds-outline-variant/30 space-y-5 max-h-[92vh] overflow-y-auto my-auto"
          >
            {modalSuccess ? (
              <AnimatedConfirmation
                title="Inquiry Updated Successfully"
                description={modalSuccess}
                referenceCode={selectedInquiry.ticket_code}
                duration={1800}
                onComplete={() => handleCloseModal()}
              />
            ) : (
              <>
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-jds-outline-variant/20 pb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-xs font-bold text-jds-primary bg-jds-primary/10 px-2.5 py-1 rounded-lg">
                    {selectedInquiry.ticket_code}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopyCode(selectedInquiry.ticket_code)}
                    className="p-1 text-jds-on-surface-variant hover:text-jds-on-surface transition-colors"
                    title="Copy ticket code"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  {copiedCode && <span className="text-[10px] text-emerald-600 font-bold">Copied!</span>}
                </div>
                <h3 className="text-lg font-bold text-jds-on-surface">
                  {selectedInquiry.customer_name}
                </h3>
                <p className="text-xs text-jds-on-surface-variant">
                  {selectedInquiry.barangay ? `${(selectedInquiry.city || '').toLowerCase().includes('manila') && !(selectedInquiry.city || '').toLowerCase().includes('metro') ? '' : 'Brgy. '}${selectedInquiry.barangay.replace(/^brgy\.?\s*/i, '')}, ` : ''}{selectedInquiry.city || 'Showroom Customer'}{selectedInquiry.province ? `, ${selectedInquiry.province}` : ''} • {selectedInquiry.mobile_contact}
                </p>
                {selectedInquiry.facebook && (
                  <div className="mt-2.5">
                    <a
                      href={selectedInquiry.facebook}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#1877F2]/10 hover:bg-[#1877F2]/20 text-[#1877F2] border border-[#1877F2]/30 transition-all shadow-sm"
                    >
                      <FaFacebook className="h-3.5 w-3.5 shrink-0 text-[#1877F2]" />
                      <span className="truncate max-w-[200px]">
                        {selectedInquiry.facebook.replace(/^https?:\/\/(www\.)?facebook\.com\//i, '')}
                      </span>
                      <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 bg-[#1877F2] text-white rounded">Profile</span>
                      <ExternalLink className="h-3 w-3 shrink-0 opacity-70" />
                    </a>
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={handleCloseModal}
                className="p-1.5 rounded-lg hover:bg-jds-surface-container text-jds-on-surface-variant transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Product Summary */}
            <div className="p-3.5 rounded-xl bg-jds-surface-container-low/60 border border-jds-outline-variant/20 space-y-1">
              <div className="text-[10px] font-bold uppercase tracking-wider text-jds-on-surface-variant/70">
                Inquired Equipment & Purpose
              </div>
              <div className="font-bold text-sm text-jds-on-surface">
                {selectedInquiry.product_name}
              </div>
              <div className="text-xs text-jds-on-surface-variant flex items-center gap-2">
                <span>Quantity: {selectedInquiry.quantity || 1}</span>
                {selectedInquiry.product_watt && <span>• {selectedInquiry.product_watt}W</span>}
                <span>• {selectedInquiry.purpose_of_visitation || 'Consultation'}</span>
              </div>
            </div>

            {/* Customer Location & Address Details */}
            <div className="p-3.5 rounded-xl bg-jds-surface-container-low/60 border border-jds-outline-variant/20 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-jds-on-surface-variant/70">
                  Customer Location & Address
                </span>
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-jds-surface border border-jds-outline-variant/30 text-jds-on-surface-variant">
                  {selectedInquiry.province || 'Philippines'}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                <div className="p-2.5 rounded-lg bg-jds-surface border border-jds-outline-variant/20 sm:col-span-3">
                  <span className="text-[10px] text-jds-on-surface-variant block mb-0.5">House / Street Address</span>
                  <span className="font-semibold text-jds-on-surface truncate block">
                    {selectedInquiry.street_address || (selectedInquiry.delivery_address ? selectedInquiry.delivery_address.split(',')[0] : 'Not Specified')}
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-jds-surface border border-jds-outline-variant/20">
                  <span className="text-[10px] text-jds-on-surface-variant block mb-0.5">Barangay / District</span>
                  <span className="font-semibold text-jds-on-surface truncate block">
                    {selectedInquiry.barangay ? ((selectedInquiry.city || '').toLowerCase().includes('manila') && !(selectedInquiry.city || '').toLowerCase().includes('metro') ? selectedInquiry.barangay : `Brgy. ${selectedInquiry.barangay.replace(/^brgy\.?\s*/i, '')}`) : 'Not Specified'}
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-jds-surface border border-jds-outline-variant/20">
                  <span className="text-[10px] text-jds-on-surface-variant block mb-0.5">City / Municipality</span>
                  <span className="font-semibold text-jds-on-surface truncate block">
                    {selectedInquiry.city || 'Showroom Customer'}
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-jds-surface border border-jds-outline-variant/20">
                  <span className="text-[10px] text-jds-on-surface-variant block mb-0.5">Province</span>
                  <span className="font-semibold text-jds-on-surface truncate block">
                    {selectedInquiry.province || 'Metro Manila (NCR)'}
                  </span>
                </div>
              </div>
              {selectedInquiry.delivery_address && (
                <div className="text-[11px] text-jds-on-surface-variant flex items-center gap-1.5 pt-1.5 border-t border-jds-outline-variant/10">
                  <MapPin className="h-3.5 w-3.5 text-jds-primary shrink-0" />
                  <span className="truncate">{selectedInquiry.delivery_address}</span>
                </div>
              )}
            </div>

            {/* Editable Fields Form */}
            <div className="space-y-4">
              {/* Status Selector */}
              <div>
                <label className="block text-xs font-semibold text-jds-on-surface mb-1">
                  Inquiry Status
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {INQUIRY_STATUSES.map((st) => {
                    const isSelected = modalStatus === st
                    const cfg = getInquiryStatusConfig(st)
                    return (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setModalStatus(st)}
                        className={`p-2.5 rounded-xl text-xs font-bold border text-left transition-all flex items-center justify-between ${isSelected
                            ? `${cfg.badgeClass} ring-2 ring-jds-primary/20`
                            : 'border-jds-outline-variant/30 text-jds-on-surface-variant hover:bg-jds-surface-container-low'
                          }`}
                      >
                        <span>{cfg.label}</span>
                        {isSelected && <Check className="w-3.5 h-3.5" />}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Showroom Business Hours Banner */}
              <div className="p-3 rounded-xl border border-jds-outline-variant/30 bg-jds-surface-container-low/60 text-xs text-jds-on-surface flex items-start gap-2.5">
                <Clock className="h-4 w-4 text-jds-primary shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block text-jds-on-surface">Showroom Business Hours</span>
                  <span className="text-[11px] text-jds-on-surface-variant block mt-0.5">
                    Monday to Saturday: 9:00 AM – 5:00 PM • Closed on Sundays
                  </span>
                </div>
              </div>

              {/* Date & Time Slot */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-jds-on-surface">
                      Scheduled Visit Date <span className="text-amber-600">*</span>
                    </label>
                    <span className="text-[11px] text-jds-on-surface-variant font-medium">Mon – Sat Only</span>
                  </div>
                  <input
                    type="date"
                    min={minBusinessDateStr}
                    required
                    value={modalDate}
                    onClick={(e) => {
                      try {
                        e.currentTarget.showPicker?.()
                      } catch (err) { }
                    }}
                    onChange={(e) => {
                      setModalDate(e.target.value)
                      setModalError('')
                    }}
                    className="w-full text-xs p-2.5 rounded-xl border border-jds-outline-variant/40 bg-jds-surface text-jds-on-surface focus:outline-none focus:border-jds-primary cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-jds-on-surface">
                      Time Slot <span className="text-amber-600">*</span>
                    </label>
                    <span className="text-[11px] text-jds-on-surface-variant font-medium">9:00 AM – 5:00 PM</span>
                  </div>
                  <input
                    type="time"
                    min="09:00"
                    max="17:00"
                    step="900"
                    required
                    value={modalTime}
                    onClick={(e) => {
                      try {
                        e.currentTarget.showPicker?.()
                      } catch (err) { }
                    }}
                    onChange={(e) => {
                      setModalTime(e.target.value)
                      setModalError('')
                    }}
                    className="w-full text-xs p-2.5 rounded-xl border border-jds-outline-variant/40 bg-jds-surface text-jds-on-surface focus:outline-none focus:border-jds-primary font-semibold cursor-pointer"
                  />
                </div>
              </div>

              {modalError && (
                <div className="p-2.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs text-red-700 dark:text-red-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{modalError}</span>
                </div>
              )}

              {/* Branch */}
              <div>
                <label className="block text-xs font-semibold text-jds-on-surface mb-1">
                  Showroom Branch
                </label>
                <select
                  value={modalBranch}
                  onChange={(e) => setModalBranch(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-jds-outline-variant/40 bg-jds-surface text-jds-on-surface focus:outline-none focus:border-jds-primary cursor-pointer"
                >
                  <option value="Cavite Distribution Hub">Cavite Distribution Hub</option>
                  <option value="Quiapo Branch (Manila)">Quiapo Branch (Manila Showroom)</option>
                </select>
              </div>

              {/* Staff Notes */}
              <div>
                <label className="block text-xs font-semibold text-jds-on-surface mb-1">
                  Staff Notes & Next Steps
                </label>
                <textarea
                  rows={3}
                  value={modalStaffNotes}
                  onChange={(e) => setModalStaffNotes(e.target.value)}
                  placeholder="Record customer notes, requirements, or conversation summaries..."
                  className="w-full text-xs p-2.5 rounded-xl border border-jds-outline-variant/40 bg-jds-surface text-jds-on-surface focus:outline-none focus:border-jds-primary resize-none"
                />
              </div>
            </div>

            {/* Direct Contact Links */}
            {selectedInquiry.email && (
              <div className="flex items-center gap-3 pt-2">
                <a
                  href={`mailto:${selectedInquiry.email}`}
                  className="text-xs font-bold text-blue-700 bg-blue-50 dark:bg-blue-950/40 border border-blue-300 dark:border-blue-800 px-3 py-2 rounded-xl flex items-center gap-1.5 hover:bg-blue-100 transition-colors"
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>Send Email</span>
                </a>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-between border-t border-jds-outline-variant/20 pt-4">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 text-xs font-bold rounded-xl border border-jds-outline-variant/40 text-jds-on-surface hover:bg-jds-surface-container transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => setTicketToDelete(selectedInquiry)}
                  className="px-3.5 py-2 text-xs font-bold rounded-xl border border-rose-200 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 hover:bg-rose-100 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Inquiry</span>
                </button>
              </div>

              <button
                type="button"
                onClick={handleSaveModal}
                disabled={modalSaving}
                className="px-5 py-2 text-xs font-bold rounded-xl bg-jds-primary text-white hover:bg-jds-primary/90 transition-all flex items-center gap-2 shadow-xs cursor-pointer"
              >
                {modalSaving ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving to Database...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Save Changes</span>
                  </>
                )}
              </button>
            </div>
            </>
            )}
          </div>
        </div>
      )}

      {/* NEW INQUIRY / WALK-IN MODAL */}
      {isNewModalOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget && !newCreating) setIsNewModalOpen(false)
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-jds-surface rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-jds-outline-variant/30 space-y-4 max-h-[92vh] overflow-y-auto my-auto"
          >
            {newSuccessTicket ? (
              <AnimatedConfirmation
                title="Showroom Appointment Scheduled"
                description={`Showroom appointment booked for ${newSuccessTicket.customer_name} at ${newSuccessTicket.store_branch}.`}
                referenceCode={newSuccessTicket.ticket_code}
                duration={1800}
                onComplete={() => {
                  setNewSuccessTicket(null)
                  setIsNewModalOpen(false)
                  setNewCustName('')
                  setNewCustPhone('')
                  setNewCustEmail('')
                  setNewCustFacebook('')
                  setNewCustStreetAddress('')
                  setNewCustProvince('')
                  setNewCustProvinceCode('')
                  setNewCustCity('')
                  setNewCustCityCode('')
                  setNewCustBarangay('')
                  setNewCustBarangayCode('')
                  setNewLocationErrors({})
                  setNewProduct('')
                  setNewWatt('')
                  setNewQuantity(1)
                  setNewVisitDate(getNextBusinessDay())
                  setNewVisitTime('09:00')
                  setNewStaffNotes('')
                }}
              />
            ) : (
              <>
            <div className="flex items-start justify-between border-b border-jds-outline-variant/20 pb-3">
              <div>
                <h3 className="text-lg font-bold text-jds-on-surface">Log New Customer Inquiry</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsNewModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-jds-surface-container text-jds-on-surface-variant transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {newError && (
              <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs text-red-700 dark:text-red-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{newError}</span>
              </div>
            )}

            <form onSubmit={handleCreateInquiry} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-jds-on-surface mb-1">
                    Customer Name <span className="text-amber-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Full Name"
                    value={newCustName}
                    onChange={(e) => setNewCustName(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl border border-jds-outline-variant/40 bg-jds-surface text-jds-on-surface focus:outline-none focus:border-jds-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-jds-on-surface mb-1">
                    Contact Number <span className="text-amber-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="09XXXXXXXXX"
                    value={newCustPhone}
                    onChange={(e) => setNewCustPhone(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl border border-jds-outline-variant/40 bg-jds-surface text-jds-on-surface focus:outline-none focus:border-jds-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-jds-on-surface mb-1">
                  Email Address <span className="text-amber-600">*</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="customer@example.com"
                  value={newCustEmail}
                  onChange={(e) => {
                    setNewCustEmail(e.target.value)
                    if (newError) setNewError('')
                  }}
                  className="w-full text-xs p-2.5 rounded-xl border border-jds-outline-variant/40 bg-jds-surface text-jds-on-surface focus:outline-none focus:border-jds-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-jds-on-surface mb-1">
                  Facebook Profile / Username
                </label>
                <div className="flex items-center rounded-xl border border-jds-outline-variant/40 bg-jds-surface transition-all overflow-hidden focus-within:border-jds-primary">
                  <div className="flex items-center gap-1.5 pl-3 pr-2 py-2 bg-jds-surface-container-low border-r border-jds-outline-variant/30 text-jds-on-surface-variant select-none shrink-0">
                    <FaFacebook className="h-3.5 w-3.5 text-[#1877F2] shrink-0" />
                    <span className="text-xs font-mono text-jds-on-surface-variant font-semibold">facebook.com/</span>
                  </div>
                  <input
                    type="text"
                    placeholder="username or profile ID (optional)"
                    value={newCustFacebook}
                    onChange={(e) => setNewCustFacebook(extractFacebookHandle(e.target.value))}
                    className="w-full bg-transparent px-3 py-2 text-xs text-jds-on-surface outline-none placeholder:text-jds-on-surface-variant/50"
                  />
                </div>
              </div>

              {/* Philippine Cascading Address Selector for Staff / Admin */}
              <div className="p-3 rounded-xl bg-jds-surface-container-low/40 border border-jds-outline-variant/30 space-y-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-jds-on-surface-variant block">
                  Customer Location & Address
                </span>
                <PhilippineAddressSelect
                  provinceCode={newCustProvinceCode}
                  provinceName={newCustProvince}
                  cityCode={newCustCityCode}
                  cityName={newCustCity}
                  barangayCode={newCustBarangayCode}
                  barangayName={newCustBarangay}
                  streetAddress={newCustStreetAddress}
                  errors={newLocationErrors}
                  required={false}
                  onLocationChange={({
                    provinceCode: pCode,
                    provinceName: pName,
                    cityCode: cCode,
                    cityName: cName,
                    barangayCode: bCode,
                    barangayName: bName,
                    streetAddress: sAddress,
                  }) => {
                    setNewCustProvinceCode(pCode)
                    setNewCustProvince(pName)
                    setNewCustCityCode(cCode)
                    setNewCustCity(cName)
                    setNewCustBarangayCode(bCode)
                    setNewCustBarangay(bName)
                    if (sAddress !== undefined) {
                      setNewCustStreetAddress(sAddress)
                    }
                    setNewLocationErrors({})
                  }}
                  variant="admin"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-jds-on-surface mb-1">
                    Inquiry Type
                  </label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl border border-jds-outline-variant/40 bg-jds-surface text-jds-on-surface focus:outline-none focus:border-jds-primary cursor-pointer"
                  >
                    <option value="INQUIRY">Showroom Consultation</option>
                    <option value="PICKUP">Store Pickup & Reservation</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-jds-on-surface mb-1">
                    Showroom Branch
                  </label>
                  <select
                    value={newBranch}
                    onChange={(e) => setNewBranch(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl border border-jds-outline-variant/40 bg-jds-surface text-jds-on-surface focus:outline-none focus:border-jds-primary cursor-pointer"
                  >
                    <option value="Cavite Distribution Hub">Cavite Distribution Hub</option>
                    <option value="Quiapo Branch (Manila)">Quiapo Showroom (Manila)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-jds-on-surface mb-1">
                    Product / System Inquired
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 5kW Hybrid Solar Package"
                    value={newProduct}
                    onChange={(e) => setNewProduct(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl border border-jds-outline-variant/40 bg-jds-surface text-jds-on-surface focus:outline-none focus:border-jds-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-jds-on-surface mb-1">
                    Quantity
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={newQuantity}
                    onChange={(e) => setNewQuantity(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl border border-jds-outline-variant/40 bg-jds-surface text-jds-on-surface focus:outline-none focus:border-jds-primary"
                  />
                </div>
              </div>

              {/* Showroom Business Hours Banner */}
              <div className="p-3 rounded-xl border border-jds-outline-variant/30 bg-jds-surface-container-low/60 text-xs text-jds-on-surface flex items-start gap-2.5">
                <Clock className="h-4 w-4 text-jds-primary shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block text-jds-on-surface">Showroom Business Hours</span>
                  <span className="text-[11px] text-jds-on-surface-variant block mt-0.5">
                    Monday to Saturday: 9:00 AM – 5:00 PM • Closed on Sundays
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-jds-on-surface">
                      Visit Date <span className="text-amber-600">*</span>
                    </label>
                    <span className="text-[11px] text-jds-on-surface-variant font-medium">Mon – Sat Only</span>
                  </div>
                  <input
                    type="date"
                    min={minBusinessDateStr}
                    required
                    value={newVisitDate}
                    onClick={(e) => {
                      try {
                        e.currentTarget.showPicker?.()
                      } catch (err) { }
                    }}
                    onChange={(e) => {
                      setNewVisitDate(e.target.value)
                      setNewError('')
                    }}
                    className="w-full text-xs p-2.5 rounded-xl border border-jds-outline-variant/40 bg-jds-surface text-jds-on-surface focus:outline-none focus:border-jds-primary cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-jds-on-surface">
                      Time Slot <span className="text-amber-600">*</span>
                    </label>
                    <span className="text-[11px] text-jds-on-surface-variant font-medium">9:00 AM – 5:00 PM</span>
                  </div>
                  <input
                    type="time"
                    min="09:00"
                    max="17:00"
                    step="900"
                    required
                    value={newVisitTime}
                    onClick={(e) => {
                      try {
                        e.currentTarget.showPicker?.()
                      } catch (err) { }
                    }}
                    onChange={(e) => {
                      setNewVisitTime(e.target.value)
                      setNewError('')
                    }}
                    className="w-full text-xs p-2.5 rounded-xl border border-jds-outline-variant/40 bg-jds-surface text-jds-on-surface focus:outline-none focus:border-jds-primary font-semibold cursor-pointer"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-jds-on-surface mb-1">
                  Staff Notes
                </label>
                <textarea
                  rows={2}
                  value={newStaffNotes}
                  onChange={(e) => setNewStaffNotes(e.target.value)}
                  placeholder="Additional customer requirements or background notes..."
                  className="w-full text-xs p-2.5 rounded-xl border border-jds-outline-variant/40 bg-jds-surface text-jds-on-surface focus:outline-none focus:border-jds-primary resize-none"
                />
              </div>

              <div className="flex items-center justify-between border-t border-jds-outline-variant/20 pt-4">
                <button
                  type="button"
                  onClick={() => setIsNewModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold rounded-xl border border-jds-outline-variant/40 text-jds-on-surface hover:bg-jds-surface-container transition-colors"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={newCreating}
                  className="px-5 py-2 text-xs font-bold rounded-xl bg-jds-primary text-white hover:bg-jds-primary/90 transition-all flex items-center gap-2 shadow-xs cursor-pointer"
                >
                  {newCreating ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Recording...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Confirm & Add to Calendar</span>
                    </>
                  )}
                </button>
              </div>
            </form>
            </>
            )}
          </div>
        </div>
      )}

      {/* DELETE INQUIRY CONFIRMATION MODAL */}
      {ticketToDelete && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isDeletingTicket) setTicketToDelete(null)
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-jds-surface rounded-2xl max-w-md w-full p-6 shadow-2xl border border-jds-outline-variant/30 space-y-4 my-auto"
          >
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
              <div className="p-2.5 rounded-full bg-rose-100 dark:bg-rose-950/50">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-jds-on-surface">Delete Inquiry Record</h3>
                <p className="text-xs text-jds-on-surface-variant">Permanent database deletion</p>
              </div>
            </div>

            <p className="text-xs text-jds-on-surface-variant leading-relaxed">
              Are you sure you want to permanently delete this inquiry? This action cannot be reversed and will remove the record from both the database and staff calendar.
            </p>

            <div className="p-3 rounded-xl bg-jds-surface-container-low/40 border border-jds-outline-variant/20 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-jds-on-surface-variant font-medium">Ticket Code:</span>
                <span className="font-mono font-bold text-jds-on-surface">{ticketToDelete.ticket_code}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-jds-on-surface-variant font-medium">Customer:</span>
                <span className="font-bold text-jds-on-surface">{ticketToDelete.customer_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-jds-on-surface-variant font-medium">Schedule:</span>
                <span className="text-jds-on-surface">
                  {ticketToDelete.visit_date || ticketToDelete.effectiveDate} ({ticketToDelete.visit_time_slot || 'N/A'})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-jds-on-surface-variant font-medium">Status:</span>
                <span className="font-bold text-jds-on-surface">{ticketToDelete.status}</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-jds-outline-variant/20">
              <button
                type="button"
                onClick={() => setTicketToDelete(null)}
                disabled={isDeletingTicket}
                className="px-4 py-2 text-xs font-bold rounded-xl border border-jds-outline-variant/40 text-jds-on-surface hover:bg-jds-surface-container transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteInquiry}
                disabled={isDeletingTicket}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-rose-600 hover:bg-rose-700 text-white transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                {isDeletingTicket ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Confirm Delete</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BULK CLEAN UP INACTIVE INQUIRIES MODAL */}
      {isPurgeModalOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isPurging) setIsPurgeModalOpen(false)
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-jds-surface rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-jds-outline-variant/30 space-y-4 my-auto"
          >
            <div className="flex items-center gap-3 text-amber-600 dark:text-amber-400">
              <div className="p-2.5 rounded-full bg-amber-100 dark:bg-amber-950/50">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-jds-on-surface">Clean Up Inactive Inquiries</h3>
                <p className="text-xs text-jds-on-surface-variant">Automated database hygiene & maintenance</p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-jds-surface-container-low/40 border border-jds-outline-variant/20 space-y-2 text-xs text-jds-on-surface-variant">
              <p className="font-semibold text-jds-on-surface">Retention Policy Rules:</p>
              <ul className="list-disc list-inside space-y-1 pl-1">
                <li>Completed or Cancelled inquiries older than 7 days</li>
                <li>Stale Pending inquiries older than 14 days without showroom visit or update</li>
              </ul>
            </div>

            {inactiveSummary.count === 0 ? (
              <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300">
                The database is already clean. No inquiries currently match the inactive retention rules.
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-jds-on-surface">
                  Found <span className="font-bold text-amber-600 dark:text-amber-400">{inactiveSummary.count}</span> inactive {inactiveSummary.count === 1 ? 'inquiry' : 'inquiries'} ready for permanent deletion:
                </p>

                <div className="grid grid-cols-3 gap-2">
                  <div className="p-2.5 rounded-lg border border-jds-outline-variant/30 bg-jds-surface text-center">
                    <div className="text-base font-bold text-jds-on-surface">{inactiveSummary.completedCount}</div>
                    <div className="text-[10px] text-jds-on-surface-variant">Completed (&gt;7d)</div>
                  </div>
                  <div className="p-2.5 rounded-lg border border-jds-outline-variant/30 bg-jds-surface text-center">
                    <div className="text-base font-bold text-jds-on-surface">{inactiveSummary.cancelledCount}</div>
                    <div className="text-[10px] text-jds-on-surface-variant">Cancelled (&gt;7d)</div>
                  </div>
                  <div className="p-2.5 rounded-lg border border-jds-outline-variant/30 bg-jds-surface text-center">
                    <div className="text-base font-bold text-jds-on-surface">{inactiveSummary.pendingCount}</div>
                    <div className="text-[10px] text-jds-on-surface-variant">Stale Pending (&gt;14d)</div>
                  </div>
                </div>

                <div className="max-h-40 overflow-y-auto rounded-xl border border-jds-outline-variant/20 divide-y divide-jds-outline-variant/15 text-xs">
                  {inactiveSummary.eligible.slice(0, 10).map((item) => (
                    <div key={item.id || item.ticket_code} className="p-2 flex items-center justify-between">
                      <span className="font-mono font-bold text-jds-on-surface">{item.ticket_code}</span>
                      <span className="text-jds-on-surface-variant truncate max-w-[150px]">{item.customer_name}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded border border-jds-outline-variant/30">{item.status}</span>
                    </div>
                  ))}
                  {inactiveSummary.count > 10 && (
                    <div className="p-2 text-center text-[10px] text-jds-on-surface-variant italic">
                      ...and {inactiveSummary.count - 10} more records
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-jds-outline-variant/20">
              <button
                type="button"
                onClick={() => setIsPurgeModalOpen(false)}
                disabled={isPurging}
                className="px-4 py-2 text-xs font-bold rounded-xl border border-jds-outline-variant/40 text-jds-on-surface hover:bg-jds-surface-container transition-colors cursor-pointer"
              >
                {inactiveSummary.count === 0 ? 'Close' : 'Cancel'}
              </button>

              {inactiveSummary.count > 0 && (
                <button
                  type="button"
                  onClick={executePurgeInactive}
                  disabled={isPurging}
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-amber-600 hover:bg-amber-700 text-white transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  {isPurging ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Purging Records...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Confirm Purge ({inactiveSummary.count})</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
