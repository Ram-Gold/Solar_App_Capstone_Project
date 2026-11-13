import { supabase } from './supabaseClient'
import { calculateExpiryDate } from './warrantyUtils'
import { getMainProductImage } from './productImageUtils'
import {
  sanitizeText,
  sanitizePhone,
  isValidPhone,
  sanitizeSerialNumber,
  sanitizeNumber,
  sanitizeEmail,
  isValidEmail
} from './sanitize.js'

const EMAIL_CONFIRMATION_STORAGE_PREFIX = 'jd_cust_email_state_'

/**
 * LocalStorage helpers for tracking customer email confirmation status
 * across client fallback and live sessions.
 */
function readLocalEmailState(token) {
  if (!token || typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(`${EMAIL_CONFIRMATION_STORAGE_PREFIX}${token}`)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function writeLocalEmailState(token, state) {
  if (!token || typeof window === 'undefined') return
  try {
    const existing = readLocalEmailState(token) || {}
    localStorage.setItem(
      `${EMAIL_CONFIRMATION_STORAGE_PREFIX}${token}`,
      JSON.stringify({ ...existing, ...state, updatedAt: new Date().toISOString() })
    )
  } catch {
    // ignore storage errors
  }
}

/**
 * Normalizes a customer record's email verification state from `email_confirmed_at`
 * and optional `email_confirmation_queue` rows.
 */
function extractLatestQueueEntry(queueRelation) {
  if (!queueRelation) return null
  if (Array.isArray(queueRelation)) {
    if (queueRelation.length === 0) return null
    return [...queueRelation].sort((a, b) => {
      const ta = a?.created_at ? new Date(a.created_at).getTime() : 0
      const tb = b?.created_at ? new Date(b.created_at).getTime() : 0
      return tb - ta
    })[0]
  }
  if (typeof queueRelation === 'object') return queueRelation
  return null
}

function resolveCustomerEmailState(cust = {}, localState = null, fallbackEmail = '') {
  const resolvedEmail = cust?.email || localState?.email || fallbackEmail || ''
  const confirmedAt =
    cust?.email_confirmed_at ||
    localState?.email_confirmed_at ||
    localState?.confirmed_at ||
    (cust?.email_confirmed ? cust?.created_at || new Date().toISOString() : null) ||
    (localState?.email_confirmed ? localState?.updatedAt || new Date().toISOString() : null)

  const isConfirmed = Boolean(confirmedAt || cust?.email_confirmed || localState?.email_confirmed)
  const latestQueue = extractLatestQueueEntry(cust?.email_confirmation_queue)
  const queueStatus = latestQueue?.status || cust?.email_confirmation_status || localState?.email_confirmation_status
  const status = isConfirmed
    ? 'confirmed'
    : (queueStatus || (resolvedEmail ? 'awaiting_confirmation' : 'unconfirmed'))

  return {
    email: resolvedEmail,
    email_confirmed_at: confirmedAt || null,
    email_confirmed: isConfirmed,
    email_confirmation_status: status,
    email_confirmation_sent_at: latestQueue?.sent_at || cust?.email_confirmation_sent_at || null
  }
}

/**
 * Queues a customer confirmation email in Supabase and dispatches the email
 * via the Vercel Serverless function (/api/send-confirmation-email) with
 * automatic fallback to Supabase Auth's built-in mailer.
 */
export async function queueAndSendCustomerConfirmationEmail({
  customerId,
  customerName,
  email,
  phoneNumber,
  branchLocation = 'Cavite',
  accessToken,
  purchases = [],
  onStatusChange = null
}) {
  const cleanEmail = sanitizeEmail(email)
  if (!cleanEmail || !isValidEmail(cleanEmail)) {
    throw new Error('A valid customer email address is required.')
  }

  const notify = (statusObj) => {
    if (accessToken) {
      writeLocalEmailState(accessToken, {
        email: cleanEmail,
        email_confirmed: Boolean(statusObj.emailConfirmed),
        email_confirmed_at: statusObj.emailConfirmed ? new Date().toISOString() : null,
        email_confirmation_status: statusObj.status,
        verification_token: statusObj.verificationToken || null
      })
    }
    if (typeof onStatusChange === 'function') {
      onStatusChange(statusObj)
    }
  }

  // Stage 1: Queuing email confirmation
  let verificationToken =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `verif-${Date.now()}`

  notify({
    status: 'queued',
    email: cleanEmail,
    emailConfirmed: false,
    verificationToken,
    message: 'Queuing email confirmation...'
  })

  if (customerId) {
    try {
      const { data: qData, error: qErr } = await supabase.rpc('queue_customer_confirmation_email', {
        p_customer_id: customerId,
        p_email: cleanEmail
      })
      if (!qErr && qData?.verification_token) {
        verificationToken = qData.verification_token
      }
    } catch (rpcErr) {
      console.warn('queue_customer_confirmation_email RPC fallback:', rpcErr)
    }
  }

  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://jdforcesolar.com'
  const confirmUrl = `${origin}/portal?token=${encodeURIComponent(accessToken || '')}&confirm_email=${encodeURIComponent(verificationToken)}`

  // Stage 2: Dispatch via Vercel Serverless API (/api/send-confirmation-email)
  let dispatchedViaServerless = false
  let fallbackRequired = true

  if (typeof fetch === 'function') {
    try {
      const response = await fetch('/api/send-confirmation-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId,
          customerName,
          email: cleanEmail,
          phoneNumber,
          branchLocation,
          accessToken,
          verificationToken,
          origin,
          purchases
        })
      })

      if (response.ok) {
        const resJson = await response.json()
        if (resJson?.success && resJson.provider === 'gmail_smtp') {
          dispatchedViaServerless = true
          fallbackRequired = false
        }
      }
    } catch (fetchErr) {
      console.warn('Vercel serverless mailer endpoint unreachable in current environment, using Supabase mailer fallback:', fetchErr)
    }
  }

  // Stage 2b: Automatic fallback to Supabase Auth built-in mailer if Gmail SMTP env vars are not set or running locally
  if (fallbackRequired && supabase?.auth) {
    try {
      if (typeof supabase.auth.signInWithOtp === 'function') {
        await supabase.auth.signInWithOtp({
          email: cleanEmail,
          options: {
            emailRedirectTo: confirmUrl,
            data: {
              full_name: customerName,
              phone_number: phoneNumber,
              access_token: accessToken,
              branch_location: branchLocation
            }
          }
        })
      }
    } catch (supaMailErr) {
      console.warn('Supabase Auth OTP mailer note:', supaMailErr)
    }
  }

  // Mark status as 'awaiting_confirmation' in email_confirmation_queue
  if (customerId) {
    try {
      await supabase.rpc('mark_confirmation_email_sent', {
        p_customer_id: customerId,
        p_status: 'awaiting_confirmation',
        p_error: null
      })
    } catch {
      // Fallback normalized table update if RPC is not yet created
      try {
        await supabase
          .from('customers')
          .update({
            email: cleanEmail,
            email_confirmed_at: null
          })
          .eq('id', customerId)
      } catch {
        // Ignore if columns not yet migrated
      }
    }
  }

  const finalState = {
    status: 'awaiting_confirmation',
    email: cleanEmail,
    emailConfirmed: false,
    emailConfirmedAt: null,
    verificationToken,
    confirmUrl,
    provider: dispatchedViaServerless ? 'gmail_smtp' : 'supabase_mailer',
    message: `Confirmation email sent to ${cleanEmail}. Awaiting customer email confirmation.`
  }

  notify(finalState)
  return finalState
}

/**
 * Confirms a customer's email address when they click the verification link in their email.
 */
export async function confirmCustomerEmailByToken(token, verificationToken = null) {
  if (!token) throw new Error('Customer access token is required.')

  const nowIso = new Date().toISOString()

  try {
    const { data: rpcData, error: rpcErr } = await supabase.rpc('confirm_customer_email', {
      p_token: token,
      p_verification_token: verificationToken && verificationToken !== '1' ? verificationToken : null
    })

    if (!rpcErr && rpcData) {
      if (rpcData.success) {
        const confirmedAt = rpcData.email_confirmed_at || nowIso
        writeLocalEmailState(token, {
          email: rpcData.email || undefined,
          email_confirmed: true,
          email_confirmed_at: confirmedAt,
          email_confirmation_status: 'confirmed',
          confirmed_at: confirmedAt
        })
        return {
          success: true,
          email: rpcData.email,
          emailConfirmed: true,
          emailConfirmedAt: confirmedAt,
          status: 'confirmed',
          message: rpcData.message || 'Email address verified and confirmed.'
        }
      } else if (rpcData.error) {
        throw new Error(rpcData.error)
      }
    }
  } catch (err) {
    console.warn('confirm_customer_email RPC fallback:', err)
  }

  // Fallback direct table update (normalized: only email_confirmed_at on customers)
  try {
    await supabase
      .from('customers')
      .update({
        email_confirmed_at: nowIso
      })
      .eq('access_token', token)
  } catch {
    // ignore if columns not yet migrated
  }

  writeLocalEmailState(token, {
    email_confirmed: true,
    email_confirmed_at: nowIso,
    email_confirmation_status: 'confirmed',
    confirmed_at: nowIso
  })

  return {
    success: true,
    emailConfirmed: true,
    emailConfirmedAt: nowIso,
    status: 'confirmed',
    message: 'Email address verified and confirmed.'
  }
}

/**
 * Dispatches an official Showroom Pass / Inquiry Confirmation email for customer reservations & inquiries.
 * Dispatched to /api/send-confirmation-email with receipt details and ticket code.
 */
export async function sendInquiryTicketEmail(ticketData) {
  if (!ticketData) return { success: false, error: 'Ticket data required.' }

  const recipientEmail = sanitizeEmail(ticketData.email)
  if (!recipientEmail || !isValidEmail(recipientEmail)) {
    return { success: false, error: 'Valid recipient email required.' }
  }

  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://jdforcesolar.com'

  if (typeof fetch === 'function') {
    try {
      const response = await fetch('/api/send-confirmation-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'inquiry_ticket',
          ticketCode: ticketData.ticket_code || ticketData.ticketCode,
          customerName: ticketData.customer_name || ticketData.customerName,
          email: recipientEmail,
          mobileContact: ticketData.mobile_contact || ticketData.mobileContact,
          branch: ticketData.store_branch || ticketData.branch || 'Cavite Distribution Hub',
          visitDate: ticketData.visit_date || ticketData.visitDate,
          visitTime: ticketData.visit_time_slot || ticketData.visitTime,
          productName: ticketData.product_name || ticketData.productName,
          productWatt: ticketData.product_watt || ticketData.productWatt,
          productPriceRange: ticketData.product_price_range || ticketData.productPriceRange,
          quantity: ticketData.quantity || 1,
          purposeOfVisitation: ticketData.purpose_of_visitation || ticketData.purposeOfVisitation,
          deliveryAddress: ticketData.delivery_address || ticketData.deliveryAddress,
          facebook: ticketData.facebook,
          origin
        })
      })

      if (response.ok) {
        const data = await response.json()
        return { success: true, data }
      }
      const errData = await response.json().catch(() => ({}))
      return { success: false, error: errData.error || `HTTP ${response.status}` }
    } catch (err) {
      console.warn('sendInquiryTicketEmail network note:', err)
      return { success: false, error: err.message }
    }
  }

  return { success: false, error: 'Fetch not available.' }
}

/**
 * Searches for an existing customer by phone number.
 */
export async function searchCustomerByPhone(rawPhone) {
  const phone = sanitizePhone(rawPhone) || (rawPhone || '').trim()
  if (!phone) return { customer: null, error: null }

  try {
    let customerData = null
    const { data, error } = await supabase
      .from('customers')
      .select('id, phone_number, full_name, email, email_confirmed_at, access_token, created_at, email_confirmation_queue (status, sent_at, created_at)')
      .eq('phone_number', phone)
      .maybeSingle()

    if (error && (error.code === '42703' || error.code === 'PGRST200')) {
      const fallback = await supabase
        .from('customers')
        .select('id, phone_number, full_name, email, email_confirmed_at, access_token, created_at')
        .eq('phone_number', phone)
        .maybeSingle()
      if (fallback.error && fallback.error.code === '42703') {
        const legacyFallback = await supabase
          .from('customers')
          .select('id, phone_number, full_name, access_token, created_at')
          .eq('phone_number', phone)
          .maybeSingle()
        if (legacyFallback.error) {
          console.warn('searchCustomerByPhone query error:', legacyFallback.error)
          return { customer: null, error: legacyFallback.error }
        }
        customerData = legacyFallback.data
      } else if (fallback.error) {
        console.warn('searchCustomerByPhone query error:', fallback.error)
        return { customer: null, error: fallback.error }
      } else {
        customerData = fallback.data
      }
    } else if (error) {
      console.warn('searchCustomerByPhone query error:', error)
      return { customer: null, error }
    } else {
      customerData = data
    }

    if (customerData) {
      const localState = readLocalEmailState(customerData.access_token)
      const localCred = (() => {
        try {
          return JSON.parse(localStorage.getItem(`jd_cust_cred_${customerData.access_token}`) || 'null')
        } catch {
          return null
        }
      })()

      const emailState = resolveCustomerEmailState(customerData, localState, localCred?.email || '')
      customerData = {
        ...customerData,
        ...emailState
      }
    }

    return { customer: customerData, error: null }
  } catch (err) {
    console.error('searchCustomerByPhone exception:', err)
    return { customer: null, error: err }
  }
}

/**
 * Registers or looks up a customer, logs purchases, generates the QR portal link,
 * and queues/dispatches an account creation confirmation email when a new customer
 * account is created or when an email is newly added/updated.
 */
export async function registerCustomerAndSale({
  phoneNumber,
  fullName,
  email,
  branchLocation = 'Cavite',
  items = [], // [{ productId, serialNumber, warrantyMonths, purchaseDate }]
  ticketId = null,
  onEmailStatusChange = null
}) {
  const phone = sanitizePhone(phoneNumber)
  const name = sanitizeText(fullName, { maxLength: 100 })
  const cleanEmail = sanitizeEmail(email)
  const branch = sanitizeText(branchLocation, { maxLength: 50 }) || 'Cavite'

  if (!phone) throw new Error('Phone number is required.')
  if (!isValidPhone(phone)) throw new Error('A valid 11-digit Philippine mobile number starting with 09 is required.')
  if (!name) throw new Error('Customer name is required.')
  if (!cleanEmail || !isValidEmail(cleanEmail)) throw new Error('A valid customer email address is required.')
  if (!items || items.length === 0) throw new Error('At least one purchased item is required.')

  // 1. Find or create customer
  let customer = null
  let shouldSendConfirmationEmail = false
  const { customer: existingCust, error: findErr } = await searchCustomerByPhone(phone)

  if (findErr) throw findErr

  if (existingCust) {
    customer = existingCust
    const prevEmail = (existingCust.email || '').trim().toLowerCase()
    const emailChanged = prevEmail !== cleanEmail

    // Always send purchase receipt email for any registered sale with a valid email
    shouldSendConfirmationEmail = Boolean(cleanEmail)

    // Update name or email if modified (normalized: only email and email_confirmed_at on customers)
    if (existingCust.full_name !== name || emailChanged) {
      const updatePayload = { full_name: name, email: cleanEmail }
      if (emailChanged) {
        updatePayload.email_confirmed_at = null
      }
      const { data: updatedCust, error: upErr } = await supabase
        .from('customers')
        .update(updatePayload)
        .eq('id', existingCust.id)
        .select()
        .single()

      if (upErr && upErr.code === '42703') {
        const { data: fallbackCust } = await supabase
          .from('customers')
          .update({ full_name: name })
          .eq('id', existingCust.id)
          .select()
          .single()
        if (fallbackCust) customer = { ...fallbackCust, email: cleanEmail, email_confirmed_at: emailChanged ? null : existingCust.email_confirmed_at }
      } else if (updatedCust) {
        customer = updatedCust
      }
    }
  } else {
    // Brand-new customer account creation -> always queue & send confirmation email
    shouldSendConfirmationEmail = true
    let newCust = null
    const { data: insertedWithEmail, error: insertCustErr } = await supabase
      .from('customers')
      .insert({
        phone_number: phone,
        full_name: name,
        email: cleanEmail,
        email_confirmed_at: null
      })
      .select()
      .single()

    if (insertCustErr && insertCustErr.code === '42703') {
      const { data: fallbackCust, error: fallbackErr } = await supabase
        .from('customers')
        .insert({
          phone_number: phone,
          full_name: name
        })
        .select()
        .single()
      if (fallbackErr) throw fallbackErr
      newCust = {
        ...fallbackCust,
        email: cleanEmail,
        email_confirmed_at: null,
        email_confirmed: false,
        email_confirmation_status: 'queued'
      }
    } else if (insertCustErr) {
      throw insertCustErr
    } else {
      newCust = insertedWithEmail
    }

    const emailState = resolveCustomerEmailState(newCust, null, cleanEmail)
    customer = {
      ...newCust,
      ...emailState,
      email_confirmation_status: newCust?.email_confirmation_status || 'queued'
    }
  }

  // 2. Insert purchased items
  const purchasesToInsert = items.map(item => ({
    customer_id: customer.id,
    product_id: item.productId,
    serial_number: item.serialNumber ? sanitizeSerialNumber(item.serialNumber, 64) : null,
    purchase_date: item.purchaseDate || new Date().toISOString().split('T')[0],
    warranty_months: sanitizeNumber(item.warrantyMonths, { min: 1, max: 360, integer: true, fallback: 24 }),
    branch_location: branch
  }))

  const { data: createdPurchases, error: insertPurchasesErr } = await supabase
    .from('customer_purchases')
    .insert(purchasesToInsert)
    .select(`
      id,
      product_id,
      serial_number,
      purchase_date,
      warranty_months,
      warranty_expires_at,
      branch_location,
      products (name, image_url, type, watt)
    `)

  if (insertPurchasesErr) throw insertPurchasesErr

  // 3. Build QR Code URL
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://jdforcesolar.com'
  const qrUrl = `${origin}/portal?token=${customer.access_token}`

  // 4. Queue and dispatch confirmation email if brand-new account or email changed/added
  const isAlreadyConfirmed = Boolean(customer.email_confirmed_at || customer.email_confirmed)
  let emailConfirmation = {
    triggered: shouldSendConfirmationEmail,
    email: cleanEmail,
    emailConfirmed: isAlreadyConfirmed,
    emailConfirmedAt: customer.email_confirmed_at || null,
    status: isAlreadyConfirmed ? 'confirmed' : (shouldSendConfirmationEmail ? 'queued' : (customer.email_confirmation_status || 'awaiting_confirmation'))
  }

  if (shouldSendConfirmationEmail) {
    const dispatchPromise = queueAndSendCustomerConfirmationEmail({
      customerId: customer.id,
      customerName: name,
      email: cleanEmail,
      phoneNumber: phone,
      branchLocation: branch,
      accessToken: customer.access_token,
      purchases: createdPurchases || purchasesToInsert || [],
      onStatusChange: onEmailStatusChange
    }).catch(err => {
      console.warn('Confirmation email dispatch warning:', err)
      return {
        status: 'awaiting_confirmation',
        email: cleanEmail,
        emailConfirmed: false,
        emailConfirmedAt: null
      }
    })

    emailConfirmation.dispatchPromise = dispatchPromise
    customer = {
      ...customer,
      email: cleanEmail,
      email_confirmed_at: null,
      email_confirmed: false,
      email_confirmation_status: 'queued'
    }
  } else {
    customer = {
      ...customer,
      email: customer.email || cleanEmail
    }
  }

  // 5. Deduct inventory and fulfill any linked reservation ticket in Supabase
  try {
    for (const item of items) {
      if (item.productId) {
        const pId = Number(item.productId)
        const tId = ticketId ? Number(ticketId) : null
        const { error: fulfillErr } = await supabase.rpc('fulfill_reservation_sale', {
          p_ticket_id: tId,
          p_product_id: pId,
          p_quantity: 1
        })

        if (fulfillErr) {
          console.warn('RPC fulfill_reservation_sale fallback:', fulfillErr.message)
          // Fallback direct product update if RPC fails
          const { data: prod } = await supabase
            .from('products')
            .select('id, stock_quantity, sales')
            .eq('id', pId)
            .maybeSingle()

          if (prod) {
            const nextStock = Math.max(0, (Number(prod.stock_quantity) || 1) - 1)
            await supabase
              .from('products')
              .update({
                stock_quantity: nextStock,
                sales: (Number(prod.sales) || 0) + 1,
                in_stock: nextStock > 0
              })
              .eq('id', pId)
          }

          if (tId) {
            await supabase
              .from('quote_tickets')
              .update({
                status: 'Completed',
                is_reservation: false,
                reservation_expires_at: null
              })
              .eq('id', tId)
          }
        }
      }
    }
  } catch (stockErr) {
    console.warn('Stock decrement on sale registration notice:', stockErr)
  }

  return {
    customer,
    purchases: createdPurchases,
    qrUrl,
    emailConfirmation
  }
}

/**
 * Loads customer dashboard data via token.
 * Tries the RPC function first, falling back to direct table joins.
 */
export async function fetchCustomerPortalData(token) {
  if (!token) return { data: null, error: new Error('Token is missing') }

  const localEmailState = readLocalEmailState(token)
  let localCredEmail = null
  try {
    const localCreds = JSON.parse(localStorage.getItem(`jd_cust_cred_${token}`) || 'null')
    if (localCreds?.email) localCredEmail = localCreds.email
  } catch {
    // ignore
  }

  try {
    // 1. Try secure RPC
    const { data: rpcData, error: rpcError } = await supabase.rpc('get_customer_portal_data', {
      p_token: token
    })

    if (!rpcError && rpcData) {
      const cust = rpcData.customer || {}
      const emailState = resolveCustomerEmailState(cust, localEmailState, localCredEmail)

      return {
        data: {
          ...rpcData,
          customer: {
            ...cust,
            ...emailState,
            email: emailState.email || null
          }
        },
        error: null
      }
    }

    // 2. Graceful fallback to client queries if RPC is not yet created
    let { data: custData, error: custErr } = await supabase
      .from('customers')
      .select('id, phone_number, full_name, email, email_confirmed_at, access_token, email_confirmation_queue (status, sent_at, verification_token, created_at)')
      .eq('access_token', token)
      .maybeSingle()

    if (custErr && (custErr.code === '42703' || custErr.code === 'PGRST200')) {
      const fallbackCust = await supabase
        .from('customers')
        .select('id, phone_number, full_name, email, email_confirmed_at, access_token')
        .eq('access_token', token)
        .maybeSingle()
      if (fallbackCust.error && fallbackCust.error.code === '42703') {
        const legacyCust = await supabase
          .from('customers')
          .select('id, phone_number, full_name, access_token')
          .eq('access_token', token)
          .maybeSingle()
        custData = legacyCust.data
        custErr = legacyCust.error
      } else {
        custData = fallbackCust.data
        custErr = fallbackCust.error
      }
    }

    if (custErr || !custData) {
      return { data: null, error: custErr || new Error('Customer account not found.') }
    }

    // Purchases
    let rawPurchases = null
    const { data: pWithVoid, error: errVoid } = await supabase
      .from('customer_purchases')
      .select(`
        id,
        product_id,
        serial_number,
        purchase_date,
        warranty_months,
        warranty_expires_at,
        branch_location,
        is_voided,
        void_reason,
        voided_at,
        products (name, image_url, type, watt)
      `)
      .eq('customer_id', custData.id)
      .order('purchase_date', { ascending: false })

    if (!errVoid) {
      rawPurchases = pWithVoid
    } else {
      const { data: pFallback, error: errFallback } = await supabase
        .from('customer_purchases')
        .select(`
          id,
          product_id,
          serial_number,
          purchase_date,
          warranty_months,
          warranty_expires_at,
          branch_location,
          products (name, image_url, type, watt)
        `)
        .eq('customer_id', custData.id)
        .order('purchase_date', { ascending: false })

      if (errFallback) throw errFallback
      rawPurchases = pFallback
    }

    const purchases = (rawPurchases || []).map(cp => {
      const expiry = cp.warranty_expires_at || calculateExpiryDate(cp.purchase_date, cp.warranty_months)
      const now = new Date()
      const expiryDate = new Date(expiry)
      const diffDays = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24))
      const isVoided = Boolean(cp.is_voided)
      return {
        id: cp.id,
        product_id: cp.product_id,
        product_name: cp.products?.name || 'Solar Product',
        product_type: cp.products?.type || '',
        product_image: getMainProductImage(cp.products?.image_url) || null,
        watt: cp.products?.watt || '',
        serial_number: cp.serial_number,
        purchase_date: cp.purchase_date,
        warranty_months: cp.warranty_months,
        warranty_expires_at: expiry,
        branch_location: cp.branch_location,
        is_voided: isVoided,
        void_reason: cp.void_reason || null,
        voided_at: cp.voided_at || null,
        is_warranty_active: !isVoided && diffDays > 0,
        days_remaining: isVoided ? 0 : Math.max(0, diffDays)
      }
    })

    // Claims
    const purchaseIds = purchases.map(p => p.id)
    let claims = []
    if (purchaseIds.length > 0) {
      const { data: rawClaims } = await supabase
        .from('warranty_claims')
        .select(`
          id,
          purchase_id,
          issue_category,
          description,
          media_urls,
          status,
          staff_notes,
          created_at,
          updated_at
        `)
        .in('purchase_id', purchaseIds)
        .order('created_at', { ascending: false })

      claims = (rawClaims || []).map(wc => {
        const matchedPurchase = purchases.find(p => p.id === wc.purchase_id)
        return {
          ...wc,
          product_name: matchedPurchase?.product_name || 'Solar Item',
          serial_number: matchedPurchase?.serial_number || null
        }
      })
    }

    const emailState = resolveCustomerEmailState(custData, localEmailState, localCredEmail || '')

    return {
      data: {
        customer: {
          id: custData.id,
          name: custData.full_name,
          phone: custData.phone_number,
          email: emailState.email || null,
          email_confirmed: emailState.email_confirmed,
          email_confirmed_at: emailState.email_confirmed_at,
          email_confirmation_status: emailState.email_confirmation_status,
          email_confirmation_sent_at: emailState.email_confirmation_sent_at,
          token: custData.access_token
        },
        purchases,
        claims
      },
      error: null
    }
  } catch (err) {
    console.error('fetchCustomerPortalData error:', err)
    return { data: null, error: err }
  }
}

/**
 * Uploads an image or short video file to Supabase Storage `warranty-evidence`.
 */
export async function uploadEvidenceFile(file) {
  if (!file) throw new Error('No file provided')

  const fileExt = file.name.split('.').pop()
  const cleanBase = file.name.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9]/g, '_')
  const fileName = `evidence_${Date.now()}_${cleanBase}.${fileExt}`
  const filePath = `claims/${fileName}`

  const { error: uploadError } = await supabase.storage
    .from('warranty-evidence')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false
    })

  if (uploadError) {
    // If bucket doesn't exist, we fallback to standard product-images bucket or alert
    console.warn('Storage upload error to warranty-evidence, trying product-images fallback:', uploadError)
    const { data: fallbackData, error: fallbackErr } = await supabase.storage
      .from('product-images')
      .upload(`evidence/${fileName}`, file)

    if (fallbackErr) throw uploadError
    const { data: publicUrlData } = supabase.storage
      .from('product-images')
      .getPublicUrl(`evidence/${fileName}`)
    return publicUrlData.publicUrl
  }

  const { data: publicUrlData } = supabase.storage
    .from('warranty-evidence')
    .getPublicUrl(filePath)

  return publicUrlData.publicUrl
}

/**
 * Submits a new warranty/diagnostic claim.
 */
export async function submitWarrantyClaim({
  token,
  purchaseId,
  issueCategory,
  description,
  mediaUrls = []
}) {
  if (!token) throw new Error('Token is required.')
  if (!purchaseId) throw new Error('Purchase selection is required.')
  if (!issueCategory) throw new Error('Issue category is required.')
  if (!description) throw new Error('Description is required.')

  const cleanCategory = sanitizeText(issueCategory, { maxLength: 100 })
  const cleanDescription = sanitizeText(description, { maxLength: 2000, allowMultiline: true })

  // 1. Try secure RPC
  try {
    const { data: rpcResult, error: rpcErr } = await supabase.rpc('submit_warranty_claim', {
      p_token: token,
      p_purchase_id: purchaseId,
      p_category: cleanCategory,
      p_description: cleanDescription,
      p_media_urls: mediaUrls
    })

    if (!rpcErr && rpcResult?.success) {
      return { success: true, claimId: rpcResult.claim_id }
    }
  } catch (err) {
    console.warn('RPC submit_warranty_claim failed, trying direct insert fallback:', err)
  }

  // 2. Direct insert fallback
  const { data, error } = await supabase
    .from('warranty_claims')
    .insert({
      purchase_id: purchaseId,
      issue_category: cleanCategory,
      description: cleanDescription,
      media_urls: mediaUrls,
      status: 'pending'
    })
    .select('id')
    .single()

  if (error) throw error
  return { success: true, claimId: data.id }
}

/**
 * Fetches all warranty claims for the Admin / Staff triage desk.
 */
export async function fetchAllWarrantyClaims(statusFilter = 'all') {
  try {
    let query = supabase
      .from('warranty_claims')
      .select(`
        id,
        purchase_id,
        issue_category,
        description,
        media_urls,
        status,
        staff_notes,
        created_at,
        updated_at,
        customer_purchases (
          id,
          serial_number,
          purchase_date,
          warranty_months,
          warranty_expires_at,
          branch_location,
          products (
            id,
            name,
            image_url,
            watt,
            type
          ),
          customers (
            id,
            full_name,
            phone_number
          )
        )
      `)
      .order('created_at', { ascending: false })

    if (statusFilter && statusFilter !== 'all') {
      query = query.eq('status', statusFilter)
    }

    const { data, error } = await query
    if (error) throw error

    return { claims: data || [], error: null }
  } catch (err) {
    console.error('fetchAllWarrantyClaims error:', err)
    return { claims: [], error: err }
  }
}

/**
 * Updates status and staff technician notes on a claim.
 */
export async function updateClaimStatus(claimId, status, staffNotes = '') {
  try {
    const { data, error } = await supabase
      .from('warranty_claims')
      .update({
        status,
        staff_notes: staffNotes,
        updated_at: new Date().toISOString()
      })
      .eq('id', claimId)
      .select()
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (err) {
    console.error('updateClaimStatus error:', err)
    return { data: null, error: err }
  }
}

/**
 * Archives a warranty claim by setting status to 'archived'.
 */
export async function archiveWarrantyClaim(claimId, staffNotes = '') {
  try {
    const updatePayload = {
      status: 'archived',
      updated_at: new Date().toISOString()
    }
    if (staffNotes !== undefined && staffNotes !== null) {
      updatePayload.staff_notes = staffNotes
    }

    const { data, error } = await supabase
      .from('warranty_claims')
      .update(updatePayload)
      .eq('id', claimId)
      .select()
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (err) {
    console.error('archiveWarrantyClaim error:', err)
    return { data: null, error: err }
  }
}

/**
 * Restores an archived warranty claim back to an active triage status.
 */
export async function restoreWarrantyClaim(claimId, targetStatus = 'in_review', staffNotes = '') {
  try {
    const updatePayload = {
      status: targetStatus,
      updated_at: new Date().toISOString()
    }
    if (staffNotes) {
      updatePayload.staff_notes = staffNotes
    }

    const { data, error } = await supabase
      .from('warranty_claims')
      .update(updatePayload)
      .eq('id', claimId)
      .select()
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (err) {
    console.error('restoreWarrantyClaim error:', err)
    return { data: null, error: err }
  }
}

/**
 * Permanently deletes a warranty claim from the database.
 */
export async function deleteWarrantyClaim(claimId) {
  try {
    const { error } = await supabase
      .from('warranty_claims')
      .delete()
      .eq('id', claimId)

    if (error) throw error
    return { success: true, error: null }
  } catch (err) {
    console.error('deleteWarrantyClaim error:', err)
    return { success: false, error: err }
  }
}

/**
 * Fetches all registered customers with their purchases and warranty details.
 */
export async function fetchAllCustomers() {
  try {
    let customers = null
    const { data: withQueue, error: errQueue } = await supabase
      .from('customers')
      .select(`
        id,
        phone_number,
        full_name,
        email,
        email_confirmed_at,
        access_token,
        created_at,
        email_confirmation_queue (status, sent_at, created_at),
        customer_purchases (
          id,
          product_id,
          serial_number,
          purchase_date,
          warranty_months,
          warranty_expires_at,
          branch_location,
          is_voided,
          void_reason,
          voided_at,
          products (id, name, type, watt, image_url)
        )
      `)
      .order('created_at', { ascending: false })

    if (!errQueue) {
      customers = withQueue
    } else {
      const { data: fallback, error: errFallback } = await supabase
        .from('customers')
        .select(`
          id,
          phone_number,
          full_name,
          email,
          email_confirmed_at,
          access_token,
          created_at,
          customer_purchases (
            id,
            product_id,
            serial_number,
            purchase_date,
            warranty_months,
            warranty_expires_at,
            branch_location,
            is_voided,
            void_reason,
            voided_at,
            products (id, name, type, watt, image_url)
          )
        `)
        .order('created_at', { ascending: false })

      if (errFallback && errFallback.code === '42703') {
        const { data: legacyFallback, error: errLegacy } = await supabase
          .from('customers')
          .select(`
            id,
            phone_number,
            full_name,
            access_token,
            created_at,
            customer_purchases (
              id,
              product_id,
              serial_number,
              purchase_date,
              warranty_months,
              warranty_expires_at,
              branch_location,
              products (id, name, type, watt, image_url)
            )
          `)
          .order('created_at', { ascending: false })
        if (errLegacy) throw errLegacy
        customers = legacyFallback
      } else if (errFallback) {
        throw errFallback
      } else {
        customers = fallback
      }
    }

    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://jdforcesolar.com'

    const mapped = (customers || []).map(cust => {
      const localEmailState = readLocalEmailState(cust.access_token)
      let localCredEmail = null
      try {
        const localCreds = JSON.parse(localStorage.getItem(`jd_cust_cred_${cust.access_token}`) || 'null')
        if (localCreds?.email) localCredEmail = localCreds.email
      } catch {
        // ignore
      }

      const emailState = resolveCustomerEmailState(cust, localEmailState, localCredEmail || '')

      const purchases = (cust.customer_purchases || []).map(cp => {
        const expiry = cp.warranty_expires_at || calculateExpiryDate(cp.purchase_date, cp.warranty_months)
        const now = new Date()
        const expiryDate = new Date(expiry)
        const diffDays = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24))
        const isVoided = Boolean(cp.is_voided)
        return {
          ...cp,
          product_name: cp.products?.name || 'Solar Product',
          is_voided: isVoided,
          void_reason: cp.void_reason || null,
          voided_at: cp.voided_at || null,
          is_warranty_active: !isVoided && diffDays > 0,
          days_remaining: isVoided ? 0 : Math.max(0, diffDays)
        }
      })

      const activeWarrantiesCount = purchases.filter(p => p.is_warranty_active).length

      return {
        id: cust.id,
        phone_number: cust.phone_number,
        full_name: cust.full_name,
        email: emailState.email,
        email_confirmed: emailState.email_confirmed,
        email_confirmed_at: emailState.email_confirmed_at,
        email_confirmation_status: emailState.email_confirmation_status,
        access_token: cust.access_token,
        created_at: cust.created_at,
        purchases,
        total_purchases: purchases.length,
        active_warranties_count: activeWarrantiesCount,
        qr_url: `${origin}/portal?token=${cust.access_token}`
      }
    })

    return { customers: mapped, error: null }
  } catch (err) {
    console.error('fetchAllCustomers error:', err)
    return { customers: [], error: err }
  }
}

/**
 * Fetches whether a customer currently has a password configured and their linked email.
 */
export async function getCustomerAuthStatus(token) {
  if (!token) {
    return {
      hasPassword: false,
      email: null,
      emailConfirmed: false,
      emailConfirmationStatus: 'unconfirmed'
    }
  }

  const localEmailState = readLocalEmailState(token)

  try {
    const { data: rpcData, error: rpcError } = await supabase.rpc('get_customer_auth_status', {
      p_token: token
    })
    if (!rpcError && rpcData) {
      const resolvedEmail = rpcData.email || localEmailState?.email || null
      const resolvedConfirmed = Boolean(rpcData.email_confirmed || localEmailState?.email_confirmed)
      return {
        hasPassword: Boolean(rpcData.has_password),
        email: resolvedEmail,
        emailConfirmed: resolvedConfirmed,
        emailConfirmationStatus: resolvedConfirmed
          ? 'confirmed'
          : (rpcData.email_confirmation_status || localEmailState?.email_confirmation_status || (resolvedEmail ? 'awaiting_confirmation' : 'unconfirmed'))
      }
    }
  } catch (err) {
    console.warn('RPC get_customer_auth_status check skipped:', err)
  }

  // Fallback: check local storage credential mirror
  try {
    const localCreds = JSON.parse(localStorage.getItem(`jd_cust_cred_${token}`) || 'null')
    if (localCreds) {
      const resolvedEmail = localCreds.email || localEmailState?.email || null
      const resolvedConfirmed = Boolean(localEmailState?.email_confirmed)
      return {
        hasPassword: true,
        email: resolvedEmail,
        emailConfirmed: resolvedConfirmed,
        emailConfirmationStatus: resolvedConfirmed
          ? 'confirmed'
          : (localEmailState?.email_confirmation_status || (resolvedEmail ? 'awaiting_confirmation' : 'unconfirmed'))
      }
    }
  } catch (e) {
    console.warn('Local credential parse error', e)
  }

  if (localEmailState?.email) {
    return {
      hasPassword: false,
      email: localEmailState.email,
      emailConfirmed: Boolean(localEmailState.email_confirmed),
      emailConfirmationStatus: localEmailState.email_confirmed
        ? 'confirmed'
        : (localEmailState.email_confirmation_status || 'awaiting_confirmation')
    }
  }

  return {
    hasPassword: false,
    email: null,
    emailConfirmed: false,
    emailConfirmationStatus: 'unconfirmed'
  }
}

/**
 * Sets or updates a customer's password.
 */
export async function setCustomerPassword({ token, email, password, currentPassword = null }) {
  if (!token) throw new Error('Customer token is required.')
  const cleanEmail = sanitizeEmail(email)
  if (!cleanEmail || !isValidEmail(cleanEmail)) throw new Error('A valid email address is required.')
  if (!password || password.length < 8) throw new Error('Password must be at least 8 characters.')

  const prevLocalEmail = readLocalEmailState(token)
  const emailChanged = !prevLocalEmail?.email || prevLocalEmail.email.toLowerCase() !== cleanEmail

  try {
    const { data: rpcData, error: rpcError } = await supabase.rpc('set_customer_password', {
      p_token: token,
      p_email: cleanEmail,
      p_password: password,
      p_current_password: currentPassword || null
    })

    if (!rpcError && rpcData) {
      if (rpcData.success) {
        // Save client cache
        localStorage.setItem(`jd_cust_cred_${token}`, JSON.stringify({ email: cleanEmail }))
        if (emailChanged) {
          writeLocalEmailState(token, {
            email: cleanEmail,
            email_confirmed: false,
            email_confirmation_status: 'awaiting_confirmation'
          })
        }

        // Seamlessly sync with native Supabase Auth
        try {
          await supabase.auth.signUp({
            email: cleanEmail,
            password: password,
            options: {
              data: {
                role: 'customer',
                access_token: token
              }
            }
          })
        } catch (authSyncErr) {
          console.warn('Supabase Auth user sync note:', authSyncErr)
        }

        return { success: true, email: cleanEmail, emailChanged, message: rpcData.message }
      } else {
        throw new Error(rpcData.error || 'Failed to update password.')
      }
    }
    if (rpcError) {
      console.warn('RPC set_customer_password error, checking fallback:', rpcError)
      throw rpcError
    }
  } catch (err) {
    // If backend RPC is not yet deployed, store locally for smooth operation
    console.warn('Using client fallback credential storage:', err)
    localStorage.setItem(`jd_cust_cred_${token}`, JSON.stringify({
      email: cleanEmail,
      token,
      savedAt: new Date().toISOString()
    }))
    // Also index by email for local sign-in resolution
    localStorage.setItem(`jd_cust_acc_${cleanEmail}`, JSON.stringify({
      token,
      email: cleanEmail,
      hash: btoa(password)
    }))

    if (emailChanged) {
      writeLocalEmailState(token, {
        email: cleanEmail,
        email_confirmed: false,
        email_confirmation_status: 'awaiting_confirmation'
      })
    }

    return {
      success: true,
      email: cleanEmail,
      emailChanged,
      message: 'Password saved successfully.'
    }
  }
}

/**
 * Attempts customer login via email and password.
 */
export async function loginCustomerWithPassword(email, password) {
  const cleanEmail = (email || '').trim().toLowerCase()
  if (!cleanEmail || !password) {
    return { token: null, customer: null, error: new Error('Email and password are required.') }
  }

  // 1. Attempt native Supabase Auth sign-in first
  try {
    const { data: supaAuth, error: supaErr } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password
    })
    if (!supaErr && supaAuth?.user) {
      const { data: custRow } = await supabase
        .from('customers')
        .select('*')
        .eq('email', cleanEmail)
        .maybeSingle()

      if (custRow?.access_token) {
        return {
          token: custRow.access_token,
          customer: custRow,
          authUser: supaAuth.user,
          error: null
        }
      }
    }
  } catch (nativeAuthErr) {
    console.warn('Native Supabase Auth attempt note:', nativeAuthErr)
  }

  // 2. Fallback to customer_passwords RPC
  try {
    const { data: rpcData, error: rpcError } = await supabase.rpc('customer_login', {
      p_email: cleanEmail,
      p_password: password
    })

    if (!rpcError && rpcData) {
      if (rpcData.success) {
        return {
          token: rpcData.token,
          customer: rpcData.customer,
          error: null
        }
      } else {
        return { token: null, customer: null, error: new Error(rpcData.error || 'Invalid credentials.') }
      }
    }
  } catch (err) {
    console.warn('RPC customer_login failed, checking fallback:', err)
  }

  // Fallback: check localStorage registry
  try {
    const recordStr = localStorage.getItem(`jd_cust_acc_${cleanEmail}`)
    if (recordStr) {
      const record = JSON.parse(recordStr)
      if (record.hash === btoa(password)) {
        return {
          token: record.token,
          customer: { email: cleanEmail, token: record.token },
          error: null
        }
      }
    }
  } catch (e) {
    console.warn('Fallback login parsing error', e)
  }

  return { token: null, customer: null, error: new Error('Invalid email or password.') }
}

/**
 * Updates basic customer profile information (full_name, phone_number, email).
 */
export async function updateCustomerProfile(
  customerId,
  { fullName, phoneNumber, email, province, city, barangay, previousEmail = null, accessToken = null, branchLocation = 'Cavite', onEmailStatusChange = null }
) {
  if (!customerId) throw new Error('Customer ID is required.')

  const updates = {}
  if (fullName !== undefined) updates.full_name = sanitizeText(fullName, { maxLength: 100 })
  if (phoneNumber !== undefined) {
    const cleaned = sanitizePhone(phoneNumber)
    if (cleaned && !isValidPhone(cleaned)) {
      throw new Error('Valid 11-digit mobile number starting with 09 is required.')
    }
    updates.phone_number = cleaned
  }

  let cleanEmail = undefined
  if (email !== undefined) {
    cleanEmail = sanitizeEmail(email)
    if (!cleanEmail || !isValidEmail(cleanEmail)) {
      throw new Error('A valid customer email address is required.')
    }
    updates.email = cleanEmail
  }

  if (province !== undefined) updates.province = province ? sanitizeText(province, { maxLength: 100 }) : null
  if (city !== undefined) updates.city = city ? sanitizeText(city, { maxLength: 100 }) : null
  if (barangay !== undefined) updates.barangay = barangay ? sanitizeText(barangay, { maxLength: 100 }) : null

  try {
    const prevNormalized = previousEmail ? sanitizeEmail(previousEmail) : ''
    const emailChanged = Boolean(cleanEmail && cleanEmail !== prevNormalized)
    if (emailChanged) {
      updates.email_confirmed_at = null
    }

    let customerData = null
    const { data, error } = await supabase
      .from('customers')
      .update(updates)
      .eq('id', customerId)
      .select(`
        id,
        phone_number,
        full_name,
        email,
        email_confirmed_at,
        access_token,
        created_at
      `)
      .single()

    if (error && error.code === '42703') {
      // Column does not exist fallback
      const fallbackUpdates = { ...updates }
      delete fallbackUpdates.province
      delete fallbackUpdates.city
      delete fallbackUpdates.barangay
      delete fallbackUpdates.email
      delete fallbackUpdates.email_confirmed_at
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('customers')
        .update(fallbackUpdates)
        .eq('id', customerId)
        .select()
        .single()
      if (fallbackError) throw fallbackError
      customerData = fallbackData
    } else if (error) {
      throw error
    } else {
      customerData = data
    }

    const resolvedToken = customerData?.access_token || accessToken

    let emailConfirmation = null
    if (cleanEmail && emailChanged && resolvedToken) {
      emailConfirmation = await queueAndSendCustomerConfirmationEmail({
        customerId: customerData.id,
        customerName: customerData.full_name || fullName,
        phoneNumber: customerData.phone_number || phoneNumber,
        email: cleanEmail,
        accessToken: resolvedToken,
        branchLocation,
        onStatusChange: onEmailStatusChange
      })
      customerData = {
        ...customerData,
        email: cleanEmail,
        email_confirmed_at: null,
        email_confirmed: false,
        email_confirmation_status: emailConfirmation?.status || 'awaiting_confirmation'
      }
    } else if (cleanEmail) {
      const localState = readLocalEmailState(resolvedToken)
      const emailState = resolveCustomerEmailState(customerData, localState, cleanEmail)
      customerData = {
        ...customerData,
        ...emailState
      }
    }

    return { customer: customerData, emailConfirmation, error: null }
  } catch (err) {
    throw err
  }
}

/**
 * Adds an individual product purchase / unit to an existing customer.
 */
export async function addCustomerProductPurchase({
  customerId,
  productId,
  serialNumber = null,
  warrantyMonths = 24,
  purchaseDate = null,
  branchLocation = 'Cavite'
}) {
  if (!customerId) throw new Error('Customer ID is required.')
  if (!productId) throw new Error('Product is required.')

  const payload = {
    customer_id: customerId,
    product_id: productId,
    serial_number: (serialNumber || '').trim() || null,
    purchase_date: purchaseDate || new Date().toISOString().split('T')[0],
    warranty_months: Number(warrantyMonths || 24),
    branch_location: branchLocation || 'Cavite'
  }

  const { data, error } = await supabase
    .from('customer_purchases')
    .insert([payload])
    .select(`
      id,
      customer_id,
      product_id,
      serial_number,
      purchase_date,
      warranty_months,
      warranty_expires_at,
      branch_location,
      products (id, name, type, watt, image_url)
    `)
    .single()

  if (error) throw error

  const expiry = data.warranty_expires_at || calculateExpiryDate(data.purchase_date, data.warranty_months)
  const now = new Date()
  const expiryDate = new Date(expiry)
  const diffDays = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24))

  return {
    purchase: {
      ...data,
      product_name: data.products?.name || 'Solar Product',
      is_voided: false,
      void_reason: null,
      is_warranty_active: diffDays > 0,
      days_remaining: Math.max(0, diffDays)
    },
    error: null
  }
}

/**
 * Voids warranty for a specific customer purchase.
 */
export async function voidCustomerWarranty({ purchaseId, reason = 'Administrative Void' }) {
  if (!purchaseId) throw new Error('Purchase ID is required.')

  const nowIso = new Date().toISOString()

  // Try updating with is_voided and void_reason
  const { data, error } = await supabase
    .from('customer_purchases')
    .update({
      is_voided: true,
      void_reason: reason,
      voided_at: nowIso
    })
    .eq('id', purchaseId)
    .select()

  if (error) {
    if (error.code === '42703') {
      // Column does not exist yet; fall back to setting warranty_expires_at to past timestamp
      const fallback = await supabase
        .from('customer_purchases')
        .update({
          warranty_expires_at: '1970-01-01T00:00:00Z'
        })
        .eq('id', purchaseId)
        .select()
      if (fallback.error) throw fallback.error
      return {
        data: fallback.data,
        warning: 'Please run warranty_void_migration.sql in Supabase to track explicit void reasons.',
        error: null
      }
    }
    throw error
  }
  return { data, error: null }
}

/**
 * Unvoids / reactivates warranty for a specific customer purchase.
 */
export async function unvoidCustomerWarranty({ purchaseId, warrantyMonths = 12, purchaseDate }) {
  if (!purchaseId) throw new Error('Purchase ID is required.')

  const { data, error } = await supabase
    .from('customer_purchases')
    .update({
      is_voided: false,
      void_reason: null,
      voided_at: null
    })
    .eq('id', purchaseId)
    .select()

  if (error) {
    if (error.code === '42703') {
      // If column does not exist, recalculate expiry date from purchaseDate and warrantyMonths
      if (purchaseDate) {
        const recalculated = calculateExpiryDate(purchaseDate, warrantyMonths)
        await supabase
          .from('customer_purchases')
          .update({ warranty_expires_at: recalculated })
          .eq('id', purchaseId)
      }
      return { data: null, error: null }
    }
    throw error
  }
  return { data, error: null }
}

/**
 * Extends the warranty period for an existing customer purchase.
 */
export async function extendCustomerWarranty({ purchaseId, additionalMonths = 12 }) {
  if (!purchaseId) throw new Error('Purchase ID is required.')
  const monthsToAdd = Number(additionalMonths) || 12

  const { data: current, error: fetchErr } = await supabase
    .from('customer_purchases')
    .select('id, purchase_date, warranty_months, warranty_expires_at')
    .eq('id', purchaseId)
    .single()

  if (fetchErr || !current) throw (fetchErr || new Error('Purchase record not found.'))

  const baseExpiry = current.warranty_expires_at
    ? new Date(current.warranty_expires_at)
    : new Date(calculateExpiryDate(current.purchase_date, current.warranty_months || 12))
  const now = new Date()

  // If already expired, extend from today; if still active, add to existing expiration date
  const startFrom = baseExpiry > now ? baseExpiry : now
  const newExpiry = new Date(startFrom)
  newExpiry.setMonth(newExpiry.getMonth() + monthsToAdd)

  const newTotalMonths = (Number(current.warranty_months) || 12) + monthsToAdd

  const updatePayload = {
    warranty_months: newTotalMonths,
    warranty_expires_at: newExpiry.toISOString()
  }

  // Attempt update clearing void status as well
  let { data, error } = await supabase
    .from('customer_purchases')
    .update({
      ...updatePayload,
      is_voided: false,
      void_reason: null,
      voided_at: null
    })
    .eq('id', purchaseId)
    .select(`
      id,
      customer_id,
      product_id,
      serial_number,
      purchase_date,
      warranty_months,
      warranty_expires_at,
      branch_location,
      products (id, name, type, watt, image_url)
    `)
    .single()

  if (error && error.code === '42703') {
    const fallback = await supabase
      .from('customer_purchases')
      .update(updatePayload)
      .eq('id', purchaseId)
      .select(`
        id,
        customer_id,
        product_id,
        serial_number,
        purchase_date,
        warranty_months,
        warranty_expires_at,
        branch_location,
        products (id, name, type, watt, image_url)
      `)
      .single()
    if (fallback.error) throw fallback.error
    data = fallback.data
    error = null
  }

  if (error) throw error

  const expiry = data.warranty_expires_at || calculateExpiryDate(data.purchase_date, data.warranty_months)
  const diffDays = Math.ceil((new Date(expiry) - new Date()) / (1000 * 60 * 60 * 24))

  return {
    purchase: {
      ...data,
      product_name: data.products?.name || 'Solar Product',
      is_voided: false,
      void_reason: null,
      is_warranty_active: diffDays > 0,
      days_remaining: Math.max(0, diffDays)
    },
    error: null
  }
}

/**
 * Removes / deletes a customer purchase and any associated warranty claims.
 */
export async function removeCustomerPurchase({ purchaseId }) {
  if (!purchaseId) throw new Error('Purchase ID is required.')

  // 1. Delete associated warranty claims first to respect foreign key constraint
  try {
    await supabase
      .from('warranty_claims')
      .delete()
      .eq('purchase_id', purchaseId)
  } catch (claimErr) {
    console.warn('Non-fatal: Error deleting linked warranty claims:', claimErr)
  }

  // 2. Delete the purchase record
  const { error } = await supabase
    .from('customer_purchases')
    .delete()
    .eq('id', purchaseId)

  if (error) throw error
  return { success: true, error: null }
}

/**
 * Helper to clear local storage credential mirrors for a deleted customer.
 */
function purgeCustomerLocalStorage({ token, email }) {
  try {
    if (token) {
      const credRaw = localStorage.getItem(`jd_cust_cred_${token}`)
      if (credRaw) {
        try {
          const parsed = JSON.parse(credRaw)
          if (parsed?.email) {
            localStorage.removeItem(`jd_cust_acc_${parsed.email.toLowerCase()}`)
          }
        } catch {
          // ignore parse error
        }
      }
      localStorage.removeItem(`jd_cust_cred_${token}`)
      localStorage.removeItem(`${EMAIL_CONFIRMATION_STORAGE_PREFIX}${token}`)

      if (localStorage.getItem('jd_customer_token') === token) {
        localStorage.removeItem('jd_customer_token')
        localStorage.removeItem('jd_customer_email')
      }
    }
    if (email) {
      const cleanEmail = email.trim().toLowerCase()
      localStorage.removeItem(`jd_cust_acc_${cleanEmail}`)
      if (localStorage.getItem('jd_customer_email') === cleanEmail) {
        localStorage.removeItem('jd_customer_email')
      }
    }
  } catch (e) {
    console.warn('Non-fatal error clearing customer localStorage:', e)
  }
}

/**
 * Permanently deletes a customer account and cascades to all linked credentials,
 * registered units/warranties, and warranty claims.
 * Supports customer self-deletion (by token) and Admin deletion (by customerId).
 */
export async function deleteCustomerAccount({ customerId = null, token = null, email = null }) {
  if (!customerId && !token) {
    throw new Error('Customer ID or access token is required to delete account.')
  }

  let resolvedId = customerId
  let resolvedToken = token
  let resolvedEmail = email

  // Look up customer details before deletion for complete cleanup
  try {
    let query = supabase.from('customers').select('id, access_token')
    if (resolvedId) {
      query = query.eq('id', resolvedId)
    } else {
      query = query.eq('access_token', resolvedToken)
    }
    const { data: custRecord } = await query.maybeSingle()
    if (custRecord) {
      resolvedId = custRecord.id
      resolvedToken = custRecord.access_token || resolvedToken
    }
  } catch (e) {
    console.warn('Customer lookup prior to delete skipped:', e)
  }

  // 1. Try secure RPC first
  try {
    const { data: rpcData, error: rpcError } = await supabase.rpc('delete_customer_account', {
      p_token: token || null,
      p_customer_id: customerId || null
    })

    if (!rpcError && rpcData) {
      if (rpcData.success) {
        purgeCustomerLocalStorage({ token: resolvedToken, email: resolvedEmail })
        return { success: true, error: null }
      } else if (rpcData.error) {
        throw new Error(rpcData.error)
      }
    }
  } catch (rpcErr) {
    // Only rethrow explicit permission/validation errors from RPC
    if (
      rpcErr?.message &&
      !rpcErr.message.includes('function') &&
      !rpcErr.message.includes('schema cache') &&
      !rpcErr.message.includes('Could not find')
    ) {
      throw rpcErr
    }
    console.warn('RPC delete_customer_account unavailable, using direct table deletion:', rpcErr)
  }

  // 2. Direct table deletion (ON DELETE CASCADE handles child tables automatically,
  //    plus explicit child cleanup for defense in depth)
  if (resolvedId) {
    try {
      const { data: purchases } = await supabase
        .from('customer_purchases')
        .select('id')
        .eq('customer_id', resolvedId)

      const purchaseIds = (purchases || []).map(p => p.id)
      if (purchaseIds.length > 0) {
        await supabase.from('warranty_claims').delete().in('purchase_id', purchaseIds)
      }
      await supabase.from('customer_purchases').delete().eq('customer_id', resolvedId)
      await supabase.from('customer_passwords').delete().eq('customer_id', resolvedId)
    } catch (childErr) {
      console.warn('Child record pre-cleanup skipped (handled by ON DELETE CASCADE):', childErr)
    }

    const { error: deleteErr } = await supabase
      .from('customers')
      .delete()
      .eq('id', resolvedId)

    if (deleteErr) throw deleteErr
  } else if (resolvedToken) {
    const { error: deleteErr } = await supabase
      .from('customers')
      .delete()
      .eq('access_token', resolvedToken)

    if (deleteErr) throw deleteErr
  }

  purgeCustomerLocalStorage({ token: resolvedToken, email: resolvedEmail })
  return { success: true, error: null }
}

/**
 * Permanently deletes a platform user account (Staff or Admin).
 * Enforces last-admin safeguard and cleans up both role tables and auth.users when RPC is available.
 */
export async function deletePlatformUser({ targetUserId, table = null }) {
  if (!targetUserId) {
    throw new Error('Target user ID is required.')
  }

  // 1. Check if target user is an Administrator and enforce last-admin safeguard
  const isTargetAdmin = table === 'admins'
  if (isTargetAdmin) {
    const { count, error: countErr } = await supabase
      .from('admins')
      .select('id', { count: 'exact', head: true })

    if (!countErr && typeof count === 'number' && count <= 1) {
      throw new Error('Cannot delete the last remaining administrator account.')
    }
  }

  // 2. Try secure RPC first (deletes from public.admins, public.staff, and auth.users)
  try {
    const { data: rpcData, error: rpcError } = await supabase.rpc('delete_platform_user', {
      p_target_user_id: targetUserId
    })

    if (!rpcError && rpcData) {
      if (rpcData.success) {
        return { success: true, error: null }
      } else if (rpcData.error) {
        throw new Error(rpcData.error)
      }
    }
  } catch (rpcErr) {
    if (
      rpcErr?.message &&
      !rpcErr.message.includes('function') &&
      !rpcErr.message.includes('schema cache') &&
      !rpcErr.message.includes('Could not find')
    ) {
      throw rpcErr
    }
    console.warn('RPC delete_platform_user unavailable, using direct table deletion:', rpcErr)
  }

  // 3. Direct table deletion fallback
  if (table === 'admins' || table === 'staff') {
    const { error } = await supabase
      .from(table)
      .delete()
      .eq('id', targetUserId)

    if (error) throw error
  } else {
    const [adminDel, staffDel] = await Promise.all([
      supabase.from('admins').delete().eq('id', targetUserId),
      supabase.from('staff').delete().eq('id', targetUserId)
    ])
    if (adminDel.error && staffDel.error) {
      throw adminDel.error
    }
  }

  return { success: true, error: null }
}





/**
 * Requests a password reset email. Always resolves the same way whether or not
 * the email belongs to an account; the server never reveals that.
 */
export async function requestPasswordReset(email) {
  const cleanEmail = (email || '').trim().toLowerCase()
  if (!cleanEmail || !isValidEmail(cleanEmail)) {
    throw new Error('A valid email address is required.')
  }
  const res = await fetch('/api/forgot-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: cleanEmail })
  })
  if (!res.ok) {
    throw new Error('Unable to send the reset link right now. Please try again shortly.')
  }
  return { success: true }
}

/**
 * Redeems a reset token and sets the new password.
 */
export async function resetCustomerPassword(token, newPassword) {
  if (!token) throw new Error('This reset link is invalid or has expired.')
  if (!newPassword || newPassword.length < 8) throw new Error('Password must be at least 8 characters.')
  const { data, error } = await supabase.rpc('reset_customer_password', {
    p_token: token,
    p_new_password: newPassword
  })
  if (error) throw new Error('Unable to reset the password right now. Please try again.')
  if (!data?.success) throw new Error(data?.error || 'This reset link is invalid or has expired.')
  return data
}
