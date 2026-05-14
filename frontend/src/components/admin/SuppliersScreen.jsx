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
    <div className="max-w-[1200px] mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-headline-md font-bold text-jds-on-surface">Supplier Directory</h1>
          <p className="text-body-md text-jds-on-surface-variant">Manage relationships with solar component manufacturers and vendors.</p>
        </div>
        <Button onClick={() => { resetForm(); setShowForm(true) }} className="bg-jds-primary text-jds-on-primary hover:opacity-90 rounded-lg px-6 gap-2">
          <Plus className="h-4 w-4" /> Add Supplier
        </Button>
      </div>

      {showForm && (
        <div className="rounded-xl border border-jds-outline-variant/40 bg-jds-surface-container-lowest p-8 space-y-6 shadow-lg animate-in slide-in-from-top-4 duration-300">
          <div className="flex items-center justify-between border-b border-jds-outline-variant/20 pb-4">
            <h3 className="text-body-lg font-bold text-jds-on-surface">{editingId ? 'Edit Supplier Credentials' : 'Register New Supplier'}</h3>
            <Button variant="ghost" size="icon" onClick={resetForm} className="h-10 w-10 text-jds-on-surface-variant hover:bg-jds-surface-container-low">
              <X className="h-5 w-5" />
            </Button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              {[
                { key: 'name', label: 'Company Name', placeholder: 'e.g. SolarEdge Technologies' },
                { key: 'email', label: 'Point of Contact Email', placeholder: 'contact@supplier.com' },
                { key: 'phone', label: 'Contact Number', placeholder: '+63 9XX XXX XXXX' },
                { key: 'address', label: 'Business Address', placeholder: 'Office location...' },
              ].map(f => (
                <div key={f.key} className="space-y-1.5">
                  <label className="text-label-sm font-bold text-jds-on-surface-variant/80 uppercase tracking-wider">{f.label}</label>
                  <input
                    value={form[f.key]}
                    onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                    className="h-11 w-full rounded-lg border border-jds-outline-variant/30 bg-jds-surface-container-low/20 px-4 text-body-md outline-none focus:border-jds-secondary focus:bg-jds-surface-container-lowest transition-all"
                    placeholder={f.placeholder}
                  />
                </div>
              ))}
            </div>
            <div className="flex gap-4 pt-4 border-t border-jds-outline-variant/20">
              <Button type="submit" className="bg-jds-primary text-jds-on-primary px-8">{editingId ? 'Save Changes' : 'Register Supplier'}</Button>
              <Button variant="outline" onClick={resetForm} className="border-jds-outline-variant text-jds-on-surface-variant px-8">Discard</Button>
            </div>
          </form>
        </div>
      )}

      <div className="rounded-xl border border-jds-outline-variant/30 bg-jds-surface-container-lowest overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-jds-surface-container-low/10">
              <TableRow>
                <TableHead className="text-jds-on-surface-variant font-bold">ID</TableHead>
                <TableHead className="text-jds-on-surface-variant font-bold">Company Name</TableHead>
                <TableHead className="text-jds-on-surface-variant font-bold">Email</TableHead>
                <TableHead className="text-jds-on-surface-variant font-bold">Phone</TableHead>
                <TableHead className="text-jds-on-surface-variant font-bold">Business Address</TableHead>
                <TableHead className="text-right text-jds-on-surface-variant font-bold">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {suppliers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-16 text-center text-body-md text-jds-on-surface-variant/50">No registered suppliers found.</TableCell>
                </TableRow>
              ) : (
                suppliers.map((s) => (
                  <TableRow key={s.id} className="hover:bg-jds-surface-container-low/5 transition-colors">
                    <TableCell className="font-mono text-xs text-jds-secondary">{s.id}</TableCell>
                    <TableCell className="font-bold text-jds-on-surface">{s.name}</TableCell>
                    <TableCell className="text-jds-on-surface-variant font-medium">{s.email || '—'}</TableCell>
                    <TableCell className="text-jds-on-surface-variant font-medium">{s.phone || '—'}</TableCell>
                    <TableCell className="max-w-[250px] truncate text-jds-on-surface-variant">{s.address || '—'}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleEdit(s)}
                          className="h-9 w-9 text-jds-secondary hover:bg-jds-secondary-container/10"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleDelete(s.id)} 
                          className="h-9 w-9 text-jds-error hover:bg-jds-error-container/10"
                        >
                          <Trash2 className="h-4 w-4" />
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
    </div>
  )
}
