import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { Button } from '../ui/button'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '../ui/table'
import { Plus, Pencil, Trash2, X } from 'lucide-react'

const emptySupplier = { name: '', email: '', phone: '', address: '' }

export default function SuppliersScreen() {
  const [suppliers, setSuppliers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptySupplier)
  const [editingId, setEditingId] = useState(null)

  useEffect(() => {
    fetchSuppliers()
  }, [])

  const fetchSuppliers = async () => {
    const { data, error } = await supabase
      .from('suppliers')
      .select('*')
      .order('id')
    if (!error) setSuppliers(data || [])
    setLoading(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (editingId) {
      const { error } = await supabase.from('suppliers').update(form).eq('id', editingId)
      if (!error) {
        setSuppliers(suppliers.map(s => s.id === editingId ? { ...s, ...form } : s))
        resetForm()
      }
    } else {
      const { data, error } = await supabase.from('suppliers').insert([form]).select()
      if (!error && data) {
        setSuppliers([...suppliers, data[0]])
        resetForm()
      }
    }
  }

  const handleEdit = (supplier) => {
    setForm({ name: supplier.name, email: supplier.email || '', phone: supplier.phone || '', address: supplier.address || '' })
    setEditingId(supplier.id)
    setShowForm(true)
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this supplier?')) return
    const { error } = await supabase.from('suppliers').delete().eq('id', id)
    if (!error) setSuppliers(suppliers.filter(s => s.id !== id))
  }

  const resetForm = () => {
    setForm(emptySupplier)
    setEditingId(null)
    setShowForm(false)
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20 text-muted-foreground">Loading suppliers...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Suppliers</h1>
        <Button onClick={() => { resetForm(); setShowForm(true) }} className="gap-2">
          <Plus className="h-4 w-4" /> Add Supplier
        </Button>
      </div>

      {showForm && (
        <div className="rounded-xl border bg-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">{editingId ? 'Edit Supplier' : 'Add a New Supplier'}</h3>
            <Button variant="ghost" size="icon-sm" onClick={resetForm}><X className="h-4 w-4" /></Button>
          </div>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {[
              { key: 'name', label: 'Name', required: true },
              { key: 'email', label: 'Email' },
              { key: 'phone', label: 'Phone' },
              { key: 'address', label: 'Address' },
            ].map(f => (
              <div key={f.key} className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">{f.label}</label>
                <input
                  required={f.required}
                  value={form[f.key]}
                  onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                  className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
                />
              </div>
            ))}
            <div className="sm:col-span-2">
              <Button type="submit">{editingId ? 'Save Changes' : 'Add Supplier'}</Button>
            </div>
          </form>
        </div>
      )}

      <div className="rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Address</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {suppliers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">No suppliers yet.</TableCell>
              </TableRow>
            ) : (
              suppliers.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>{s.id}</TableCell>
                  <TableCell className="font-medium">{s.name}</TableCell>
                  <TableCell>{s.email || '—'}</TableCell>
                  <TableCell>{s.phone || '—'}</TableCell>
                  <TableCell className="max-w-[200px] truncate">{s.address || '—'}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon-sm" onClick={() => handleEdit(s)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon-sm" onClick={() => handleDelete(s.id)} className="text-destructive hover:text-destructive">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
