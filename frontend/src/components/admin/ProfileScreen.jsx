import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../context/AuthContext'
import { Button } from '../ui/button'

export default function ProfileScreen() {
  const { user, role } = useAuth()
  const [form, setForm] = useState({ full_name: '', phone: '', position: '' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')

  const tableName = role === 'admin' ? 'admins' : 'staff'

  useEffect(() => {
    if (user) fetchProfile()
  }, [user, role])

  const fetchProfile = async () => {
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .eq('id', user.id)
      .single()

    if (data) {
      setForm({
        full_name: data.full_name || '',
        phone: data.phone || '',
        position: data.position || '',
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
      .from(tableName)
      .update({
        full_name: form.full_name,
        phone: form.phone,
        position: form.position,
      })
      .eq('id', user.id)

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
    <div className="max-w-[1200px] mx-auto space-y-8">
      <div className="space-y-1">
        <h1 className="text-headline-md font-bold text-jds-on-surface">Personal Profile</h1>
        <p className="text-body-md text-jds-on-surface-variant">Manage your account information and administrative settings.</p>
      </div>

      <div className="max-w-2xl">
        <div className="rounded-xl border border-jds-outline-variant/40 bg-jds-surface-container-lowest p-8 space-y-8 shadow-sm">
          <div className="flex items-center gap-4 border-b border-jds-outline-variant/20 pb-6">
            <div className="h-16 w-16 rounded-full bg-jds-primary/10 flex items-center justify-center text-jds-primary">
              <span className="text-headline-sm font-bold">{form.full_name?.charAt(0) || user?.email?.charAt(0).toUpperCase()}</span>
            </div>
            <div>
              <h3 className="text-body-lg font-bold text-jds-on-surface">{form.full_name || 'User'}</h3>
              <p className="text-label-md font-bold text-jds-secondary uppercase tracking-wider">{role === 'admin' ? 'Administrator' : 'Staff Member'}</p>
            </div>
          </div>

          {error && (
            <div className="rounded-lg bg-jds-error-container/10 border border-jds-error/20 p-4 text-body-sm text-jds-error">{error}</div>
          )}
          {success && (
            <div className="rounded-lg bg-jds-secondary-container/10 border border-jds-secondary/20 p-4 text-body-sm text-jds-secondary">{success}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-label-sm font-bold text-jds-on-surface-variant/80 uppercase tracking-wider">Account Email</label>
                <input
                  disabled
                  value={user?.email || ''}
                  className="h-11 w-full rounded-lg border border-jds-outline-variant/30 bg-jds-surface-container-low/50 px-4 text-body-md text-jds-on-surface-variant/60 cursor-not-allowed"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-label-sm font-bold text-jds-on-surface-variant/80 uppercase tracking-wider">Access Level</label>
                <input
                  disabled
                  value={role === 'admin' ? 'Administrator' : 'Staff Member'}
                  className="h-11 w-full rounded-lg border border-jds-outline-variant/30 bg-jds-surface-container-low/50 px-4 text-body-md text-jds-on-surface-variant/60 cursor-not-allowed capitalize"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-label-sm font-bold text-jds-on-surface-variant/80 uppercase tracking-wider">Full Name</label>
                <input
                  value={form.full_name}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                  className="h-11 w-full rounded-lg border border-jds-outline-variant/30 bg-jds-surface-container-low/20 px-4 text-body-md outline-none focus:border-jds-secondary focus:bg-jds-surface-container-lowest transition-all"
                  placeholder="e.g. Maria Clara"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-label-sm font-bold text-jds-on-surface-variant/80 uppercase tracking-wider">Contact Number</label>
                <input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="h-11 w-full rounded-lg border border-jds-outline-variant/30 bg-jds-surface-container-low/20 px-4 text-body-md outline-none focus:border-jds-secondary focus:bg-jds-surface-container-lowest transition-all"
                  placeholder="+63 9XX XXX XXXX"
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-label-sm font-bold text-jds-on-surface-variant/80 uppercase tracking-wider">Position / Title</label>
                <input
                  value={form.position}
                  onChange={(e) => setForm({ ...form, position: e.target.value })}
                  className="h-11 w-full rounded-lg border border-jds-outline-variant/30 bg-jds-surface-container-low/20 px-4 text-body-md outline-none focus:border-jds-secondary focus:bg-jds-surface-container-lowest transition-all"
                  placeholder="e.g. Solar Technician"
                />
              </div>
            </div>

            <div className="pt-6 border-t border-jds-outline-variant/20">
              <Button type="submit" disabled={saving} className="bg-jds-primary text-jds-on-primary h-12 px-10 rounded-lg font-bold shadow-sm hover:opacity-90">
                {saving ? 'Saving Updates...' : 'Update Account Info'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
