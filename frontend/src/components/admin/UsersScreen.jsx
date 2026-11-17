import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../context/AuthContext'
import { deletePlatformUser, adminSetUserPassword } from '../../lib/customerService'
import { sanitizeText, sanitizePhone, isValidPhone, sanitizeEmail } from '../../lib/sanitize.js'
import { Button } from '../ui/button'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '../ui/table'
import { Trash2, X, Shield, Users as UsersIcon, CalendarDays, Mail, Phone, Briefcase, UserPlus, AlertTriangle, KeyRound, Eye, EyeOff, Search, RotateCcw } from 'lucide-react'
import useModalBehavior from '../../hooks/useModalBehavior'
import useIsMobile from '../../hooks/useIsMobile'
import InspectorDrawer from './InspectorDrawer'
import ViewModeToggle from './ViewModeToggle'

export default function UsersScreen() {
  const { user: currentUser, signOut } = useAuth()
  const navigate = useNavigate()
  const [staffList, setStaffList] = useState([])
  const [adminList, setAdminList] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '', role: 'staff' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState('ALL') // 'ALL' | 'staff' | 'admins'
  const [sortOrder, setSortOrder] = useState('name') // 'name' | 'newest' | 'oldest'
  const [viewMode, setViewMode] = useState('table') // 'table' | 'cards'

  const isMobile = useIsMobile()

  // User detail & deletion confirmation modal states
  const [selectedUser, setSelectedUser] = useState(null)
  const [deletingUser, setDeletingUser] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  // Admin password change modal states
  const [passwordUser, setPasswordUser] = useState(null)
  const [newPasswordVal, setNewPasswordVal] = useState('')
  const [confirmPasswordVal, setConfirmPasswordVal] = useState('')
  const [showPwdVal, setShowPwdVal] = useState(false)
  const [showConfirmPwdVal, setShowConfirmPwdVal] = useState(false)
  const [pwdUpdating, setPwdUpdating] = useState(false)
  const [pwdModalError, setPwdModalError] = useState('')

  const anyUserModalOpen = Boolean(deletingUser || passwordUser)

  useModalBehavior({
    isOpen: anyUserModalOpen,
    onClose: () => {
      if (passwordUser && !pwdUpdating) setPasswordUser(null)
      else if (deletingUser && !isDeleting) setDeletingUser(null)
    },
  })

  useEffect(() => {
    fetchAll()
  }, [])

  const fetchAll = async () => {
    setLoading(true)
    const [staffRes, adminRes] = await Promise.all([
      supabase.from('staff').select('*').order('full_name'),
      supabase.from('admins').select('*').order('full_name'),
    ])
    if (!staffRes.error) setStaffList(staffRes.data || [])
    if (!adminRes.error) setAdminList(adminRes.data || [])
    setLoading(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    const cleanName = sanitizeText(form.name, { maxLength: 100 })
    const cleanEmail = sanitizeEmail(form.email)
    const cleanPhone = form.phone ? sanitizePhone(form.phone) : null

    if (!cleanName) {
      setError('Full name is required.')
      return
    }
    if (!cleanEmail) {
      setError('A valid email address is required.')
      return
    }
    if (cleanPhone && !isValidPhone(cleanPhone)) {
      setError('Phone number must be a valid 11-digit Philippine mobile starting with 09 (e.g. 09171234567).')
      return
    }

    setSaving(true)

    // Create user via Supabase Auth signUp
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: cleanEmail,
      password: form.password,
    })

    if (authError) {
      setError(authError.message)
      setSaving(false)
      return
    }

    // Insert into the correct table
    if (authData.user) {
      const tableName = form.role === 'admin' ? 'admins' : 'staff'
      const { error: insertError } = await supabase.from(tableName).insert([{
        id: authData.user.id,
        full_name: cleanName,
        email: cleanEmail,
        phone: cleanPhone,
        position: form.role === 'admin' ? 'Administrator' : 'Staff Member',
      }])

      if (insertError) {
        setError(insertError.message)
      } else {
        setSuccess(`${form.role === 'admin' ? 'Administrator' : 'Staff member'} "${cleanName}" created successfully.`)
        setForm({ name: '', email: '', password: '', phone: '', role: 'staff' })
        setShowForm(false)
        fetchAll()
      }
    }
    setSaving(false)
  }

  const handleOpenDeleteConfirm = (userObj, table) => {
    setDeleteError('')
    setDeletingUser({ ...userObj, table })
  }

  const handleConfirmDelete = async () => {
    if (!deletingUser) return
    const { id, table, full_name } = deletingUser
    const label = table === 'admins' ? 'Administrator' : 'Staff member'

    if (table === 'admins' && adminList.length <= 1) {
      setDeleteError('Cannot delete the last remaining administrator account.')
      return
    }

    try {
      setIsDeleting(true)
      setDeleteError('')
      setError('')
      setSuccess('')

      await deletePlatformUser({ targetUserId: id, table })

      if (table === 'admins') {
        setAdminList(prev => prev.filter(u => u.id !== id))
      } else {
        setStaffList(prev => prev.filter(u => u.id !== id))
      }

      setDeletingUser(null)
      setSelectedUser(null)

      if (currentUser?.id === id) {
        await signOut()
        navigate('/')
        return
      }

      setSuccess(`${label} "${full_name || 'User'}" has been permanently deleted from the platform.`)
    } catch (err) {
      console.error('Failed to delete platform user:', err)
      setDeleteError(err.message || `Failed to delete ${label.toLowerCase()}.`)
    } finally {
      setIsDeleting(false)
    }
  }

  const handleOpenChangePassword = (userObj, table) => {
    setPwdModalError('')
    setNewPasswordVal('')
    setConfirmPasswordVal('')
    setShowPwdVal(false)
    setShowConfirmPwdVal(false)
    setPasswordUser({ ...userObj, table })
  }

  const handleSaveUserPassword = async (e) => {
    e.preventDefault()
    setPwdModalError('')

    if (!newPasswordVal || newPasswordVal.length < 8) {
      setPwdModalError('New password must be at least 8 characters long.')
      return
    }

    if (newPasswordVal !== confirmPasswordVal) {
      setPwdModalError('Passwords do not match.')
      return
    }

    try {
      setPwdUpdating(true)
      await adminSetUserPassword({
        targetUserId: passwordUser.id,
        newPassword: newPasswordVal,
      })

      const name = passwordUser.full_name || passwordUser.email || 'User'
      setSuccess(`Password for "${name}" updated successfully.`)
      setPasswordUser(null)
    } catch (err) {
      console.error('Failed to update user password:', err)
      setPwdModalError(err.message || 'Failed to update user password.')
    } finally {
      setPwdUpdating(false)
    }
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return '—'
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const allUsers = useMemo(() => {
    return [
      ...staffList.map((u) => ({ ...u, table: 'staff', roleLabel: 'Staff' })),
      ...adminList.map((u) => ({ ...u, table: 'admins', roleLabel: 'Administrator' })),
    ]
  }, [staffList, adminList])

  const filteredUsers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    const list = allUsers.filter((u) => {
      if (roleFilter !== 'ALL' && u.table !== roleFilter) return false
      if (!q) return true
      return (
        (u.full_name || '').toLowerCase().includes(q) ||
        (u.email || '').toLowerCase().includes(q) ||
        (u.phone || '').toLowerCase().includes(q) ||
        (u.position || '').toLowerCase().includes(q)
      )
    })

    if (sortOrder === 'newest') {
      return [...list].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
    }
    if (sortOrder === 'oldest') {
      return [...list].sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0))
    }
    return [...list].sort((a, b) => (a.full_name || '').localeCompare(b.full_name || ''))
  }, [allUsers, searchQuery, roleFilter, sortOrder])

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center py-20 text-jds-on-surface-variant font-inter">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-jds-primary border-t-transparent" />
          <p>Loading users...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-[1440px] mx-auto space-y-4">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <h1 className="text-lg sm:text-xl font-bold text-jds-on-surface">Users</h1>
          <span className="rounded-full bg-jds-surface-container px-2.5 py-0.5 text-xs font-bold text-jds-on-surface-variant tabular-nums">
            {allUsers.length}
          </span>
        </div>
        <Button
          onClick={() => { setError(''); setSuccess(''); setShowForm(!showForm) }}
          className="bg-jds-primary text-jds-on-primary hover:opacity-90 rounded-lg px-4 gap-1.5 h-9 text-xs font-bold"
        >
          <UserPlus className="h-3.5 w-3.5" />
          Create Account
        </Button>
      </div>

      {/* Filter & View Bar */}
      <div className="jds-panel p-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-jds-on-surface-variant/50" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search name, email, or phone..."
              className="jds-control w-full pl-9 pr-8"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-jds-on-surface-variant/60 hover:text-jds-on-surface cursor-pointer"
                aria-label="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <select
            aria-label="Filter by role"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="jds-control px-3 font-semibold cursor-pointer"
          >
            <option value="ALL">All Roles ({allUsers.length})</option>
            <option value="staff">Staff ({staffList.length})</option>
            <option value="admins">Administrators ({adminList.length})</option>
          </select>

          <select
            aria-label="Sort users"
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            className="jds-control px-3 font-semibold cursor-pointer"
          >
            <option value="name">Name (A–Z)</option>
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
          </select>

          {(searchQuery || roleFilter !== 'ALL' || sortOrder !== 'name') && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('')
                setRoleFilter('ALL')
                setSortOrder('name')
              }}
              className="jds-control px-3 font-semibold text-jds-on-surface-variant hover:text-jds-primary flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Reset</span>
            </button>
          )}

          <div className="ml-auto">
            <ViewModeToggle value={viewMode} onChange={setViewMode} />
          </div>
        </div>
      </div>

      {/* Create Account Form */}
      {showForm && (
        <div className="rounded-xl border border-jds-outline-variant/40 bg-jds-surface-container-lowest p-4 sm:p-8 space-y-6 shadow-lg animate-in slide-in-from-top-4 duration-300">
          <div className="flex items-center justify-between border-b border-jds-outline-variant/20 pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-jds-primary-container/20">
                <UserPlus className="h-5 w-5 text-jds-primary" />
              </div>
              <div>
                <h3 className="text-body-lg font-bold text-jds-on-surface">Create New Account</h3>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setShowForm(false)} className="h-10 w-10 text-jds-on-surface-variant hover:bg-jds-surface-container-low">
              <X className="h-5 w-5" />
            </Button>
          </div>

          {error && (
            <div className="rounded-lg bg-jds-error-container/10 border border-jds-error/20 p-4 text-body-sm text-jds-error">{error}</div>
          )}
          {success && (
            <div className="rounded-lg bg-jds-secondary-container/10 border border-jds-secondary/20 p-4 text-body-sm text-jds-secondary">{success}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[
                { key: 'name', label: 'Full Name', type: 'text', placeholder: 'e.g. Maria Clara', icon: UsersIcon, maxLength: 100 },
                { key: 'email', label: 'Email Address', type: 'email', placeholder: 'name@solarapp.com', icon: Mail, maxLength: 254 },
                { key: 'password', label: 'Initial Password', type: 'password', placeholder: '••••••••', icon: Shield, minLength: 6 },
                { key: 'phone', label: 'Phone Number (Optional)', type: 'tel', placeholder: '09171234567', icon: Phone, required: false, maxLength: 11, inputMode: 'numeric', pattern: '[0-9]*' },
              ].map(f => (
                <div key={f.key} className="space-y-1.5">
                  <div className="flex items-center justify-between text-label-sm font-bold text-jds-on-surface-variant/80 uppercase tracking-wider">
                    <label>{f.label}</label>
                    {f.key === 'phone' && form.phone && (
                      <span className={`text-[10px] font-mono lowercase ${form.phone.length === 11 && isValidPhone(form.phone) ? 'text-emerald-500 font-bold' : 'text-jds-on-surface-variant/60'
                        }`}>
                        {form.phone.length}/11 digits
                      </span>
                    )}
                  </div>
                  <input
                    type={f.type}
                    required={f.required !== false}
                    maxLength={f.maxLength}
                    minLength={f.minLength}
                    inputMode={f.inputMode}
                    pattern={f.pattern}
                    value={form[f.key]}
                    onChange={(e) => {
                      let val = e.target.value
                      if (f.key === 'phone') val = sanitizePhone(val)
                      else if (f.key === 'email') val = sanitizeEmail(val)
                      else if (f.key === 'name') val = sanitizeText(val, { maxLength: 100, trim: false })
                      setForm({ ...form, [f.key]: val })
                    }}
                    className="h-11 w-full rounded-lg border border-jds-outline-variant/30 bg-jds-surface-container-low/20 px-4 text-body-md outline-none focus:border-jds-secondary focus:bg-jds-surface-container-lowest transition-all"
                    placeholder={f.placeholder}
                  />
                </div>
              ))}
              <div className="space-y-1.5">
                <label className="text-label-sm font-bold text-jds-on-surface-variant/80 uppercase tracking-wider">Access Role</label>
                <select
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  className="h-11 w-full rounded-lg border border-jds-outline-variant/30 bg-jds-surface-container-low/20 px-4 text-body-md outline-none focus:border-jds-secondary focus:bg-jds-surface-container-lowest transition-all"
                >
                  <option value="staff">Staff Member</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>
            </div>
            <div className="flex gap-4 pt-4 border-t border-jds-outline-variant/20">
              <Button type="submit" disabled={saving} className="bg-jds-primary text-jds-on-primary px-8 h-11 rounded-lg font-bold shadow-sm hover:opacity-90">
                {saving ? 'Processing...' : 'Register Account'}
              </Button>
              <Button variant="outline" onClick={() => setShowForm(false)} className="border-jds-outline-variant text-jds-on-surface-variant px-8 h-11">
                Discard
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Inline alerts (outside form) */}
      {!showForm && error && (
        <div className="rounded-lg bg-jds-error-container/10 border border-jds-error/20 p-4 text-body-sm text-jds-error">{error}</div>
      )}
      {!showForm && success && (
        <div className="rounded-lg bg-jds-secondary-container/10 border border-jds-secondary/20 p-4 text-body-sm text-jds-secondary">{success}</div>
      )}

      {/* ──────────────── UNIFIED USERS VIEW (TABLE DEFAULT / CARDS) ──────────────── */}
      {viewMode === 'cards' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredUsers.length === 0 ? (
            <div className="col-span-full jds-panel py-16 text-center text-body-md text-jds-on-surface-variant/60">
              No users match your filters.
            </div>
          ) : (
            filteredUsers.map((u) => {
              const isAdminUser = u.table === 'admins'
              return (
                <div
                  key={`${u.table}-${u.id}`}
                  onClick={() => setSelectedUser(u)}
                  className="jds-card p-4 cursor-pointer flex flex-col justify-between gap-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold shrink-0 ${
                          isAdminUser
                            ? 'bg-jds-primary-container/25 text-jds-primary'
                            : 'bg-jds-secondary-container/25 text-jds-secondary'
                        }`}
                      >
                        {u.full_name?.charAt(0)?.toUpperCase() || (isAdminUser ? 'A' : 'S')}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-jds-on-surface truncate">{u.full_name}</div>
                        <div className="text-xs text-jds-on-surface-variant truncate">{u.email}</div>
                      </div>
                    </div>
                    <span
                      className={`shrink-0 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                        isAdminUser
                          ? 'bg-jds-primary-container/15 text-jds-primary'
                          : 'bg-jds-surface-container text-jds-on-surface-variant'
                      }`}
                    >
                      {isAdminUser ? <Shield className="h-3 w-3" /> : <Briefcase className="h-3 w-3" />}
                      {u.roleLabel}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-jds-outline-variant/60 text-xs text-jds-on-surface-variant">
                    <span className="truncate tabular-nums">{u.phone || '—'} &middot; {formatDate(u.created_at)}</span>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleOpenChangePassword(u, u.table)
                        }}
                        className="h-8 w-8 text-jds-primary hover:bg-jds-primary/10"
                        title={`Change ${u.full_name}'s password`}
                      >
                        <KeyRound className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleOpenDeleteConfirm(u, u.table)
                        }}
                        className="h-8 w-8 text-jds-error hover:bg-jds-error-container/10"
                        title={`Delete ${u.roleLabel.toLowerCase()} account`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      ) : (
        <div className="jds-panel overflow-hidden">
          {isMobile ? (
            <div className="divide-y divide-jds-outline-variant/60">
              {filteredUsers.length === 0 ? (
                <div className="py-12 px-4 text-center text-body-md text-jds-on-surface-variant/50">
                  No users match your filters.
                </div>
              ) : (
                filteredUsers.map((u) => {
                  const isAdminUser = u.table === 'admins'
                  return (
                    <div
                      key={`${u.table}-${u.id}`}
                      onClick={() => setSelectedUser(u)}
                      className="p-4 space-y-2.5 cursor-pointer hover:bg-jds-surface-container-low/20"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold shrink-0 ${
                              isAdminUser
                                ? 'bg-jds-primary-container/25 text-jds-primary'
                                : 'bg-jds-secondary-container/25 text-jds-secondary'
                            }`}
                          >
                            {u.full_name?.charAt(0)?.toUpperCase() || 'U'}
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-jds-on-surface truncate">{u.full_name}</div>
                            <div className="text-xs text-jds-on-surface-variant truncate">{u.email}</div>
                          </div>
                        </div>
                        <span
                          className={`shrink-0 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ${
                            isAdminUser
                              ? 'bg-jds-primary-container/15 text-jds-primary'
                              : 'bg-jds-surface-container text-jds-on-surface-variant'
                          }`}
                        >
                          {u.roleLabel}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2 pt-1 text-xs text-jds-on-surface-variant">
                        <span>{u.phone || '—'} &middot; {formatDate(u.created_at)}</span>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleOpenChangePassword(u, u.table)
                            }}
                            className="text-jds-primary hover:bg-jds-primary/10"
                            title={`Change ${u.full_name}'s password`}
                          >
                            <KeyRound className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleOpenDeleteConfirm(u, u.table)
                            }}
                            className="text-jds-error hover:bg-jds-error-container/10"
                            title="Delete account"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-16 text-center text-body-md text-jds-on-surface-variant/50">
                        No users match your filters.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredUsers.map((u) => {
                      const isAdminUser = u.table === 'admins'
                      return (
                        <TableRow
                          key={`${u.table}-${u.id}`}
                          onClick={() => setSelectedUser(u)}
                          className="cursor-pointer"
                        >
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div
                                className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold shrink-0 ${
                                  isAdminUser
                                    ? 'bg-jds-primary-container/25 text-jds-primary'
                                    : 'bg-jds-secondary-container/25 text-jds-secondary'
                                }`}
                              >
                                {u.full_name?.charAt(0)?.toUpperCase() || 'U'}
                              </div>
                              <span className="font-bold text-jds-on-surface">{u.full_name}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-jds-on-surface-variant font-medium">{u.email}</TableCell>
                          <TableCell className="text-jds-on-surface-variant font-medium tabular-nums">{u.phone || '—'}</TableCell>
                          <TableCell>
                            <span
                              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-label-sm font-bold ${
                                isAdminUser
                                  ? 'bg-jds-primary-container/15 text-jds-primary'
                                  : 'bg-jds-surface-container text-jds-on-surface-variant'
                              }`}
                            >
                              {isAdminUser ? <Shield className="h-3 w-3" /> : <Briefcase className="h-3 w-3" />}
                              {u.position || u.roleLabel}
                            </span>
                          </TableCell>
                          <TableCell className="text-jds-on-surface-variant text-label-sm tabular-nums">
                            <span className="inline-flex items-center gap-1.5">
                              <CalendarDays className="h-3 w-3" />
                              {formatDate(u.created_at)}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleOpenChangePassword(u, u.table)
                                }}
                                className="h-9 w-9 text-jds-primary hover:bg-jds-primary/10"
                                title={`Change ${u.full_name}'s password`}
                              >
                                <KeyRound className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleOpenDeleteConfirm(u, u.table)
                                }}
                                className="h-9 w-9 text-jds-error hover:bg-jds-error-container/10"
                                title="Delete account"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      )}

      {/* User Account Slide-Over Inspector Drawer */}
      <InspectorDrawer
        isOpen={Boolean(selectedUser)}
        onClose={() => setSelectedUser(null)}
        disableClose={Boolean(deletingUser || passwordUser)}
        subtitle={selectedUser?.table === 'admins' ? 'Administrator Account' : 'Staff Member Account'}
        title={selectedUser?.full_name}
        footer={
          selectedUser && (
            <div className="flex items-center justify-between w-full gap-2">
              <button
                type="button"
                onClick={() => handleOpenDeleteConfirm(selectedUser, selectedUser.table)}
                className="jds-btn-motion inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-lg border border-rose-500/30 text-rose-600 hover:bg-rose-500/10 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete User</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedUser(null)}
                className="jds-btn-motion px-4 py-2 text-xs font-semibold rounded-lg border border-jds-outline-variant/50 bg-jds-surface-container-lowest text-jds-on-surface hover:bg-jds-surface-container cursor-pointer"
              >
                Done
              </button>
            </div>
          )
        }
      >
        {selectedUser && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-xl border border-jds-outline-variant/30 bg-jds-surface-container-low p-4 text-xs">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-jds-on-surface-variant/70 block mb-0.5">
                  Email Address
                </span>
                <span className="font-semibold text-jds-on-surface break-all">{selectedUser.email}</span>
              </div>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-jds-on-surface-variant/70 block mb-0.5">
                  Phone Number
                </span>
                <span className="font-semibold text-jds-on-surface tabular-nums">{selectedUser.phone || '—'}</span>
              </div>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-jds-on-surface-variant/70 block mb-0.5">
                  Role / Position
                </span>
                <span className="font-semibold text-jds-on-surface">
                  {selectedUser.position || (selectedUser.table === 'admins' ? 'Administrator' : 'Staff Member')}
                </span>
              </div>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-jds-on-surface-variant/70 block mb-0.5">
                  Date Joined
                </span>
                <span className="font-semibold text-jds-on-surface tabular-nums">{formatDate(selectedUser.created_at)}</span>
              </div>
            </div>

            {/* Password Management */}
            <div className="rounded-xl border border-jds-outline-variant/30 bg-jds-surface-container-low/60 p-4 space-y-3">
              <div className="space-y-1">
                <h3 className="text-xs font-bold text-jds-on-surface flex items-center gap-1.5">
                  <KeyRound className="w-4 h-4 shrink-0 text-jds-primary" />
                  <span>Password Management</span>
                </h3>
                <p className="text-xs text-jds-on-surface-variant leading-relaxed">
                  Set a new password for this {selectedUser.table === 'admins' ? 'administrator' : 'staff'} account.
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleOpenChangePassword(selectedUser, selectedUser.table)}
                className="jds-btn-motion inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-jds-primary hover:bg-jds-primary/90 text-jds-on-primary text-xs font-bold cursor-pointer"
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>Set New Password</span>
              </button>
            </div>
          </div>
        )}
      </InspectorDrawer>

      {/* Delete Platform User Confirmation Modal */}
      {deletingUser && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isDeleting) setDeletingUser(null)
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md max-h-[92dvh] overflow-y-auto bg-jds-surface border border-jds-outline-variant/40 rounded-2xl shadow-2xl p-5 sm:p-6 space-y-4 animate-in zoom-in-95 duration-150"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-body-md font-bold text-jds-on-surface truncate">
                  Delete {deletingUser.table === 'admins' ? 'Administrator' : 'Staff'} Account?
                </h3>
                <p className="text-label-sm text-jds-on-surface-variant truncate">
                  {deletingUser.full_name} ({deletingUser.email})
                </p>
              </div>
            </div>

            <div className="text-xs text-rose-600 dark:text-rose-400 bg-rose-500/10 border border-rose-500/20 p-3.5 rounded-xl space-y-1.5 leading-relaxed">
              <p className="font-bold">This action is permanent and cannot be undone.</p>
              <p>
                Deleting this {deletingUser.table === 'admins' ? 'administrator' : 'staff member'} will permanently remove their profile record and login credentials from the database.
              </p>
            </div>

            {deleteError && (
              <div className="p-3 rounded-xl bg-jds-error-container/10 border border-jds-error/20 text-xs font-semibold text-jds-error">
                {deleteError}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-jds-outline-variant/20">
              <button
                type="button"
                onClick={() => {
                  setDeletingUser(null)
                  setDeleteError('')
                }}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl border border-jds-outline-variant/40 text-xs font-semibold text-jds-on-surface hover:bg-jds-surface-container transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting || (deletingUser.table === 'admins' && adminList.length <= 1)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700 transition-colors disabled:opacity-50 cursor-pointer"
              >
                {isDeleting ? (
                  <div className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                <span>Yes, Permanently Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {passwordUser && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget && !pwdUpdating) setPasswordUser(null)
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md max-h-[92dvh] overflow-y-auto bg-jds-surface border border-jds-outline-variant/40 rounded-2xl shadow-2xl animate-in zoom-in-95 duration-150"
          >
            <div className="p-5 border-b border-jds-outline-variant/30 flex items-center justify-between gap-3 bg-jds-surface-container-low/20">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-jds-primary/10 text-jds-primary flex items-center justify-center shrink-0">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-body-md font-bold text-jds-on-surface truncate">
                    Set User Password
                  </h3>
                  <p className="text-label-sm text-jds-on-surface-variant truncate">
                    {passwordUser.full_name || passwordUser.email} ({passwordUser.table === 'admins' ? 'Administrator' : 'Staff Member'})
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={pwdUpdating}
                onClick={() => setPasswordUser(null)}
                className="p-1.5 text-jds-on-surface-variant hover:text-jds-on-surface rounded-lg hover:bg-jds-surface-container transition-colors disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveUserPassword} className="p-5 space-y-4">
              {pwdModalError && (
                <div className="p-3 rounded-xl bg-jds-error-container/10 border border-jds-error/20 text-xs font-semibold text-jds-error">
                  {pwdModalError}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-label-sm font-bold text-jds-on-surface-variant/80 uppercase tracking-wider block">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showPwdVal ? 'text' : 'password'}
                    required
                    minLength={8}
                    value={newPasswordVal}
                    onChange={(e) => setNewPasswordVal(e.target.value)}
                    placeholder="Minimum 8 characters"
                    className="h-11 w-full rounded-lg border border-jds-outline-variant/30 bg-jds-surface-container-low/20 px-4 pr-11 text-body-md outline-none focus:border-jds-secondary focus:bg-jds-surface-container-lowest transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwdVal(!showPwdVal)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-jds-on-surface-variant/60 hover:text-jds-on-surface transition-colors cursor-pointer"
                    aria-label={showPwdVal ? 'Hide password' : 'Show password'}
                  >
                    {showPwdVal ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-label-sm font-bold text-jds-on-surface-variant/80 uppercase tracking-wider block">
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPwdVal ? 'text' : 'password'}
                    required
                    minLength={8}
                    value={confirmPasswordVal}
                    onChange={(e) => setConfirmPasswordVal(e.target.value)}
                    placeholder="Re-enter new password"
                    className="h-11 w-full rounded-lg border border-jds-outline-variant/30 bg-jds-surface-container-low/20 px-4 pr-11 text-body-md outline-none focus:border-jds-secondary focus:bg-jds-surface-container-lowest transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPwdVal(!showConfirmPwdVal)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-jds-on-surface-variant/60 hover:text-jds-on-surface transition-colors cursor-pointer"
                    aria-label={showConfirmPwdVal ? 'Hide password' : 'Show password'}
                  >
                    {showConfirmPwdVal ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <p className="text-[11px] text-jds-on-surface-variant leading-relaxed">
                The new password will immediately be updated in Supabase and take effect for their next sign in.
              </p>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-jds-outline-variant/20">
                <button
                  type="button"
                  disabled={pwdUpdating}
                  onClick={() => setPasswordUser(null)}
                  className="px-4 py-2 rounded-xl border border-jds-outline-variant/40 text-xs font-semibold text-jds-on-surface hover:bg-jds-surface-container transition-colors cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <Button
                  type="submit"
                  disabled={pwdUpdating}
                  className="bg-jds-primary text-jds-on-primary text-xs font-semibold px-5 h-9 rounded-xl hover:opacity-90 disabled:opacity-50 cursor-pointer shadow-xs"
                >
                  {pwdUpdating ? 'Updating...' : 'Save Password'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
