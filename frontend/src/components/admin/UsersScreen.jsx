import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { Button } from '../ui/button'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '../ui/table'
import { Trash2 } from 'lucide-react'

export default function UsersScreen() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '', role: 'staff' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    fetchProfiles()
  }, [])

  const fetchProfiles = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('full_name')
    if (!error) setUsers(data || [])
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

    // Insert profile row
    if (authData.user) {
      const { error: profileError } = await supabase.from('profiles').insert([{
        id: authData.user.id,
        full_name: form.name,
        phone: form.phone,
        role: form.role,
      }])

      if (profileError) {
        setError(profileError.message)
      } else {
        setSuccess(`User "${form.name}" created successfully.`)
        setForm({ name: '', email: '', password: '', phone: '', role: 'staff' })
        fetchProfiles()
      }
    }
    setSaving(false)
  }

  const handleDelete = async (id) => {
    if (!confirm('Remove this user profile?')) return
    const { error } = await supabase.from('profiles').delete().eq('id', id)
    if (!error) setUsers(users.filter(u => u.id !== id))
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20 text-muted-foreground">Loading users...</div>
  }

  return (
    <div className="max-w-[1200px] mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="space-y-1">
        <h1 className="text-headline-md font-bold text-jds-on-surface">Staff & User Management</h1>
        <p className="text-body-md text-jds-on-surface-variant">Control access levels and manage administrative accounts.</p>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-5">
        {/* Add User Form */}
        <div className="lg:col-span-2 rounded-xl border border-jds-outline-variant/40 bg-jds-surface-container-lowest p-8 space-y-6 shadow-sm h-fit">
          <h3 className="text-body-lg font-bold text-jds-on-surface border-b border-jds-outline-variant/20 pb-4">Create Account</h3>

          {error && (
            <div className="rounded-lg bg-jds-error-container/10 border border-jds-error/20 p-4 text-body-sm text-jds-error">{error}</div>
          )}
          {success && (
            <div className="rounded-lg bg-jds-secondary-container/10 border border-jds-secondary/20 p-4 text-body-sm text-jds-secondary">{success}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {[
              { key: 'name', label: 'Full Name', type: 'text', placeholder: 'e.g. Maria Clara' },
              { key: 'email', label: 'Email Address', type: 'email', placeholder: 'name@solarapp.com' },
              { key: 'password', label: 'Initial Password', type: 'password', placeholder: '••••••••' },
              { key: 'phone', label: 'Phone Number', type: 'text', placeholder: '+63 9XX XXX XXXX' },
            ].map(f => (
              <div key={f.key} className="space-y-1.5">
                <label className="text-label-sm font-bold text-jds-on-surface-variant/80 uppercase tracking-wider">{f.label}</label>
                <input
                  type={f.type}
                  required={f.key !== 'phone'}
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
            <Button type="submit" disabled={saving} className="w-full bg-jds-primary text-jds-on-primary h-12 rounded-lg font-bold shadow-sm hover:opacity-90">
              {saving ? 'Processing...' : 'Register User'}
            </Button>
          </form>
        </div>

        {/* Users Table */}
        <div className="lg:col-span-3 rounded-xl border border-jds-outline-variant/30 bg-jds-surface-container-lowest overflow-hidden shadow-sm h-fit">
          <div className="border-b border-jds-outline-variant/20 px-6 py-5 bg-jds-surface-container-low/10">
            <h3 className="text-body-md font-bold text-jds-on-surface">Registered Members</h3>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-jds-surface-container-low/5">
                <TableRow>
                  <TableHead className="text-jds-on-surface-variant font-bold">Name</TableHead>
                  <TableHead className="text-jds-on-surface-variant font-bold">Role</TableHead>
                  <TableHead className="text-jds-on-surface-variant font-bold">Phone</TableHead>
                  <TableHead className="text-right text-jds-on-surface-variant font-bold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="py-20 text-center text-body-md text-jds-on-surface-variant/50">No administrative profiles found.</TableCell>
                  </TableRow>
                ) : (
                  users.map((u) => (
                    <TableRow key={u.id} className="hover:bg-jds-surface-container-low/5 transition-colors">
                      <TableCell className="font-bold text-jds-on-surface">{u.full_name || u.id.slice(0, 8)}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center rounded-full px-3 py-1 text-label-sm font-bold uppercase ${
                          u.role === 'admin' ? 'bg-jds-primary-container/10 text-jds-primary' : 'bg-jds-surface-container-high/30 text-jds-on-surface-variant'
                        }`}>
                          {u.role}
                        </span>
                      </TableCell>
                      <TableCell className="text-jds-on-surface-variant font-medium">{u.phone || '—'}</TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleDelete(u.id)} 
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
