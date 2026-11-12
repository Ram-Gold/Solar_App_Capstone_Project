import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom'
import ForgotPasswordPage from '../ForgotPasswordPage'
import ResetPasswordPage from '../ResetPasswordPage'
import LoginPage from '../LoginPage'

const requestPasswordReset = vi.fn()
const resetCustomerPassword = vi.fn()

vi.mock('../../lib/customerService', () => ({
  requestPasswordReset: (...a) => requestPasswordReset(...a),
  resetCustomerPassword: (...a) => resetCustomerPassword(...a),
  loginCustomerWithPassword: vi.fn()
}))
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ signIn: vi.fn(), setCustomerSession: vi.fn() })
}))
vi.mock('../../lib/supabaseClient', () => ({ supabase: { auth: { signOut: vi.fn() }, from: vi.fn() } }))

function LocationProbe() {
  const loc = useLocation()
  return <div data-testid="loc">{loc.pathname + loc.search}</div>
}

const renderAt = (path) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/login" element={<><LoginPage /><LocationProbe /></>} />
      </Routes>
    </MemoryRouter>
  )

describe('Forgot password flow', () => {
  beforeEach(() => {
    localStorage.clear()
    requestPasswordReset.mockReset()
    resetCustomerPassword.mockReset()
  })
  afterEach(() => cleanup())

  it('shows the generic confirmation and a resend cooldown after submit', async () => {
    requestPasswordReset.mockResolvedValue({ success: true })
    renderAt('/forgot-password')
    fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: 'a@b.com' } })
    fireEvent.click(screen.getByRole('button', { name: /send reset link/i }))
    await waitFor(() => expect(screen.getByRole('status').textContent).toMatch(/if an account exists/i))
    expect(requestPasswordReset).toHaveBeenCalledWith('a@b.com')
    expect(screen.getByRole('button', { name: /resend available in/i }).disabled).toBe(true)
  })

  it('shows an error when the request fails', async () => {
    requestPasswordReset.mockRejectedValue(new Error('Unable to send the reset link right now.'))
    renderAt('/forgot-password')
    fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: 'a@b.com' } })
    fireEvent.click(screen.getByRole('button', { name: /send reset link/i }))
    await waitFor(() => expect(screen.getByRole('alert').textContent).toMatch(/unable to send/i))
  })

  it('reset page without a token shows the invalid-link state', () => {
    renderAt('/reset-password')
    expect(screen.getByText(/invalid or has expired/i)).toBeTruthy()
    expect(screen.getByRole('link', { name: /request a new link/i }).getAttribute('href')).toBe('/forgot-password')
  })

  it('rejects mismatched and short passwords without calling the server', () => {
    renderAt('/reset-password?token=abc')
    fireEvent.change(screen.getByLabelText(/^new password/i), { target: { value: 'password123' } })
    fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: 'different123' } })
    fireEvent.submit(screen.getByRole('button', { name: /update password/i }).closest('form'))
    expect(screen.getByRole('alert').textContent).toMatch(/do not match/i)
    expect(resetCustomerPassword).not.toHaveBeenCalled()
  })

  it('resets the password and redirects to login with the success banner', async () => {
    resetCustomerPassword.mockResolvedValue({ success: true })
    renderAt('/reset-password?token=abc')
    fireEvent.change(screen.getByLabelText(/^new password/i), { target: { value: 'password123' } })
    fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: 'password123' } })
    fireEvent.click(screen.getByRole('button', { name: /update password/i }))
    await waitFor(() => expect(screen.getByTestId('loc').textContent).toBe('/login?reason=reset'))
    expect(resetCustomerPassword).toHaveBeenCalledWith('abc', 'password123')
    expect(screen.getByText(/password updated/i)).toBeTruthy()
  })

  it('shows the invalid-link state when the token is rejected', async () => {
    resetCustomerPassword.mockRejectedValue(new Error('This reset link is invalid or has expired.'))
    renderAt('/reset-password?token=expired')
    fireEvent.change(screen.getByLabelText(/^new password/i), { target: { value: 'password123' } })
    fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: 'password123' } })
    fireEvent.click(screen.getByRole('button', { name: /update password/i }))
    await waitFor(() => expect(screen.getByText(/link not valid/i)).toBeTruthy())
  })

  it('login page links to forgot password', () => {
    renderAt('/login')
    expect(screen.getByRole('link', { name: /forgot password/i }).getAttribute('href')).toBe('/forgot-password')
  })
})
