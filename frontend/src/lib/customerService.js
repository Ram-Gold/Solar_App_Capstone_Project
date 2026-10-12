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
    const { data: rawPurchases, error: purchasesErr } = await supabase
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

    if (purchasesErr) throw purchasesErr

    const purchases = (rawPurchases || []).map(cp => {
      const expiry = cp.warranty_expires_at || calculateExpiryDate(cp.purchase_date, cp.warranty_months)
      const now = new Date()
      const expiryDate = new Date(expiry)
      const diffDays = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24))
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
        is_warranty_active: diffDays > 0,
        days_remaining: Math.max(0, diffDays)
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
