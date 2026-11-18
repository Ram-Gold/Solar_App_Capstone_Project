import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import SchedulePicker from '../SchedulePicker'

describe('SchedulePicker', () => {
  afterEach(() => {
    cleanup()
  })

  it('displays formatted summary on trigger and opens Mon-Sat calendar without Sunday column', () => {
    render(
      <SchedulePicker
        date="2026-11-19"
        time="10:00"
        minDate="2026-11-19"
        onDateChange={vi.fn()}
        onTimeChange={vi.fn()}
      />
    )

    const trigger = screen.getByRole('button', { name: /Nov 19, 2026 · 10:00 AM/i })
    fireEvent.click(trigger)

    // 6-column Mon-Sat headers only, no Sunday column
    for (const day of ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']) {
      expect(screen.getByText(day)).toBeDefined()
    }
    expect(screen.queryByText('Su')).toBeNull()

    // Nov 22, 2026 is a Sunday -> must not be rendered as a selectable button
    expect(screen.queryByRole('button', { name: '22' })).toBeNull()
    // Nov 21, 2026 is a Saturday -> selectable
    expect(screen.getByRole('button', { name: '21' })).toBeDefined()
  })

  it('renders Hour (8 AM - 5 PM) and 5-Min columns, clamps 5 PM to :30, and closes on Done', () => {
    const onDateChange = vi.fn()
    const onTimeChange = vi.fn()

    const { rerender } = render(
      <SchedulePicker
        date="2026-11-19"
        time="10:45"
        minDate="2026-11-19"
        onDateChange={onDateChange}
        onTimeChange={onTimeChange}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /Nov 19, 2026 · 10:45 AM/i }))

    // Out-of-hours are absent
    expect(screen.queryByRole('button', { name: '11 PM' })).toBeNull()
    expect(screen.queryByRole('button', { name: '6 PM' })).toBeNull()
    expect(screen.queryByRole('button', { name: '7 AM' })).toBeNull()

    // Switch hour to 5 PM -> clamps 10:45 to 17:30
    fireEvent.click(screen.getByRole('button', { name: '5 PM' }))
    expect(onTimeChange).toHaveBeenCalledWith('17:30')

    // Re-render with 17:30 to verify :35 and :45 are omitted for 5 PM
    rerender(
      <SchedulePicker
        date="2026-11-19"
        time="17:30"
        minDate="2026-11-19"
        onDateChange={onDateChange}
        onTimeChange={onTimeChange}
      />
    )
    expect(screen.getByRole('button', { name: ':30' })).toBeDefined()
    expect(screen.queryByRole('button', { name: ':35' })).toBeNull()
    expect(screen.queryByRole('button', { name: ':45' })).toBeNull()

    // Done collapses the panel
    fireEvent.click(screen.getByRole('button', { name: 'Done' }))
    expect(screen.queryByText('Mo')).toBeNull()
  })
})
