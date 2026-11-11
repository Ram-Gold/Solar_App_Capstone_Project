import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Trash2, AlertTriangle } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../context/AuthContext'
import { deletePlatformUser } from '../../lib/customerService'
import { sanitizeText, sanitizePhone, isValidPhone } from '../../lib/sanitize.js'
import { Button } from '../ui/button'
import useModalBehavior from '../../hooks/useModalBehavior'

export default function ProfileScreen() {
  const { user, role, signOut } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ full_name: '', phone: '', position: '' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')

  // Self-deletion modal states
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  const { backdropProps } = useModalBehavior({
    isOpen: isDeleteModalOpen,
    onClose: () => {
      if (!isDeleting) setIsDeleteModalOpen(false)
    },
  })

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

    const cleanName = sanitizeText(form.full_name, { maxLength: 100 })
    const cleanPhone = form.phone ? sanitizePhone(form.phone) : null
    const cleanPosition = sanitizeText(form.position, { maxLength: 100 })

    if (!cleanName) {
      setError('Full name is required.')
      return
    }

    if (cleanPhone && !isValidPhone(cleanPhone)) {
      setError('Contact number must be an 11-digit Philippine mobile number starting with 09 (e.g. 09171234567).')
      return
    }

    setSaving(true)

    const { error: updateError } = await supabase
      .from(tableName)
      .update({
        full_name: cleanName,
        phone: cleanPhone,
        position: cleanPosition,
      })
      .eq('id', user.id)

    if (updateError) {
      setError(updateError.message)
    } else {
      setSuccess('Profile updated successfully.')
    }
    setSaving(false)
  }

  const handleConfirmDeleteOwnAccount = async () => {
    if (!user?.id) return
    try {
      setIsDeleting(true)
      setDeleteError('')
      await deletePlatformUser({ targetUserId: user.id, table: tableName })
      await signOut()
      navigate('/')
    } catch (err) {
      console.error('Failed to delete account:', err)
      setDeleteError(err.message || 'Failed to delete your account.')
      setIsDeleting(false)
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20 text-muted-foreground">Loading profile...</div>
  }

  return (
    <div className="max-w-[1200px] mx-auto space-y-8">
      <div>
        <h1 className="text-headline-md font-bold text-jds-on-surface">Personal Profile</h1>
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
                  maxLength={100}
                  value={form.full_name}
                  onChange={(e) => setForm({ ...form, full_name: sanitizeText(e.target.value, { maxLength: 100 }) })}
                  className="h-11 w-full rounded-lg border border-jds-outline-variant/30 bg-jds-surface-container-low/20 px-4 text-body-md outline-none focus:border-jds-secondary focus:bg-jds-surface-container-lowest transition-all"
                  placeholder="e.g. Maria Clara"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-label-sm font-bold text-jds-on-surface-variant/80 uppercase tracking-wider">
                  <label>Contact Number</label>
                  {form.phone && (
                    <span className={`text-[10px] font-mono lowercase ${form.phone.length === 11 && isValidPhone(form.phone) ? 'text-emerald-500 font-bold' : 'text-jds-on-surface-variant/60'
                      }`}>
                      {form.phone.length}/11 digits
                    </span>
                  )}
                </div>
                <input
                  type="tel"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={11}
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: sanitizePhone(e.target.value) })}
                  className="h-11 w-full rounded-lg border border-jds-outline-variant/30 bg-jds-surface-container-low/20 px-4 text-body-md outline-none focus:border-jds-secondary focus:bg-jds-surface-container-lowest transition-all font-mono"
                  placeholder="09171234567"
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-label-sm font-bold text-jds-on-surface-variant/80 uppercase tracking-wider">Position / Title</label>
                <input
                  maxLength={100}
                  value={form.position}
                  onChange={(e) => setForm({ ...form, position: sanitizeText(e.target.value, { maxLength: 100 }) })}
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

        {/* Danger Zone: Delete Own Account (Bottom of Profile Page) */}
        <div className="mt-8 rounded-xl border border-rose-500/30 bg-rose-500/5 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
          <div className="space-y-1">
            <h3 className="text-body-md font-bold text-rose-600 dark:text-rose-400 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>Delete Account</span>
            </h3>
            <p className="text-xs text-jds-on-surface-variant leading-relaxed max-w-md">
              Permanently delete your {role === 'admin' ? 'administrator' : 'staff'} account from the JD Solar platform. Once deleted, your login credentials and dashboard access will be revoked immediately.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setDeleteError('')
              setIsDeleteModalOpen(true)
            }}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors shrink-0 shadow-xs cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
            <span>Delete Account</span>
          </button>
        </div>
      </div>

      {/* Delete Own Account Confirmation Modal */}
      {isDeleteModalOpen && (
        <div
          {...backdropProps}
          className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-jds-surface border border-jds-outline-variant/40 rounded-2xl shadow-2xl p-6 space-y-4 animate-in zoom-in-95 duration-150"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-body-md font-bold text-jds-on-surface truncate">
                  Delete Your Account?
                </h3>
                <p className="text-label-sm text-jds-on-surface-variant truncate">
                  {form.full_name || user?.email} ({role === 'admin' ? 'Administrator' : 'Staff Member'})
                </p>
              </div>
            </div>

            <div className="text-xs text-rose-600 dark:text-rose-400 bg-rose-500/10 border border-rose-500/20 p-3.5 rounded-xl space-y-1.5 leading-relaxed">
              <p className="font-bold">This action is permanent and cannot be undone.</p>
              <p>
                Deleting your account will permanently erase your {role === 'admin' ? 'administrator' : 'staff'} profile and credentials from the database, and sign you out immediately.
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
                  setIsDeleteModalOpen(false)
                  setDeleteError('')
                }}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl border border-jds-outline-variant/40 text-xs font-semibold text-jds-on-surface hover:bg-jds-surface-container transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteOwnAccount}
                disabled={isDeleting}
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
