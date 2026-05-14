import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { Button } from '../ui/button'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '../ui/table'
import { Search, Plus, Pencil, Trash2 } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

export default function ProductsScreen({ onNavigate }) {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('All Types')
  const [editingProduct, setEditingProduct] = useState(null)
  const { role } = useAuth()

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
    <div className="max-w-[1200px] mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-headline-md font-bold text-jds-on-surface">Solar Products</h1>
          <p className="text-body-md text-jds-on-surface-variant">Manage and curate the solar inventory catalog.</p>
        </div>
        <Button 
          onClick={() => onNavigate('add-product')} 
          className="bg-jds-primary text-jds-on-primary hover:opacity-90 rounded-lg px-6 gap-2"
        >
          <Plus className="h-4 w-4" /> Add Product
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4 bg-jds-surface-container-low/20 p-4 rounded-xl border border-jds-outline-variant/20">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-jds-on-surface-variant/50" />
          <input
            className="h-10 w-full rounded-lg border border-jds-outline-variant/30 bg-jds-surface-container-lowest pl-10 pr-4 text-body-md outline-none focus:border-jds-secondary focus:ring-2 focus:ring-jds-secondary/10 transition-all"
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-label-sm font-bold text-jds-on-surface-variant/70 uppercase tracking-wider">Type:</label>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="h-10 rounded-lg border border-jds-outline-variant/30 bg-jds-surface-container-lowest px-4 text-body-md outline-none focus:border-jds-secondary transition-all"
          >
            {types.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Edit Inline Panel */}
      {editingProduct && (
        <div className="rounded-xl border border-jds-outline-variant/40 bg-jds-surface-container-lowest p-8 space-y-6 shadow-lg animate-in slide-in-from-top-4 duration-300">
          <div className="flex items-center justify-between border-b border-jds-outline-variant/20 pb-4">
            <h3 className="text-body-lg font-bold text-jds-on-surface">Edit Product Details</h3>
            <span className="text-label-sm text-jds-on-surface-variant/50">ID: {editingProduct.id}</span>
          </div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { key: 'name', label: 'Product Name', type: 'text' },
              { key: 'type', label: 'Category Type', type: 'text' },
              { key: 'watt', label: 'Power (Watts)', type: 'number' },
              { key: 'price', label: 'Unit Price (₱)', type: 'number' },
              { key: 'efficiency', label: 'Efficiency (%)', type: 'number' },
              { key: 'measurements', label: 'Dimensions', type: 'text' },
              { key: 'sales', label: 'Total Sales', type: 'number' },
              { key: 'stock', label: 'Inventory Count', type: 'number' },
              { key: 'image_url', label: 'Product Image Link', type: 'text' },
            ].map(field => (
              <div key={field.key} className="space-y-1.5">
                <label className="text-label-sm font-bold text-jds-on-surface-variant/80">{field.label}</label>
                <input
                  type={field.type}
                  value={editingProduct[field.key] || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, [field.key]: field.type === 'number' ? Number(e.target.value) : e.target.value })}
                  className="h-11 w-full rounded-lg border border-jds-outline-variant/30 bg-jds-surface-container-low/20 px-4 text-body-md outline-none focus:border-jds-secondary focus:bg-jds-surface-container-lowest transition-all"
                />
              </div>
            ))}
            <div className="space-y-1.5">
              <label className="text-label-sm font-bold text-jds-on-surface-variant/80">Has Battery?</label>
              <select
                value={editingProduct.battery ? 'true' : 'false'}
                onChange={(e) => setEditingProduct({ ...editingProduct, battery: e.target.value === 'true' })}
                className="h-11 w-full rounded-lg border border-jds-outline-variant/30 bg-jds-surface-container-low/20 px-4 text-body-md outline-none focus:border-jds-secondary focus:bg-jds-surface-container-lowest transition-all"
              >
                <option value="false">No</option>
                <option value="true">Yes</option>
              </select>
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-label-sm font-bold text-jds-on-surface-variant/80">Extended Description</label>
            <textarea
              value={editingProduct.description || ''}
              onChange={(e) => setEditingProduct({ ...editingProduct, description: e.target.value })}
              rows={3}
              className="w-full rounded-lg border border-jds-outline-variant/30 bg-jds-surface-container-low/20 px-4 py-3 text-body-md outline-none focus:border-jds-secondary focus:bg-jds-surface-container-lowest transition-all"
            />
          </div>
          <div className="flex gap-4 pt-4 border-t border-jds-outline-variant/20">
            <Button onClick={handleEditSave} className="bg-jds-primary text-jds-on-primary px-8">Save Changes</Button>
            <Button variant="outline" onClick={() => setEditingProduct(null)} className="border-jds-outline-variant text-jds-on-surface-variant">Cancel</Button>
          </div>
        </div>
      )}

      {/* Products Table */}
      <div className="rounded-xl border border-jds-outline-variant/30 bg-jds-surface-container-lowest overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-jds-surface-container-low/10">
              <TableRow>
                <TableHead className="text-jds-on-surface-variant font-bold">Product</TableHead>
                <TableHead className="text-jds-on-surface-variant font-bold">Category</TableHead>
                <TableHead className="text-jds-on-surface-variant font-bold">Price</TableHead>
                <TableHead className="text-jds-on-surface-variant font-bold">Power</TableHead>
                <TableHead className="text-jds-on-surface-variant font-bold">Sales</TableHead>
                <TableHead className="text-jds-on-surface-variant font-bold">Inventory</TableHead>
                <TableHead className="text-right text-jds-on-surface-variant font-bold">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-16 text-body-md text-jds-on-surface-variant/50">
                    No matching products found in the catalog.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((p) => (
                  <TableRow key={p.id} className="hover:bg-jds-surface-container-low/5 transition-colors">
                    <TableCell className="font-bold text-jds-on-surface">{p.name}</TableCell>
                    <TableCell className="text-jds-on-surface-variant">{p.type}</TableCell>
                    <TableCell className="text-jds-on-surface font-medium">₱{Number(p.price).toLocaleString()}</TableCell>
                    <TableCell className="text-jds-on-surface-variant">{p.watt}W</TableCell>
                    <TableCell className="text-jds-on-surface-variant">{p.sales || 0}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center rounded-full px-3 py-1 text-label-sm font-bold uppercase ${
                        (p.stock || 0) >= 10
                          ? 'bg-jds-secondary-container/10 text-jds-secondary'
                          : 'bg-jds-error-container/10 text-jds-error'
                      }`}>
                        {(p.stock || 0) >= 10 ? 'Optimal' : 'Low Stock'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => setEditingProduct({ ...p })}
                          className="h-9 w-9 text-jds-secondary hover:bg-jds-secondary-container/10"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        {role === 'admin' && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handleDelete(p.id)} 
                            className="h-9 w-9 text-jds-error hover:bg-jds-error-container/10"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
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
