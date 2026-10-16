import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { Button } from '../ui/button'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '../ui/table'
import { Trash2, Plus, X, Shield, Users as UsersIcon, CalendarDays, Mail, Phone, Briefcase, UserPlus } from 'lucide-react'

export default function UsersScreen() {
  const [staffList, setStaffList] = useState([])
  const [adminList, setAdminList] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '', role: 'staff' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

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
    setSaving(true)

    // Create user via Supabase Auth signUp
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: form.email,
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
        full_name: form.name,
        email: form.email,
        phone: form.phone || null,
        position: form.role === 'admin' ? 'Administrator' : 'Staff Member',
      }])

      if (insertError) {
        setError(insertError.message)
      } else {
        setSuccess(`${form.role === 'admin' ? 'Administrator' : 'Staff member'} "${form.name}" created successfully.`)
        setForm({ name: '', email: '', password: '', phone: '', role: 'staff' })
        setShowForm(false)
        fetchAll()
      }
    }
    setSaving(false)
  }

  const handleDelete = async (id, table) => {
    const label = table === 'admins' ? 'administrator' : 'staff member'
    if (!confirm(`Remove this ${label}? This cannot be undone.`)) return
    const { error } = await supabase.from(table).delete().eq('id', id)
    if (!error) {
      if (table === 'admins') {
        setAdminList(adminList.filter(u => u.id !== id))
      } else {
        setStaffList(staffList.filter(u => u.id !== id))
      }
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
        <div className="space-y-1">
          <h1 className="text-headline-md font-bold text-jds-on-surface">User Management</h1>
          <p className="text-body-md text-jds-on-surface-variant">
            Manage staff members and administrators across the solar platform.
          </p>
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
                <p className="text-label-sm text-jds-on-surface-variant">Register a new staff member or administrator</p>
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
                { key: 'name', label: 'Full Name', type: 'text', placeholder: 'e.g. Maria Clara', icon: UsersIcon },
                { key: 'email', label: 'Email Address', type: 'email', placeholder: 'name@solarapp.com', icon: Mail },
                { key: 'password', label: 'Initial Password', type: 'password', placeholder: '••••••••', icon: Shield },
                { key: 'phone', label: 'Phone Number', type: 'text', placeholder: '+63 9XX XXX XXXX', icon: Phone, required: false },
              ].map(f => (
                <div key={f.key} className="space-y-1.5">
                  <label className="text-label-sm font-bold text-jds-on-surface-variant/80 uppercase tracking-wider">{f.label}</label>
                  <input
                    type={f.type}
                    required={f.required !== false}
                    value={form[f.key]}
                    onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
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
            <p className="text-label-sm text-jds-on-surface-variant">Team members with product management access</p>
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
                    <TableRow key={u.id} className="hover:bg-jds-surface-container-low/5 transition-colors">
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
                          onClick={() => handleDelete(u.id, 'staff')} 
                          className="h-9 w-9 text-jds-error hover:bg-jds-error-container/10"
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
            <p className="text-label-sm text-jds-on-surface-variant">Full-access accounts with administrative privileges</p>
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
                    <TableRow key={u.id} className="hover:bg-jds-surface-container-low/5 transition-colors">
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
                          onClick={() => handleDelete(u.id, 'admins')} 
                          className="h-9 w-9 text-jds-error hover:bg-jds-error-container/10"
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
    </div>
  )
}
