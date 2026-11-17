import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import BrowsePage from '../BrowsePage'
import ProductInfoPage from '../ProductInfoPage'

const mockProducts = [
  {
    id: 1,
    name: 'Solar Streetlight 100W',
    type: 'Solar Streetlight',
    watt: 100,
    price_range: '1000-2000',
    waterproof_grade: 'IP65',
    in_stock: true,
    stock_quantity: 12,
  },
  {
    id: 2,
    name: 'Solar Streetlight 300W',
    type: 'Solar Streetlight',
    watt: 300,
    price_range: '2500-3500',
    waterproof_grade: 'IP66',
    in_stock: true,
    stock_quantity: 8,
  },
  {
    id: 3,
    name: 'Heavy Floodlight 500W',
    type: 'Solar Floodlight',
    watt: 500,
    price_range: '3500-5000',
    waterproof_grade: 'IP67',
    in_stock: true,
    stock_quantity: 5,
  },
]

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ user: null, role: null }),
}))

vi.mock('../../context/ChatContext', () => ({
  useChat: () => ({ sendMessage: vi.fn(), startProductChat: vi.fn() }),
}))

vi.mock('../../lib/supabaseClient', () => ({
  supabase: {
    from: (table) => {
      if (table === 'products') {
        return {
          select: vi.fn((cols) => {
            if (cols === '*') {
              return {
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: mockProducts[0], error: null }),
                }),
                then: (resolve) => Promise.resolve({ data: mockProducts, error: null }).then(resolve),
              }
            }
            return {
              eq: vi.fn().mockReturnValue({
                neq: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue({ data: mockProducts.slice(1), error: null }),
                }),
              }),
              then: (resolve) => Promise.resolve({ data: mockProducts, error: null }).then(resolve),
            }
          }),
        }
      }
      if (table === 'categories') {
        return {
          select: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }
      }
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
          then: (resolve) => Promise.resolve({ data: [], error: null }).then(resolve),
        }),
      }
    },
    storage: {
      from: () => ({
        getPublicUrl: (p) => ({ data: { publicUrl: p } }),
      }),
    },
  },
}))

describe('Mobile 2-Column Catalog & Item Usability', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  it('BrowsePage keeps 2-column grid on mobile with >= 44px filter and detail tap targets', async () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/browse']}>
        <Routes>
          <Route path="/browse" element={<BrowsePage />} />
        </Routes>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Solar Streetlight 100W')).toBeTruthy()
    })

    const grid = container.querySelector('[data-testid="browse-product-grid"]')
    expect(grid).toBeTruthy()
    expect(grid.className).toContain('grid-cols-2')

    const filterToggle = screen.getByRole('button', { name: /Show Filters/i })
    expect(filterToggle.className).toContain('min-h-[44px]')

    fireEvent.click(filterToggle)
    expect(screen.getByRole('button', { name: /Hide Filters/i })).toBeTruthy()

    const detailLabels = screen.getAllByText('View Details')
    expect(detailLabels[0].className).toContain('min-h-[44px]')
  })

  it('ProductInfoPage renders 2-column Similar Solutions grid, >= 44px CTAs, and opens QuoteModal', async () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/product/1']}>
        <Routes>
          <Route path="/product/:id" element={<ProductInfoPage />} />
        </Routes>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Similar Solutions')).toBeTruthy()
    }, { timeout: 3000 })

    const similarGrid = container.querySelector('[data-testid="similar-solutions-grid"]')
    expect(similarGrid).toBeTruthy()
    expect(similarGrid.className).toContain('grid-cols-2')

    const whereBtn = screen.getByRole('button', { name: /Where\?/i })
    expect(whereBtn.className).toContain('min-h-[44px]')

    const reserveBtn = screen.getByRole('button', { name: /Reserve for Store Pickup/i })
    const inquireBtn = screen.getByRole('button', { name: /Inquire Now/i })
    const askBtn = screen.getByRole('button', { name: /Ask Solar Assistant/i })
    expect(reserveBtn.className).toContain('min-h-[44px]')
    expect(inquireBtn.className).toContain('min-h-[44px]')
    expect(askBtn.className).toContain('min-h-[44px]')

    const similarDetailLinks = screen.getAllByRole('link', { name: /View Details/i })
    expect(similarDetailLinks.length).toBeGreaterThan(0)
    expect(similarDetailLinks[0].className).toContain('min-h-[44px]')

    fireEvent.click(inquireBtn)
    await waitFor(() => {
      expect(screen.getByText('Product Inquiry & Consultation')).toBeTruthy()
    })
  })
})
