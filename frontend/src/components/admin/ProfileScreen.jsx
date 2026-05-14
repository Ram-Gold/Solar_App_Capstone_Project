import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../context/AuthContext'
import { Button } from '../ui/button'

export default function ProfileScreen() {
  const { user } = useAuth()
  const [form, setForm] = useState({ full_name: '', phone: '', role: 'staff' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (user) fetchProfile()
  }, [user])

  const fetchProfile = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (data) {
      setForm({
        full_name: data.full_name || '',
        phone: data.phone || '',
        role: data.role || 'staff',
      })
    }
    setLoading(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setSaving(true)

    const { error: updateError } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        full_name: form.full_name,
        phone: form.phone,
        role: form.role,
      })

    if (updateError) {
      setError(updateError.message)
    } else {
      setSuccess('Profile updated successfully.')
    }
    setSaving(false)
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20 text-muted-foreground">Loading profile...</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Profile</h1>
        <p className="text-sm text-muted-foreground">Update your personal information.</p>
      </div>

      {error && (
        <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">{error}</div>
      )}
      {success && (
        <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3 text-sm text-emerald-600">{success}</div>
      )}

      <form onSubmit={handleSubmit} className="max-w-lg space-y-5 rounded-xl border bg-card p-6">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Email</label>
          <input
            disabled
            value={user?.email || ''}
            className="h-10 w-full rounded-lg border border-input bg-muted/50 px-3 text-sm text-muted-foreground cursor-not-allowed"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Full Name</label>
          <input
            value={form.full_name}
            onChange={(e) => setForm({ ...form, full_name: e.target.value })}
            className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
            placeholder="Your full name"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Phone</label>
          <input
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
            placeholder="Your phone number"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Role</label>
          <input
            disabled
            value={form.role}
            className="h-10 w-full rounded-lg border border-input bg-muted/50 px-3 text-sm text-muted-foreground cursor-not-allowed capitalize"
          />
        </div>

        <Button type="submit" disabled={saving}>
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </form>
    </div>
  )
}
