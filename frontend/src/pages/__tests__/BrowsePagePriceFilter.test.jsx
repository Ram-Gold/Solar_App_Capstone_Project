import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import BrowsePage from '../BrowsePage'

const mockProducts = [
  {
    id: 1,
    name: 'Solar Streetlight 100W',
    type: 'Solar Streetlight',
    watt: 100,
    price_range: '1000-2000',
    waterproof_grade: 'IP65',
    in_stock: true,
  },
  {
    id: 2,
    name: 'Aviation Aluminum Solar Road Light 300W',
    type: 'Aviation Aluminum Solar Road Light',
    watt: 300,
    price_range: '2500-3500',
    waterproof_grade: 'IP65',
    in_stock: true,
  },
  {
    id: 3,
    name: 'Heavy Industrial Floodlight 1000W',
    type: 'Solar Floodlight JDL',
    watt: 1000,
    price_range: '3500-5000',
    waterproof_grade: 'IP67',
    in_stock: true,
  },
  {
    id: 4,
    name: 'Unpriced Consultative Streetlight 600W',
    type: 'Solar Streetlight',
    watt: 600,
    price_range: null,
    min_price: null,
    max_price: null,
    waterproof_grade: 'IP65',
    in_stock: true,
  },
]

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ user: null, role: null }),
}))

vi.mock('../../lib/supabaseClient', () => ({
  supabase: {
    from: (table) => {
      if (table === 'products') {
        return {
          select: vi.fn().mockResolvedValue({ data: mockProducts, error: null }),
        }
      }
      if (table === 'categories') {
        return {
          select: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }
      }
      return { select: vi.fn().mockResolvedValue({ data: [], error: null }) }
    },
  },
}))

describe('BrowsePage Target Budget Slider', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  const renderBrowsePage = () => {
    return render(
      <MemoryRouter initialEntries={['/browse']}>
        <Routes>
          <Route path="/browse" element={<BrowsePage />} />
        </Routes>
      </MemoryRouter>
    )
  }

  it('renders Target Budget slider with real-time value and Any Budget unconstrained state', async () => {
    renderBrowsePage()

    await waitFor(() => {
      expect(screen.getByText('Solar Streetlight 100W')).toBeDefined()
    })

    expect(screen.getByLabelText(/target budget slider in philippine pesos/i)).toBeDefined()
    expect(screen.getAllByText(/Any Budget/i).length).toBeGreaterThanOrEqual(1)
    // Unpriced units are visible in Any Budget mode
    expect(screen.getByText('Unpriced Consultative Streetlight 600W')).toBeDefined()
  })

  it('dynamically matches products whose price range encloses the budget slider value (1500)', async () => {
    renderBrowsePage()

    await waitFor(() => {
      expect(screen.getByText('Solar Streetlight 100W')).toBeDefined()
    })

    const slider = screen.getByLabelText(/target budget slider in philippine pesos/i)

    // Move slider to 1500. 1000 <= 1500 <= 2000 matches!
    fireEvent.change(slider, { target: { value: '1500' } })

    await waitFor(() => {
      expect(screen.getByText('Solar Streetlight 100W')).toBeDefined()
      expect(screen.queryByText('Aviation Aluminum Solar Road Light 300W')).toBeNull()
      expect(screen.queryByText('Heavy Industrial Floodlight 1000W')).toBeNull()
      // Specific budget excludes unpriced models
      expect(screen.queryByText('Unpriced Consultative Streetlight 600W')).toBeNull()
    })
  })

  it('correctly matches at lower boundary (1000) resolving the 1000 pesos slider bug', async () => {
    renderBrowsePage()

    await waitFor(() => {
      expect(screen.getByText('Solar Streetlight 100W')).toBeDefined()
    })

    const slider = screen.getByLabelText(/target budget slider in philippine pesos/i)

    // Set slider to 1000. Under min <= budget <= max, 1000 <= 1000 <= 2000 is true!
    fireEvent.change(slider, { target: { value: '1000' } })

    await waitFor(() => {
      expect(screen.getByText('Solar Streetlight 100W')).toBeDefined()
      expect(screen.queryByText('Aviation Aluminum Solar Road Light 300W')).toBeNull()
      expect(screen.queryByText('Heavy Industrial Floodlight 1000W')).toBeNull()
    })
  })

  it('dynamically switches active products when dragged to 3000', async () => {
    renderBrowsePage()

    await waitFor(() => {
      expect(screen.getByText('Solar Streetlight 100W')).toBeDefined()
    })

    const slider = screen.getByLabelText(/target budget slider in philippine pesos/i)

    // Drag to 3000. 2500 <= 3000 <= 3500 matches! 1000-2000 is excluded.
    fireEvent.change(slider, { target: { value: '3000' } })

    await waitFor(() => {
      expect(screen.queryByText('Solar Streetlight 100W')).toBeNull()
      expect(screen.getByText('Aviation Aluminum Solar Road Light 300W')).toBeDefined()
      expect(screen.queryByText('Heavy Industrial Floodlight 1000W')).toBeNull()
    })
  })

  it('clicking Reset or sliding to max returns to unconstrained Any Budget mode', async () => {
    renderBrowsePage()

    await waitFor(() => {
      expect(screen.getByText('Solar Streetlight 100W')).toBeDefined()
    })

    const slider = screen.getByLabelText(/target budget slider in philippine pesos/i)

    fireEvent.change(slider, { target: { value: '2500' } })

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /reset/i })).toBeDefined()
    })

    // Click Reset
    fireEvent.click(screen.getByRole('button', { name: /reset/i }))

    await waitFor(() => {
      expect(screen.getByText('Solar Streetlight 100W')).toBeDefined()
      expect(screen.getByText('Aviation Aluminum Solar Road Light 300W')).toBeDefined()
      expect(screen.getByText('Heavy Industrial Floodlight 1000W')).toBeDefined()
      expect(screen.getByText('Unpriced Consultative Streetlight 600W')).toBeDefined()
      expect(screen.queryByRole('button', { name: /reset/i })).toBeNull()
    })
  })
})
