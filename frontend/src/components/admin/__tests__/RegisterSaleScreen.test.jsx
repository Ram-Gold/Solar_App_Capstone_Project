import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import RegisterSaleScreen from '../RegisterSaleScreen'
import { sanitizeText } from '../../../lib/sanitize'

// Mock supabase client
vi.mock('../../../lib/supabaseClient', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
      insert: vi.fn().mockResolvedValue({ data: [], error: null })
    })),
    rpc: vi.fn().mockResolvedValue({ data: null, error: null })
  }
}))

describe('RegisterSaleScreen - Customer Full Name input spaces handling', () => {
  it('preserves spaces during typing and does not collapse or delete trailing spaces', () => {
    render(<RegisterSaleScreen onNavigate={vi.fn()} />)
    const nameInput = screen.getByPlaceholderText('e.g. Maria Santos')

    // Simulate typing "Juan " (typing first name and pressing space)
    fireEvent.change(nameInput, { target: { value: 'Juan ' } })
    expect(nameInput.value).toBe('Juan ')

    // Simulate continuing to type "Juan Dela "
    fireEvent.change(nameInput, { target: { value: 'Juan Dela ' } })
    expect(nameInput.value).toBe('Juan Dela ')

    // Simulate typing the full name "Juan Dela Cruz"
    fireEvent.change(nameInput, { target: { value: 'Juan Dela Cruz' } })
    expect(nameInput.value).toBe('Juan Dela Cruz')

    // On blur, trims leading and trailing spaces if any
    fireEvent.change(nameInput, { target: { value: '  Juan Dela Cruz  ' } })
    fireEvent.blur(nameInput)
    expect(nameInput.value).toBe('Juan Dela Cruz')
  })

  it('sanitizeText unit test verifies trim:false preserves single trailing spaces while typing', () => {
    expect(sanitizeText('Maria ', { trim: false })).toBe('Maria ')
    expect(sanitizeText('Maria Clara ', { trim: false })).toBe('Maria Clara ')
    expect(sanitizeText('Maria  Clara', { trim: false })).toBe('Maria Clara')
    expect(sanitizeText('<script>alert(1)</script>Maria Santos', { trim: false })).toBe('Maria Santos')
  })
})

