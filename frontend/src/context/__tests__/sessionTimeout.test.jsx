import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, cleanup, act } from '@testing-library/react'
import { AuthProvider, useAuth } from '../AuthContext'

// Mock Supabase client
vi.mock('../../lib/supabaseClient', () => {
  const mockSubscription = { unsubscribe: vi.fn() }
  return {
    supabase: {
      auth: {
        getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
        onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: mockSubscription } }),
        signOut: vi.fn().mockResolvedValue({ error: null }),
        signInWithPassword: vi.fn().mockResolvedValue({ data: { user: null }, error: null })
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null })
      })
    }
  }
})

function TestConsumer() {
  const { user, role } = useAuth()
  return (
    <div>
      <span data-testid="user-id">{user?.id || 'none'}</span>
      <span data-testid="user-role">{role || 'none'}</span>
    </div>
  )
}

describe('Inactivity Session Timeout Watchdog', () => {
  let originalLocation

  beforeEach(() => {
    vi.useFakeTimers()
    localStorage.clear()

    originalLocation = window.location
    delete window.location
    window.location = {
      href: 'http://localhost:5173/portal',
      pathname: '/portal',
      search: '',
      assign: vi.fn(),
      replace: vi.fn()
    }
  })

  afterEach(() => {
    cleanup()
    vi.clearAllTimers()
    vi.useRealTimers()
    window.location = originalLocation
  })

  it('does not enforce timeout for unauthenticated visitors', async () => {
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    )

    // Flush promises
    await act(async () => {
      await Promise.resolve()
    })

    // Advance 30 minutes in time
    await act(async () => {
      vi.advanceTimersByTime(30 * 60 * 1000)
    })

    // Unauthenticated user should not be redirected
    expect(window.location.href).toBe('http://localhost:5173/portal')
    expect(localStorage.getItem('jd_last_activity_timestamp')).toBeNull()
  })

  it('tracks user interaction with 10-second throttling when authenticated', async () => {
    localStorage.setItem('jd_customer_token', 'token-abc')
    localStorage.setItem('jd_customer_email', 'solar.user@jdsolar.ph')

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    )

    // Flush session init promise
    await act(async () => {
      await Promise.resolve()
    })

    const initialStamp = Number(localStorage.getItem('jd_last_activity_timestamp'))
    expect(initialStamp).toBeGreaterThan(0)

    // Fire mousemove after 2 seconds (within 10s throttle window)
    await act(async () => {
      vi.advanceTimersByTime(2000)
      window.dispatchEvent(new Event('mousemove'))
    })

    // Must remain the initial timestamp
    expect(Number(localStorage.getItem('jd_last_activity_timestamp'))).toBe(initialStamp)

    // Advance 11 seconds (> 10s throttle window) and fire keydown
    await act(async () => {
      vi.advanceTimersByTime(11000)
      window.dispatchEvent(new Event('keydown'))
    })

    const updatedStamp = Number(localStorage.getItem('jd_last_activity_timestamp'))
    expect(updatedStamp).toBeGreaterThan(initialStamp)
  })

  it('synchronizes activity across browser tabs via storage events', async () => {
    localStorage.setItem('jd_customer_token', 'token-abc')
    localStorage.setItem('jd_customer_email', 'solar.user@jdsolar.ph')

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    )

    await act(async () => {
      await Promise.resolve()
    })

    // Advance 14 minutes (1 min before timeout)
    await act(async () => {
      vi.advanceTimersByTime(14 * 60 * 1000)
    })

    // Simulate activity from another browser tab updating the timestamp
    const tabActivityTime = Date.now()
    await act(async () => {
      localStorage.setItem('jd_last_activity_timestamp', tabActivityTime.toString())
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: 'jd_last_activity_timestamp',
          newValue: tabActivityTime.toString()
        })
      )
    })

    // Advance another 2 minutes (16 minutes total, but only 2 minutes since Tab 2 activity)
    await act(async () => {
      vi.advanceTimersByTime(2 * 60 * 1000)
    })

    // Session remains active
    expect(window.location.href).toBe('http://localhost:5173/portal')
    expect(localStorage.getItem('jd_customer_token')).toBe('token-abc')
  })

  it('terminates session, purges tokens, preserves email, and redirects to login when 15 minutes elapse', async () => {
    localStorage.setItem('jd_customer_token', 'token-xyz-999')
    localStorage.setItem('jd_customer_email', 'customer.target@jdsolar.ph')

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    )

    await act(async () => {
      await Promise.resolve()
    })

    expect(localStorage.getItem('jd_customer_token')).toBe('token-xyz-999')

    // Advance timer past 15 minutes of inactivity
    await act(async () => {
      vi.advanceTimersByTime(15 * 60 * 1000 + 5000)
    })

    // Verification
    expect(localStorage.getItem('jd_customer_token')).toBeNull()
    expect(localStorage.getItem('jd_last_activity_timestamp')).toBeNull()
    expect(localStorage.getItem('jd_customer_email')).toBe('customer.target@jdsolar.ph')
    expect(localStorage.getItem('jd_remembered_email')).toBe('customer.target@jdsolar.ph')
    expect(window.location.href).toBe('/login?reason=timeout')
  })

  it('triggers immediate timeout when device wakes or tab becomes visible after 15+ minutes', async () => {
    localStorage.setItem('jd_customer_token', 'token-sleep-check')
    localStorage.setItem('jd_customer_email', 'sleep.user@jdsolar.ph')

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    )

    await act(async () => {
      await Promise.resolve()
    })

    // Set last activity timestamp to 20 minutes in the past
    const twentyMinsAgo = Date.now() - 20 * 60 * 1000
    localStorage.setItem('jd_last_activity_timestamp', twentyMinsAgo.toString())

    Object.defineProperty(document, 'visibilityState', {
      value: 'visible',
      configurable: true
    })

    // Dispatch visibility change
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'))
    })

    expect(localStorage.getItem('jd_customer_token')).toBeNull()
    expect(localStorage.getItem('jd_customer_email')).toBe('sleep.user@jdsolar.ph')
    expect(window.location.href).toBe('/login?reason=timeout')
  })
})
