import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import QuoteModal from '../QuoteModal'

vi.mock('../../lib/supabaseClient', () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue({ data: [], error: null }),
      }),
    }),
  },
}))

describe('QuoteModal Inline Validation', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    cleanup()
  })

  it('shows inline validation errors for required Step 1 fields (name, contact number, email) and uses noValidate', () => {
    render(
      <QuoteModal
        isOpen={true}
        onClose={vi.fn()}
        initialStep={1}
        initialMode="reserve"
      />
    )

    const form = document.body.querySelector('form')
    expect(form.noValidate).toBe(true)

    fireEvent.click(screen.getByRole('button', { name: /Continue to Schedule Visit/i }))

    expect(screen.getByText('Please enter your full name.')).toBeDefined()
    expect(screen.getByText('Contact number is required.')).toBeDefined()
    expect(screen.getByText('Email address is required.')).toBeDefined()

    // Typing into Full Name should clear its inline error
    const nameInput = screen.getByPlaceholderText('e.g. Engr. Juan Dela Cruz')
    fireEvent.change(nameInput, { target: { value: 'Juan Dela Cruz' } })
    expect(screen.queryByText('Please enter your full name.')).toBeNull()
  })

  it('shows inline validation errors for required Step 2 schedule fields (date and time) and uses noValidate', () => {
    render(
      <QuoteModal
        isOpen={true}
        onClose={vi.fn()}
        initialStep={2}
        initialMode="reserve"
      />
    )

    const form = document.body.querySelector('form')
    expect(form.noValidate).toBe(true)

    const dateInput = document.body.querySelector('input[type="date"]')
    const hourSelect = screen.getByLabelText(/Hour/i)

    fireEvent.change(dateInput, { target: { value: '' } })
    fireEvent.change(hourSelect, { target: { value: '' } })
    fireEvent.click(screen.getByRole('checkbox'))

    fireEvent.click(screen.getByRole('button', { name: /Confirm Reservation Pass/i }))

    expect(screen.getByText('Please select a visit date.')).toBeDefined()
    expect(screen.getByText('Please select a visit time slot.')).toBeDefined()
  })

  it('shows inline validation error for required branch when deselected and clears it on selection', () => {
    render(
      <QuoteModal
        isOpen={true}
        onClose={vi.fn()}
        initialStep={2}
        initialMode="reserve"
      />
    )

    // Deselect default branch by clicking it
    const quiapoBranch = screen.getByText('Quiapo Showroom (Manila)')
    fireEvent.click(quiapoBranch)

    fireEvent.click(screen.getByRole('checkbox'))
    fireEvent.click(screen.getByRole('button', { name: /Confirm Reservation Pass/i }))

    expect(screen.getByText('Please select a showroom branch.')).toBeDefined()

    // Re-selecting a branch clears the inline error
    fireEvent.click(screen.getByText('Cavite Distribution Hub'))
    expect(screen.queryByText('Please select a showroom branch.')).toBeNull()
  })
})
