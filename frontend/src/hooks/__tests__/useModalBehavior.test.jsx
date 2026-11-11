import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, fireEvent, renderHook } from '@testing-library/react'
import useModalBehavior from '../useModalBehavior'

describe('useModalBehavior', () => {
  beforeEach(() => {
    document.body.style.overflow = ''
  })

  afterEach(() => {
    document.body.style.overflow = ''
  })

  it('locks body scroll when opened and unlocks on unmount', () => {
    const { unmount } = renderHook(() =>
      useModalBehavior({ isOpen: true, onClose: vi.fn() })
    )
    expect(document.body.style.overflow).toBe('hidden')
    unmount()
    expect(document.body.style.overflow).toBe('')
  })

  it('supports nested modals with ref-counted scroll lock', () => {
    const modal1 = renderHook(() =>
      useModalBehavior({ isOpen: true, onClose: vi.fn() })
    )
    expect(document.body.style.overflow).toBe('hidden')

    const modal2 = renderHook(() =>
      useModalBehavior({ isOpen: true, onClose: vi.fn() })
    )
    expect(document.body.style.overflow).toBe('hidden')

    modal2.unmount()
    // Still locked because modal1 is open
    expect(document.body.style.overflow).toBe('hidden')

    modal1.unmount()
    // Now unlocked
    expect(document.body.style.overflow).toBe('')
  })

  it('calls onClose on Escape key', () => {
    const onClose = vi.fn()
    renderHook(() => useModalBehavior({ isOpen: true, onClose }))

    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('calls onClose when clicking outside on backdrop', () => {
    const onClose = vi.fn()

    function TestModal() {
      const { backdropProps } = useModalBehavior({ isOpen: true, onClose })
      return (
        <div data-testid="backdrop" {...backdropProps}>
          <div data-testid="modal-content">Content</div>
        </div>
      )
    }

    const { getByTestId } = render(<TestModal />)
    const backdrop = getByTestId('backdrop')
    const content = getByTestId('modal-content')

    // Click on backdrop
    fireEvent.mouseDown(backdrop)
    fireEvent.click(backdrop)
    expect(onClose).toHaveBeenCalledTimes(1)

    // Click on content should not close
    fireEvent.mouseDown(content)
    fireEvent.click(content)
    expect(onClose).toHaveBeenCalledTimes(1)

    // Drag from content to backdrop should not close
    fireEvent.mouseDown(content)
    fireEvent.click(backdrop)
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})

