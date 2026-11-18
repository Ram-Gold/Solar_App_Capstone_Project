import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent, act } from '@testing-library/react'
import QuoteModal from '../QuoteModal'
import * as customerService from '../../lib/customerService'

vi.mock('../../lib/inquiryFulfillment', () => ({
  inquiryFulfillment: {
    submitInquiry: vi.fn(async (payload) => ({
      ticket: {
        ...payload,
        email: payload.email || 'juan@example.com',
        ticket_code: payload.ticket_code || 'JDS-RES-2026-999999',
        is_reservation: payload.ticket_code?.includes('RES'),
      },
    })),
  },
}))

vi.mock('../../lib/supabaseClient', () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue({
          data: [{
            ticket_code: 'JDS-RES-2026-999999',
            customer_name: 'Test Juan',
            mobile_contact: '09171234567',
            email: 'juan@example.com',
            store_branch: 'Quiapo Showroom (Manila)',
            visit_date: '2026-11-19',
            visit_time_slot: '10:00 AM',
            status: 'Pending',
          }],
          error: null,
        }),
      }),
    }),
  },
}))

describe('QuoteModal Branch Hours, Slot Picker & Email Status', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
    cleanup()
  })

  it('displays Open/Closed status and exact operating hours for both branches', () => {
    vi.useFakeTimers()
    // Thursday 2026-11-19 10:00 AM PHT (02:00 UTC) -> Open
    vi.setSystemTime(new Date('2026-11-19T02:00:00Z'))

    render(
      <QuoteModal
        isOpen={true}
        onClose={vi.fn()}
        initialStep={2}
        initialMode="reserve"
      />
    )

    expect(screen.getAllByText('Open Now')).toHaveLength(2)
    expect(screen.getAllByText('Mon – Sat, 8:00 AM – 5:30 PM · Closed Sun')).toHaveLength(2)
  })

  it('opens combined Mon-Sat Calendar + Hour/5-Min picker and omits Sundays and out-of-hours times', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-11-18T02:00:00Z'))

    render(
      <QuoteModal
        isOpen={true}
        onClose={vi.fn()}
        initialStep={2}
        initialMode="reserve"
      />
    )

    expect(document.body.querySelector('input[type="time"]')).toBeNull()
    expect(document.body.querySelector('input[type="date"]')).toBeNull()

    // Open SchedulePicker
    fireEvent.click(screen.getByRole('button', { name: /Nov 19, 2026 · 10:00 AM/i }))

    // Sunday column is omitted completely
    expect(screen.queryByText('Su')).toBeNull()
    expect(screen.queryByRole('button', { name: '22' })).toBeNull()

    // Out-of-hours times are omitted completely
    expect(screen.queryByRole('button', { name: '11 PM' })).toBeNull()
    expect(screen.queryByRole('button', { name: '6 PM' })).toBeNull()

    // Select 5 PM -> clamps 5 PM minutes to :30
    fireEvent.click(screen.getByRole('button', { name: '5 PM' }))
    expect(screen.getByRole('button', { name: ':30' })).toBeDefined()
    expect(screen.queryByRole('button', { name: ':35' })).toBeNull()
  })

  it('shows email delivery failed status on Step 3 when sendInquiryTicketEmail fails', async () => {
    vi.useFakeTimers()
    vi.spyOn(customerService, 'sendInquiryTicketEmail').mockRejectedValue(new Error('SMTP down'))

    render(
      <QuoteModal
        isOpen={true}
        onClose={vi.fn()}
        initialStep={2}
        initialMode="reserve"
      />
    )

    fireEvent.click(screen.getByRole('checkbox'))
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Confirm Reservation Pass/i }))
    })

    // Advance past AnimatedConfirmation (1800ms)
    await act(async () => {
      vi.advanceTimersByTime(1800)
    })

    expect(screen.getByText(/Email delivery failed/i)).toBeDefined()
    expect(screen.getAllByText(/2026-11-19/).length).toBeGreaterThanOrEqual(1)
  })

  it('completes scheduling with SchedulePicker in inquire mode using blue accent', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-11-18T02:00:00Z'))
    vi.spyOn(customerService, 'sendInquiryTicketEmail').mockResolvedValue({ success: true })

    render(
      <QuoteModal
        isOpen={true}
        onClose={vi.fn()}
        initialStep={2}
        initialMode="inquire"
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /Nov 19, 2026 · 10:00 AM/i }))
    const doneBtn = screen.getByRole('button', { name: 'Done' })
    expect(doneBtn.className).toContain('bg-blue-600')

    fireEvent.click(screen.getByRole('button', { name: '20' }))
    fireEvent.click(screen.getByRole('button', { name: '2 PM' }))
    fireEvent.click(screen.getByRole('button', { name: ':25' }))
    fireEvent.click(doneBtn)

    expect(screen.getByRole('button', { name: /Nov 20, 2026 · 2:25 PM/i })).toBeDefined()

    fireEvent.click(screen.getByRole('checkbox'))
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Confirm Consultation Pass/i }))
    })
    await act(async () => {
      vi.advanceTimersByTime(1800)
    })

    expect(screen.getByText(/2026-11-20 • 2:25 PM/)).toBeDefined()
  })

  it('completes scheduling with SchedulePicker in reserve mode using amber accent', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-11-18T02:00:00Z'))
    vi.spyOn(customerService, 'sendInquiryTicketEmail').mockResolvedValue({ success: true })

    render(
      <QuoteModal
        isOpen={true}
        onClose={vi.fn()}
        initialStep={2}
        initialMode="reserve"
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /Nov 19, 2026 · 10:00 AM/i }))
    const doneBtn = screen.getByRole('button', { name: 'Done' })
    expect(doneBtn.className).toContain('bg-amber-500')

    fireEvent.click(screen.getByRole('button', { name: '21' }))
    fireEvent.click(screen.getByRole('button', { name: '5 PM' }))
    fireEvent.click(screen.getByRole('button', { name: ':30' }))
    fireEvent.click(doneBtn)

    expect(screen.getByRole('button', { name: /Nov 21, 2026 · 5:30 PM/i })).toBeDefined()

    fireEvent.click(screen.getByRole('checkbox'))
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Confirm Reservation Pass/i }))
    })
    await act(async () => {
      vi.advanceTimersByTime(1800)
    })

    expect(screen.getByText(/2026-11-21 • 5:30 PM/)).toBeDefined()
  })
})
