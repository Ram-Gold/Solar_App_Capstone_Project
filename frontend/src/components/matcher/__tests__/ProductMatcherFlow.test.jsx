import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { useState, useMemo } from 'react'
import PrototypeGuidedFlow from '../PrototypeGuidedFlow'
import MultiCriteriaMatchModal from '../../MultiCriteriaMatchModal'
import { matchSolarProducts, getCatalogBounds } from '../../../lib/multiCriteriaMatcher'

vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }) => children,
  motion: {
    div: ({ children, className, style, role }) => (
      <div className={className} style={style} role={role}>
        {children}
      </div>
    ),
  },
}))

afterEach(() => {
  cleanup()
})

const TEST_PRODUCTS = [
  {
    id: 1,
    name: 'Integrated Solar Street Light 200W',
    type: 'Integrated Solar Street Light',
    watt: 200,
    min_price: 1500,
    max_price: 2500,
    price_range: '1500-2500',
    waterproof_grade: 'IP67',
    solar_panel: 'Monocrystalline',
    in_stock: true,
    stock_quantity: 12,
  },
  {
    id: 2,
    name: 'Aviation Aluminum Solar Road Light 500W',
    type: 'Aviation Aluminum Solar Road Light',
    watt: 500,
    min_price: 3000,
    max_price: 4500,
    price_range: '3000-4500',
    waterproof_grade: 'IP65',
    solar_panel: 'Monocrystalline',
    in_stock: true,
    stock_quantity: 8,
  },
  {
    id: 3,
    name: 'KKSKY Solar Floodlight 400W',
    type: 'KKSKY Solar Floodlight',
    watt: 400,
    min_price: null,
    max_price: null,
    price_range: null,
    waterproof_grade: 'IP67',
    solar_panel: '6V 40W',
    in_stock: true,
    stock_quantity: 20,
  },
]

function MatcherHarness({ initialCriteria, onConsult = vi.fn() }) {
  const [criteria, setCriteria] = useState({
    location: 'street',
    formFactor: 'any',
    mounting: 'any',
    powerNeeds: 300,
    wattageManuallyEdited: false,
    quantity: 1,
    budget: 3500,
    budgetMode: 'unit',
    threshold: 0.70,
    ...initialCriteria,
  })
  const bounds = useMemo(() => getCatalogBounds(TEST_PRODUCTS), [])
  const matchResult = useMemo(
    () =>
      matchSolarProducts(TEST_PRODUCTS, criteria, {
        threshold: 0.70,
        limit: 4,
        unlistedLimit: 4,
        separateUnlisted: true,
        catalogBounds: bounds,
      }),
    [criteria, bounds]
  )

  return (
    <MemoryRouter>
      <PrototypeGuidedFlow
        criteria={criteria}
        onCriteriaChange={setCriteria}
        matchResult={matchResult}
        catalogBounds={bounds}
        onConsultAssistant={onConsult}
      />
    </MemoryRouter>
  )
}

describe('Product Matcher Two-Door Hybrid UI (RAM-10, RAM-11, RAM-12)', () => {
  it('renders dropdown form in direct entry, hides results until Submit, and allows editing answers back', () => {
    const { container } = render(<MatcherHarness />)

    expect(screen.getByText('Help me choose')).toBeTruthy()
    expect(screen.getByText('I know what I need')).toBeTruthy()

    fireEvent.click(screen.getByText('I know what I need'))

    // Verify no range sliders exist (RAM-12)
    expect(container.querySelectorAll('input[type="range"]').length).toBe(0)

    // Verify dropdowns for Location, Light style, and Mounting
    const locationSelect = screen.getByLabelText('Where will you put it?')
    const styleSelect = screen.getByLabelText('Light style')
    const mountSelect = screen.getByLabelText('How will you mount it?')
    expect(locationSelect.tagName).toBe('SELECT')
    expect(styleSelect.tagName).toBe('SELECT')
    expect(mountSelect.tagName).toBe('SELECT')

    // Verify direct numeric inputs with inputmode="numeric" exist
    const wattInput = screen.getByLabelText('Brightness (watts)')
    const qtyInput = screen.getByLabelText('How many units?')
    const budgetInput = screen.getByLabelText('Budget')
    expect(wattInput.getAttribute('inputmode')).toBe('numeric')
    expect(qtyInput.getAttribute('inputmode')).toBe('numeric')
    expect(budgetInput.getAttribute('inputmode')).toBe('numeric')

    // Results should not render before Submit
    expect(screen.queryByText('Your best matches')).toBeNull()

    // Submit form
    fireEvent.click(screen.getByRole('button', { name: /Submit/i }))

    // Results render cleanly with Match Breakdown hidden until requested
    expect(screen.getByText('Your best matches')).toBeTruthy()
    expect(screen.queryByRole('dialog', { name: 'Match breakdown' })).toBeNull()
    expect(screen.getByText(/Price upon inquiry \(1\)/i)).toBeTruthy()
    expect(screen.getByText('KKSKY Solar Floodlight 400W')).toBeTruthy()

    // Clicking the match badge opens the Match Breakdown popover
    const matchTriggers = screen.getAllByRole('button', { name: /Match breakdown for .*match/i })
    fireEvent.click(matchTriggers[0])
    const dialog = screen.getByRole('dialog', { name: 'Match breakdown' })
    expect(within(dialog).getByText('Location')).toBeTruthy()
    expect(within(dialog).getByText('Budget')).toBeTruthy()

    // Pressing Escape closes the popover
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('dialog', { name: 'Match breakdown' })).toBeNull()

    // Clicking the Price upon inquiry fit badge opens its Match Breakdown popover
    const fitTrigger = screen.getByRole('button', { name: /Match breakdown for .*fit/i })
    fireEvent.click(fitTrigger)
    const unlistedDialog = screen.getByRole('dialog', { name: 'Match breakdown' })
    expect(within(unlistedDialog).getByText('Price upon inquiry')).toBeTruthy()

    // Return to form via Edit answers without losing inputs
    fireEvent.click(screen.getByText('Edit answers'))
    expect(screen.getByLabelText('Brightness (watts)').value).toBe('300')
  })

  it('shows below-budget alert after Submit when budget is below lowest-priced solar light', () => {
    render(<MatcherHarness initialCriteria={{ budget: 500 }} />)
    fireEvent.click(screen.getByText('I know what I need'))
    fireEvent.click(screen.getByRole('button', { name: /Submit/i }))

    expect(screen.getByRole('alert').textContent).toContain('Budget is below our lowest-priced solar light')
    expect(screen.getByText('Closest price option')).toBeTruthy()
  })

  it('rejects 0 for Budget and Brightness (watts) with inline guidance and blocks submission in Direct Entry', () => {
    render(<MatcherHarness />)
    fireEvent.click(screen.getByText('I know what I need'))

    fireEvent.change(screen.getByLabelText('Budget'), { target: { value: '0' } })
    expect(screen.getByText('Enter an amount above ₱0, or leave blank for Any.')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /Submit/i }))
    expect(screen.queryByText('Your best matches')).toBeNull()

    // Clearing budget back to blank removes error; test 0W as well
    fireEvent.change(screen.getByLabelText('Budget'), { target: { value: '' } })
    fireEvent.change(screen.getByLabelText('Brightness (watts)'), { target: { value: '0' } })
    expect(screen.getByText('Enter a wattage above 0W, or leave blank for Any.')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /Submit/i }))
    expect(screen.queryByText('Your best matches')).toBeNull()
  })

  it('blocks Guided Mode from advancing to Matches when Budget or Brightness is 0', () => {
    render(<MatcherHarness />)
    fireEvent.click(screen.getByText('Help me choose'))

    // Advance to Step 3 (Power)
    fireEvent.click(screen.getByRole('button', { name: /Next/i }))
    fireEvent.click(screen.getByRole('button', { name: /Next/i }))

    fireEvent.change(screen.getByLabelText('Brightness (watts)'), { target: { value: '0' } })
    expect(screen.getByText('Enter a wattage above 0W, or leave blank for Any.')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /Next/i }))
    expect(screen.getByText('Step 3 of 5')).toBeTruthy()

    // Fix wattage and go to Step 4 (Budget)
    fireEvent.change(screen.getByLabelText('Brightness (watts)'), { target: { value: '300' } })
    fireEvent.click(screen.getByRole('button', { name: /Next/i }))
    expect(screen.getByText('Step 4 of 5')).toBeTruthy()

    fireEvent.change(screen.getByLabelText('Budget per unit'), { target: { value: '0' } })
    expect(screen.getByText('Enter an amount above ₱0, or leave blank for Any.')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /See my matches/i }))
    expect(screen.queryByText('Your best matches')).toBeNull()
    expect(screen.getByText('Step 4 of 5')).toBeTruthy()

    // Stepper jump to Matches should also be blocked
    fireEvent.click(screen.getByRole('button', { name: 'Matches' }))
    expect(screen.queryByText('Your best matches')).toBeNull()
  })

  it('preserves manually edited wattage when changing the Location dropdown', () => {
    render(<MatcherHarness />)
    fireEvent.click(screen.getByText('I know what I need'))

    const wattInput = screen.getByLabelText('Brightness (watts)')
    fireEvent.change(wattInput, { target: { value: '450' } })
    expect(wattInput.value).toBe('450')

    fireEvent.change(screen.getByLabelText('Where will you put it?'), { target: { value: 'home' } })
    expect(wattInput.value).toBe('450')
  })

  it('displays "Any" for unset criteria inside Match Breakdown popover and invokes assistant callback', () => {
    const onConsult = vi.fn()
    render(<MatcherHarness onConsult={onConsult} />)
    fireEvent.click(screen.getByText('I know what I need'))

    fireEvent.change(screen.getByLabelText('Brightness (watts)'), { target: { value: '' } })
    fireEvent.change(screen.getByLabelText('Budget'), { target: { value: '' } })
    fireEvent.change(screen.getByLabelText('How many units?'), { target: { value: '' } })
    fireEvent.click(screen.getByRole('button', { name: /Submit/i }))

    expect(screen.getByText('Your best matches')).toBeTruthy()
    const matchTriggers = screen.getAllByRole('button', { name: /Match breakdown for .*match/i })
    fireEvent.click(matchTriggers[0])
    const dialog = screen.getByRole('dialog', { name: 'Match breakdown' })
    expect(within(dialog).getAllByText('Any').length).toBeGreaterThanOrEqual(2)

    fireEvent.click(screen.getByText('Ask assistant'))
    expect(onConsult).toHaveBeenCalledTimes(1)
  })

  it('validates 0 inputs and renders on-demand Match Breakdown popovers in MultiCriteriaMatchModal', () => {
    render(
      <MemoryRouter>
        <MultiCriteriaMatchModal isOpen onClose={vi.fn()} products={TEST_PRODUCTS} />
      </MemoryRouter>
    )

    fireEvent.change(screen.getByLabelText('modal-budget'), { target: { value: '0' } })
    expect(screen.getByText('Enter an amount above ₱0, or leave blank for Any.')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /Submit/i }))
    expect(screen.queryByText('Your best matches')).toBeNull()

    fireEvent.change(screen.getByLabelText('modal-budget'), { target: { value: '3500' } })
    fireEvent.click(screen.getByRole('button', { name: /Submit/i }))
    expect(screen.getByText('Your best matches')).toBeTruthy()
    expect(screen.queryByRole('dialog', { name: 'Match breakdown' })).toBeNull()

    const matchTriggers = screen.getAllByRole('button', { name: /Match breakdown for .*match/i })
    fireEvent.click(matchTriggers[0])
    expect(screen.getByRole('dialog', { name: 'Match breakdown' })).toBeTruthy()
  })
})
