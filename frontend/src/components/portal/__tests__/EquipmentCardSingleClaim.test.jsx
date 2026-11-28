import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import EquipmentCard from '../EquipmentCard'
import FaultDiagnosticModal from '../../FaultDiagnosticModal'

describe('EquipmentCard single-claim-per-purchase enforcement', () => {
  afterEach(() => {
    cleanup()
  })

  const basePurchase = {
    id: 'pur-1',
    product_name: 'Deye 8kW Inverter',
    serial_number: 'SN-1001',
    purchase_date: '2026-06-01',
    warranty_expires_at: '2028-06-01',
    warranty_months: 24,
    branch_location: 'Cavite',
    is_voided: false,
  }

  it('shows File Claim when no claim exists for the purchased product', () => {
    render(
      <EquipmentCard
        purchase={basePurchase}
        linkedClaims={[]}
        onTroubleshoot={vi.fn()}
        onFileClaim={vi.fn()}
        onViewClaims={vi.fn()}
      />
    )
    expect(screen.getByRole('button', { name: /File Claim/i })).toBeTruthy()
  })

  it('hides File Claim when an active or declined claim already exists for the purchased product', () => {
    const { rerender } = render(
      <EquipmentCard
        purchase={basePurchase}
        linkedClaims={[{ id: 'claim-12345678', status: 'in_review' }]}
        onTroubleshoot={vi.fn()}
        onFileClaim={vi.fn()}
        onViewClaims={vi.fn()}
      />
    )
    expect(screen.queryByRole('button', { name: /File Claim/i })).toBeNull()
    expect(screen.getByRole('button', { name: /Active Ticket #CLAIM-12/i })).toBeTruthy()
    expect(screen.getByRole('button', { name: /Run Troubleshooting Guide/i })).toBeTruthy()

    rerender(
      <EquipmentCard
        purchase={basePurchase}
        linkedClaims={[{ id: 'claim-99999999', status: 'rejected' }]}
        onTroubleshoot={vi.fn()}
        onFileClaim={vi.fn()}
        onViewClaims={vi.fn()}
      />
    )
    expect(screen.queryByRole('button', { name: /File Claim/i })).toBeNull()
    expect(screen.getByRole('button', { name: /Claim Filed #CLAIM-99/i })).toBeTruthy()
  })

  it('blocks File Warranty Claim inside FaultDiagnosticModal when this purchased product already has a claim', () => {
    render(
      <FaultDiagnosticModal
        isOpen={true}
        onClose={vi.fn()}
        purchase={{ ...basePurchase, product_name: 'Eco LED Flood Light 100W', is_warranty_active: true }}
        customerToken="tok-1"
        existingClaim={{ id: 'claim-pur-1', purchase_id: 'pur-1', status: 'in_review' }}
        onClaimSubmitted={vi.fn()}
        onTrackClaims={vi.fn()}
        initialMode="claim"
      />
    )

    const blockedTab = screen.getByRole('button', { name: /Claim On File/i })
    expect(blockedTab.disabled).toBe(true)
    expect(screen.queryByRole('button', { name: /Submit Warranty Claim Ticket/i })).toBeNull()
    expect(screen.getByRole('button', { name: /Troubleshooting Wizard/i })).toBeTruthy()
  })

  it('allows File Warranty Claim inside FaultDiagnosticModal when this purchased product has no claim', () => {
    render(
      <FaultDiagnosticModal
        isOpen={true}
        onClose={vi.fn()}
        purchase={{ ...basePurchase, id: 'pur-2', product_name: 'Eco LED Flood Light 100W', is_warranty_active: true }}
        customerToken="tok-1"
        existingClaim={null}
        onClaimSubmitted={vi.fn()}
        onTrackClaims={vi.fn()}
        initialMode="claim"
      />
    )

    expect(screen.getByRole('button', { name: /Submit Warranty Claim Ticket/i })).toBeTruthy()
    expect(screen.queryByRole('button', { name: /Claim On File/i })).toBeNull()
  })
})
