import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { Button } from '../ui/button'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '../ui/table'
import { Search, Plus, Pencil, Trash2 } from 'lucide-react'

export default function ProductsScreen({ onNavigate }) {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('All Types')
  const [editingProduct, setEditingProduct] = useState(null)

  useEffect(() => {
    fetchProducts()
  }, [])

  const fetchProducts = async () => {
    const { data, error } = await supabase
      .from('products')
      .select('id, name, type, price, efficiency, battery, measurements, stock, watt, description, image_url, product_overview, product_details, sales')
      .order('id')
    if (!error) setProducts(data || [])
    setLoading(false)
  }

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this product?')) return
    const { error } = await supabase.from('products').delete().eq('id', id)
    if (!error) setProducts(products.filter(p => p.id !== id))
  }

  const handleEditSave = async () => {
    if (!editingProduct) return
    const { id, name, type, price, efficiency, battery, measurements, stock, watt, description, image_url, product_overview, product_details, sales } = editingProduct
    const { error } = await supabase
      .from('products')
      .update({ name, type, price, efficiency, battery, measurements, stock, watt, description, image_url, product_overview, product_details, sales })
      .eq('id', id)
    if (!error) {
      setProducts(products.map(p => p.id === id ? editingProduct : p))
      setEditingProduct(null)
    }
  }

  const types = ['All Types', ...new Set(products.map(p => p.type).filter(Boolean))]

  const filtered = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.type || '').toLowerCase().includes(search.toLowerCase())
    const matchesType = typeFilter === 'All Types' || p.type === typeFilter
    return matchesSearch && matchesType
  })

  if (loading) {
    return <div className="flex items-center justify-center py-20 text-muted-foreground">Loading products...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Solar Products</h1>
        <Button onClick={() => onNavigate('add-product')} className="gap-2">
          <Plus className="h-4 w-4" /> Add Product
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            className="h-9 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="h-9 rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
        >
          {types.map(t => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      {/* Edit Inline Panel */}
      {editingProduct && (
        <div className="rounded-xl border bg-card p-5 space-y-4">
          <h3 className="text-sm font-semibold">Edit Product</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { key: 'name', label: 'Name', type: 'text' },
              { key: 'type', label: 'Type', type: 'text' },
              { key: 'watt', label: 'Watt', type: 'number' },
              { key: 'price', label: 'Price', type: 'number' },
              { key: 'efficiency', label: 'Efficiency (%)', type: 'number' },
              { key: 'measurements', label: 'Measurements', type: 'text' },
              { key: 'sales', label: 'Sales', type: 'number' },
              { key: 'stock', label: 'Stock', type: 'number' },
              { key: 'image_url', label: 'Image URL', type: 'text' },
            ].map(field => (
              <div key={field.key} className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">{field.label}</label>
                <input
                  type={field.type}
                  value={editingProduct[field.key] || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, [field.key]: field.type === 'number' ? Number(e.target.value) : e.target.value })}
                  className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
                />
              </div>
            ))}
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Battery</label>
              <select
                value={editingProduct.battery ? 'true' : 'false'}
                onChange={(e) => setEditingProduct({ ...editingProduct, battery: e.target.value === 'true' })}
                className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
              >
                <option value="false">No</option>
                <option value="true">Yes</option>
              </select>
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Description</label>
            <textarea
              value={editingProduct.description || ''}
              onChange={(e) => setEditingProduct({ ...editingProduct, description: e.target.value })}
              rows={2}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
            />
          </div>
          <div className="flex gap-2">
            <Button onClick={handleEditSave}>Save Changes</Button>
            <Button variant="outline" onClick={() => setEditingProduct(null)}>Cancel</Button>
          </div>
        </div>
      )}

      {/* Products Table */}
      <div className="rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Measurements</TableHead>
              <TableHead>Efficiency</TableHead>
              <TableHead>Sales</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                  No products found.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell>{p.type}</TableCell>
                  <TableCell>₱{Number(p.price).toLocaleString()}</TableCell>
                  <TableCell>{p.measurements}</TableCell>
                  <TableCell>{p.efficiency}%</TableCell>
                  <TableCell>{p.sales || 0}</TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                      (p.stock || 0) >= 10
                        ? 'bg-emerald-500/10 text-emerald-500'
                        : 'bg-red-500/10 text-red-500'
                    }`}>
                      {(p.stock || 0) >= 10 ? 'Active' : 'Low Stock'}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon-sm" onClick={() => setEditingProduct({ ...p })}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon-sm" onClick={() => handleDelete(p.id)} className="text-destructive hover:text-destructive">
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
