import { useEffect, useState, useMemo } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { Button } from '../ui/button'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '../ui/table'
import { Plus, Pencil, Trash2, X, Search, RotateCcw } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import ViewModeToggle from './ViewModeToggle'
const emptyOrder = { customer_name: '', address: '', product_name: '', quantity: 1, price: '', status: 'Pending' }
const ORDER_STATUSES = ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled']

export default function OrdersScreen() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyOrder)
  const [editingId, setEditingId] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [sortOrder, setSortOrder] = useState('newest')
  const [viewMode, setViewMode] = useState('table') // 'table' | 'cards'
  const { role } = useAuth()

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

  const filteredOrders = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    const list = orders.filter((o) => {
      if (statusFilter !== 'ALL' && o.status !== statusFilter) return false
      if (!q) return true
      return (
        (o.customer_name || '').toLowerCase().includes(q) ||
        (o.address || '').toLowerCase().includes(q) ||
        (o.product_name || '').toLowerCase().includes(q)
      )
    })

    if (sortOrder === 'total_desc') {
      return [...list].sort((a, b) => Number(b.price * b.quantity) - Number(a.price * a.quantity))
    }
    if (sortOrder === 'total_asc') {
      return [...list].sort((a, b) => Number(a.price * a.quantity) - Number(b.price * b.quantity))
    }
    if (sortOrder === 'name') {
      return [...list].sort((a, b) => (a.customer_name || '').localeCompare(b.customer_name || ''))
    }
    return [...list].sort((a, b) => Number(b.id || 0) - Number(a.id || 0))
  }, [orders, searchQuery, statusFilter, sortOrder])

  const getStatusBadgeClass = (status) => {
    if (status === 'Delivered') return 'bg-emerald-500/10 text-emerald-700'
    if (status === 'Cancelled') return 'bg-jds-error-container text-jds-error'
    return 'bg-jds-primary-fixed text-jds-primary'
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20 text-muted-foreground">Loading orders...</div>
  }

  return (
    <div className="max-w-[1440px] mx-auto space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <h1 className="text-lg sm:text-xl font-bold text-jds-on-surface">Orders</h1>
          <span className="rounded-full bg-jds-surface-container px-2.5 py-0.5 text-xs font-bold text-jds-on-surface-variant tabular-nums">
            {orders.length}
          </span>
        </div>
        {role === 'admin' && (
          <Button onClick={() => { resetForm(); setShowForm(true) }} className="bg-jds-primary text-jds-on-primary hover:opacity-90 rounded-lg px-4 h-9 text-xs font-bold gap-1.5">
            <Plus className="h-3.5 w-3.5" /> Add Order
          </Button>
        )}
      </div>

      {/* Filter & View Bar */}
      <div className="jds-panel p-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-jds-on-surface-variant/50" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search customer, product, or address..."
              className="jds-control w-full pl-9 pr-8"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-jds-on-surface-variant/60 hover:text-jds-on-surface cursor-pointer"
                aria-label="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <select
            aria-label="Filter by order status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="jds-control px-3 font-semibold cursor-pointer"
          >
            <option value="ALL">All Statuses ({orders.length})</option>
            {ORDER_STATUSES.map((st) => (
              <option key={st} value={st}>
                {st} ({orders.filter((o) => o.status === st).length})
              </option>
            ))}
          </select>

          <select
            aria-label="Sort orders"
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            className="jds-control px-3 font-semibold cursor-pointer"
          >
            <option value="newest">Newest First</option>
            {role !== 'staff' && <option value="total_desc">Highest Total</option>}
            {role !== 'staff' && <option value="total_asc">Lowest Total</option>}
            <option value="name">Customer (A–Z)</option>
          </select>

          {(searchQuery || statusFilter !== 'ALL' || sortOrder !== 'newest') && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('')
                setStatusFilter('ALL')
                setSortOrder('newest')
              }}
              className="jds-control px-3 font-semibold text-jds-on-surface-variant hover:text-jds-primary flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Reset</span>
            </button>
          )}

          <div className="ml-auto">
            <ViewModeToggle value={viewMode} onChange={setViewMode} />
          </div>
        </div>
      </div>

      {/* Add / Edit Form */}
      {showForm && (
        <div className="rounded-xl border border-jds-outline-variant/40 bg-jds-surface-container-lowest p-4 sm:p-8 space-y-6 shadow-lg animate-in slide-in-from-top-4 duration-300">
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

      {/* Orders Table (default) or Card Grid */}
      {viewMode === 'cards' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredOrders.length === 0 ? (
            <div className="col-span-full jds-panel py-16 text-center text-body-md text-jds-on-surface-variant/60">
              No orders match your filters.
            </div>
          ) : (
            filteredOrders.map((o) => (
              <div
                key={o.id}
                className="jds-card p-4 flex flex-col justify-between gap-3"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="font-bold text-jds-on-surface truncate">{o.customer_name}</h3>
                      <p className="text-xs text-jds-on-surface-variant line-clamp-2">{o.address}</p>
                    </div>
                    <span className={`shrink-0 inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase ${getStatusBadgeClass(o.status)}`}>
                      {o.status}
                    </span>
                  </div>
                  <div className="rounded-lg bg-jds-surface-container-low px-3 py-2 flex items-center justify-between text-xs">
                    <span className="font-medium text-jds-on-surface truncate pr-2">{o.product_name} × {o.quantity}</span>
                    {role !== 'staff' && (
                      <span className="font-bold text-jds-primary shrink-0 tabular-nums">₱{Number(o.price * o.quantity).toLocaleString()}</span>
                    )}
                  </div>
                </div>
                {role === 'admin' && (
                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-jds-outline-variant/60">
                    <Button variant="outline" size="sm" onClick={() => handleEdit(o)} className="h-8 rounded-lg text-xs">
                      <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleDelete(o.id)} className="h-8 rounded-lg text-xs text-jds-error border-jds-error/30">
                      <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
                    </Button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="jds-panel overflow-hidden">
          <div className="md:hidden divide-y divide-jds-outline-variant/60">
            {filteredOrders.length === 0 ? (
              <div className="py-12 px-4 text-center text-body-md text-jds-on-surface-variant/50">
                No orders match your filters.
              </div>
            ) : (
              filteredOrders.map((o) => (
                <div key={o.id} className="p-4 space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-bold text-jds-on-surface truncate">{o.customer_name}</div>
                      <div className="text-xs text-jds-on-surface-variant line-clamp-2">{o.address}</div>
                    </div>
                    <span className={`shrink-0 inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold uppercase ${getStatusBadgeClass(o.status)}`}>
                      {o.status}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs pt-1">
                    <span className="text-jds-on-surface-variant truncate pr-2">{o.product_name} × {o.quantity}</span>
                    {role !== 'staff' && (
                      <span className="font-bold text-jds-on-surface shrink-0 tabular-nums">₱{Number(o.price * o.quantity).toLocaleString()}</span>
                    )}
                  </div>
                  {role === 'admin' && (
                    <div className="flex items-center justify-end gap-2 pt-1">
                      <Button variant="outline" size="sm" onClick={() => handleEdit(o)} className="rounded-lg text-jds-on-surface">
                        <Pencil className="h-4 w-4 mr-1" /> Edit
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleDelete(o.id)} className="rounded-lg text-jds-error">
                        <Trash2 className="h-4 w-4 mr-1" /> Delete
                      </Button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
          <div className="hidden md:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Qty</TableHead>
                  {role !== 'staff' && (
                    <TableHead>Total Price</TableHead>
                  )}
                  <TableHead>Status</TableHead>
                  {role === 'admin' && (
                    <TableHead className="text-right">Actions</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-16 text-center text-body-md text-jds-on-surface-variant/50">No orders match your filters.</TableCell>
                  </TableRow>
                ) : (
                  filteredOrders.map((o) => (
                    <TableRow key={o.id}>
                      <TableCell className="font-bold text-jds-on-surface">{o.customer_name}</TableCell>
                      <TableCell className="text-jds-on-surface-variant max-w-[200px] truncate">{o.address}</TableCell>
                      <TableCell className="text-jds-on-surface-variant">{o.product_name}</TableCell>
                      <TableCell className="text-jds-on-surface font-medium tabular-nums">{o.quantity}</TableCell>
                      {role !== 'staff' && (
                        <TableCell className="text-jds-on-surface font-bold tabular-nums">₱{Number(o.price * o.quantity).toLocaleString()}</TableCell>
                      )}
                      <TableCell>
                        <span className={`inline-flex items-center rounded-full px-3 py-1 text-label-sm font-bold uppercase ${getStatusBadgeClass(o.status)}`}>
                          {o.status}
                        </span>
                      </TableCell>
                      {role === 'admin' && (
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(o)}
                              className="h-8 w-8 rounded-lg text-jds-on-surface-variant hover:text-jds-primary hover:bg-jds-surface-container"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(o.id)}
                              className="h-8 w-8 rounded-lg text-jds-error hover:bg-jds-error-container/40"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  )
}
