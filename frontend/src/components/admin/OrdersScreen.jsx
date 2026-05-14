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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Orders</h1>
        <Button onClick={() => { resetForm(); setShowForm(true) }} className="gap-2">
          <Plus className="h-4 w-4" /> Add Order
        </Button>
      </div>

      {/* Add / Edit Form */}
      {showForm && (
        <div className="rounded-xl border bg-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">{editingId ? 'Edit Order' : 'New Order'}</h3>
            <Button variant="ghost" size="icon-sm" onClick={resetForm}><X className="h-4 w-4" /></Button>
          </div>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { key: 'customer_name', label: 'Customer Name', type: 'text' },
              { key: 'address', label: 'Address', type: 'text' },
              { key: 'product_name', label: 'Product Name', type: 'text' },
              { key: 'quantity', label: 'Quantity', type: 'number' },
              { key: 'price', label: 'Price', type: 'number' },
            ].map(f => (
              <div key={f.key} className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">{f.label}</label>
                <input
                  type={f.type}
                  required
                  value={form[f.key]}
                  onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                  className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
                />
              </div>
            ))}
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Status</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
              >
                <option>Pending</option>
                <option>Processing</option>
                <option>Shipped</option>
                <option>Delivered</option>
                <option>Cancelled</option>
              </select>
            </div>
            <div className="sm:col-span-2 lg:col-span-3">
              <Button type="submit">{editingId ? 'Save Changes' : 'Create Order'}</Button>
            </div>
          </form>
        </div>
      )}

      {/* Orders Table */}
      <div className="rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Address</TableHead>
              <TableHead>Product Name</TableHead>
              <TableHead>Quantity</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">No orders yet.</TableCell>
              </TableRow>
            ) : (
              orders.map((o) => (
                <TableRow key={o.id}>
                  <TableCell className="font-medium">{o.customer_name}</TableCell>
                  <TableCell>{o.address}</TableCell>
                  <TableCell>{o.product_name}</TableCell>
                  <TableCell>{o.quantity}</TableCell>
                  <TableCell>₱{Number(o.price).toLocaleString()}</TableCell>
                  <TableCell>{o.order_date ? new Date(o.order_date).toLocaleDateString() : '—'}</TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                      o.status === 'Delivered' ? 'bg-emerald-500/10 text-emerald-500'
                        : o.status === 'Cancelled' ? 'bg-red-500/10 text-red-500'
                        : 'bg-amber-500/10 text-amber-600'
                    }`}>
                      {o.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon-sm" onClick={() => handleEdit(o)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon-sm" onClick={() => handleDelete(o.id)} className="text-destructive hover:text-destructive">
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
