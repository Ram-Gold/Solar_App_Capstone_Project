import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import FaultDiagnosticModal from '../FaultDiagnosticModal'

// Mock dependencies
vi.mock('../../lib/customerService', () => ({
  uploadEvidenceFile: vi.fn(),
  submitWarrantyClaim: vi.fn().mockResolvedValue({ success: true, claimId: 'CLM-TEST-001' }),
}))

const mockPurchase = {
  id: 'PURCHASE-123',
  product_name: 'JD-8800 Solar Street Light 800W',
  watt: 800,
  serial_number: 'SN-SOLAR-8800-XYZ',
  is_warranty_active: true,
  is_voided: false,
  days_remaining: 180,
  warranty_months: 24,
}

describe('FaultDiagnosticModal Multi-Choice Symptom Selection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  it('renders root symptom choices with checkboxes and a disabled Continue button initially', () => {
    render(
      <FaultDiagnosticModal
        isOpen={true}
        onClose={vi.fn()}
        purchase={mockPurchase}
        customerToken="dummy-token"
      />
    )

    // Check header
    expect(screen.getByText(/Select one or more symptoms observed/i)).toBeTruthy()

    // Continue button should be disabled when 0 symptoms are selected
    const continueBtn = screen.getByRole('button', { name: /Continue Diagnostic/i })
    expect(continueBtn.disabled).toBe(true)
    expect(screen.getByText(/Select one or more symptoms above to proceed/i)).toBeTruthy()
  })

  it('allows toggling multiple symptoms and updates the Continue button label', () => {
    render(
      <FaultDiagnosticModal
        isOpen={true}
        onClose={vi.fn()}
        purchase={mockPurchase}
        customerToken="dummy-token"
      />
    )

    const symptom1 = screen.getByRole('button', { name: /Light Does NOT Turn On at Night/i })
    const symptom2 = screen.getByRole('button', { name: /Dim Illumination or Flickering LEDs/i })

    // Select first symptom
    fireEvent.click(symptom1)
    expect(symptom1.getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByText('1 symptom selected')).toBeTruthy()

    const continueBtn = screen.getByRole('button', { name: /Continue Diagnostic/i })
    expect(continueBtn.disabled).toBe(false)

    // Select second symptom
    fireEvent.click(symptom2)
    expect(symptom2.getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByText('2 symptoms selected')).toBeTruthy()

    const continueBtnMulti = screen.getByRole('button', { name: /Continue with 2 Symptoms/i })
    expect(continueBtnMulti.disabled).toBe(false)

    // Unselect first symptom
    fireEvent.click(symptom1)
    expect(symptom1.getAttribute('aria-pressed')).toBe('false')
    expect(screen.getByText('1 symptom selected')).toBeTruthy()
  })

  it('advances wizard on Continue and transfers multi-symptom dossier to warranty claim form', () => {
    render(
      <FaultDiagnosticModal
        isOpen={true}
        onClose={vi.fn()}
        purchase={mockPurchase}
        customerToken="dummy-token"
      />
    )

    const symptom1 = screen.getByRole('button', { name: /Light Does NOT Turn On at Night/i })
    const symptom2 = screen.getByRole('button', { name: /Remote Control \/ Radar/i })

    fireEvent.click(symptom1)
    fireEvent.click(symptom2)

    const continueBtn = screen.getByRole('button', { name: /Continue with 2 Symptoms/i })
    fireEvent.click(continueBtn)

    // Should advance past ROOT to Stage 2
    expect(screen.getByText(/Diagnostic Stage 2 of 4/i)).toBeTruthy()

    // Switch to Claim tab directly via header tab
    const claimTabBtn = screen.getByRole('button', { name: /File Warranty Claim/i })
    fireEvent.click(claimTabBtn)

    // Check categories: multi-symptom transfer preselects both corresponding categories
    expect(screen.getByText('2 selected')).toBeTruthy()
    const noPowerCatBtn = screen.getByRole('button', { name: /No Power \/ Won't Turn On/i })
    const remoteCatBtn = screen.getByRole('button', { name: /Remote Control/i })
    expect(noPowerCatBtn.getAttribute('aria-pressed')).toBe('true')
    expect(remoteCatBtn.getAttribute('aria-pressed')).toBe('true')

    // Check description includes both reported symptoms
    const textarea = screen.getByRole('textbox')
    expect(textarea.value).toContain('Light Does NOT Turn On at Night')
    expect(textarea.value).toContain('Remote Control / Radar')
  })

  it('allows multi-choice category selection directly in the File Warranty Claim form', () => {
    render(
      <FaultDiagnosticModal
        isOpen={true}
        onClose={vi.fn()}
        purchase={mockPurchase}
        customerToken="dummy-token"
        initialMode="claim"
      />
    )

    // Initially defaults to 1 category selected
    expect(screen.getByText('1 selected')).toBeTruthy()
    const noPowerBtn = screen.getByRole('button', { name: /No Power \/ Won't Turn On/i })
    const batteryBtn = screen.getByRole('button', { name: /Battery \/ Rapid Discharge/i })
    const dimBtn = screen.getByRole('button', { name: /Dim Lighting/i })

    expect(noPowerBtn.getAttribute('aria-pressed')).toBe('true')
    expect(batteryBtn.getAttribute('aria-pressed')).toBe('false')

    // Toggle on a second category
    fireEvent.click(batteryBtn)
    expect(batteryBtn.getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByText('2 selected')).toBeTruthy()

    // Toggle on a third category
    fireEvent.click(dimBtn)
    expect(dimBtn.getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByText('3 selected')).toBeTruthy()

    // Deselect one category
    fireEvent.click(batteryBtn)
    expect(batteryBtn.getAttribute('aria-pressed')).toBe('false')
    expect(screen.getByText('2 selected')).toBeTruthy()

    // Cannot deselect when only 1 remains (preserves form validity)
    fireEvent.click(dimBtn)
    expect(screen.getByText('1 selected')).toBeTruthy()
    fireEvent.click(noPowerBtn) // Attempt to unselect sole remaining
    expect(noPowerBtn.getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByText('1 selected')).toBeTruthy()
  })

  it('routes to highest severity symptom via priority-weighted branching regardless of click order', () => {
    render(
      <FaultDiagnosticModal
        isOpen={true}
        onClose={vi.fn()}
        purchase={mockPurchase}
        customerToken="dummy-token"
      />
    )

    // Select lower-severity symptom first (Remote Control / Radar, priority 6)
    const remoteBtn = screen.getByRole('button', { name: /Remote Control \/ Radar/i })
    fireEvent.click(remoteBtn)

    // Select highest-severity symptom second (Physical Heat / Discoloration / Broken Glass, priority 1)
    const hotspotBtn = screen.getByRole('button', { name: /Panel Heat \/ Discoloration \/ Broken Glass/i })
    fireEvent.click(hotspotBtn)

    const continueBtn = screen.getByRole('button', { name: /Continue with 2 Symptoms/i })
    fireEvent.click(continueBtn)

    // Due to safety priority hierarchy, it must route to Step 1 of Physical Hotspot audit
    expect(screen.getByText(/Diagnostic Stage 2 of 4/i)).toBeTruthy()
    // The option for Physical Hotspot audit is displayed (confirming priority branching)
    expect(screen.getByText(/Brown \/ black burned spots/i)).toBeTruthy()
  })

  it('contains zero emojis in all rendered UI copy', () => {
    const { container } = render(
      <FaultDiagnosticModal
        isOpen={true}
        onClose={vi.fn()}
        purchase={mockPurchase}
        customerToken="dummy-token"
      />
    )

    // Emoji regex checking against unicode emoji sequences
    const emojiRegex = /\p{Extended_Pictographic}/u
    expect(emojiRegex.test(container.textContent)).toBe(false)
  })
})
