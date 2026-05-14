import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { Button } from '../ui/button'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '../ui/table'
import { Plus, Pencil, Trash2, X } from 'lucide-react'

const emptyOrder = { customer_name: '', address: '', product_name: '', quantity: 1, price: '', status: 'Pending' }

export default function OrdersScreen() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyOrder)
  const [editingId, setEditingId] = useState(null)

  useEffect(() => {
    fetchOrders()
  }, [])

  const fetchOrders = async () => {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('id', { ascending: false })
    if (!error) setOrders(data || [])
    setLoading(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const payload = { ...form, price: Number(form.price), quantity: Number(form.quantity) }

    if (editingId) {
      const { error } = await supabase.from('orders').update(payload).eq('id', editingId)
      if (!error) {
        setOrders(orders.map(o => o.id === editingId ? { ...o, ...payload } : o))
        resetForm()
      }
    } else {
      const { data, error } = await supabase.from('orders').insert([payload]).select()
      if (!error && data) {
        setOrders([data[0], ...orders])
        resetForm()
      }
    }
  }

  const handleEdit = (order) => {
    setForm({
      customer_name: order.customer_name,
      address: order.address,
      product_name: order.product_name,
      quantity: order.quantity,
      price: order.price,
      status: order.status,
    })
    setEditingId(order.id)
    setShowForm(true)
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this order?')) return
    const { error } = await supabase.from('orders').delete().eq('id', id)
    if (!error) setOrders(orders.filter(o => o.id !== id))
  }

  const resetForm = () => {
    setForm(emptyOrder)
    setEditingId(null)
    setShowForm(false)
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20 text-muted-foreground">Loading orders...</div>
  }

  return (
    <div className="max-w-[1200px] mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-headline-md font-bold text-jds-on-surface">Order Management</h1>
          <p className="text-body-md text-jds-on-surface-variant">Track and fulfill customer solar installation orders.</p>
        </div>
        <Button onClick={() => { resetForm(); setShowForm(true) }} className="bg-jds-primary text-jds-on-primary hover:opacity-90 rounded-lg px-6 gap-2">
          <Plus className="h-4 w-4" /> Add Order
        </Button>
      </div>

      {/* Add / Edit Form */}
      {showForm && (
        <div className="rounded-xl border border-jds-outline-variant/40 bg-jds-surface-container-lowest p-8 space-y-6 shadow-lg animate-in slide-in-from-top-4 duration-300">
          <div className="flex items-center justify-between border-b border-jds-outline-variant/20 pb-4">
            <h3 className="text-body-lg font-bold text-jds-on-surface">{editingId ? 'Edit Order Details' : 'Create New Order'}</h3>
            <Button variant="ghost" size="icon" onClick={resetForm} className="h-10 w-10 text-jds-on-surface-variant hover:bg-jds-surface-container-low">
              <X className="h-5 w-5" />
            </Button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[
                { key: 'customer_name', label: 'Customer Full Name', type: 'text', placeholder: 'e.g. Juan Dela Cruz' },
                { key: 'address', label: 'Installation Address', type: 'text', placeholder: 'e.g. Quezon City, Metro Manila' },
                { key: 'product_name', label: 'Solar Product', type: 'text', placeholder: 'e.g. SunPower Panel' },
                { key: 'quantity', label: 'Unit Quantity', type: 'number', placeholder: '1' },
                { key: 'price', label: 'Unit Price (₱)', type: 'number', placeholder: '0.00' },
              ].map(f => (
                <div key={f.key} className="space-y-1.5">
                  <label className="text-label-sm font-bold text-jds-on-surface-variant/80 uppercase tracking-wider">{f.label}</label>
                  <input
                    type={f.type}
                    required
                    value={form[f.key]}
                    onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                    className="h-11 w-full rounded-lg border border-jds-outline-variant/30 bg-jds-surface-container-low/20 px-4 text-body-md outline-none focus:border-jds-secondary focus:bg-jds-surface-container-lowest transition-all"
                    placeholder={f.placeholder}
                  />
                </div>
              ))}
              <div className="space-y-1.5">
                <label className="text-label-sm font-bold text-jds-on-surface-variant/80 uppercase tracking-wider">Order Status</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                  className="h-11 w-full rounded-lg border border-jds-outline-variant/30 bg-jds-surface-container-low/20 px-4 text-body-md outline-none focus:border-jds-secondary focus:bg-jds-surface-container-lowest transition-all"
                >
                  <option>Pending</option>
                  <option>Processing</option>
                  <option>Shipped</option>
                  <option>Delivered</option>
                  <option>Cancelled</option>
                </select>
              </div>
            </div>
            <div className="flex gap-4 pt-4 border-t border-jds-outline-variant/20">
              <Button type="submit" className="bg-jds-primary text-jds-on-primary px-8">{editingId ? 'Update Order' : 'Publish Order'}</Button>
              <Button variant="outline" onClick={resetForm} className="border-jds-outline-variant text-jds-on-surface-variant px-8">Discard</Button>
            </div>
          </form>
        </div>
      )}

      {/* Orders Table */}
      <div className="rounded-xl border border-jds-outline-variant/30 bg-jds-surface-container-lowest overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-jds-surface-container-low/10">
              <TableRow>
                <TableHead className="text-jds-on-surface-variant font-bold">Customer</TableHead>
                <TableHead className="text-jds-on-surface-variant font-bold">Location</TableHead>
                <TableHead className="text-jds-on-surface-variant font-bold">Product</TableHead>
                <TableHead className="text-jds-on-surface-variant font-bold">Qty</TableHead>
                <TableHead className="text-jds-on-surface-variant font-bold">Total Price</TableHead>
                <TableHead className="text-jds-on-surface-variant font-bold">Status</TableHead>
                <TableHead className="text-right text-jds-on-surface-variant font-bold">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-16 text-center text-body-md text-jds-on-surface-variant/50">No orders currently in the system.</TableCell>
                </TableRow>
              ) : (
                orders.map((o) => (
                  <TableRow key={o.id} className="hover:bg-jds-surface-container-low/5 transition-colors">
                    <TableCell className="font-bold text-jds-on-surface">{o.customer_name}</TableCell>
                    <TableCell className="text-jds-on-surface-variant max-w-[200px] truncate">{o.address}</TableCell>
                    <TableCell className="text-jds-on-surface-variant">{o.product_name}</TableCell>
                    <TableCell className="text-jds-on-surface font-medium">{o.quantity}</TableCell>
                    <TableCell className="text-jds-on-surface font-bold">₱{Number(o.price * o.quantity).toLocaleString()}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center rounded-full px-3 py-1 text-label-sm font-bold uppercase ${
                        o.status === 'Delivered' ? 'bg-jds-secondary-container/10 text-jds-secondary'
                          : o.status === 'Cancelled' ? 'bg-jds-error-container/10 text-jds-error'
                          : 'bg-jds-primary-container/10 text-jds-primary'
                      }`}>
                        {o.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleEdit(o)}
                          className="h-9 w-9 text-jds-secondary hover:bg-jds-secondary-container/10"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleDelete(o.id)} 
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
