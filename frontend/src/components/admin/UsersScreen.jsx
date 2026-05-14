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
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Users</h1>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Add User Form */}
        <div className="rounded-xl border bg-card p-5 space-y-4">
          <h3 className="text-sm font-semibold">Add a New User</h3>

          {error && (
            <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">{error}</div>
          )}
          {success && (
            <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3 text-sm text-emerald-600">{success}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            {[
              { key: 'name', label: 'Name', type: 'text' },
              { key: 'email', label: 'Email', type: 'email' },
              { key: 'password', label: 'Password', type: 'password' },
              { key: 'phone', label: 'Phone', type: 'text' },
            ].map(f => (
              <div key={f.key} className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">{f.label}</label>
                <input
                  type={f.type}
                  required={f.key !== 'phone'}
                  value={form[f.key]}
                  onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                  className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
                />
              </div>
            ))}
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Role</label>
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
              >
                <option value="staff">Staff</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <Button type="submit" disabled={saving} className="w-full">
              {saving ? 'Creating...' : 'Add User'}
            </Button>
          </form>
        </div>

        {/* Users Table */}
        <div className="rounded-xl border bg-card">
          <div className="border-b px-5 py-4">
            <h3 className="text-sm font-semibold">Users</h3>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-10 text-center text-muted-foreground">No user profiles yet.</TableCell>
                </TableRow>
              ) : (
                users.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.full_name || '—'}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
                        u.role === 'admin' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                      }`}>
                        {u.role}
                      </span>
                    </TableCell>
                    <TableCell>{u.phone || '—'}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon-sm" onClick={() => handleDelete(u.id)} className="text-destructive hover:text-destructive">
                        <Trash2 className="h-3.5 w-3.5" />
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
  )
}
