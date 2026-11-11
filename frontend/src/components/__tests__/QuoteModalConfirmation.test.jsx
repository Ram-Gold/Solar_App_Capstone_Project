import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent, act } from '@testing-library/react'
import QuoteModal from '../QuoteModal'

// Mock Supabase
vi.mock('../../lib/supabaseClient', () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue({
          data: [{
            ticket_code: 'JDS-RES-2026-123456',
            customer_name: 'Test Juan',
            mobile_contact: '09171234567',
            store_branch: 'Quiapo Showroom (Manila)',
            visit_date: '2026-11-16',
            visit_time_slot: '10:00 AM',
            status: 'Pending',
          }],
          error: null,
        }),
      }),
    }),
  },
}))

describe('QuoteModal Animated Confirmation Flow', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers()
  })

  afterEach(() => {
    act(() => {
      vi.runOnlyPendingTimers()
    })
    vi.useRealTimers()
    cleanup()
  })

  it('transitions through AnimatedConfirmation before rendering final Showroom Pass in Step 3', async () => {
    render(
      <QuoteModal
        isOpen={true}
        onClose={vi.fn()}
        initialStep={2}
        initialMode="reserve"
      />
    )

    // Accept consent
    const consentCheckbox = screen.getByRole('checkbox')
    fireEvent.click(consentCheckbox)

    const confirmBtn = screen.getByRole('button', { name: /Confirm Reservation Pass/i })
    expect(confirmBtn.disabled).toBe(false)

    // Submit form
    await act(async () => {
      fireEvent.click(confirmBtn)
    })

    // Animated Confirmation should now be displayed
    expect(screen.getByText('Stock Hold Pass Confirmed')).toBeDefined()
    expect(screen.getByText(/Your unit reservation has been registered/i)).toBeDefined()

    // Pass details should not be rendered yet (Step 3 held until animation completes)
    expect(screen.queryByText('Showroom Visit at Quiapo Showroom (Manila)')).toBeNull()

    // Fast-forward animation timer (1800ms)
    act(() => {
      vi.advanceTimersByTime(1800)
    })

    // Now Step 3 (Reservation Pass) is visible
    expect(screen.getByText('48-Hour Stock Hold Pass')).toBeDefined()
  })
})

