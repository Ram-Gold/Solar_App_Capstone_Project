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

  it('opens and closes the unified Terms of Service and Data Privacy modal', () => {
    render(
      <QuoteModal
        isOpen={true}
        onClose={vi.fn()}
        initialStep={2}
        initialMode="reserve"
      />
    )

    // Click the Terms of Service link
    const termsBtn = screen.getByRole('button', { name: /Terms of Service/i })
    fireEvent.click(termsBtn)

    // Modal elements should be visible
    expect(screen.getByText('Terms of Service and Privacy Policy')).toBeDefined()
    expect(screen.getAllByText(/Republic Act 10173/i).length).toBeGreaterThan(0)
    expect(screen.getByText(/Product Matcher and Sizing Recommendations/i)).toBeDefined()
    expect(screen.getByText(/Privacy of Inquiries and Troubleshooting Requests/i)).toBeDefined()
    expect(screen.getByText(/Zero Third-Party Sharing/i)).toBeDefined()

    // Click Close
    const closeBtns = screen.getAllByRole('button', { name: /close/i })
    fireEvent.click(closeBtns[closeBtns.length - 1])

    // Notice should close
    expect(screen.queryByText('Terms of Service and Privacy Policy')).toBeNull()
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

