import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { Package, BarChart3, DollarSign, AlertTriangle } from 'lucide-react'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '../ui/table'

export default function DashboardScreen() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchProducts()
  }, [])

  const fetchProducts = async () => {
    const { data, error } = await supabase
      .from('products')
      .select('id, name, type, price, stock, watt, efficiency')
      .order('id')
    if (!error) setProducts(data || [])
    setLoading(false)
  }

  const totalProducts = products.length
  const totalStock = products.reduce((sum, p) => sum + (p.stock || 0), 0)
  const prices = products.map(p => Number(p.price)).filter(Boolean)
  const priceRange = prices.length > 0
    ? `₱${Math.min(...prices).toLocaleString()} – ₱${Math.max(...prices).toLocaleString()}`
    : '—'
  const lowStockProducts = products.filter(p => (p.stock || 0) < 10)

  const cards = [
    { label: 'Total Products', value: totalProducts, icon: Package, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { label: 'Total Stock', value: totalStock, icon: BarChart3, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { label: 'Price Range', value: priceRange, icon: DollarSign, color: 'text-amber-500', bg: 'bg-amber-500/10' },
    { label: 'Low Stock Items', value: lowStockProducts.length, icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-500/10' },
  ]

  if (loading) {
    return <div className="flex items-center justify-center py-20 text-muted-foreground">Loading dashboard...</div>
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Overview of your solar product inventory.</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon
          return (
            <div key={card.label} className="rounded-xl border bg-card p-5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-muted-foreground">{card.label}</p>
                <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${card.bg}`}>
                  <Icon className={`h-4 w-4 ${card.color}`} />
                </div>
              </div>
              <p className="mt-2 text-2xl font-bold">{card.value}</p>
            </div>
          )
        })}
      </div>

      {/* Low Stock Alert Table */}
      <div className="rounded-xl border bg-card">
        <div className="border-b px-5 py-4">
          <h2 className="text-sm font-semibold">Low Stock Alert</h2>
          <p className="text-xs text-muted-foreground">Products with fewer than 10 units in stock.</p>
        </div>
        {lowStockProducts.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-muted-foreground">
            All products are sufficiently stocked.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lowStockProducts.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell>{p.type}</TableCell>
                  <TableCell>₱{Number(p.price).toLocaleString()}</TableCell>
                  <TableCell>{p.stock}</TableCell>
                  <TableCell>
                    <span className="inline-flex items-center rounded-full bg-red-500/10 px-2 py-0.5 text-xs font-medium text-red-500">
                      Low Stock
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  )
}
