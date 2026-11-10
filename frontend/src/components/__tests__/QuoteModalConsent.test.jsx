import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import React from 'react'
import QuoteModal from '../QuoteModal'

// Mock Supabase
vi.mock('../../lib/supabaseClient', () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue({ data: [{ id: 'ticket-1' }], error: null })
      })
    })
  }
}))

describe('QuoteModal Data Privacy Consent Gate', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    cleanup()
  })

  it('renders unchecked consent checkbox in Step 2 and disables submit button', () => {
    render(
      <QuoteModal
        isOpen={true}
        onClose={vi.fn()}
        initialStep={2}
        initialMode="reserve"
      />
    )

    // Checkbox should be present and unchecked
    const checkbox = screen.getByRole('checkbox')
    expect(checkbox).toBeDefined()
    expect(checkbox.checked).toBe(false)

    // Confirm button should be disabled
    const submitBtn = screen.getByRole('button', { name: /Confirm Reservation Pass/i })
    expect(submitBtn).toBeDefined()
    expect(submitBtn.disabled).toBe(true)
  })

  it('enables the confirmation button when the user checks the consent checkbox', () => {
    render(
      <QuoteModal
        isOpen={true}
        onClose={vi.fn()}
        initialStep={2}
        initialMode="reserve"
      />
    )

    const checkbox = screen.getByRole('checkbox')
    const submitBtn = screen.getByRole('button', { name: /Confirm Reservation Pass/i })

    expect(submitBtn.disabled).toBe(true)

    // Check the box
    fireEvent.click(checkbox)
    expect(checkbox.checked).toBe(true)
    expect(submitBtn.disabled).toBe(false)

    // Uncheck the box
    fireEvent.click(checkbox)
    expect(checkbox.checked).toBe(false)
    expect(submitBtn.disabled).toBe(true)
  })

  it('opens and closes the Data Privacy Act disclosure modal', () => {
    render(
      <QuoteModal
        isOpen={true}
        onClose={vi.fn()}
        initialStep={2}
        initialMode="reserve"
      />
    )

    // Click the Data Privacy Act link
    const dpaBtn = screen.getByRole('button', { name: /Data Privacy Act/i })
    fireEvent.click(dpaBtn)

    // Modal elements should be visible
    expect(screen.getByText('Data Privacy Notice')).toBeDefined()
    expect(screen.getByText(/Republic Act No. 10173/i)).toBeDefined()
    expect(screen.getByText('Purpose Limitation')).toBeDefined()
    expect(screen.getByText('Zero Third-Party Sharing')).toBeDefined()
    expect(screen.getByText('Automated Hygiene Retention')).toBeDefined()

    // Click Understood
    const understoodBtn = screen.getByRole('button', { name: /Understood/i })
    fireEvent.click(understoodBtn)

    // Notice should close
    expect(screen.queryByText('Data Privacy Notice')).toBeNull()
  })

  it('preserves the consent checkbox state when navigating between Step 2 and Step 1', () => {
    render(
      <QuoteModal
        isOpen={true}
        onClose={vi.fn()}
        initialStep={2}
        initialMode="reserve"
      />
    )

    const checkbox = screen.getByRole('checkbox')
    fireEvent.click(checkbox)
    expect(checkbox.checked).toBe(true)

    // Click Back to Step 1
    const backBtn = screen.getByRole('button', { name: /Back/i })
    fireEvent.click(backBtn)

    // We should be in Step 1 (Continue to Schedule Visit is visible)
    expect(screen.getByRole('button', { name: /Continue to Schedule Visit/i })).toBeDefined()
  })
})

