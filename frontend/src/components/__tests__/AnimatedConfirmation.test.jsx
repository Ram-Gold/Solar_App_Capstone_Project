import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import AnimatedConfirmation from '../ui/AnimatedConfirmation'

describe('AnimatedConfirmation Component', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
  })

  it('renders title, description, and referenceCode cleanly without emojis', () => {
    const onComplete = vi.fn()
    const { container } = render(
      <AnimatedConfirmation
        isOpen={true}
        title="Showroom Pass Confirmed"
        description="Your consultation appointment has been scheduled."
        referenceCode="JDS-INQ-2026-999888"
        onComplete={onComplete}
      />
    )

    expect(screen.getByText('Showroom Pass Confirmed')).toBeDefined()
    expect(screen.getByText('Your consultation appointment has been scheduled.')).toBeDefined()
    expect(screen.getByText('JDS-INQ-2026-999888')).toBeDefined()

    // Strict emoji prohibition check
    const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u
    expect(emojiRegex.test(container.textContent)).toBe(false)
  })

  it('renders SVG paths for the animated circle and checkmark', () => {
    const { container } = render(
      <AnimatedConfirmation
        isOpen={true}
        title="Action Successful"
        onComplete={vi.fn()}
      />
    )

    const svg = container.querySelector('svg')
    expect(svg).toBeDefined()
    const circle = container.querySelector('circle')
    expect(circle).toBeDefined()
  })

  it('automatically triggers onComplete after the duration without requiring button clicks', () => {
    const onComplete = vi.fn()
    render(
      <AnimatedConfirmation
        isOpen={true}
        title="Diagnostic Claim Submitted"
        duration={1500}
        onComplete={onComplete}
      />
    )

    expect(onComplete).not.toHaveBeenCalled()

    // Fast-forward by 1499ms
    act(() => {
      vi.advanceTimersByTime(1499)
    })
    expect(onComplete).not.toHaveBeenCalled()

    // Advance past 1500ms
    act(() => {
      vi.advanceTimersByTime(1)
    })
    expect(onComplete).toHaveBeenCalledTimes(1)
  })

  it('renders modal overlay when isModal is true', () => {
    const { container } = render(
      <AnimatedConfirmation
        isOpen={true}
        isModal={true}
        title="Product Added Successfully"
        onComplete={vi.fn()}
      />
    )

    expect(screen.getByText('Product Added Successfully')).toBeDefined()
    expect(container.querySelector('.fixed.inset-0')).toBeDefined()
  })
})

