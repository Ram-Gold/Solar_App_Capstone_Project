import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import LoginPage from '../LoginPage'

// Mock AuthContext
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    signIn: vi.fn(),
    setCustomerSession: vi.fn()
  })
}))

// Mock Customer Service
vi.mock('../../lib/customerService', () => ({
  loginCustomerWithPassword: vi.fn()
}))

// Mock Supabase
vi.mock('../../lib/supabaseClient', () => ({
  supabase: {
    auth: {
      signOut: vi.fn()
    },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null })
    })
  }
}))

describe('LoginPage Timeout Banner and Email Autofill', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    cleanup()
  })

  it('renders the session timeout notification banner and pre-fills email when reason=timeout', () => {
    localStorage.setItem('jd_customer_email', 'engr.reyes@jdsolar.ph')

    render(
      <MemoryRouter initialEntries={['/login?reason=timeout']}>
        <LoginPage />
      </MemoryRouter>
    )

    // Banner should be visible
    expect(screen.getByText('Session Timed Out')).toBeDefined()
    expect(
      screen.getByText(/Your session expired due to 15 minutes of inactivity/i)
    ).toBeDefined()

    // Email input should be pre-populated
    const emailInput = screen.getByLabelText(/Email Address/i)
    expect(emailInput.value).toBe('engr.reyes@jdsolar.ph')
  })

  it('does not display the session timeout banner during normal login navigation', () => {
    render(
      <MemoryRouter initialEntries={['/login']}>
        <LoginPage />
      </MemoryRouter>
    )

    expect(screen.queryByText('Session Timed Out')).toBeNull()
  })
})
