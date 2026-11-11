import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import React from 'react'
import { MemoryRouter } from 'react-router-dom'
import Navbar from '../Navbar'

const { mockAuthReturn } = vi.hoisted(() => ({
  mockAuthReturn: {
    current: {
      user: null,
      role: null,
      signOut: vi.fn(),
    },
  },
}))

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => mockAuthReturn.current,
}))

describe('Navbar Inquire vs Sign Out button behavior', () => {
  const mockSignOut = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  it('renders Login and Inquire buttons when signed out', () => {
    mockAuthReturn.current = {
      user: null,
      role: null,
      signOut: mockSignOut,
    }

    render(
      <MemoryRouter initialEntries={['/']}>
        <Navbar />
      </MemoryRouter>
    )

    const inquireButtons = screen.getAllByRole('button', { name: /^Inquire$/i })
    expect(inquireButtons.length).toBeGreaterThan(0)

    const loginButtons = screen.getAllByRole('button', { name: /^Login$/i })
    expect(loginButtons.length).toBeGreaterThan(0)

    expect(screen.queryByRole('button', { name: /^Sign Out$/i })).toBeNull()
  })

  it('replaces Inquire with Sign Out when signed in as customer', () => {
    mockAuthReturn.current = {
      user: { id: 'cust-1' },
      role: 'customer',
      signOut: mockSignOut,
    }

    render(
      <MemoryRouter initialEntries={['/']}>
        <Navbar />
      </MemoryRouter>
    )

    expect(screen.queryByRole('button', { name: /^Inquire$/i })).toBeNull()

    const signOutButtons = screen.getAllByRole('button', { name: /^Sign Out$/i })
    expect(signOutButtons.length).toBeGreaterThan(0)

    expect(screen.queryByRole('button', { name: /^Login$/i })).toBeNull()
  })

  it('replaces Inquire with Sign Out when signed in as staff', () => {
    mockAuthReturn.current = {
      user: { id: 'staff-1' },
      role: 'staff',
      signOut: mockSignOut,
    }

    render(
      <MemoryRouter initialEntries={['/']}>
        <Navbar />
      </MemoryRouter>
    )

    expect(screen.queryByRole('button', { name: /^Inquire$/i })).toBeNull()
    const signOutButtons = screen.getAllByRole('button', { name: /^Sign Out$/i })
    expect(signOutButtons.length).toBeGreaterThan(0)
  })

  it('replaces Inquire with Sign Out when signed in as admin', () => {
    mockAuthReturn.current = {
      user: { id: 'admin-1' },
      role: 'admin',
      signOut: mockSignOut,
    }

    render(
      <MemoryRouter initialEntries={['/']}>
        <Navbar />
      </MemoryRouter>
    )

    expect(screen.queryByRole('button', { name: /^Inquire$/i })).toBeNull()
    const signOutButtons = screen.getAllByRole('button', { name: /^Sign Out$/i })
    expect(signOutButtons.length).toBeGreaterThan(0)
  })
})
