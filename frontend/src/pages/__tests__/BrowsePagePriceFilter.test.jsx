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

describe('BrowsePage Price Range Filter', () => {
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

  it('renders MIN, MAX inputs and APPLY button according to reference specification', async () => {
    renderBrowsePage()

    await waitFor(() => {
      expect(screen.getByText('Solar Streetlight 100W')).toBeDefined()
    })

    expect(screen.getByPlaceholderText('₱ MIN')).toBeDefined()
    expect(screen.getByPlaceholderText('₱ MAX')).toBeDefined()
    expect(screen.getByRole('button', { name: /apply/i })).toBeDefined()
  })

  it('correctly matches products when MAX is set to 1000 (resolving the upper-bound exclusion bug)', async () => {
    renderBrowsePage()

    await waitFor(() => {
      expect(screen.getByText('Solar Streetlight 100W')).toBeDefined()
    })

    const maxInput = screen.getByPlaceholderText('₱ MAX')
    const applyBtn = screen.getByRole('button', { name: /apply/i })

    // Set MAX = 1000. Products with starting price <= 1000 (e.g. 1000-2000) are affordable.
    fireEvent.change(maxInput, { target: { value: '1000' } })
    fireEvent.click(applyBtn)

    await waitFor(() => {
      expect(screen.getByText('Solar Streetlight 100W')).toBeDefined()
      expect(screen.queryByText('Aviation Aluminum Solar Road Light 300W')).toBeNull()
      expect(screen.queryByText('Heavy Industrial Floodlight 1000W')).toBeNull()
    })
  })

  it('excludes products when MIN is set to 1500 if their starting price is lower (e.g. 1000-2000)', async () => {
    renderBrowsePage()

    await waitFor(() => {
      expect(screen.getByText('Solar Streetlight 100W')).toBeDefined()
    })

    const minInput = screen.getByPlaceholderText('₱ MIN')
    const applyBtn = screen.getByRole('button', { name: /apply/i })

    // Set MIN = 1500. Solar Streetlight 100W (1000-2000) starts at 1000, so it must be excluded.
    fireEvent.change(minInput, { target: { value: '1500' } })
    fireEvent.click(applyBtn)

    await waitFor(() => {
      expect(screen.queryByText('Solar Streetlight 100W')).toBeNull()
      expect(screen.getByText('Aviation Aluminum Solar Road Light 300W')).toBeDefined()
      expect(screen.getByText('Heavy Industrial Floodlight 1000W')).toBeDefined()
    })
  })

  it('filters by range (2100 - 3400) and displays the Reset button', async () => {
    renderBrowsePage()

    await waitFor(() => {
      expect(screen.getByText('Solar Streetlight 100W')).toBeDefined()
    })

    const minInput = screen.getByPlaceholderText('₱ MIN')
    const maxInput = screen.getByPlaceholderText('₱ MAX')
    const applyBtn = screen.getByRole('button', { name: /apply/i })

    fireEvent.change(minInput, { target: { value: '2100' } })
    fireEvent.change(maxInput, { target: { value: '3400' } })
    fireEvent.click(applyBtn)

    await waitFor(() => {
      expect(screen.queryByText('Solar Streetlight 100W')).toBeNull()
      expect(screen.getByText('Aviation Aluminum Solar Road Light 300W')).toBeDefined()
      expect(screen.queryByText('Heavy Industrial Floodlight 1000W')).toBeNull()
      expect(screen.getByRole('button', { name: /reset/i })).toBeDefined()
    })

    // Click Reset
    fireEvent.click(screen.getByRole('button', { name: /reset/i }))

    await waitFor(() => {
      expect(screen.getByText('Solar Streetlight 100W')).toBeDefined()
      expect(screen.getByText('Aviation Aluminum Solar Road Light 300W')).toBeDefined()
      expect(screen.getByText('Heavy Industrial Floodlight 1000W')).toBeDefined()
      expect(screen.queryByRole('button', { name: /reset/i })).toBeNull()
    })
  })

  it('automatically swaps MIN and MAX if user enters MIN > MAX', async () => {
    renderBrowsePage()

    await waitFor(() => {
      expect(screen.getByText('Solar Streetlight 100W')).toBeDefined()
    })

    const minInput = screen.getByPlaceholderText('₱ MIN')
    const maxInput = screen.getByPlaceholderText('₱ MAX')
    const applyBtn = screen.getByRole('button', { name: /apply/i })

    // User accidentally inverted them
    fireEvent.change(minInput, { target: { value: '5000' } })
    fireEvent.change(maxInput, { target: { value: '3500' } })
    fireEvent.click(applyBtn)

    await waitFor(() => {
      expect(screen.getByText('Heavy Industrial Floodlight 1000W')).toBeDefined()
      expect(screen.queryByText('Solar Streetlight 100W')).toBeNull()
      expect(minInput.value).toBe('3500')
      expect(maxInput.value).toBe('5000')
    })
  })
})
