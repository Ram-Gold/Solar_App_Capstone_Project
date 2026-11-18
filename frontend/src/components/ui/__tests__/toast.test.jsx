import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react'
import { ToastProvider, useToast } from '../toast'

function ToastTrigger() {
  const { showToast } = useToast()
  return (
    <div>
      <button type="button" onClick={() => showToast('Saved', 'Stock updated.', 'success')}>
        Trigger Success
      </button>
      <button type="button" onClick={() => showToast('Failed', 'Network error.', 'error')}>
        Trigger Error
      </button>
    </div>
  )
}

describe('Shared ToastProvider and ToastViewport', () => {
  afterEach(() => {
    cleanup()
    vi.useRealTimers()
  })

  it('renders semantic success and error toasts and supports manual dismiss', () => {
    render(
      <ToastProvider durationMs={5000}>
        <ToastTrigger />
      </ToastProvider>
    )

    fireEvent.click(screen.getByText('Trigger Success'))
    const statusToast = screen.getByRole('status')
    expect(statusToast.textContent).toContain('Saved')
    expect(statusToast.textContent).toContain('Stock updated.')
    expect(statusToast.className).toContain('border-l-emerald-500')

    fireEvent.click(screen.getByText('Trigger Error'))
    const alertToast = screen.getByRole('alert')
    expect(alertToast.textContent).toContain('Failed')
    expect(alertToast.className).toContain('border-l-rose-500')

    const dismissButtons = screen.getAllByRole('button', { name: /Dismiss notification/i })
    fireEvent.click(dismissButtons[0])
    expect(screen.queryByText('Saved')).toBeNull()
  })

  it('auto-dismisses toasts after durationMs', () => {
    vi.useFakeTimers()
    render(
      <ToastProvider durationMs={3000}>
        <ToastTrigger />
      </ToastProvider>
    )

    fireEvent.click(screen.getByText('Trigger Success'))
    expect(screen.getByText('Saved')).toBeTruthy()

    act(() => {
      vi.advanceTimersByTime(3100)
    })
    expect(screen.queryByText('Saved')).toBeNull()
  })
})
