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

  it('enforces one claim per purchased product without locking other products on the dashboard', async () => {
    // mockPortalPayload has purch-1 (no claim) and purch-2 (1 active claim)
    renderPortal()

    await waitFor(() => {
      expect(screen.getByText(/Welcome, Juan Dela Cruz!/i)).toBeTruthy()
    })

    // Only purch-1 should show File Claim; purch-2 should show Active Ticket + Run Troubleshooting Guide
    const fileClaimBtns = screen.getAllByRole('button', { name: /^File Claim$/i })
    expect(fileClaimBtns).toHaveLength(1)
    expect(screen.getByRole('button', { name: /Active Ticket #A4F912C0/i })).toBeTruthy()
    expect(screen.getByRole('button', { name: /Run Troubleshooting Guide/i })).toBeTruthy()

    // Opening File Claim on unclaimed purch-1 opens the claim form for purch-1
    fireEvent.click(fileClaimBtns[0])
    await waitFor(() => {
      expect(screen.getByText('Filing Claim For:')).toBeTruthy()
      expect(screen.getByRole('button', { name: /Submit Warranty Claim Ticket/i })).toBeTruthy()
    })

    fireEvent.click(screen.getByLabelText('Close'))
    await waitFor(() => {
      expect(screen.queryByText('Filing Claim For:')).toBeNull()
    })

    // Opening Run Troubleshooting Guide on claimed purch-2 keeps File Warranty Claim locked for that unit
    fireEvent.click(screen.getByRole('button', { name: /Run Troubleshooting Guide/i }))
    await waitFor(() => {
      const lockedTab = screen.getByRole('button', { name: /Claim On File/i })
      expect(lockedTab.disabled).toBe(true)
    })
  })

  it('allows filing a claim on each unclaimed unit when a customer owns 3 units of the same product and 1 already has a claim', async () => {
    customerService.submitWarrantyClaim.mockResolvedValue({
      success: true,
      claimId: 'b88f0022-1111-2222-3333-444455556666',
    })
    customerService.fetchCustomerPortalData.mockResolvedValueOnce({
      data: {
        ...mockPortalPayload.data,
        purchases: [
          { ...mockPortalPayload.data.purchases[0], id: 'unit-1', product_name: 'Solar Floodlight JDL 1000W', serial_number: 'SN-1' },
          { ...mockPortalPayload.data.purchases[0], id: 'unit-2', product_name: 'Solar Floodlight JDL 1000W', serial_number: 'SN-2' },
          { ...mockPortalPayload.data.purchases[0], id: 'unit-3', product_name: 'Solar Floodlight JDL 1000W', serial_number: 'SN-3' },
        ],
        claims: [
          {
            id: '654ff9a8-7d19-4ea2-9130-813aaed6979f',
            purchase_id: 'unit-1',
            issue_category: 'No Power',
            description: 'Unit 1 stopped charging.',
            status: 'in_review',
            created_at: '2026-11-28T08:13:53Z',
            product_name: 'Solar Floodlight JDL 1000W',
            serial_number: 'SN-1',
          },
        ],
      },
      error: null,
    })

    renderPortal()

    await waitFor(() => {
      expect(screen.getByText(/Welcome, Juan Dela Cruz!/i)).toBeTruthy()
    })

    // 1 claimed unit locked, 2 unclaimed units unlocked
    const fileClaimBtns = screen.getAllByRole('button', { name: /^File Claim$/i })
    expect(fileClaimBtns).toHaveLength(2)
    expect(screen.getByRole('button', { name: /Active Ticket #654FF9A8/i })).toBeTruthy()

    // Submit a claim on unit-2
    fireEvent.click(fileClaimBtns[0])
    const textarea = await screen.findByPlaceholderText(/Describe the observed hardware failure symptoms/i)
    fireEvent.change(textarea, { target: { value: 'Unit 2 battery drains after 1 hour.' } })
    fireEvent.click(screen.getByRole('button', { name: /Submit Warranty Claim Ticket/i }))

    await waitFor(() => {
      expect(customerService.submitWarrantyClaim).toHaveBeenCalledWith(
        expect.objectContaining({
          token: 'cust-token-1',
          purchaseId: 'unit-2',
          description: 'Unit 2 battery drains after 1 hour.',
        })
      )
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
