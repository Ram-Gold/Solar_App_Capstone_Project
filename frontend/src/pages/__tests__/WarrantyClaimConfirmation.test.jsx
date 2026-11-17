import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent, waitFor, act } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import CustomerPortalPage from '../CustomerPortalPage'
import * as customerService from '../../lib/customerService'

vi.mock('../../lib/customerService', () => ({
  fetchCustomerPortalData: vi.fn(),
  getCustomerAuthStatus: vi.fn(),
  setCustomerPassword: vi.fn(),
  deleteCustomerAccount: vi.fn(),
  confirmCustomerEmailByToken: vi.fn(),
  queueAndSendCustomerConfirmationEmail: vi.fn(),
  uploadEvidenceFile: vi.fn(),
  submitWarrantyClaim: vi.fn(),
}))

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'cust-token-1', isCustomer: true, accessToken: 'cust-token-1' },
    role: 'customer',
    loading: false,
    setCustomerSession: vi.fn(),
    signOut: vi.fn().mockResolvedValue({}),
  }),
}))

const initialPortalPayload = {
  data: {
    customer: {
      id: 'cust-1',
      name: 'Juan Dela Cruz',
      phone: '+63 917 555 0142',
      email: 'juan.delacruz@solar.ph',
      email_confirmed: true,
      email_confirmed_at: '2026-11-01T00:00:00Z',
      email_confirmation_status: 'confirmed',
      token: 'cust-token-1',
    },
    purchases: [
      {
        id: 'purch-1',
        product_id: 101,
        product_name: '300W Solar Street Light Pro',
        product_type: 'Solar Street Light',
        watt: '300W',
        serial_number: 'JDS-300-8821',
        purchase_date: '2026-03-14',
        warranty_months: 24,
        warranty_expires_at: '2028-03-14T00:00:00Z',
        branch_location: 'Cavite Hub',
        is_voided: false,
        is_warranty_active: true,
        days_remaining: 480,
      },
    ],
    claims: [],
  },
  error: null,
}

describe('Customer Portal Warranty Claim Confirmation & Validation', () => {
  beforeEach(() => {
    localStorage.clear()
    localStorage.setItem('jd_warranty_ack_cust-token-1', 'true')
    vi.clearAllMocks()

    customerService.fetchCustomerPortalData.mockResolvedValue(initialPortalPayload)
    customerService.getCustomerAuthStatus.mockResolvedValue({
      hasPassword: true,
      email: 'juan.delacruz@solar.ph',
      emailConfirmed: true,
      emailConfirmationStatus: 'confirmed',
    })
    customerService.submitWarrantyClaim.mockResolvedValue({
      success: true,
      claimId: 'a91f0011-2222-3333-4444-555566667777',
    })
  })

  afterEach(() => {
    vi.useRealTimers()
    cleanup()
  })

  function renderPortal() {
    return render(
      <MemoryRouter initialEntries={['/portal?token=cust-token-1']}>
        <CustomerPortalPage />
      </MemoryRouter>
    )
  }

  it('plays AnimatedConfirmation without unmounting modal during portal background refresh and transitions to final ticket summary', async () => {
    customerService.fetchCustomerPortalData
      .mockResolvedValueOnce(initialPortalPayload)
      .mockResolvedValueOnce({
        data: {
          ...initialPortalPayload.data,
          claims: [
            {
              id: 'a91f0011-2222-3333-4444-555566667777',
              purchase_id: 'purch-1',
              issue_category: 'Battery Drain / Low Runtime',
              description: 'LED drops to 20% brightness after 3 hours.',
              status: 'in_review',
              created_at: '2026-11-17T08:00:00Z',
              product_name: '300W Solar Street Light Pro',
              serial_number: 'JDS-300-8821',
            },
          ],
        },
        error: null,
      })

    renderPortal()

    await waitFor(() => {
      expect(screen.getByText(/Welcome, Juan Dela Cruz!/i)).toBeTruthy()
    })

    fireEvent.click(screen.getByRole('button', { name: /File Claim/i }))

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Describe the observed hardware failure symptoms/i)).toBeTruthy()
    })

    fireEvent.change(screen.getByPlaceholderText(/Describe the observed hardware failure symptoms/i), {
      target: { value: 'LED drops to 20% brightness after 3 hours.' },
    })

    vi.useFakeTimers()

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Submit Warranty Claim Ticket/i }))
    })

    // Background refresh must not replace the portal with full-page loading screen
    expect(screen.queryByText(/Loading your solar equipment & warranties/i)).toBeNull()

    // AnimatedConfirmation splash must be rendered right after submission
    expect(screen.getByText('Warranty Diagnostic Claim Filed')).toBeTruthy()
    expect(screen.getByText('TICKET #CLAIM-A91F0011')).toBeTruthy()
    // Tab switcher is locked/hidden during animated confirmation
    expect(screen.queryByRole('button', { name: /Troubleshooting Wizard/i })).toBeNull()

    // Final confirmation summary button should be held until 1800ms animation finishes
    expect(screen.queryByRole('button', { name: /Return to Customer Portal/i })).toBeNull()

    act(() => {
      vi.advanceTimersByTime(1800)
    })

    expect(screen.getByText('Warranty Claim Submitted Successfully')).toBeTruthy()
    expect(screen.getByRole('button', { name: /Return to Customer Portal/i })).toBeTruthy()

    // Clicking Track Claim Status closes modal and opens Service Claims with the new ticket
    fireEvent.click(screen.getByRole('button', { name: /Track Claim Status/i }))

    expect(screen.queryByText('Warranty Claim Submitted Successfully')).toBeNull()
    expect(screen.getByText('TICKET #A91F0011')).toBeTruthy()
    expect(screen.getByLabelText('Claim progress')).toBeTruthy()
    expect(screen.getAllByText('Diagnostic Intake').length).toBeGreaterThanOrEqual(1)
  })

  it('shows accessible inline validation error for blank fault description and clears it on input without calling submitWarrantyClaim', async () => {
    renderPortal()

    await waitFor(() => {
      expect(screen.getByText(/Welcome, Juan Dela Cruz!/i)).toBeTruthy()
    })

    fireEvent.click(screen.getByRole('button', { name: /File Claim/i }))

    const textarea = await screen.findByPlaceholderText(/Describe the observed hardware failure symptoms/i)
    fireEvent.change(textarea, { target: { value: '   ' } })

    fireEvent.click(screen.getByRole('button', { name: /Submit Warranty Claim Ticket/i }))

    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toMatch(/Please provide a brief description of the fault/i)
    expect(textarea.getAttribute('aria-invalid')).toBe('true')
    expect(customerService.submitWarrantyClaim).not.toHaveBeenCalled()

    // Typing a real fault description clears the inline validation error
    fireEvent.change(textarea, { target: { value: 'Unit will not turn on at dusk.' } })
    expect(screen.queryByRole('alert')).toBeNull()
    expect(textarea.getAttribute('aria-invalid')).toBe('false')
  })

  it('shows inline error alert and keeps entered fault description intact when claim submission fails', async () => {
    customerService.submitWarrantyClaim.mockRejectedValueOnce(new Error('Service hub temporarily unavailable.'))

    renderPortal()

    await waitFor(() => {
      expect(screen.getByText(/Welcome, Juan Dela Cruz!/i)).toBeTruthy()
    })

    fireEvent.click(screen.getByRole('button', { name: /File Claim/i }))

    const textarea = await screen.findByPlaceholderText(/Describe the observed hardware failure symptoms/i)
    fireEvent.change(textarea, { target: { value: 'Battery drains within 2 hours.' } })

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Submit Warranty Claim Ticket/i }))
    })

    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toContain('Service hub temporarily unavailable.')
    expect(screen.queryByText('Warranty Diagnostic Claim Filed')).toBeNull()
    expect(textarea.value).toBe('Battery drains within 2 hours.')

    // Editing the fault description clears the server error alert
    fireEvent.change(textarea, { target: { value: 'Battery drains within 2 hours under full sun.' } })
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('rejects oversized and excess media attachments with accessible inline validation alerts', async () => {
    renderPortal()

    await waitFor(() => {
      expect(screen.getByText(/Welcome, Juan Dela Cruz!/i)).toBeTruthy()
    })

    fireEvent.click(screen.getByRole('button', { name: /File Claim/i }))

    const fileInput = await screen.findByLabelText('Evidence attachments')
    const oversizedFile = new File(['x'], 'oversized-video.mp4', { type: 'video/mp4' })
    Object.defineProperty(oversizedFile, 'size', { value: 16 * 1024 * 1024 })

    fireEvent.change(fileInput, { target: { files: [oversizedFile] } })
    expect((await screen.findByRole('alert')).textContent).toMatch(/exceeds the 15MB limit/i)

    // Excess files (>4)
    const fiveFiles = [1, 2, 3, 4, 5].map(
      (n) => new File(['img'], `photo-${n}.jpg`, { type: 'image/jpeg' })
    )
    fireEvent.change(fileInput, { target: { files: fiveFiles } })
    expect((await screen.findByRole('alert')).textContent).toMatch(/Maximum 4 media files allowed/i)
    expect(customerService.submitWarrantyClaim).not.toHaveBeenCalled()
  })
})
