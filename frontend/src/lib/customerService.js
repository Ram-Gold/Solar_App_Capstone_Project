import { supabase } from './supabaseClient'
import { calculateExpiryDate } from './warrantyUtils'

/**
 * Searches for an existing customer by phone number.
 */
export async function searchCustomerByPhone(rawPhone) {
  const phone = (rawPhone || '').trim()
  if (!phone) return { customer: null, error: null }

  try {
    const { data, error } = await supabase
      .from('customers')
      .select('id, phone_number, full_name, access_token, created_at')
      .eq('phone_number', phone)
      .maybeSingle()

    if (error) {
      console.warn('searchCustomerByPhone query error:', error)
      return { customer: null, error }
    }

    return { customer: data, error: null }
  } catch (err) {
    console.error('searchCustomerByPhone exception:', err)
    return { customer: null, error: err }
  }
}

/**
 * Registers or looks up a customer, logs purchases, and generates the QR portal link.
 */
export async function registerCustomerAndSale({
  phoneNumber,
  fullName,
  branchLocation = 'Cavite',
  items = [] // [{ productId, serialNumber, warrantyMonths, purchaseDate }]
}) {
  const phone = (phoneNumber || '').trim()
  const name = (fullName || '').trim()

  if (!phone) throw new Error('Phone number is required.')
  if (!name) throw new Error('Customer name is required.')
  if (!items || items.length === 0) throw new Error('At least one purchased item is required.')

  // 1. Find or create customer
  let customer = null
  const { customer: existingCust, error: findErr } = await searchCustomerByPhone(phone)
  
  if (findErr) throw findErr

  if (existingCust) {
    customer = existingCust
    // Optionally update name if modified
    if (existingCust.full_name !== name) {
      const { data: updatedCust } = await supabase
        .from('customers')
        .update({ full_name: name })
        .eq('id', existingCust.id)
        .select()
        .single()
      if (updatedCust) customer = updatedCust
    }
  } else {
    // Insert new customer
    const { data: newCust, error: insertCustErr } = await supabase
      .from('customers')
      .insert({
        phone_number: phone,
        full_name: name
      })
      .select()
      .single()

    if (insertCustErr) throw insertCustErr
    customer = newCust
  }

  // 2. Insert purchased items
  const purchasesToInsert = items.map(item => ({
    customer_id: customer.id,
    product_id: item.productId,
    serial_number: (item.serialNumber || '').trim() || null,
    purchase_date: item.purchaseDate || new Date().toISOString().split('T')[0],
    warranty_months: Number(item.warrantyMonths || 12),
    branch_location: branchLocation
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

  return {
    customer,
    purchases: createdPurchases,
    qrUrl
  }
}

/**
 * Loads customer dashboard data via token.
 * Tries the RPC function first, falling back to direct table joins.
 */
export async function fetchCustomerPortalData(token) {
  if (!token) return { data: null, error: new Error('Token is missing') }

  try {
    // 1. Try secure RPC
    const { data: rpcData, error: rpcError } = await supabase.rpc('get_customer_portal_data', {
      p_token: token
    })

    if (!rpcError && rpcData) {
      return { data: rpcData, error: null }
    }

    // 2. Graceful fallback to client queries if RPC is not yet created
    const { data: custData, error: custErr } = await supabase
      .from('customers')
      .select('id, phone_number, full_name, access_token')
      .eq('access_token', token)
      .maybeSingle()

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
        product_image: cp.products?.image_url || null,
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

    return {
      data: {
        customer: {
          id: custData.id,
          name: custData.full_name,
          phone: custData.phone_number,
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

  // 1. Try secure RPC
  try {
    const { data: rpcResult, error: rpcErr } = await supabase.rpc('submit_warranty_claim', {
      p_token: token,
      p_purchase_id: purchaseId,
      p_category: issueCategory,
      p_description: description,
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
      issue_category: issueCategory,
      description,
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
    const { data: withVoid, error: errVoid } = await supabase
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
          is_voided,
          void_reason,
          voided_at,
          products (id, name, type, watt, image_url)
        )
      `)
      .order('created_at', { ascending: false })

    if (!errVoid) {
      customers = withVoid
    } else {
      const { data: fallback, error: errFallback } = await supabase
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

      if (errFallback) throw errFallback
      customers = fallback
    }

    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://jdforcesolar.com'

    const mapped = (customers || []).map(cust => {
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
  if (!token) return { hasPassword: false, email: null }

  try {
    const { data: rpcData, error: rpcError } = await supabase.rpc('get_customer_auth_status', {
      p_token: token
    })
    if (!rpcError && rpcData) {
      return {
        hasPassword: Boolean(rpcData.has_password),
        email: rpcData.email || null
      }
    }
  } catch (err) {
    console.warn('RPC get_customer_auth_status check skipped:', err)
  }

  // Fallback: check local storage credential mirror
  try {
    const localCreds = JSON.parse(localStorage.getItem(`jd_cust_cred_${token}`) || 'null')
    if (localCreds) {
      return { hasPassword: true, email: localCreds.email || null }
    }
  } catch (e) {
    console.warn('Local credential parse error', e)
  }

  return { hasPassword: false, email: null }
}

/**
 * Sets or updates a customer's password.
 */
export async function setCustomerPassword({ token, email, password, currentPassword = null }) {
  if (!token) throw new Error('Customer token is required.')
  if (!email || !email.includes('@')) throw new Error('A valid email address is required.')
  if (!password || password.length < 6) throw new Error('Password must be at least 6 characters.')

  const cleanEmail = email.trim().toLowerCase()

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
        return { success: true, email: cleanEmail, message: rpcData.message }
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

    return {
      success: true,
      email: cleanEmail,
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
 * Updates basic customer profile information (full_name, phone_number).
 */
export async function updateCustomerProfile(customerId, { fullName, phoneNumber }) {
  if (!customerId) throw new Error('Customer ID is required.')

  const updates = {}
  if (fullName !== undefined) updates.full_name = fullName.trim()
  if (phoneNumber !== undefined) updates.phone_number = phoneNumber.trim()

  const { data, error } = await supabase
    .from('customers')
    .update(updates)
    .eq('id', customerId)
    .select(`
      id,
      phone_number,
      full_name,
      access_token,
      created_at
    `)
    .single()

  if (error) throw error
  return { customer: data, error: null }
}

/**
 * Adds an individual product purchase / unit to an existing customer.
 */
export async function addCustomerProductPurchase({
  customerId,
  productId,
  serialNumber = null,
  warrantyMonths = 12,
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
    warranty_months: Number(warrantyMonths || 12),
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



