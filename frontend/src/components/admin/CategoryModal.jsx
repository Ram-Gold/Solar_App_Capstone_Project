import { useState, useEffect, useRef } from 'react'
import { Plus, X, Pencil, Trash2, Check, AlertCircle, Tag, Loader2, ShieldAlert } from 'lucide-react'
import { Button } from '../ui/button'
import { useAuth } from '../../context/AuthContext'
import {
  fetchCategoriesWithCounts,
  addCategory,
  updateCategory,
  deleteCategory,
} from '../../lib/categories'
import useModalBehavior from '../../hooks/useModalBehavior'

export default function CategoryModal({
  isOpen,
  onClose,
  onCategoryAdded,
  onCategoriesChanged,
}) {
  const { role } = useAuth()
  const isAdmin = role === 'admin'

  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [newCatName, setNewCatName] = useState('')
  const [saving, setSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  // Inline editing state for Admin rename
  const [editingId, setEditingId] = useState(null)
  const [editingName, setEditingName] = useState('')
  const [actionLoadingId, setActionLoadingId] = useState(null)

  const inputRef = useRef(null)

  const loadData = async () => {
    setLoading(true)
    const { data } = await fetchCategoriesWithCounts()
    if (data) {
      setCategories(data)
      if (onCategoriesChanged) {
        onCategoriesChanged(data.map(c => c.name))
      }
    }
    setLoading(false)
  }

  useEffect(() => {
    if (isOpen) {
      setErrorMsg('')
      setSuccessMsg('')
      setNewCatName('')
      setEditingId(null)
      loadData()
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isOpen])

  const { backdropProps } = useModalBehavior({ isOpen, onClose })

  if (!isOpen) return null

  const handleAdd = async (e) => {
    e.preventDefault()
    setErrorMsg('')
    setSuccessMsg('')

    const trimmed = newCatName.trim()
    if (!trimmed) {
      setErrorMsg('Please enter a category name.')
      return
    }

    setSaving(true)
    const { data, error } = await addCategory(trimmed)
    setSaving(false)

    if (error) {
      setErrorMsg(error.message || 'Failed to add category.')
      return
    }

    setSuccessMsg(`Category "${data.name}" added successfully!`)
    setNewCatName('')
    
    // Refresh list and notify parent
    await loadData()
    if (onCategoryAdded) {
      onCategoryAdded(data.name)
    }
  }

  const handleStartEdit = (cat) => {
    setEditingId(cat.id)
    setEditingName(cat.name)
    setErrorMsg('')
    setSuccessMsg('')
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditingName('')
  }

  const handleSaveEdit = async (cat) => {
    const trimmed = editingName.trim()
    if (!trimmed) {
      setErrorMsg('Category name cannot be empty.')
      return
    }
    if (trimmed === cat.name) {
      setEditingId(null)
      return
    }

    setActionLoadingId(cat.id)
    setErrorMsg('')
    setSuccessMsg('')

    const { data, error } = await updateCategory(cat.id, cat.name, trimmed)
    setActionLoadingId(null)

    if (error) {
      setErrorMsg(error.message || 'Failed to update category.')
      return
    }

    setEditingId(null)
    setSuccessMsg(`Renamed category to "${data.name}"`)
    await loadData()
  }

  const handleDelete = async (cat) => {
    if (!confirm(`Are you sure you want to delete the category "${cat.name}"?`)) {
      return
    }

    setActionLoadingId(cat.id)
    setErrorMsg('')
    setSuccessMsg('')

    const { success, error } = await deleteCategory(cat.id, cat.name)
    setActionLoadingId(null)

    if (!success && error) {
      setErrorMsg(error.message)
      return
    }

    setSuccessMsg(`Category "${cat.name}" deleted.`)
    await loadData()
  }

  return (
    <div
      {...backdropProps}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-2xl bg-jds-surface border border-jds-outline-variant/30 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="category-modal-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-jds-outline-variant/20 bg-jds-surface-container-low/40">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-jds-primary/10 text-jds-primary">
              <Tag className="h-5 w-5" />
            </div>
            <div>
              <h2 id="category-modal-title" className="text-body-lg font-bold text-jds-on-surface">
                Manage Categories
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-jds-on-surface-variant/70 hover:bg-jds-surface-container hover:text-jds-on-surface transition-colors"
            title="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* Notifications */}
          {errorMsg && (
            <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-jds-error/10 border border-jds-error/20 text-jds-error text-body-sm animate-in fade-in">
              <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{errorMsg}</div>
            </div>
          )}

          {successMsg && (
            <div className="flex items-center gap-2.5 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-body-sm font-medium animate-in fade-in">
              <Check className="h-5 w-5 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Add Category Section */}
          <div className="p-4 rounded-xl border border-jds-outline-variant/20 bg-jds-surface-container-low/30 space-y-3">
            <label className="text-label-sm font-bold uppercase tracking-wider text-jds-on-surface-variant">
              Add New Category
            </label>
            <form onSubmit={handleAdd} className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                placeholder="e.g. Solar Floodlight"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                disabled={saving}
                className="flex-1 h-11 px-3.5 rounded-lg border border-jds-outline-variant/30 bg-jds-surface text-body-md text-jds-on-surface placeholder:text-jds-on-surface-variant/40 outline-none focus:border-jds-primary focus:ring-2 focus:ring-jds-primary/10 transition-all"
              />
              <Button
                type="submit"
                disabled={saving || !newCatName.trim()}
                className="bg-jds-primary text-jds-on-primary hover:opacity-90 h-11 px-4 rounded-lg font-semibold shrink-0 gap-1.5"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                <span>Add</span>
              </Button>
            </form>
          </div>

          {/* Current Categories List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-label-sm font-bold uppercase tracking-wider text-jds-on-surface-variant">
                Existing Categories ({categories.length})
              </span>
              {!isAdmin && (
                <span className="flex items-center gap-1 text-[11px] text-jds-on-surface-variant/70">
                  <ShieldAlert className="h-3 w-3" /> Staff view (rename/delete restricted to Admin)
                </span>
              )}
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-8 text-label-md text-jds-on-surface-variant">
                <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading categories...
              </div>
            ) : categories.length === 0 ? (
              <div className="p-6 text-center text-label-md text-jds-on-surface-variant bg-jds-surface-container-low/20 rounded-xl">
                No categories found. Add your first category above.
              </div>
            ) : (
              <div className="space-y-2">
                {categories.map((cat) => {
                  const isEditing = editingId === cat.id
                  const isActionLoading = actionLoadingId === cat.id

                  return (
                    <div
                      key={cat.id || cat.name}
                      className="group flex items-center justify-between gap-3 p-3 rounded-xl border border-jds-outline-variant/20 bg-jds-surface-container-lowest hover:border-jds-primary/30 transition-all"
                    >
                      {isEditing ? (
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <input
                            type="text"
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveEdit(cat)
                              if (e.key === 'Escape') handleCancelEdit()
                            }}
                            autoFocus
                            disabled={isActionLoading}
                            className="flex-1 h-9 px-3 rounded-lg border border-jds-primary bg-jds-surface text-body-sm outline-none"
                          />
                          <button
                            onClick={() => handleSaveEdit(cat)}
                            disabled={isActionLoading}
                            className="p-2 text-emerald-600 hover:bg-emerald-500/10 rounded-lg transition-colors"
                            title="Save Rename"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            disabled={isActionLoading}
                            className="p-2 text-jds-on-surface-variant hover:bg-jds-surface-container rounded-lg transition-colors"
                            title="Cancel"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            <span className="text-body-sm font-semibold text-jds-on-surface truncate">
                              {cat.name}
                            </span>
                            <span
                              className={`text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${
                                cat.count > 0
                                  ? 'bg-jds-primary/10 text-jds-primary border border-jds-primary/20'
                                  : 'bg-jds-surface-container-high text-jds-on-surface-variant/60'
                              }`}
                              title={`${cat.count} product(s) assigned`}
                            >
                              {cat.count} {cat.count === 1 ? 'product' : 'products'}
                            </span>
                          </div>

                          {isAdmin && (
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                onClick={() => handleStartEdit(cat)}
                                disabled={isActionLoading}
                                className="p-1.5 text-jds-on-surface-variant/60 hover:text-jds-primary hover:bg-jds-surface-container rounded-lg transition-colors"
                                title="Rename Category"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => handleDelete(cat)}
                                disabled={isActionLoading}
                                className="p-1.5 text-jds-on-surface-variant/60 hover:text-jds-error hover:bg-jds-error/10 rounded-lg transition-colors"
                                title={
                                  cat.count > 0
                                    ? `Cannot delete: ${cat.count} product(s) assigned`
                                    : 'Delete Category'
                                }
                              >
                                {isActionLoading ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <Trash2 className="h-3.5 w-3.5" />
                                )}
                              </button>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-jds-outline-variant/20 bg-jds-surface-container-low/40 flex justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="border-jds-outline-variant text-jds-on-surface-variant px-5 rounded-lg text-body-sm font-semibold"
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  )
}
