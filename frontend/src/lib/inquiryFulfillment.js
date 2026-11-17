/**
 * JD Solar Platform - Deep Inquiry Fulfillment & Stock Hold Module
 * Centralizes Inquiry submission, Stock Hold RPC ordering, Mon-Sat 8:00 AM - 5:30 PM
 * schedule validation, retention auto-purge, and post-mutation product deltas
 * behind a repository adapter seam.
 */

import { supabase } from './supabaseClient'
import { isEligibleForAutoPurge } from './inquiryStatusUtils'
import { getBranchStock } from './inventoryUtils'

const LOCAL_QUOTES_KEY = 'jds_local_quotes'

/**
 * Parses either "HH:MM" (24h) or "HH:MM AM/PM ..." into minutes since midnight.
 */
function parseTimeToMinutes(timeStr) {
  if (!timeStr) return null
  const trimmed = String(timeStr).trim()
  const firstSegment = trimmed.split('-')[0].trim()

  const ampmMatch = firstSegment.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i)
  if (ampmMatch) {
    let hours = Number(ampmMatch[1])
    const mins = Number(ampmMatch[2])
    const period = ampmMatch[3].toUpperCase()
    if (period === 'PM' && hours !== 12) hours += 12
    if (period === 'AM' && hours === 12) hours = 0
    return hours * 60 + mins
  }

  const h24Match = firstSegment.match(/^(\d{1,2}):(\d{2})$/)
  if (h24Match) {
    return Number(h24Match[1]) * 60 + Number(h24Match[2])
  }

  return null
}

/**
 * Formats 24-hour "HH:MM" to "HH:MM AM/PM".
 */
export function format24HourToDisplay(time24) {
  if (!time24) return ''
  const [hStr, mStr] = String(time24).split(':')
  const hours = Number(hStr)
  const mins = Number(mStr)
  if (Number.isNaN(hours) || Number.isNaN(mins)) return String(time24)
  const period = hours >= 12 ? 'PM' : 'AM'
  const h12 = hours % 12 === 0 ? 12 : hours % 12
  return `${String(h12).padStart(2, '0')}:${String(mins).padStart(2, '0')} ${period}`
}

/**
 * Enforces Mon-Sat and 8:00 AM - 5:30 PM showroom business hours.
 * Throws a descriptive Error if invalid.
 */
export function validateBusinessSchedule(visitDate, visitTime) {
  if (!visitDate) {
    throw new Error('Please select a visit date.')
  }
  const dateObj = new Date(`${visitDate}T00:00:00`)
  if (Number.isNaN(dateObj.getTime())) {
    throw new Error('Please choose a valid calendar date.')
  }
  if (dateObj.getDay() === 0) {
    throw new Error('Our showrooms are closed on Sundays. Please choose Monday through Saturday.')
  }

  if (!visitTime) {
    throw new Error('Please select a visit time.')
  }
  const totalMins = parseTimeToMinutes(visitTime)
  if (totalMins === null || totalMins < 8 * 60 || totalMins > 17 * 60 + 30) {
    throw new Error('Showroom visits must be scheduled within business hours: 8:00 AM to 5:30 PM.')
  }
}

function findMatchedProduct(ticket, productsList = []) {
  return productsList.find(
    (p) =>
      (ticket?.product_id && String(p.id) === String(ticket.product_id)) ||
      (p.name &&
        ticket?.product_name &&
        p.name.trim().toLowerCase() === ticket.product_name.trim().toLowerCase())
  )
}

function computeProductDeltaAfterHoldChange(
  product,
  { wasReservation, prevQty, prevBranchCavite, nowReserved, nextQty, nextBranchCavite }
) {
  if (!product) return null
  let stockQuiapo = Number(product.stock_quiapo ?? product.stock_quantity ?? 0)
  let stockCavite = Number(product.stock_cavite ?? 0)
  let reservedQuiapo = Number(product.reserved_quiapo ?? 0)
  let reservedCavite = Number(product.reserved_cavite ?? 0)

  if (wasReservation) {
    if (prevBranchCavite) {
      stockCavite += prevQty
      reservedCavite = Math.max(0, reservedCavite - prevQty)
    } else {
      stockQuiapo += prevQty
      reservedQuiapo = Math.max(0, reservedQuiapo - prevQty)
    }
  }

  if (nowReserved) {
    if (nextBranchCavite) {
      stockCavite = Math.max(0, stockCavite - nextQty)
      reservedCavite += nextQty
    } else {
      stockQuiapo = Math.max(0, stockQuiapo - nextQty)
      reservedQuiapo += nextQty
    }
  }

  const stockQuantity = stockQuiapo + stockCavite
  const reservedQuantity = reservedQuiapo + reservedCavite

  return {
    productId: product.id,
    stock_quiapo: stockQuiapo,
    stock_cavite: stockCavite,
    stock_quantity: stockQuantity,
    reserved_quiapo: reservedQuiapo,
    reserved_cavite: reservedCavite,
    reserved_quantity: reservedQuantity,
    in_stock: stockQuantity > 0,
  }
}

/**
 * Creates the Inquiry Fulfillment service bound to a repository adapter.
 */
export function createInquiryFulfillment(adapter) {
  if (!adapter) {
    throw new Error('Inquiry adapter is required.')
  }

  return {
    async submitInquiry(payload, { reserveStock = false } = {}) {
      const insertPayload = {
        ...payload,
        is_reservation: false,
      }
      const inserted = await adapter.insertTicket(insertPayload)
      let finalTicket = inserted
      let holdAcquired = false

      if (reserveStock && payload.product_id && inserted?.id) {
        try {
          const qty = Math.max(1, Number(payload.quantity) || 1)
          const res = await adapter.reserveStock({
            ticketId: inserted.id,
            productId: payload.product_id,
            quantity: qty,
          })
          if (res?.success) {
            holdAcquired = true
            finalTicket = {
              ...inserted,
              is_reservation: true,
              reservation_expires_at: res.expires_at || null,
            }
          }
        } catch (err) {
          console.warn('Reservation hold could not be acquired on submit; leaving Pending:', err)
        }
      }

      adapter.saveLocalTicket?.(finalTicket)
      return { ticket: finalTicket, holdAcquired }
    },

    async loadAndPurgeInquiries(referenceDate = new Date()) {
      let fetched = await adapter.listTickets()
      const eligibleOnLoad = fetched.filter((item) => isEligibleForAutoPurge(item, referenceDate))
      let purgedCount = 0

      if (eligibleOnLoad.length > 0) {
        const eligibleIds = eligibleOnLoad.map((q) => q.id).filter(Boolean)
        const eligibleCodes = new Set(eligibleOnLoad.map((q) => q.ticket_code).filter(Boolean))

        for (const ticket of eligibleOnLoad) {
          if (ticket.is_reservation && ticket.id) {
            try {
              await adapter.releaseReservation(ticket.id)
            } catch (err) {
              console.warn('Auto-purge release warning:', err)
            }
          }
        }

        if (eligibleIds.length > 0 || eligibleCodes.size > 0) {
          await adapter.deleteTickets(eligibleIds, Array.from(eligibleCodes))
          purgedCount = eligibleOnLoad.length
        }

        fetched = fetched.filter(
          (q) => !eligibleCodes.has(q.ticket_code) && !eligibleIds.includes(q.id)
        )
      }

      return { inquiries: fetched, purgedCount }
    },

    async updateInquiry(currentInquiry, patch, productsList = []) {
      if (!currentInquiry) {
        throw new Error('Inquiry is required.')
      }

      const {
        visitDate,
        visitTime24,
        status,
        storeBranch,
        staffNotes,
        holdStock,
        holdQty,
      } = patch

      validateBusinessSchedule(visitDate, visitTime24)
      const formattedTime = format24HourToDisplay(visitTime24)

      const updates = {
        visit_date: visitDate,
        visit_time_slot: formattedTime,
        status,
        store_branch: storeBranch,
        staff_notes: staffNotes,
        updated_at: new Date().toISOString(),
      }

      const matchedProd = findMatchedProduct(currentInquiry, productsList)
      const requestedQty = Math.max(1, Number(holdQty) || 1)
      const isTerminalStatus = status === 'Completed' || status === 'Cancelled'
      const wasReservation = Boolean(currentInquiry.is_reservation)
      const shouldHold = Boolean(holdStock) && !isTerminalStatus
      const prevQty = Math.max(1, Number(currentInquiry.quantity) || 1)
      const prevBranchCavite = String(currentInquiry.store_branch || '').toLowerCase().includes('cavite')
      const nextBranchCavite = String(storeBranch || '').toLowerCase().includes('cavite')
      const branchLabel = nextBranchCavite ? 'Cavite' : 'Quiapo'
      const needsReReserve =
        shouldHold && wasReservation && (requestedQty !== prevQty || prevBranchCavite !== nextBranchCavite)
      const needsNewReserve = shouldHold && !wasReservation

      if ((needsNewReserve || needsReReserve) && matchedProd) {
        const bStock = getBranchStock(matchedProd, storeBranch)
        const sameBranchCredit = wasReservation && prevBranchCavite === nextBranchCavite ? prevQty : 0
        const effectiveAvailable = bStock.stock + sameBranchCredit
        if (effectiveAvailable < requestedQty) {
          throw new Error(
            `Insufficient available stock at ${branchLabel} branch. Only ${effectiveAvailable} unit(s) available.`
          )
        }
      }

      let holdChanged = false

      // 1. Release existing hold first if turning off, entering terminal state, or changing qty/branch
      if (((!shouldHold || needsReReserve) && wasReservation) && currentInquiry.id) {
        try {
          await adapter.releaseReservation(currentInquiry.id)
        } catch (relErr) {
          console.warn('Non-fatal release error:', relErr?.message)
        }
        updates.is_reservation = false
        updates.reservation_expires_at = null
        holdChanged = true
      }

      // 2. Persist schedule/status/store_branch before reserve_product_stock reads store_branch
      if (shouldHold) {
        updates.quantity = requestedQty
      }
      if (currentInquiry.id) {
        await adapter.updateTicket(currentInquiry.id, updates)
      }

      // 3. Reserve new hold on the updated branch
      if ((needsNewReserve || needsReReserve) && matchedProd && currentInquiry.id) {
        const resResult = await adapter.reserveStock({
          ticketId: currentInquiry.id,
          productId: matchedProd.id,
          quantity: requestedQty,
        })
        if (resResult && !resResult.success) {
          throw new Error(resResult.error || 'Cannot reserve stock: insufficient available units.')
        }
        updates.is_reservation = true
        updates.quantity = requestedQty
        updates.reservation_expires_at = resResult?.expires_at || null
        holdChanged = true
      } else if (shouldHold && wasReservation && !needsReReserve) {
        updates.is_reservation = true
      } else if (!shouldHold) {
        updates.is_reservation = false
        updates.reservation_expires_at = null
      }

      const nowReserved = Boolean(updates.is_reservation)
      const productDelta =
        holdChanged && matchedProd
          ? computeProductDeltaAfterHoldChange(matchedProd, {
              wasReservation,
              prevQty,
              prevBranchCavite,
              nowReserved,
              nextQty: requestedQty,
              nextBranchCavite,
            })
          : null

      const nextInquiry = { ...currentInquiry, ...updates }
      adapter.saveLocalTicket?.(nextInquiry)

      return {
        inquiry: nextInquiry,
        productDelta,
        holdChanged,
      }
    },

    async rescheduleInquiry(ticket, { visitDate, visitTimeSlot }) {
      if (!ticket?.id) {
        throw new Error('Ticket ID is required to reschedule.')
      }
      validateBusinessSchedule(visitDate, visitTimeSlot)
      const updates = {
        visit_date: visitDate,
        visit_time_slot: visitTimeSlot,
        updated_at: new Date().toISOString(),
      }
      await adapter.updateTicket(ticket.id, updates)
      return { ...ticket, ...updates }
    },

    async releaseHold(ticket, productsList = []) {
      if (!ticket?.id) {
        throw new Error('Ticket ID is required to release hold.')
      }
      const res = await adapter.releaseReservation(ticket.id)
      if (res && res.success === false) {
        throw new Error(res.error || 'Failed to release reservation hold.')
      }

      const matchedProd = findMatchedProduct(ticket, productsList)
      const prevQty = Math.max(1, Number(ticket.quantity) || 1)
      const prevBranchCavite = String(ticket.store_branch || '').toLowerCase().includes('cavite')
      const productDelta =
        matchedProd && ticket.is_reservation
          ? computeProductDeltaAfterHoldChange(matchedProd, {
              wasReservation: true,
              prevQty,
              prevBranchCavite,
              nowReserved: false,
              nextQty: 0,
              nextBranchCavite: prevBranchCavite,
            })
          : null

      const nextInquiry = {
        ...ticket,
        is_reservation: false,
        reservation_expires_at: null,
      }

      return {
        inquiry: nextInquiry,
        productDelta,
        holdChanged: Boolean(ticket.is_reservation),
      }
    },

    async deleteInquiries(tickets = []) {
      const releasedProductIds = []
      for (const ticket of tickets) {
        if (ticket.is_reservation && ticket.id) {
          try {
            await adapter.releaseReservation(ticket.id)
            if (ticket.product_id) releasedProductIds.push(ticket.product_id)
          } catch (err) {
            console.warn('Release on delete warning:', err)
          }
        }
      }
      const ids = tickets.map((t) => t.id).filter(Boolean)
      const codes = tickets.map((t) => t.ticket_code).filter(Boolean)
      await adapter.deleteTickets(ids, codes)
      return { deletedIds: ids, deletedCodes: codes, releasedProductIds }
    },
  }
}

/**
 * Production Supabase + localStorage (`jds_local_quotes`) adapter.
 */
export function createSupabaseInquiryAdapter(supabaseClient = supabase, storage = typeof localStorage !== 'undefined' ? localStorage : null) {
  const readLocal = () => {
    if (!storage) return []
    try {
      return JSON.parse(storage.getItem(LOCAL_QUOTES_KEY) || '[]')
    } catch {
      return []
    }
  }

  const writeLocal = (items) => {
    if (!storage) return
    try {
      storage.setItem(LOCAL_QUOTES_KEY, JSON.stringify(items))
    } catch {
      // Ignore storage quota errors
    }
  }

  return {
    async insertTicket(payload) {
      let { data, error } = await supabaseClient
        .from('quote_tickets')
        .insert([payload])
        .select()

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
        const fallbackPayload = { ...payload }
        if (error.message?.includes('province')) delete fallbackPayload.province
        if (error.message?.includes('barangay')) delete fallbackPayload.barangay
        if (error.message?.includes('street_address')) delete fallbackPayload.street_address
        if (error.message?.includes('facebook')) delete fallbackPayload.facebook
        if (error.message?.includes('instagram')) delete fallbackPayload.instagram
        if (error.message?.includes('is_reservation')) delete fallbackPayload.is_reservation
        const retry = await supabaseClient
          .from('quote_tickets')
          .insert([fallbackPayload])
          .select()
        data = retry.data
        error = retry.error
      }

      if (error) throw error
      return data && data[0] ? data[0] : payload
    },

    async listTickets() {
      let fetched = []
      const { data, error } = await supabaseClient
        .from('quote_tickets')
        .select('*')
        .order('id', { ascending: false })

      if (!error && data) {
        fetched = data
      }

      const local = readLocal()
      const existingCodes = new Set(fetched.map((q) => q.ticket_code))
      const extraLocal = local.filter((q) => !existingCodes.has(q.ticket_code))
      return [...extraLocal, ...fetched]
    },

    async updateTicket(id, updates) {
      const { data, error } = await supabaseClient
        .from('quote_tickets')
        .update(updates)
        .eq('id', id)
        .select()
      if (error) throw error
      return data && data[0] ? data[0] : updates
    },

    async deleteTickets(ids = [], codes = []) {
      if (ids.length > 0) {
        const { error } = await supabaseClient
          .from('quote_tickets')
          .delete()
          .in('id', ids)
        if (error) throw error
      }
      const codeSet = new Set(codes)
      const idSet = new Set(ids)
      const local = readLocal()
      writeLocal(local.filter((q) => !codeSet.has(q.ticket_code) && !idSet.has(q.id)))
    },

    async reserveStock({ ticketId, productId, quantity }) {
      const { data, error } = await supabaseClient.rpc('reserve_product_stock', {
        p_ticket_id: ticketId,
        p_product_id: productId,
        p_quantity: quantity,
        p_expires_hours: 48,
      })
      if (error) throw error
      return data
    },

    async releaseReservation(ticketId) {
      const { data, error } = await supabaseClient.rpc('release_product_reservation', {
        p_ticket_id: ticketId,
      })
      if (error) throw error
      return data
    },

    saveLocalTicket(ticket) {
      if (!ticket?.ticket_code) return
      const local = readLocal()
      const idx = local.findIndex((q) => q.ticket_code === ticket.ticket_code)
      if (idx >= 0) {
        local[idx] = { ...local[idx], ...ticket }
        writeLocal(local)
      } else {
        writeLocal([ticket, ...local])
      }
    },
  }
}

export const inquiryFulfillment = createInquiryFulfillment(createSupabaseInquiryAdapter(supabase))
