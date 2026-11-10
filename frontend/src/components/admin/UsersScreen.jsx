import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../context/AuthContext'
import { deletePlatformUser } from '../../lib/customerService'
import { sanitizeText, sanitizePhone, isValidPhone, sanitizeEmail } from '../../lib/sanitize.js'
import { Button } from '../ui/button'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '../ui/table'
import { Trash2, Plus, X, Shield, Users as UsersIcon, CalendarDays, Mail, Phone, Briefcase, UserPlus, AlertTriangle } from 'lucide-react'

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

  // User detail & deletion confirmation modal states
  const [selectedUser, setSelectedUser] = useState(null)
  const [deletingUser, setDeletingUser] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

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

  const formatDate = (dateStr) => {
    if (!dateStr) return '—'
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center py-20 text-jds-on-surface-variant font-inter">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-jds-primary border-t-transparent" />
          <p>Loading user management...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-[1200px] mx-auto space-y-10">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-headline-md font-bold text-jds-on-surface">User Management</h1>
        </div>
        <Button
          onClick={() => { setError(''); setSuccess(''); setShowForm(!showForm) }}
          className="bg-jds-primary text-jds-on-primary hover:opacity-90 rounded-lg px-6 gap-2 h-11 shadow-sm"
        >
          <UserPlus className="h-4 w-4" />
          Create Account
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="rounded-xl border border-jds-outline-variant/30 bg-jds-surface-container-lowest p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <p className="text-label-sm font-bold uppercase tracking-wider text-jds-on-surface-variant/70">Staff Members</p>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-jds-secondary-container/20">
              <UsersIcon className="h-5 w-5 text-jds-secondary" />
            </div>
          </div>
          <p className="text-headline-md font-bold text-jds-on-surface">{staffList.length}</p>
        </div>
        <div className="rounded-xl border border-jds-outline-variant/30 bg-jds-surface-container-lowest p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <p className="text-label-sm font-bold uppercase tracking-wider text-jds-on-surface-variant/70">Administrators</p>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-jds-primary-container/20">
              <Shield className="h-5 w-5 text-jds-primary" />
            </div>
          </div>
          <p className="text-headline-md font-bold text-jds-on-surface">{adminList.length}</p>
        </div>
      </div>

      {/* Create Account Form */}
      {showForm && (
        <div className="rounded-xl border border-jds-outline-variant/40 bg-jds-surface-container-lowest p-8 space-y-6 shadow-lg animate-in slide-in-from-top-4 duration-300">
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
                      else if (f.key === 'name') val = sanitizeText(val, { maxLength: 100 })
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

      {/* ──────────────── STAFF TABLE ──────────────── */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-jds-secondary-container/20">
            <UsersIcon className="h-4 w-4 text-jds-secondary" />
          </div>
          <div>
            <h2 className="text-body-lg font-bold text-jds-on-surface">Staff Members</h2>
          </div>
        </div>

        <div className="rounded-xl border border-jds-outline-variant/30 bg-jds-surface-container-lowest overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-jds-surface-container-low/10">
                <TableRow>
                  <TableHead className="text-jds-on-surface-variant font-bold">Name</TableHead>
                  <TableHead className="text-jds-on-surface-variant font-bold">Email</TableHead>
                  <TableHead className="text-jds-on-surface-variant font-bold">Phone</TableHead>
                  <TableHead className="text-jds-on-surface-variant font-bold">Position</TableHead>
                  <TableHead className="text-jds-on-surface-variant font-bold">Joined</TableHead>
                  <TableHead className="text-right text-jds-on-surface-variant font-bold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {staffList.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-16 text-center text-body-md text-jds-on-surface-variant/50">
                      No staff members registered yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  staffList.map((u) => (
                    <TableRow
                      key={u.id}
                      onClick={() => setSelectedUser({ ...u, table: 'staff' })}
                      className="hover:bg-jds-surface-container-low/5 transition-colors cursor-pointer"
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-jds-secondary-container/20 text-jds-secondary text-xs font-bold shrink-0">
                            {u.full_name?.charAt(0)?.toUpperCase() || 'S'}
                          </div>
                          <span className="font-bold text-jds-on-surface">{u.full_name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-jds-on-surface-variant font-medium">{u.email}</TableCell>
                      <TableCell className="text-jds-on-surface-variant font-medium">{u.phone || '—'}</TableCell>
                      <TableCell>
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-jds-surface-container-high/30 px-3 py-1 text-label-sm font-bold text-jds-on-surface-variant">
                          <Briefcase className="h-3 w-3" />
                          {u.position || 'Staff Member'}
                        </span>
                      </TableCell>
                      <TableCell className="text-jds-on-surface-variant text-label-sm">
                        <span className="inline-flex items-center gap-1.5">
                          <CalendarDays className="h-3 w-3" />
                          {formatDate(u.created_at)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleOpenDeleteConfirm(u, 'staff')
                          }}
                          className="h-9 w-9 text-jds-error hover:bg-jds-error-container/10"
                          title="Delete staff account"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      {/* ──────────────── ADMINS TABLE ──────────────── */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-jds-primary-container/20">
            <Shield className="h-4 w-4 text-jds-primary" />
          </div>
          <div>
            <h2 className="text-body-lg font-bold text-jds-on-surface">Administrators</h2>
          </div>
        </div>

        <div className="rounded-xl border border-jds-outline-variant/30 bg-jds-surface-container-lowest overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-jds-surface-container-low/10">
                <TableRow>
                  <TableHead className="text-jds-on-surface-variant font-bold">Name</TableHead>
                  <TableHead className="text-jds-on-surface-variant font-bold">Email</TableHead>
                  <TableHead className="text-jds-on-surface-variant font-bold">Phone</TableHead>
                  <TableHead className="text-jds-on-surface-variant font-bold">Position</TableHead>
                  <TableHead className="text-jds-on-surface-variant font-bold">Joined</TableHead>
                  <TableHead className="text-right text-jds-on-surface-variant font-bold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {adminList.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-16 text-center text-body-md text-jds-on-surface-variant/50">
                      No administrators registered yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  adminList.map((u) => (
                    <TableRow
                      key={u.id}
                      onClick={() => setSelectedUser({ ...u, table: 'admins' })}
                      className="hover:bg-jds-surface-container-low/5 transition-colors cursor-pointer"
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-jds-primary-container/20 text-jds-primary text-xs font-bold shrink-0">
                            {u.full_name?.charAt(0)?.toUpperCase() || 'A'}
                          </div>
                          <span className="font-bold text-jds-on-surface">{u.full_name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-jds-on-surface-variant font-medium">{u.email}</TableCell>
                      <TableCell className="text-jds-on-surface-variant font-medium">{u.phone || '—'}</TableCell>
                      <TableCell>
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-jds-primary-container/10 px-3 py-1 text-label-sm font-bold text-jds-primary">
                          <Shield className="h-3 w-3" />
                          {u.position || 'Administrator'}
                        </span>
                      </TableCell>
                      <TableCell className="text-jds-on-surface-variant text-label-sm">
                        <span className="inline-flex items-center gap-1.5">
                          <CalendarDays className="h-3 w-3" />
                          {formatDate(u.created_at)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleOpenDeleteConfirm(u, 'admins')
                          }}
                          className="h-9 w-9 text-jds-error hover:bg-jds-error-container/10"
                          title="Delete administrator account"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      {/* User Account Detail Modal (with Delete Account at the bottom) */}
      {selectedUser && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-jds-surface border border-jds-outline-variant/40 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-jds-outline-variant/30 flex items-center justify-between gap-3 bg-jds-surface-container-low/20">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-jds-primary/10 text-jds-primary flex items-center justify-center font-bold text-base shrink-0">
                  {selectedUser.full_name?.charAt(0)?.toUpperCase() || 'U'}
                </div>
                <div className="min-w-0">
                  <h2 className="text-body-lg font-bold text-jds-on-surface truncate">
                    {selectedUser.full_name}
                  </h2>
                  <p className="text-label-sm text-jds-on-surface-variant">
                    {selectedUser.table === 'admins' ? 'Administrator Account' : 'Staff Member Account'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedUser(null)}
                className="p-1.5 text-jds-on-surface-variant hover:text-jds-on-surface rounded-lg hover:bg-jds-surface-container transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-xl border border-jds-outline-variant/30 bg-jds-surface-container-lowest p-4 text-xs">
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
                  <span className="font-semibold text-jds-on-surface">{selectedUser.phone || '—'}</span>
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
                  <span className="font-semibold text-jds-on-surface">{formatDate(selectedUser.created_at)}</span>
                </div>
              </div>

              {/* Danger Zone at Bottom of User's View */}
              <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <h3 className="text-xs font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>Delete User Account</span>
                  </h3>
                  <p className="text-xs text-jds-on-surface-variant leading-relaxed">
                    Permanently remove this {selectedUser.table === 'admins' ? 'administrator' : 'staff'} account and revoke all platform access.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleOpenDeleteConfirm(selectedUser, selectedUser.table)}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors shrink-0 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete User</span>
                </button>
              </div>
            </div>

            <div className="p-4 border-t border-jds-outline-variant/20 bg-jds-surface-container-low/20 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedUser(null)}
                className="px-5 py-2 text-xs font-semibold rounded-xl border border-jds-outline-variant/40 bg-jds-surface text-jds-on-surface hover:bg-jds-surface-container transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Platform User Confirmation Modal */}
      {deletingUser && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-jds-surface border border-jds-outline-variant/40 rounded-2xl shadow-2xl p-6 space-y-4 animate-in zoom-in-95 duration-150">
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
    </div>
  )
}
