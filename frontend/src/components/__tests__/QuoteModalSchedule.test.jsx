import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent, act } from '@testing-library/react'
import QuoteModal from '../QuoteModal'
import * as customerService from '../../lib/customerService'

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

  it('renders a two-part Hour + 5-Minute selector and omits out-of-hours times like 11:00 PM or 5:45 PM', () => {
    render(
      <QuoteModal
        isOpen={true}
        onClose={vi.fn()}
        initialStep={2}
        initialMode="reserve"
      />
    )

    expect(document.body.querySelector('input[type="time"]')).toBeNull()
    const hourSelect = screen.getByLabelText(/Hour/i)
    const minuteSelect = screen.getByLabelText(/Minute/i)
    expect(hourSelect.tagName).toBe('SELECT')
    expect(minuteSelect.tagName).toBe('SELECT')

    const hourValues = Array.from(hourSelect.querySelectorAll('option')).map((o) => o.value)
    expect(hourValues).toContain('08')
    expect(hourValues).toContain('17')
    expect(hourValues).not.toContain('23')
    expect(hourValues).not.toContain('18')
    expect(hourValues).not.toContain('07')

    // Select 10:45 AM, then switch hour to 5 PM (17) -> should clamp to 17:30 and omit 45
    fireEvent.change(hourSelect, { target: { value: '10' } })
    fireEvent.change(minuteSelect, { target: { value: '45' } })
    expect(minuteSelect.value).toBe('45')

    fireEvent.change(hourSelect, { target: { value: '17' } })
    const fivePmMins = Array.from(minuteSelect.querySelectorAll('option')).map((o) => o.value)
    expect(fivePmMins).toContain('30')
    expect(fivePmMins).not.toContain('35')
    expect(fivePmMins).not.toContain('45')
    expect(minuteSelect.value).toBe('30')
  })

  it('shows an immediate inline error when a Sunday is selected in visitDate', () => {
    render(
      <QuoteModal
        isOpen={true}
        onClose={vi.fn()}
        initialStep={2}
        initialMode="reserve"
      />
    )

    const dateInput = document.body.querySelector('input[type="date"]')
    fireEvent.change(dateInput, { target: { value: '2026-11-22' } }) // Sunday

    expect(
      screen.getByText('Our showrooms are closed on Sundays. Please choose Monday through Saturday.')
    ).toBeDefined()
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
    expect(screen.getAllByText(/JDS-RES-2026-999999/).length).toBeGreaterThanOrEqual(2)
  })
})
