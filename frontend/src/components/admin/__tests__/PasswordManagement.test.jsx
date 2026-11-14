import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import ProfileScreen from '../ProfileScreen'
import UsersScreen from '../UsersScreen'
import { changePlatformUserPassword, adminSetUserPassword } from '../../../lib/customerService'

// Mock useAuth
const mockUser = { id: 'admin-uuid-123', email: 'admin@solarapp.com' }
const mockSignOut = vi.fn().mockResolvedValue({})

vi.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({
    user: mockUser,
    role: 'admin',
    signOut: mockSignOut,
  }),
}))

// Mock supabaseClient
const mockRpc = vi.fn()
const mockUpdateUser = vi.fn().mockResolvedValue({ data: {}, error: null })
const mockSignInWithPassword = vi.fn().mockResolvedValue({ data: {}, error: null })

vi.mock('../../../lib/supabaseClient', () => ({
  supabase: {
    from: vi.fn((table) => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({
            data: {
              id: 'admin-uuid-123',
              full_name: 'Super Admin',
              email: 'admin@solarapp.com',
              phone: '09171234567',
              position: 'Platform Administrator',
            },
            error: null,
          }),
          maybeSingle: vi.fn().mockResolvedValue({
            data: { id: 'admin-uuid-123' },
            error: null,
          }),
        })),
        order: vi.fn().mockImplementation(() => {
          if (table === 'admins') {
            return Promise.resolve({
              data: [
                {
                  id: 'admin-uuid-123',
                  full_name: 'Admin Boss',
                  email: 'admin@solarapp.com',
                  phone: '09171234567',
                  position: 'Platform Administrator',
                  created_at: '2026-05-12T07:30:40.092Z',
                },
              ],
              error: null,
            })
          }
          return Promise.resolve({
            data: [
              {
                id: 'user-uuid-456',
                full_name: 'Juan Staff',
                email: 'staff@solarapp.com',
                phone: '09181234567',
                position: 'Solar Technician',
                created_at: '2026-05-12T07:30:42.092Z',
              },
            ],
            error: null,
          })
        }),
      })),
      update: vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({ error: null }),
      })),
      delete: vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({ error: null }),
      })),
    })),
    rpc: (...args) => mockRpc(...args),
    auth: {
      updateUser: (...args) => mockUpdateUser(...args),
      signInWithPassword: (...args) => mockSignInWithPassword(...args),
    },
  },
  createIsolatedAuthClient: () => ({
    auth: {
      signInWithPassword: (...args) => mockSignInWithPassword(...args),
    },
  }),
}))

describe('Password Management - ProfileScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  afterEach(() => {
    cleanup()
  })

  it('renders Security & Password card with password inputs in ProfileScreen', async () => {
    render(
      <MemoryRouter>
        <ProfileScreen />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Security & Password')).toBeTruthy()
    })

    expect(screen.getByPlaceholderText('Enter current password')).toBeTruthy()
    expect(screen.getByPlaceholderText('Minimum 8 characters')).toBeTruthy()
    expect(screen.getByPlaceholderText('Re-enter new password')).toBeTruthy()
    expect(screen.getByRole('button', { name: /change password/i })).toBeTruthy()
  })

  it('validates password length and matching confirmation in ProfileScreen', async () => {
    render(
      <MemoryRouter>
        <ProfileScreen />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Security & Password')).toBeTruthy()
    })

    const currentInput = screen.getByPlaceholderText('Enter current password')
    const newInput = screen.getByPlaceholderText('Minimum 8 characters')
    const confirmInput = screen.getByPlaceholderText('Re-enter new password')
    const submitBtn = screen.getByRole('button', { name: /change password/i })

    // Test mismatched passwords
    fireEvent.change(currentInput, { target: { value: 'OldPassword123!' } })
    fireEvent.change(newInput, { target: { value: 'NewPassword123!' } })
    fireEvent.change(confirmInput, { target: { value: 'DifferentPass123!' } })
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(screen.getByText('Passwords do not match.')).toBeTruthy()
    })

    // Test identical old and new password
    fireEvent.change(newInput, { target: { value: 'OldPassword123!' } })
    fireEvent.change(confirmInput, { target: { value: 'OldPassword123!' } })
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(screen.getByText('New password cannot be identical to your current password.')).toBeTruthy()
    })
  })

  it('successfully updates password and shows confirmation', async () => {
    mockRpc.mockResolvedValue({
      data: { success: true, message: 'Password changed successfully.' },
      error: null,
    })

    render(
      <MemoryRouter>
        <ProfileScreen />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Security & Password')).toBeTruthy()
    })

    const currentInput = screen.getByPlaceholderText('Enter current password')
    const newInput = screen.getByPlaceholderText('Minimum 8 characters')
    const confirmInput = screen.getByPlaceholderText('Re-enter new password')
    const submitBtn = screen.getByRole('button', { name: /change password/i })

    fireEvent.change(currentInput, { target: { value: 'OldPassword123!' } })
    fireEvent.change(newInput, { target: { value: 'BrandNewSecurePass123!' } })
    fireEvent.change(confirmInput, { target: { value: 'BrandNewSecurePass123!' } })
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(screen.getByText('Password changed successfully.')).toBeTruthy()
    })

    expect(mockRpc).toHaveBeenCalledWith('change_own_password', {
      p_current_password: 'OldPassword123!',
      p_new_password: 'BrandNewSecurePass123!',
    })
  })
})

describe('Password Management - UsersScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  afterEach(() => {
    cleanup()
  })

  it('renders Change Password action button in user table and opens modal', async () => {
    render(
      <MemoryRouter>
        <UsersScreen />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Juan Staff')).toBeTruthy()
    })

    const changePwdBtn = screen.getByTitle("Change Juan Staff's password")
    expect(changePwdBtn).toBeTruthy()

    fireEvent.click(changePwdBtn)

    await waitFor(() => {
      expect(screen.getByText('Set User Password')).toBeTruthy()
    })

    expect(screen.getAllByText(/Juan Staff/).length).toBeGreaterThan(0)
    expect(screen.getByPlaceholderText('Minimum 8 characters')).toBeTruthy()
    expect(screen.getByPlaceholderText('Re-enter new password')).toBeTruthy()
  })

  it('allows administrator to set new password for staff and submits to Supabase', async () => {
    mockRpc.mockResolvedValue({
      data: { success: true, message: 'User password updated successfully.' },
      error: null,
    })

    render(
      <MemoryRouter>
        <UsersScreen />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Juan Staff')).toBeTruthy()
    })

    fireEvent.click(screen.getByTitle("Change Juan Staff's password"))

    await waitFor(() => {
      expect(screen.getByText('Set User Password')).toBeTruthy()
    })

    const newInput = screen.getByPlaceholderText('Minimum 8 characters')
    const confirmInput = screen.getByPlaceholderText('Re-enter new password')
    const saveBtn = screen.getByRole('button', { name: /save password/i })

    fireEvent.change(newInput, { target: { value: 'StaffNewPass1234!' } })
    fireEvent.change(confirmInput, { target: { value: 'StaffNewPass1234!' } })
    fireEvent.click(saveBtn)

    await waitFor(() => {
      expect(mockRpc).toHaveBeenCalledWith('admin_set_user_password', {
        p_target_user_id: 'user-uuid-456',
        p_new_password: 'StaffNewPass1234!',
      })
    })

    await waitFor(() => {
      expect(screen.getByText('Password for "Juan Staff" updated successfully.')).toBeTruthy()
    })
  })
})

describe('Password Management - customerService helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('changePlatformUserPassword validates requirements and handles error from database', async () => {
    await expect(
      changePlatformUserPassword({ currentPassword: '', newPassword: 'abc' })
    ).rejects.toThrow('Current password is required.')

    await expect(
      changePlatformUserPassword({ currentPassword: 'old', newPassword: 'short' })
    ).rejects.toThrow('New password must be at least 8 characters long.')

    await expect(
      changePlatformUserPassword({ currentPassword: 'samepassword123', newPassword: 'samepassword123' })
    ).rejects.toThrow('New password cannot be identical to your current password.')

    mockRpc.mockResolvedValue({
      data: { success: false, error: 'Current password does not match.' },
      error: null,
    })

    await expect(
      changePlatformUserPassword({ currentPassword: 'WrongPassword!', newPassword: 'NewPassword123!' })
    ).rejects.toThrow('Current password does not match.')
  })

  it('adminSetUserPassword validates requirements and calls RPC', async () => {
    await expect(
      adminSetUserPassword({ targetUserId: '', newPassword: 'NewPassword123!' })
    ).rejects.toThrow('Target user ID is required.')

    await expect(
      adminSetUserPassword({ targetUserId: 'uuid-1', newPassword: 'short' })
    ).rejects.toThrow('New password must be at least 8 characters long.')

    mockRpc.mockResolvedValueOnce({
      data: { success: true, message: 'User password updated successfully.' },
      error: null,
    })

    const res = await adminSetUserPassword({
      targetUserId: 'uuid-1',
      newPassword: 'ValidNewPassword123!',
    })

    expect(res.success).toBe(true)
    expect(mockRpc).toHaveBeenCalledWith('admin_set_user_password', {
      p_target_user_id: 'uuid-1',
      p_new_password: 'ValidNewPassword123!',
    })
  })
})
