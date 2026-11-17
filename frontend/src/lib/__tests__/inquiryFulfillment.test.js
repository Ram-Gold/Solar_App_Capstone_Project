import { describe, it, expect } from 'vitest'
import {
  validateBusinessSchedule,
  createInquiryFulfillment,
} from '../inquiryFulfillment'

function createInMemoryInquiryAdapter({
  tickets = [],
  reserveResult = { success: true, expires_at: '2026-11-20T00:00:00Z' },
} = {}) {
  const store = [...tickets]
  const calls = []

  return {
    calls,
    store,
    async insertTicket(payload) {
      calls.push({ op: 'insertTicket', payload: { ...payload } })
      const inserted = { id: store.length + 100, ...payload }
      store.unshift(inserted)
      return inserted
    },
    async listTickets() {
      calls.push({ op: 'listTickets' })
      return [...store]
    },
    async updateTicket(id, updates) {
      calls.push({ op: 'updateTicket', id, updates: { ...updates } })
      const idx = store.findIndex((t) => t.id === id)
      if (idx === -1) throw new Error('Ticket not found')
      store[idx] = { ...store[idx], ...updates }
      return store[idx]
    },
    async deleteTickets(ids, codes = []) {
      calls.push({ op: 'deleteTickets', ids, codes })
      for (let i = store.length - 1; i >= 0; i -= 1) {
        if (ids.includes(store[i].id) || codes.includes(store[i].ticket_code)) {
          store.splice(i, 1)
        }
      }
    },
    async reserveStock({ ticketId, productId, quantity }) {
      calls.push({ op: 'reserveStock', ticketId, productId, quantity })
      return reserveResult
    },
    async releaseReservation(ticketId) {
      calls.push({ op: 'releaseReservation', ticketId })
      return { success: true, released: 1 }
    },
    saveLocalTicket() {},
  }
}

describe('inquiryFulfillment', () => {
  it('validateBusinessSchedule rejects Sundays and hours outside 8:00 AM - 5:30 PM', () => {
    // 2026-11-22 is a Sunday
    expect(() => validateBusinessSchedule('2026-11-22', '09:00')).toThrow('closed on Sundays')
    // Monday before 8:00 AM
    expect(() => validateBusinessSchedule('2026-11-23', '07:30')).toThrow('8:00 AM to 5:30 PM')
    // Monday after 5:30 PM
    expect(() => validateBusinessSchedule('2026-11-23', '17:45')).toThrow('8:00 AM to 5:30 PM')
    // Valid Monday 10:00 AM
    expect(() => validateBusinessSchedule('2026-11-23', '10:00')).not.toThrow()
  })

  it('submitInquiry inserts with is_reservation=false then calls reserveStock', async () => {
    const adapter = createInMemoryInquiryAdapter()
    const svc = createInquiryFulfillment(adapter)

    const result = await svc.submitInquiry(
      { ticket_code: 'JDS-RES-1', product_id: 10, quantity: 2, store_branch: 'Quiapo' },
      { reserveStock: true }
    )

    expect(adapter.calls[0]).toMatchObject({
      op: 'insertTicket',
      payload: { is_reservation: false },
    })
    expect(adapter.calls[1]).toEqual({
      op: 'reserveStock',
      ticketId: result.ticket.id,
      productId: 10,
      quantity: 2,
    })
    expect(result.ticket.is_reservation).toBe(true)
    expect(result.holdAcquired).toBe(true)
  })

  it('submitInquiry keeps Pending ticket with is_reservation=false if reserveStock fails', async () => {
    const adapter = createInMemoryInquiryAdapter({
      reserveResult: { success: false, error: 'Insufficient stock' },
    })
    const svc = createInquiryFulfillment(adapter)

    const result = await svc.submitInquiry(
      { ticket_code: 'JDS-RES-2', product_id: 10, quantity: 2, store_branch: 'Quiapo' },
      { reserveStock: true }
    )

    expect(result.ticket.is_reservation).toBe(false)
    expect(result.holdAcquired).toBe(false)
  })

  it('updateInquiry executes release -> update -> reserve in strict order and returns productDelta', async () => {
    const current = {
      id: 21,
      ticket_code: 'JDS-RES-21',
      product_id: 10,
      quantity: 1,
      store_branch: 'Quiapo Showroom',
      is_reservation: true,
      status: 'Confirmed',
    }
    const productsList = [
      { id: 10, stock_quantity: 5, stock_quiapo: 2, stock_cavite: 3, reserved_quiapo: 1, reserved_cavite: 0 },
    ]
    const adapter = createInMemoryInquiryAdapter({ tickets: [current] })
    const svc = createInquiryFulfillment(adapter)

    const res = await svc.updateInquiry(
      current,
      {
        visitDate: '2026-11-23',
        visitTime24: '10:00',
        status: 'Confirmed',
        storeBranch: 'Cavite Distribution Hub',
        staffNotes: 'Moved to Cavite',
        holdStock: true,
        holdQty: 2,
      },
      productsList
    )

    expect(adapter.calls.map((c) => c.op)).toEqual([
      'releaseReservation',
      'updateTicket',
      'reserveStock',
    ])
    expect(res.holdChanged).toBe(true)
    expect(res.inquiry.is_reservation).toBe(true)
    expect(res.productDelta).toMatchObject({
      productId: 10,
      stock_quiapo: 3, // +1 released from Quiapo
      stock_cavite: 1, // -2 reserved from Cavite
      stock_quantity: 4,
    })
  })

  it('rescheduleInquiry rejects Sunday and out-of-hours calendar drops', async () => {
    const ticket = { id: 30, visit_date: '2026-11-23', visit_time_slot: '09:00 AM - 09:40 AM' }
    const adapter = createInMemoryInquiryAdapter({ tickets: [ticket] })
    const svc = createInquiryFulfillment(adapter)

    await expect(
      svc.rescheduleInquiry(ticket, { visitDate: '2026-11-22', visitTimeSlot: '09:00 AM - 09:40 AM' })
    ).rejects.toThrow('closed on Sundays')
    expect(adapter.calls).toHaveLength(0)

    await expect(
      svc.rescheduleInquiry(ticket, { visitDate: '2026-11-23', visitTimeSlot: '06:00 PM - 06:40 PM' })
    ).rejects.toThrow('8:00 AM to 5:30 PM')
    expect(adapter.calls).toHaveLength(0)

    const updated = await svc.rescheduleInquiry(ticket, {
      visitDate: '2026-11-24',
      visitTimeSlot: '10:00 AM - 10:40 AM',
    })
    expect(updated.visit_date).toBe('2026-11-24')
    expect(adapter.calls).toHaveLength(1)
  })

  it('loadAndPurgeInquiries purges expired records and releases their holds', async () => {
    const oldExpired = {
      id: 50,
      ticket_code: 'JDS-RES-OLD',
      status: 'Cancelled',
      is_reservation: true,
      updated_at: '2026-10-01T00:00:00Z',
      created_at: '2026-10-01T00:00:00Z',
    }
    const active = {
      id: 51,
      ticket_code: 'JDS-INQ-NEW',
      status: 'Pending',
      is_reservation: false,
      created_at: '2026-11-16T00:00:00Z',
    }
    const adapter = createInMemoryInquiryAdapter({ tickets: [oldExpired, active] })
    const svc = createInquiryFulfillment(adapter)

    const res = await svc.loadAndPurgeInquiries(new Date('2026-11-17T12:00:00Z'))
    expect(res.purgedCount).toBe(1)
    expect(res.inquiries.map((t) => t.id)).toEqual([51])
    expect(adapter.calls.some((c) => c.op === 'releaseReservation' && c.ticketId === 50)).toBe(true)
    expect(adapter.calls.some((c) => c.op === 'deleteTickets')).toBe(true)
  })
})
