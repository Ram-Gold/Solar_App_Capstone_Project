import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import ErrorBoundary from '../ErrorBoundary'

const ProblemChild = ({ shouldThrow }) => {
  if (shouldThrow) {
    throw new Error('Simulated runtime failure in component')
  }
  return <div>Component rendered cleanly</div>
}

describe('ErrorBoundary Component', () => {
  let consoleErrorSpy

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    cleanup()
    consoleErrorSpy.mockRestore()
  })

  it('renders child components cleanly when no error is thrown', () => {
    render(
      <ErrorBoundary>
        <ProblemChild shouldThrow={false} />
      </ErrorBoundary>
    )

    expect(screen.getByText('Component rendered cleanly')).toBeDefined()
  })

  it('catches runtime errors and renders the recovery fallback interface without emojis', () => {
    const { container } = render(
      <ErrorBoundary>
        <ProblemChild shouldThrow={true} />
      </ErrorBoundary>
    )

    expect(screen.getByRole('alert')).toBeDefined()
    expect(screen.getByText('Application View Error')).toBeDefined()
    expect(screen.getByText(/Simulated runtime failure in component/)).toBeDefined()
    expect(screen.getByRole('button', { name: /Retry View/i })).toBeDefined()
    expect(screen.getByRole('button', { name: /Reload Page/i })).toBeDefined()
    expect(screen.getByRole('button', { name: /Return Home/i })).toBeDefined()

    // Ensure zero emoji rule is upheld
    const textContent = container.textContent || ''
    const emojiRegex = /[\u{1F300}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u
    expect(emojiRegex.test(textContent)).toBe(false)
  })

  it('supports custom fallbackTitle and isSubtree mode for nested admin panels', () => {
    render(
      <ErrorBoundary isSubtree fallbackTitle="Admin Section Error">
        <ProblemChild shouldThrow={true} />
      </ErrorBoundary>
    )

    expect(screen.getByText('Admin Section Error')).toBeDefined()
    expect(screen.queryByRole('button', { name: /Return Home/i })).toBeNull()
  })

  it('invokes onReset handler when clicking Retry View', () => {
    const onReset = vi.fn()
    render(
      <ErrorBoundary onReset={onReset}>
        <ProblemChild shouldThrow={true} />
      </ErrorBoundary>
    )

    fireEvent.click(screen.getByRole('button', { name: /Retry View/i }))
    expect(onReset).toHaveBeenCalledTimes(1)
  })
})
