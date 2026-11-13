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

  it('renders pre-troubleshooting safety warning at Stage 1', () => {
    render(
      <FaultDiagnosticModal
        isOpen={true}
        onClose={vi.fn()}
        purchase={mockPurchase}
        customerToken="dummy-token"
      />
    )

    expect(screen.getByRole('heading', { name: /^Warning$/i })).toBeTruthy()
    expect(screen.getByText(/Solar troubleshooting involves electrical circuits, lithium battery cells/i)).toBeTruthy()
    expect(screen.getByRole('button', { name: /Review Safety Warning/i })).toBeTruthy()
  })

  it('blurs action steps on solution view and requires safety modal acknowledgment to unlock', () => {
    render(
      <FaultDiagnosticModal
        isOpen={true}
        onClose={vi.fn()}
        purchase={mockPurchase}
        customerToken="dummy-token"
      />
    )

    // Unlock pre-troubleshooting safety warning
    fireEvent.click(screen.getByRole('button', { name: /Review Safety Warning/i }))
    fireEvent.click(screen.getByRole('button', { name: /I Understand/i }))

    // Select symptom and advance
    const hotspotBtn = screen.getByRole('button', { name: /Panel Heat \/ Discoloration \/ Broken Glass/i })
    fireEvent.click(hotspotBtn)
    fireEvent.click(screen.getByRole('button', { name: /Continue Diagnostic/i }))

    // Stage 2: Physical classification
    const cellHotspotBtn = screen.getByRole('button', { name: /Brown \/ black burned spots/i })
    fireEvent.click(cellHotspotBtn)

    // Stage 3: Electrical classification
    const darkLedBtn = screen.getByRole('button', { name: /Charging LED is completely dark/i })
    fireEvent.click(darkLedBtn)

    // Stage 4: Environmental exposure -> leads to SOLUTION
    const sunBtn = screen.getByRole('button', { name: /Direct open sunlight exposure/i })
    fireEvent.click(sunBtn)

    // Now in SOLUTION view: action steps should be blurred with precaution overlay
    expect(screen.getByText(/Recommended Solution & Action Steps/i)).toBeTruthy()
    expect(screen.getByRole('heading', { name: /^Warning$/i })).toBeTruthy()
    expect(screen.getByText(/These troubleshooting steps involve hands-on equipment handling/i)).toBeTruthy()

    // Open Safety Warning Modal
    const reviewWarningBtn = screen.getByRole('button', { name: /Review Safety Warning/i })
    fireEvent.click(reviewWarningBtn)

    // Modal elements
    expect(screen.getByText(/WARNING: Risk of Personal Harm and System Damage/i)).toBeTruthy()
    expect(screen.getByText(/WARNING: If you do this you might get harmed or risk breaking the system more/i)).toBeTruthy()
    expect(screen.getByText(/Store Warranty and Disqualification Policy Notice/i)).toBeTruthy()
    expect(screen.getByText(/If the problem does not resolve with non-invasive checks/i)).toBeTruthy()

    // Test opening the policy modal from the safety warning modal
    const policyLinkBtn = screen.getByRole('button', { name: /Read 2-Year Warranty and Disqualification Policy/i })
    fireEvent.click(policyLinkBtn)
    expect(screen.getByText(/2-Year Solar Warranty & Disqualification Notice/i)).toBeTruthy()

    // Close policy modal
    const closePolicyBtns = screen.getAllByRole('button', { name: /^Close$/i })
    fireEvent.click(closePolicyBtns[0])

    // Click "I Understand" to unlock action steps
    const understandBtn = screen.getByRole('button', { name: /I Understand/i })
    fireEvent.click(understandBtn)

    // Precaution overlay should be removed, revealing dual safety notices
    expect(screen.queryByRole('heading', { name: /^Warning$/i })).toBeNull()
    expect(screen.getByText(/Safety Warning Before Doing Actions/i)).toBeTruthy()
    expect(screen.getByText(/Safety Warning After Doing Actions/i)).toBeTruthy()
    expect(screen.getByText(/If the problem does not resolve, stop troubleshooting immediately/i)).toBeTruthy()

    // Clicking File Warranty Claim under everything transfers to claim tab
    const claimBtns = screen.getAllByRole('button', { name: /File Warranty Claim/i })
    fireEvent.click(claimBtns[claimBtns.length - 1])

    // Should now be on the claim tab with description pre-filled
    expect(screen.getByText(/Diagnostic Wizard Report Pre-Populated/i)).toBeTruthy()
  })

  it('relocks action steps if the troubleshooter is restarted or reset', () => {
    render(
      <FaultDiagnosticModal
        isOpen={true}
        onClose={vi.fn()}
        purchase={mockPurchase}
        customerToken="dummy-token"
      />
    )

    // Unlock pre-troubleshooting warning
    fireEvent.click(screen.getByRole('button', { name: /Review Safety Warning/i }))
    fireEvent.click(screen.getByRole('button', { name: /I Understand/i }))

    // Navigate to solution view
    fireEvent.click(screen.getByRole('button', { name: /Panel Heat \/ Discoloration \/ Broken Glass/i }))
    fireEvent.click(screen.getByRole('button', { name: /Continue Diagnostic/i }))
    fireEvent.click(screen.getByRole('button', { name: /Brown \/ black burned spots/i }))
    fireEvent.click(screen.getByRole('button', { name: /Charging LED is completely dark/i }))
    fireEvent.click(screen.getByRole('button', { name: /Direct open sunlight exposure/i }))

    // Solution view: Unlock
    fireEvent.click(screen.getByRole('button', { name: /Review Safety Warning/i }))
    fireEvent.click(screen.getByRole('button', { name: /I Understand/i }))
    expect(screen.queryByRole('heading', { name: /^Warning$/i })).toBeNull()

    // Click "Troubleshoot Another Issue"
    fireEvent.click(screen.getByRole('button', { name: /Troubleshoot Another Issue/i }))

    // Should be back at Stage 1, relocked with warning
    expect(screen.getByRole('heading', { name: /^Warning$/i })).toBeTruthy()

    // Unlock again to proceed
    fireEvent.click(screen.getByRole('button', { name: /Review Safety Warning/i }))
    fireEvent.click(screen.getByRole('button', { name: /I Understand/i }))

    // Navigate back to solution view
    fireEvent.click(screen.getByRole('button', { name: /Panel Heat \/ Discoloration \/ Broken Glass/i }))
    fireEvent.click(screen.getByRole('button', { name: /Continue Diagnostic/i }))
    fireEvent.click(screen.getByRole('button', { name: /Brown \/ black burned spots/i }))
    fireEvent.click(screen.getByRole('button', { name: /Charging LED is completely dark/i }))
    fireEvent.click(screen.getByRole('button', { name: /Direct open sunlight exposure/i }))

    // Must be blurred and locked again requiring re-acknowledgment
    expect(screen.getByRole('heading', { name: /^Warning$/i })).toBeTruthy()
  })

  it('closes safety warning modal on Cancel or backdrop click without unlocking action steps', () => {
    render(
      <FaultDiagnosticModal
        isOpen={true}
        onClose={vi.fn()}
        purchase={mockPurchase}
        customerToken="dummy-token"
      />
    )

    // Unlock pre-troubleshooting warning
    fireEvent.click(screen.getByRole('button', { name: /Review Safety Warning/i }))
    fireEvent.click(screen.getByRole('button', { name: /I Understand/i }))

    // Navigate to solution view
    fireEvent.click(screen.getByRole('button', { name: /Panel Heat \/ Discoloration \/ Broken Glass/i }))
    fireEvent.click(screen.getByRole('button', { name: /Continue Diagnostic/i }))
    fireEvent.click(screen.getByRole('button', { name: /Brown \/ black burned spots/i }))
    fireEvent.click(screen.getByRole('button', { name: /Charging LED is completely dark/i }))
    fireEvent.click(screen.getByRole('button', { name: /Direct open sunlight exposure/i }))

    // Open Safety Warning Modal
    fireEvent.click(screen.getByRole('button', { name: /Review Safety Warning/i }))
    expect(screen.getByText(/WARNING: Risk of Personal Harm and System Damage/i)).toBeTruthy()

    // Click Cancel
    fireEvent.click(screen.getByRole('button', { name: /^Cancel$/i }))

    // Modal closed, steps still blurred
    expect(screen.queryByText(/WARNING: Risk of Personal Harm and System Damage/i)).toBeNull()
    expect(screen.getByRole('heading', { name: /^Warning$/i })).toBeTruthy()

    // Reopen and test backdrop click
    fireEvent.click(screen.getByRole('button', { name: /Review Safety Warning/i }))
    expect(screen.getByText(/WARNING: Risk of Personal Harm and System Damage/i)).toBeTruthy()

    const modalDialog = screen.getByRole('dialog', { name: /WARNING: Risk of Personal Harm and System Damage/i })
    fireEvent.click(modalDialog)

    // Modal closed, steps remain blurred
    expect(screen.queryByText(/WARNING: Risk of Personal Harm and System Damage/i)).toBeNull()
    expect(screen.getByRole('heading', { name: /^Warning$/i })).toBeTruthy()
  })

  it('closes safety warning modal on Escape without closing parent troubleshooter', () => {
    const handleClose = vi.fn()
    render(
      <FaultDiagnosticModal
        isOpen={true}
        onClose={handleClose}
        purchase={mockPurchase}
        customerToken="dummy-token"
      />
    )

    // Unlock pre-troubleshooting warning
    fireEvent.click(screen.getByRole('button', { name: /Review Safety Warning/i }))
    fireEvent.click(screen.getByRole('button', { name: /I Understand/i }))

    // Navigate to solution view
    fireEvent.click(screen.getByRole('button', { name: /Panel Heat \/ Discoloration \/ Broken Glass/i }))
    fireEvent.click(screen.getByRole('button', { name: /Continue Diagnostic/i }))
    fireEvent.click(screen.getByRole('button', { name: /Brown \/ black burned spots/i }))
    fireEvent.click(screen.getByRole('button', { name: /Charging LED is completely dark/i }))
    fireEvent.click(screen.getByRole('button', { name: /Direct open sunlight exposure/i }))

    // Open Safety Warning Modal
    fireEvent.click(screen.getByRole('button', { name: /Review Safety Warning/i }))
    expect(screen.getByText(/WARNING: Risk of Personal Harm and System Damage/i)).toBeTruthy()

    // Press Escape
    fireEvent.keyDown(window, { key: 'Escape' })

    // Safety modal should close, but parent modal onClose should NOT have been invoked
    expect(screen.queryByText(/WARNING: Risk of Personal Harm and System Damage/i)).toBeNull()
    expect(handleClose).not.toHaveBeenCalled()
    expect(screen.getByText(/Solar Troubleshooting Guide/i)).toBeTruthy()
  })
})
