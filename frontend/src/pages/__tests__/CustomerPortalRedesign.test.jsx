import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react'
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

const mockPortalPayload = {
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
      {
        id: 'purch-2',
        product_id: 102,
        product_name: '100Ah LiFePO4 Battery Pack',
        product_type: 'Battery Storage',
        watt: '12.8V',
        serial_number: 'JDS-BAT-1094',
        purchase_date: '2025-01-18',
        warranty_months: 24,
        warranty_expires_at: '2027-01-18T00:00:00Z',
        branch_location: 'Quiapo',
        is_voided: false,
        is_warranty_active: true,
        days_remaining: 62,
      },
    ],
    claims: [
      {
        id: 'a4f912c0-1111-2222-3333-444455556666',
        purchase_id: 'purch-2',
        issue_category: 'Battery Drain / Low Runtime',
        description: 'Voltage drops rapidly overnight after 6 hours.',
        status: 'in_review',
        staff_notes: 'Bring battery pack to Quiapo branch for load bench test.',
        created_at: '2026-11-10T08:00:00Z',
        product_name: '100Ah LiFePO4 Battery Pack',
        serial_number: 'JDS-BAT-1094',
      },
    ],
  },
  error: null,
}

describe('CustomerPortalPage — Calm Device Hub & Modal Verification', () => {
  beforeEach(() => {
    localStorage.clear()
    localStorage.setItem('jd_warranty_ack_cust-token-1', 'true')
    vi.clearAllMocks()

    customerService.fetchCustomerPortalData.mockResolvedValue(mockPortalPayload)
    customerService.getCustomerAuthStatus.mockResolvedValue({
      hasPassword: false,
      email: 'juan.delacruz@solar.ph',
      emailConfirmed: true,
      emailConfirmationStatus: 'confirmed',
    })
    customerService.setCustomerPassword.mockResolvedValue({
      success: true,
      email: 'juan.delacruz@solar.ph',
      emailChanged: false,
      message: 'Account password updated successfully.',
    })
    customerService.deleteCustomerAccount.mockResolvedValue({ success: true, error: null })
  })

  afterEach(() => {
    cleanup()
  })

  function renderPortal() {
    return render(
      <MemoryRouter initialEntries={['/portal?token=cust-token-1']}>
        <CustomerPortalPage />
      </MemoryRouter>
    )
  }

  it('renders Calm Device Hub tabs with single-serial equipment cards and navigates to Service Claims stepper', async () => {
    renderPortal()

    await waitFor(() => {
      expect(screen.getByText(/Welcome, Juan Dela Cruz!/i)).toBeTruthy()
    })

    // Serial numbers should render once per card (no duplicate card footer)
    expect(screen.getAllByText('JDS-300-8821')).toHaveLength(1)
    expect(screen.getAllByText('JDS-BAT-1094')).toHaveLength(1)

    // Active claim banner lets customer jump straight to Service Claims tab
    expect(screen.getByText(/1 Active Service Ticket/i)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /Track Claim/i }))

    await waitFor(() => {
      expect(screen.getByText('TICKET #A4F912C0')).toBeTruthy()
      expect(screen.getByLabelText('Claim progress')).toBeTruthy()
      expect(screen.getByText(/Bring battery pack to Quiapo branch/i)).toBeTruthy()
    })
  })

  it('opens and closes WarrantyTermsModal via Terms & Policy button', async () => {
    renderPortal()

    await waitFor(() => {
      expect(screen.getByText(/Welcome, Juan Dela Cruz!/i)).toBeTruthy()
    })

    expect(screen.queryByRole('dialog')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: /Terms & Policy/i }))

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeTruthy()
      expect(screen.getByText('2-Year Solar Warranty & Disqualification Notice')).toBeTruthy()
    })

    const closeBtns = screen.getAllByRole('button', { name: /Close/i })
    fireEvent.click(closeBtns[0])
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull()
    })
  })

  it('opens FaultDiagnosticModal in both Troubleshoot and File Claim modes and closes cleanly', async () => {
    customerService.fetchCustomerPortalData.mockResolvedValueOnce({
      data: { ...mockPortalPayload.data, claims: [] },
      error: null,
    })
    renderPortal()

    await waitFor(() => {
      expect(screen.getByText(/Welcome, Juan Dela Cruz!/i)).toBeTruthy()
    })

    // Open in Troubleshoot (assistant) mode
    const troubleshootBtns = screen.getAllByRole('button', { name: /^Troubleshoot$/i })
    fireEvent.click(troubleshootBtns[0])

    await waitFor(() => {
      expect(screen.getByText('Solar Troubleshooting Guide')).toBeTruthy()
      expect(screen.getByText('Troubleshooting Wizard')).toBeTruthy()
    })

    // Close FaultDiagnosticModal
    fireEvent.click(screen.getByLabelText('Close'))

    await waitFor(() => {
      expect(screen.queryByText('Solar Troubleshooting Guide')).toBeNull()
    })

    // Open in File Claim mode
    const claimBtns = screen.getAllByRole('button', { name: /File Claim/i })
    fireEvent.click(claimBtns[0])

    await waitFor(() => {
      expect(screen.getByText('Filing Claim For:')).toBeTruthy()
      expect(screen.getByText('Warranty Case Evaluation Policy')).toBeTruthy()
    })
  })

  it('opens Password Management modal from Account & Security tab and saves password', async () => {
    renderPortal()

    await waitFor(() => {
      expect(screen.getByText(/Welcome, Juan Dela Cruz!/i)).toBeTruthy()
    })

    fireEvent.click(screen.getByRole('button', { name: /Account & Security/i }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Set Up Password/i })).toBeTruthy()
    })

    fireEvent.click(screen.getByRole('button', { name: /Set Up Password/i }))

    await waitFor(() => {
      expect(screen.getByText('Set Account Password')).toBeTruthy()
    })

    fireEvent.change(screen.getByPlaceholderText('Minimum 8 characters'), {
      target: { value: 'SolarPass2026!' },
    })
    fireEvent.change(screen.getByPlaceholderText('Re-enter password'), {
      target: { value: 'SolarPass2026!' },
    })
    fireEvent.click(screen.getByRole('button', { name: /Save Password/i }))

    await waitFor(() => {
      expect(customerService.setCustomerPassword).toHaveBeenCalledWith({
        token: 'cust-token-1',
        email: 'juan.delacruz@solar.ph',
        password: 'SolarPass2026!',
        currentPassword: null,
      })
    })
  })

  it('opens Delete Account modal from Account & Security tab and supports Cancel and Confirm', async () => {
    renderPortal()

    await waitFor(() => {
      expect(screen.getByText(/Welcome, Juan Dela Cruz!/i)).toBeTruthy()
    })

    fireEvent.click(screen.getByRole('button', { name: /Account & Security/i }))
    fireEvent.click(screen.getByRole('button', { name: /Delete Account/i }))

    await waitFor(() => {
      expect(screen.getByText('Delete Your Account?')).toBeTruthy()
      expect(screen.getByText(/2 registered unit\(s\)/i)).toBeTruthy()
    })

    // Cancel closes modal without calling deleteCustomerAccount
    fireEvent.click(screen.getByRole('button', { name: /^Cancel$/i }))
    await waitFor(() => {
      expect(screen.queryByText('Delete Your Account?')).toBeNull()
    })
    expect(customerService.deleteCustomerAccount).not.toHaveBeenCalled()

    // Re-open and confirm deletion
    fireEvent.click(screen.getByRole('button', { name: /Delete Account/i }))
    await waitFor(() => {
      expect(screen.getByText('Delete Your Account?')).toBeTruthy()
    })
    fireEvent.click(screen.getByRole('button', { name: /Yes, Permanently Delete/i }))

    await waitFor(() => {
      expect(customerService.deleteCustomerAccount).toHaveBeenCalledWith({
        customerId: 'cust-1',
        token: 'cust-token-1',
        email: 'juan.delacruz@solar.ph',
      })
    })
  })
})
