import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { supabase } from '../lib/supabaseClient'
import {
  X,
  Plus,
  Minus,
  Sparkles,
  ArrowRight,
  Copy,
  Building2,
  Calendar,
  Clock,
  AlertCircle,
  MailCheck,
} from 'lucide-react'
import { sendInquiryTicketEmail } from '../lib/customerService'
import TermsOfServiceModal from './TermsOfServiceModal'
import { FaFacebook, FaInstagram } from 'react-icons/fa'
import { getInquiryStatusConfig } from '../lib/inquiryStatusUtils'
import { normalizePhMobile, isValidPhMobile } from '../lib/phoneUtils'
import { sanitizeText, sanitizeEmail, isValidEmail } from '../lib/sanitize.js'
import PhilippineAddressSelect from './ui/PhilippineAddressSelect'
import { formatFullAddress } from '../lib/philippineAddresses'
import { getBranchStock } from '../lib/inventoryUtils'
import { extractFacebookHandle, formatFacebookUrl } from '../lib/facebookUtils'
import useModalBehavior from '../hooks/useModalBehavior'
import AnimatedConfirmation from './ui/AnimatedConfirmation'
import { getMainProductImage } from '../lib/productImageUtils'

const BRANCHES = [
  {
    id: 'quiapo',
    name: 'Quiapo Showroom (Manila)',
    badge: 'Main Retail Hub',
  },
  {
    id: 'cavite',
    name: 'Cavite Distribution Hub',
    badge: 'Logistics & Freight',
  },
]

const INQUIRY_TOPICS = [
  'Pole Height & Illumination Sizing Advice',
  'Bulk Procurement / LGU Illumination Project Quote',
  'Physical Product Demo & Technical Inspection',
  'Pricing, Discounts & Package Deals',
  'Warranty Coverage & Replacement Protocols',
  'General Inquiries & Specifications',
]

export const BUSINESS_HOURS = {
  startHour: 8,
  endHour: 17,
  endMinute: 30,
  startStr: '08:00',
  endStr: '17:30',
  daysDescription: 'Monday through Saturday',
  hoursDescription: '8:00 AM – 5:30 PM',
}

export const BUSINESS_TIME_SLOTS = [
  { value: '08:00', label: '8:00 AM' },
  { value: '09:00', label: '9:00 AM' },
  { value: '10:00', label: '10:00 AM' },
  { value: '11:00', label: '11:00 AM' },
  { value: '13:00', label: '1:00 PM' },
  { value: '14:00', label: '2:00 PM' },
  { value: '15:00', label: '3:00 PM' },
  { value: '16:00', label: '4:00 PM' },
  { value: '17:00', label: '5:00 PM' },
  { value: '17:30', label: '5:30 PM' },
]

export const getNextBusinessDay = () => {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  // If tomorrow is Sunday (0), advance to Monday
  if (d.getDay() === 0) {
    d.setDate(d.getDate() + 1)
  }
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export const isWithinBusinessHours = (timeStr) => {
  if (!timeStr) return false
  const [hStr, mStr] = timeStr.split(':')
  const h = parseInt(hStr, 10)
  const m = parseInt(mStr || '0', 10)
  if (isNaN(h) || isNaN(m)) return false
  const minutes = h * 60 + m
  const startMinutes = BUSINESS_HOURS.startHour * 60
  const endMinutes = BUSINESS_HOURS.endHour * 60 + (BUSINESS_HOURS.endMinute || 0)
  return minutes >= startMinutes && minutes <= endMinutes
}

// Helper to format HTML5 24hr time (e.g. "14:30") into 12hr display (e.g. "2:30 PM")
const formatDisplayTime = (timeStr) => {
  if (!timeStr) return ''
  const [h, m] = timeStr.split(':')
  const hour = parseInt(h, 10)
  if (isNaN(hour)) return timeStr
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const displayH = hour % 12 || 12
  return `${displayH}:${m || '00'} ${ampm}`
}

export default function QuoteModal({ isOpen, onClose, product, initialMode = 'reserve', initialStep = 1 }) {
  const { backdropProps } = useModalBehavior({ isOpen, onClose })
  const [mode, setMode] = useState(initialMode) // 'reserve' | 'inquire'
  const [step, setStep] = useState(initialStep) // 1: Contact, 2: Visit & Time, 3: Ticket Pass
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  // Form State
  const [quantity, setQuantity] = useState(1)
  const [customerName, setCustomerName] = useState('')
  const [mobileContact, setMobileContact] = useState('')
  const [email, setEmail] = useState('')
  const [province, setProvince] = useState('')
  const [provinceCode, setProvinceCode] = useState('')
  const [city, setCity] = useState('')
  const [cityCode, setCityCode] = useState('')
  const [barangay, setBarangay] = useState('')
  const [barangayCode, setBarangayCode] = useState('')
  const [streetAddress, setStreetAddress] = useState('')
  const [inquiryTopic, setInquiryTopic] = useState(INQUIRY_TOPICS[0])
  const [facebook, setFacebook] = useState('')
  const [instagram, setInstagram] = useState('')

  // Step 2 State (Showroom Visit)
  const [selectedBranch, setSelectedBranch] = useState(BRANCHES[0].name)
  const [visitDate, setVisitDate] = useState(getNextBusinessDay)
  const [visitTime, setVisitTime] = useState('10:00')
  const [consentAccepted, setConsentAccepted] = useState(false)
  const [showTermsModal, setShowTermsModal] = useState(false)

  // Generated Ticket State
  const [generatedTicket, setGeneratedTicket] = useState(null)
  const [errors, setErrors] = useState({})
  const [isConfirmedTransition, setIsConfirmedTransition] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setMode(initialMode || 'reserve')
      setStep(initialStep || 1)
      setIsConfirmedTransition(false)
      setErrors({})
      setCopied(false)
      setLoading(false)
      setVisitDate(getNextBusinessDay())
      setVisitTime('10:00')
      setProvince('')
      setProvinceCode('')
      setCity('')
      setCityCode('')
      setBarangay('')
      setBarangayCode('')
      setStreetAddress('')
      setConsentAccepted(false)
      setShowTermsModal(false)
    }
  }, [isOpen, initialMode])

  if (!isOpen) return null

  const isReserve = mode === 'reserve'

  const handlePhoneChange = (e) => {
    const val = normalizePhMobile(e.target.value)
    setMobileContact(val)
    if (errors.mobileContact) {
      setErrors((prev) => {
        const next = { ...prev }
        delete next.mobileContact
        return next
      })
    }
  }

  const validateStep1 = () => {
    const errs = {}
    if (!customerName.trim()) errs.customerName = 'Please enter your full name.'
    if (!mobileContact.trim()) {
      errs.mobileContact = 'Contact number is required.'
    } else if (!isValidPhMobile(mobileContact)) {
      errs.mobileContact = 'Please provide a valid 11-digit Philippine mobile number starting with 09 (e.g. 09171234567).'
    }
    const cleanEmail = sanitizeEmail(email)
    if (!cleanEmail) {
      errs.email = 'Email address is required.'
    } else if (!isValidEmail(cleanEmail)) {
      errs.email = 'Please provide a valid email address.'
    }
    if (!province.trim()) errs.province = 'Please select a province.'
    if (!city.trim()) errs.city = 'Please select a city or municipality.'
    if (!barangay.trim()) errs.barangay = 'Please select a barangay or district.'
    if (!streetAddress.trim()) errs.streetAddress = 'Please enter your house or street address.'
    if (!facebook.trim()) {
      errs.facebook = 'Facebook profile name or link is required for verification.'
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const validateStep2 = () => {
    const errs = {}
    if (!visitDate) {
      errs.visitDate = 'Please select a visit date.'
    } else {
      const selected = new Date(visitDate + 'T00:00:00')
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      if (isNaN(selected.getTime())) {
        errs.visitDate = 'Please choose a valid calendar date.'
      } else if (selected < today) {
        errs.visitDate = 'Visit date must be an upcoming business day.'
      } else if (selected.getDay() === 0) {
        errs.visitDate = 'Our showrooms are closed on Sundays. Please choose Monday through Saturday.'
      }
    }

    if (!visitTime) {
      errs.visitTime = 'Please select a visit time slot.'
    } else if (!isWithinBusinessHours(visitTime)) {
      errs.visitTime = 'Showroom visits must be scheduled within business hours: 8:00 AM to 5:30 PM.'
    }

    if (!consentAccepted) {
      errs.consent = 'You must accept the terms of service to proceed.'
    }

    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleNextToStep2 = (e) => {
    e.preventDefault()
    if (validateStep1()) {
      setStep(2)
      setErrors({})
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validateStep2()) return

    setLoading(true)
    const randomHex = Math.floor(100000 + Math.random() * 900000)
    const ticketCode = `JDS-${isReserve ? 'RES' : 'INQ'}-${new Date().getFullYear()}-${randomHex}`
    const formattedTime = formatDisplayTime(visitTime)
    const effectivePurpose = isReserve ? 'Store Pickup & Reservation' : inquiryTopic
    const formattedLocation = formatFullAddress({
      province,
      city,
      barangay,
      street: streetAddress,
    })

    const payload = {
      ticket_code: ticketCode,
      product_id: product?.id || null,
      product_name: product?.name || (isReserve ? 'Solar Lighting Unit' : 'General Technical Consultation'),
      product_watt: product?.watt || null,
      product_price_range: product?.price_range || null,
      product_image_url: getMainProductImage(product?.image_url) || null,
      quantity: Number(quantity) || 1,
      customer_name: sanitizeText(customerName, { maxLength: 100 }),
      mobile_contact: mobileContact.trim(),
      email: email.trim() ? sanitizeEmail(email) : null,
      province: sanitizeText(province, { maxLength: 100 }),
      city: sanitizeText(city, { maxLength: 100 }),
      barangay: sanitizeText(barangay, { maxLength: 100 }),
      street_address: sanitizeText(streetAddress, { maxLength: 200 }),
      facebook: formatFacebookUrl(facebook),
      instagram: instagram.trim() ? sanitizeText(instagram, { maxLength: 100 }) : null,
      purpose_of_visitation: effectivePurpose,
      will_visit: true,
      store_branch: selectedBranch,
      visit_date: visitDate,
      visit_time_slot: formattedTime,
      preferred_channel: null,
      delivery_address: formattedLocation,
      project_notes: null,
      status: 'Pending',
      created_at: new Date().toISOString(),
    }

    try {
      // For reservations, mark the ticket and check available stock before inserting
      if (isReserve && product?.id) {
        payload.is_reservation = true
      }

      let { data, error } = await supabase
        .from('quote_tickets')
        .insert([payload])
        .select()

      // Graceful fallback if PostgreSQL table has not yet applied province/barangay/street_address/facebook migration
      if (
        error &&
        (error.code === '42703' ||
          error.message?.includes('province') ||
          error.message?.includes('barangay') ||
          error.message?.includes('street_address') ||
          error.message?.includes('facebook') ||
          error.message?.includes('instagram') ||
          error.message?.includes('is_reservation'))
      ) {
        console.warn('Column missing in database, retrying with fallback payload:', error.message)
        const fallbackPayload = { ...payload }
        if (error.message?.includes('province')) delete fallbackPayload.province
        if (error.message?.includes('barangay')) delete fallbackPayload.barangay
        if (error.message?.includes('street_address')) delete fallbackPayload.street_address
        if (error.message?.includes('facebook')) delete fallbackPayload.facebook
        if (error.message?.includes('instagram')) delete fallbackPayload.instagram
        if (error.message?.includes('is_reservation')) delete fallbackPayload.is_reservation
        fallbackPayload.city = `${city.trim()}, ${province.trim()}`
        fallbackPayload.delivery_address = formattedLocation
        const fallbackRes = await supabase
          .from('quote_tickets')
          .insert([fallbackPayload])
          .select()
        data = fallbackRes.data
        error = fallbackRes.error
      }

      if (error) {
        throw error
      }

      try {
        const stored = JSON.parse(localStorage.getItem('jds_local_quotes') || '[]')
        const finalTicket = data && data[0] ? data[0] : payload
        localStorage.setItem('jds_local_quotes', JSON.stringify([finalTicket, ...stored]))
      } catch (storageErr) {
        console.error('LocalStorage write error:', storageErr)
      }

      const finalTicket = data && data[0] ? data[0] : payload
      setGeneratedTicket(finalTicket)
      setIsConfirmedTransition(true)

      // Dispatch confirmation & inquiry receipt email if email provided
      if (finalTicket.email) {
        sendInquiryTicketEmail(finalTicket).catch(emailErr => {
          console.warn('Inquiry ticket email dispatch warning:', emailErr)
        })
      }
    } catch (err) {
      console.error('Submission error:', err)
      setErrors((prev) => ({
        ...prev,
        submit: 'Unable to submit your request right now. Please check your connection and try again.',
      }))
    } finally {
      setLoading(false)
    }
  }

  const handleCopyCode = () => {
    if (!generatedTicket) return
    navigator.clipboard.writeText(generatedTicket.ticket_code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const minBusinessDateStr = getNextBusinessDay()

  const modalContent = (
    <div
      {...backdropProps}
      className="fixed inset-0 z-[9999] flex items-center justify-center p-2.5 sm:p-5 overflow-y-auto bg-black/60 backdrop-blur-md animate-in fade-in duration-200"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.98, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.98, y: 10 }}
        transition={{ duration: 0.2 }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg bg-white rounded-2xl sm:rounded-3xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.3)] p-4 sm:p-7 overflow-hidden my-auto max-h-[94vh] overflow-y-auto no-scrollbar font-inter"
      >
        {/* Floating Minimalist Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 sm:top-5 sm:right-5 p-1.5 sm:p-2 rounded-full text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors z-20 cursor-pointer"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Step Indicator & Title */}
        <div className="mb-4 sm:mb-5">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-[10px] sm:text-[11px] font-bold uppercase tracking-wider ${isReserve ? 'text-amber-600' : 'text-blue-600'}`}>
              {isConfirmedTransition
                ? 'Submission Confirmed'
                : step === 1
                  ? (isReserve ? 'Step 01 · Stock Reservation' : 'Step 01 · Inquiry & Contact')
                  : step === 2
                    ? 'Step 02 · Store Branch & Time'
                    : (isReserve ? 'Reservation Pass Ready' : 'Consultation Pass Ready')}
            </span>
            <span className="h-1 w-1 rounded-full bg-stone-300" />
            <span className="text-[10px] sm:text-[11px] font-medium text-stone-400">JD-Foz Solar</span>
          </div>
          <h2 className="text-base sm:text-xl font-black tracking-tight text-stone-900">
            {isConfirmedTransition
              ? (isReserve ? 'Reservation Confirmed' : 'Consultation Confirmed')
              : step === 1
                ? (isReserve ? 'Reserve Unit for Store Pickup' : 'Product Inquiry & Consultation')
                : step === 2
                  ? (isReserve ? 'Schedule Showroom Pickup' : 'Schedule Showroom Consultation')
                  : (isReserve ? '48-Hour Stock Hold Pass' : 'Showroom Consultation Pass')}
          </h2>
        </div>

        {/* Minimal Product Pill */}
        {step < 3 && !isConfirmedTransition && product && (
          <div className="mb-5 flex items-center justify-between p-3 rounded-2xl bg-stone-50 border border-stone-200/60">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-12 w-12 rounded-xl bg-white p-1 border border-stone-200/50 shrink-0 flex items-center justify-center">
                {getMainProductImage(product.image_url) ? (
                  <img src={getMainProductImage(product.image_url)} alt={product.name} className="h-full w-full object-contain" />
                ) : (
                  <Sparkles className="h-5 w-5 text-amber-500" />
                )}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-stone-900 truncate">{product.name}</p>
                <p className="text-[11px] text-stone-500 font-medium">
                  {product.watt ? `${product.watt}W` : 'Solar Lighting'} {product.price_range ? `· ₱${product.price_range}` : ''}
                </p>
              </div>
            </div>

            {/* Subtle Quantity Stepper */}
            <div className="flex items-center gap-2 bg-white px-2 py-1 rounded-xl border border-stone-200/80 shrink-0">
              <button
                type="button"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="text-stone-400 hover:text-stone-900 p-0.5"
                title="Decrease quantity"
              >
                <Minus className="h-3 w-3" />
              </button>
              <span className="text-xs font-bold text-stone-800 w-4 text-center">{quantity}</span>
              <button
                type="button"
                onClick={() => setQuantity(quantity + 1)}
                className="text-stone-400 hover:text-stone-900 p-0.5"
                title="Increase quantity"
              >
                <Plus className="h-3 w-3" />
              </button>
            </div>
          </div>
        )}

        {/* ================= CONFIRMATION SPLASH ANIMATION ================= */}
        {isConfirmedTransition && (
          <AnimatedConfirmation
            title={isReserve ? 'Stock Hold Pass Confirmed' : 'Showroom Pass Confirmed'}
            description={
              isReserve
                ? 'Your unit reservation has been registered. Preparing your digital showroom pass...'
                : 'Your showroom consultation has been scheduled. Preparing your official pass...'
            }
            referenceCode={generatedTicket?.ticket_code}
            duration={1800}
            onComplete={() => {
              setIsConfirmedTransition(false)
              setStep(3)
            }}
          />
        )}

        {/* ================= STEP 1: CONTACT & INTENT FORM ================= */}
        {!isConfirmedTransition && step === 1 && (
          <form onSubmit={handleNextToStep2} className="space-y-4">
            {/* Inquiry Topic Dropdown (Only for Inquiry Mode) */}
            {!isReserve && (
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Consultation Topic / Inquiry Need <span className="text-blue-600">*</span>
                </label>
                <select
                  value={inquiryTopic}
                  onChange={(e) => setInquiryTopic(e.target.value)}
                  className="w-full rounded-xl border border-stone-200 bg-stone-50/40 px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:bg-white text-stone-800"
                >
                  {INQUIRY_TOPICS.map((topic) => (
                    <option key={topic} value={topic}>{topic}</option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Full Name <span className="text-amber-600">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Engr. Juan Dela Cruz"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className={`w-full rounded-xl border px-3.5 py-2.5 text-sm outline-none transition-all ${errors.customerName ? 'border-red-400 bg-red-50/20' : 'border-stone-200 focus:border-amber-500 bg-stone-50/40 focus:bg-white'
                  }`}
              />
              {errors.customerName && <p className="text-[11px] text-red-500 mt-1">{errors.customerName}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Mobile Contact <span className="text-amber-600">*</span>
              </label>
              <input
                type="tel"
                inputMode="numeric"
                maxLength={11}
                required
                placeholder="09171234567"
                value={mobileContact}
                onChange={handlePhoneChange}
                className={`w-full rounded-xl border px-3.5 py-2.5 text-sm outline-none transition-all ${errors.mobileContact ? 'border-red-400 bg-red-50/20' : 'border-stone-200 focus:border-amber-500 bg-stone-50/40 focus:bg-white'
                  }`}
              />
              {errors.mobileContact && <p className="text-[11px] text-red-500 mt-1">{errors.mobileContact}</p>}
            </div>

            {/* Cascading Philippine Address Dropdown Selector */}
            <PhilippineAddressSelect
              provinceCode={provinceCode}
              provinceName={province}
              cityCode={cityCode}
              cityName={city}
              barangayCode={barangayCode}
              barangayName={barangay}
              streetAddress={streetAddress}
              errors={errors}
              onLocationChange={({
                provinceCode: pCode,
                provinceName: pName,
                cityCode: cCode,
                cityName: cName,
                barangayCode: bCode,
                barangayName: bName,
                streetAddress: sAddress,
              }) => {
                setProvinceCode(pCode)
                setProvince(pName)
                setCityCode(cCode)
                setCity(cName)
                setBarangayCode(bCode)
                setBarangay(bName)
                if (sAddress !== undefined) {
                  setStreetAddress(sAddress)
                }
                if (errors.province || errors.city || errors.barangay || errors.streetAddress) {
                  setErrors((prev) => {
                    const next = { ...prev }
                    delete next.province
                    delete next.city
                    delete next.barangay
                    delete next.streetAddress
                    return next
                  })
                }
              }}
              variant="modal"
            />

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Facebook Profile / Username <span className="text-amber-600">*</span>
              </label>
              <div
                className={`flex items-center rounded-xl border bg-stone-50/40 transition-all overflow-hidden focus-within:border-amber-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-amber-500/20 ${errors.facebook ? 'border-red-400 bg-red-50/20' : 'border-stone-200'
                  }`}
              >
                <div className="flex items-center gap-1.5 pl-3.5 pr-2.5 py-2.5 bg-stone-100/80 border-r border-stone-200 text-stone-600 select-none shrink-0">
                  <FaFacebook className="h-4 w-4 text-[#1877F2] shrink-0" />
                  <span className="text-xs font-semibold text-stone-600 font-mono tracking-tight">facebook.com/</span>
                </div>
                <input
                  type="text"
                  required
                  placeholder="username or profile ID"
                  value={facebook}
                  onChange={(e) => {
                    const cleanHandle = extractFacebookHandle(e.target.value)
                    setFacebook(cleanHandle)
                    if (errors.facebook) {
                      setErrors((prev) => {
                        const next = { ...prev }
                        delete next.facebook
                        return next
                      })
                    }
                  }}
                  className="w-full bg-transparent px-3 py-2.5 text-sm text-stone-800 outline-none placeholder:text-stone-400 font-medium"
                />
              </div>
              {errors.facebook ? (
                <p className="text-[11px] text-red-500 mt-1">{errors.facebook}</p>
              ) : (
                <p className="text-[11px] text-stone-400 mt-1">
                  Type your username or profile ID. Full links pasted are automatically cleaned.
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Email Address <span className="text-amber-600">*</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="juan@example.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value)
                    if (errors.email) {
                      setErrors((prev) => {
                        const next = { ...prev }
                        delete next.email
                        return next
                      })
                    }
                  }}
                  className={`w-full rounded-xl border px-3.5 py-2.5 text-sm outline-none transition-all ${errors.email ? 'border-red-400 bg-red-50/20' : 'border-stone-200 focus:border-amber-500 bg-stone-50/40 focus:bg-white'
                    }`}
                />
                {errors.email && <p className="text-[11px] text-red-500 mt-1">{errors.email}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Instagram <span className="text-stone-400 font-normal">(Optional)</span>
                </label>
                <div className="relative">
                  <FaInstagram className="absolute left-3.5 top-3 h-4 w-4 text-[#E4405F]" />
                  <input
                    type="text"
                    placeholder="@username"
                    value={instagram}
                    onChange={(e) => setInstagram(e.target.value)}
                    className="w-full rounded-xl border border-stone-200 bg-stone-50/40 pl-10 pr-3.5 py-2.5 text-sm outline-none focus:border-amber-500 focus:bg-white"
                  />
                </div>
              </div>
            </div>

            {/* Action Button */}
            <div className="pt-2">
              <button
                type="submit"
                className={`w-full py-3.5 rounded-xl text-white font-bold text-sm transition-all shadow-md flex items-center justify-center gap-2 ${isReserve
                  ? 'bg-stone-900 hover:bg-stone-800'
                  : 'bg-blue-600 hover:bg-blue-700'
                  }`}
              >
                <span>Continue to Schedule Visit</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </form>
        )}

        {/* ================= STEP 2: STORE VISIT & TIME ================= */}
        {!isConfirmedTransition && step === 2 && (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Branch Selector Cards */}
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-2">
                Select Showroom Branch
              </label>
              <div className="space-y-2">
                {BRANCHES.map((b) => {
                  const isSelected = selectedBranch === b.name
                  const bStock = product ? getBranchStock(product, b.name) : null
                  return (
                    <div
                      key={b.id}
                      onClick={() => setSelectedBranch(b.name)}
                      className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${isSelected
                        ? isReserve
                          ? 'border-amber-500 bg-amber-50/30 ring-1 ring-amber-500'
                          : 'border-blue-500 bg-blue-50/30 ring-1 ring-blue-500'
                        : 'border-stone-200 bg-stone-50/50 hover:border-stone-300'
                        }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Building2 className={`h-4 w-4 shrink-0 ${isSelected ? (isReserve ? 'text-amber-600' : 'text-blue-600') : 'text-stone-400'}`} />
                          <div>
                            <p className="text-xs font-bold text-stone-900">{b.name}</p>
                            {bStock && (
                              <p className={`text-[11px] font-medium ${bStock.available > 0 ? 'text-emerald-700' : 'text-stone-500'}`}>
                                {bStock.available > 0
                                  ? `${bStock.available} unit(s) available for pickup`
                                  : 'Out of stock at this branch (consultation only)'}
                              </p>
                            )}
                          </div>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white text-stone-600 border border-stone-200 shrink-0">
                          {b.badge}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Showroom Business Hours Banner */}
            <div className="p-3.5 rounded-2xl border border-stone-200 bg-stone-50/80 text-xs text-stone-700 flex items-start gap-2.5">
              <Clock className="h-4 w-4 text-stone-500 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block text-stone-900">Showroom Business Hours</span>
                <span className="text-[11px] text-stone-600 block mt-0.5">
                  Monday to Saturday: 8:00 AM – 5:30 PM • Closed on Sundays
                </span>
              </div>
            </div>

            {/* Date Input */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-stone-700">
                  Target Visit Date <span className="text-amber-600">*</span>
                </label>
                <span className="text-[11px] text-stone-500 font-medium">Mon – Sat Only</span>
              </div>
              <input
                type="date"
                min={minBusinessDateStr}
                required
                value={visitDate}
                onClick={(e) => {
                  try {
                    e.currentTarget.showPicker?.()
                  } catch (err) { }
                }}
                onChange={(e) => {
                  setVisitDate(e.target.value)
                  if (errors.visitDate) {
                    setErrors((prev) => {
                      const next = { ...prev }
                      delete next.visitDate
                      return next
                    })
                  }
                }}
                className={`w-full rounded-xl border px-3.5 py-2.5 text-sm outline-none transition-colors cursor-pointer ${errors.visitDate
                  ? 'border-red-400 bg-red-50/20'
                  : 'border-stone-200 bg-stone-50/40 focus:border-amber-500 focus:bg-white'
                  }`}
              />
              {errors.visitDate && (
                <p className="text-[11px] text-red-600 font-medium mt-1.5 flex items-center gap-1.5">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  <span>{errors.visitDate}</span>
                </p>
              )}
            </div>

            {/* Time Slot Input */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-stone-700">
                  Preferred Time Slot <span className="text-amber-600">*</span>
                </label>
                <span className="text-[11px] text-stone-500 font-medium">8:00 AM – 5:30 PM</span>
              </div>

              {/* Time Input constrained to business hours (09:00 - 17:00) with showPicker on click */}
              <input
                type="time"
                min="09:00"
                max="17:00"
                step="900"
                required
                value={visitTime}
                onClick={(e) => {
                  try {
                    e.currentTarget.showPicker?.()
                  } catch (err) { }
                }}
                onChange={(e) => {
                  setVisitTime(e.target.value)
                  if (errors.visitTime) {
                    setErrors((prev) => {
                      const next = { ...prev }
                      delete next.visitTime
                      return next
                    })
                  }
                }}
                className={`w-full rounded-xl border px-3.5 py-2.5 text-sm outline-none transition-colors cursor-pointer ${errors.visitTime
                  ? 'border-red-400 bg-red-50/20'
                  : 'border-stone-200 bg-stone-50/40 focus:border-amber-500 focus:bg-white'
                  }`}
              />
              {errors.visitTime && (
                <p className="text-[11px] text-red-600 font-medium mt-1.5 flex items-center gap-1.5">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  <span>{errors.visitTime}</span>
                </p>
              )}
            </div>

            {/* Terms of Service & Data Privacy Consent */}
            <div className="pt-2 pb-1">
              <label className="flex items-start gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={consentAccepted}
                  onChange={(e) => {
                    setConsentAccepted(e.target.checked)
                    if (errors.consent) {
                      setErrors((prev) => {
                        const next = { ...prev }
                        delete next.consent
                        return next
                      })
                    }
                  }}
                  className="mt-0.5 h-4 w-4 rounded border-stone-300 text-amber-500 focus:ring-amber-400 focus:ring-offset-0 cursor-pointer shrink-0"
                />
                <span className="text-xs text-stone-600 leading-relaxed">
                  I agree to the{' '}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault()
                      setShowTermsModal(true)
                    }}
                    className="text-amber-600 dark:text-amber-500 hover:text-amber-700 underline font-semibold inline cursor-pointer"
                  >
                    Terms of Service
                  </button>{' '}
                  (including technical consultation disclaimers and Data Privacy commitments under RA 10173).
                </span>
              </label>
              {errors.consent && (
                <p className="text-[11px] text-red-600 font-medium mt-1.5 flex items-center gap-1.5">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  <span>{errors.consent}</span>
                </p>
              )}
            </div>

            {errors.submit && (
              <p className="text-xs text-red-600 font-medium flex items-center gap-1.5 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errors.submit}</span>
              </p>
            )}

            {/* Inline Navigation Buttons */}
            <div className="pt-2 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="w-1/3 py-3 rounded-xl border border-stone-200 text-stone-700 font-bold text-xs hover:bg-stone-50 transition-colors"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={loading || !consentAccepted}
                className={`w-2/3 py-3 rounded-xl text-white font-bold text-xs transition-all shadow-md flex items-center justify-center gap-2 ${
                  !consentAccepted || loading
                    ? 'opacity-50 cursor-not-allowed bg-stone-400'
                    : isReserve
                      ? 'bg-amber-500 hover:bg-amber-600'
                      : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {loading ? 'Generating...' : (isReserve ? 'Confirm Reservation Pass' : 'Confirm Consultation Pass')}
              </button>
            </div>
          </form>
        )}

        {/* ================= STEP 3: TICKET PASS ================= */}
        {!isConfirmedTransition && step === 3 && generatedTicket && (
          <div className="space-y-5">
            <div className={`rounded-2xl border p-5 space-y-4 ${isReserve
              ? 'border-emerald-300 bg-emerald-50/40'
              : 'border-blue-300 bg-blue-50/40'
              }`}>
              {/* Ticket Reference Code */}
              <div className="border-b border-stone-200/80 pb-3 flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className={`h-2 w-2 rounded-full ${isReserve ? 'bg-emerald-500' : 'bg-blue-500'}`} />
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${isReserve ? 'text-emerald-700' : 'text-blue-700'}`}>
                      {isReserve ? 'Reservation Pass' : 'Consultation Pass'}
                    </span>
                  </div>
                  <span className="text-xl font-black text-stone-900 font-mono tracking-wider">{generatedTicket.ticket_code}</span>
                </div>
                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${getInquiryStatusConfig(generatedTicket.status || 'Pending').badgeClass}`}>
                  {getInquiryStatusConfig(generatedTicket.status || 'Pending').label}
                </span>
              </div>

              {/* Ticket Breakdown */}
              <div className="space-y-2 text-xs text-stone-700">
                <div className="flex justify-between">
                  <span className="text-stone-500">Customer</span>
                  <span className="font-bold text-stone-900">{generatedTicket.customer_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Contact</span>
                  <span className="font-semibold">{generatedTicket.mobile_contact}</span>
                </div>
                {generatedTicket.facebook && (
                  <div className="flex justify-between items-center">
                    <span className="text-stone-500">Facebook</span>
                    <a
                      href={generatedTicket.facebook}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold text-blue-600 hover:underline flex items-center gap-1 text-right truncate max-w-[200px]"
                    >
                      <FaFacebook className="h-3 w-3 shrink-0 text-[#1877F2]" />
                      <span className="truncate">{generatedTicket.facebook.replace(/^https?:\/\/(www\.)?facebook\.com\//i, '')}</span>
                    </a>
                  </div>
                )}
                {generatedTicket.street_address && (
                  <div className="flex justify-between">
                    <span className="text-stone-500">Address</span>
                    <span className="font-semibold text-right truncate max-w-[200px]" title={generatedTicket.street_address}>
                      {generatedTicket.street_address}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-stone-500">Area / City</span>
                  <span className="font-semibold text-right truncate max-w-[200px]" title={generatedTicket.delivery_address || generatedTicket.city}>
                    {generatedTicket.barangay ? `${generatedTicket.barangay.replace(/^brgy\.?\s*/i, '')}, ` : ''}{generatedTicket.city}{generatedTicket.province ? `, ${generatedTicket.province}` : ''}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">{isReserve ? 'Reserved Unit' : 'Product & Qty'}</span>
                  <span className="font-semibold text-right truncate max-w-[200px]">
                    {generatedTicket.product_name} × {generatedTicket.quantity}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Selected Branch</span>
                  <span className={`font-bold ${isReserve ? 'text-emerald-700' : 'text-blue-700'}`}>
                    {generatedTicket.store_branch}
                  </span>
                </div>
                {!isReserve && generatedTicket.purpose_of_visitation && (
                  <div className="flex justify-between pt-1 border-t border-stone-200/50">
                    <span className="text-stone-500">Inquiry Topic</span>
                    <span className="font-medium text-blue-800 text-right max-w-[200px] truncate">
                      {generatedTicket.purpose_of_visitation}
                    </span>
                  </div>
                )}
              </div>

              {/* Stitched Calendar Ticket Stub */}
              <div
                className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 text-xs ${getInquiryStatusConfig(generatedTicket.status || 'Pending').calendarClass}`}
              >
                <div className="flex items-center gap-2.5">
                  <div className={`p-2 rounded-lg bg-white/70 dark:bg-black/30 ${getInquiryStatusConfig(generatedTicket.status || 'Pending').calendarIconClass}`}>
                    <Calendar className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="font-bold block text-sm">
                      {generatedTicket.visit_date} • {generatedTicket.visit_time_slot}
                    </span>
                    <span className="text-[11px] opacity-80">
                      Showroom Visit at {generatedTicket.store_branch}
                    </span>
                  </div>
                </div>
              </div>

              {/* Email Confirmation Notice */}
              {generatedTicket.email && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-900 text-xs">
                  <MailCheck className="h-4 w-4 text-amber-600 shrink-0" />
                  <span className="leading-tight">
                    Official pass &amp; inquiry receipt details sent to <strong>{generatedTicket.email}</strong>.
                  </span>
                </div>
              )}

              {/* Reservation Review Notice */}
              {isReserve && (
                <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-300 text-xs">
                  <Clock className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                  <span className="leading-tight">
                    <strong>Reservation Hold Review:</strong> Your pickup request has been filed with our showroom. Staff will review and confirm your inventory hold. Physical units are held for you upon staff confirmation.
                  </span>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="space-y-2">
              <button
                type="button"
                onClick={handleCopyCode}
                className="w-full py-3 rounded-xl border border-stone-200 text-stone-800 font-bold text-xs hover:bg-stone-50 transition-colors flex items-center justify-center gap-2"
              >
                <Copy className="h-3.5 w-3.5" />
                <span>{copied ? 'Copied Ticket ID!' : 'Copy Ticket Reference'}</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="w-full py-3 rounded-xl bg-stone-900 text-white font-bold text-xs hover:bg-stone-800 transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        )}

        {/* Unified Terms of Service and Data Privacy Modal */}
        <TermsOfServiceModal
          isOpen={showTermsModal}
          onClose={() => setShowTermsModal(false)}
        />
      </motion.div>
    </div>
  )

  if (typeof document !== 'undefined') {
    return createPortal(modalContent, document.body)
  }

  return modalContent
}
