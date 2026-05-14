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
    { label: 'Total Products', value: totalProducts, icon: Package, color: 'text-jds-secondary', bg: 'bg-jds-secondary-container/20' },
    { label: 'Total Stock', value: totalStock, icon: BarChart3, color: 'text-jds-primary', bg: 'bg-jds-primary-container/20' },
    { label: 'Price Range', value: priceRange, icon: DollarSign, color: 'text-jds-tertiary', bg: 'bg-jds-tertiary-container/20' },
    { label: 'Low Stock Items', value: lowStockProducts.length, icon: AlertTriangle, color: 'text-jds-error', bg: 'bg-jds-error-container/20' },
  ]

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center py-20 text-jds-on-surface-variant font-inter">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-jds-primary border-t-transparent" />
          <p>Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-[1200px] mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="space-y-1">
        <h1 className="text-headline-md font-bold text-jds-on-surface">Inventory Dashboard</h1>
        <p className="text-body-md text-jds-on-surface-variant">Strategic overview of solar product inventory and performance.</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon
          return (
            <div key={card.label} className="rounded-xl border border-jds-outline-variant/30 bg-jds-surface-container-lowest p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <p className="text-label-sm font-bold uppercase tracking-wider text-jds-on-surface-variant/70">{card.label}</p>
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${card.bg}`}>
                  <Icon className={`h-5 w-5 ${card.color}`} />
                </div>
              </div>
              <p className="text-headline-md font-bold text-jds-on-surface">{card.value}</p>
            </div>
          )
        })}
      </div>

      {/* Low Stock Alert Table */}
      <div className="rounded-xl border border-jds-outline-variant/30 bg-jds-surface-container-lowest overflow-hidden shadow-sm">
        <div className="border-b border-jds-outline-variant/30 px-6 py-5 bg-jds-surface-container-low/20">
          <h2 className="text-body-lg font-bold text-jds-on-surface">Low Stock Alert</h2>
          <p className="text-label-md text-jds-on-surface-variant">Products requiring immediate reordering attention.</p>
        </div>
        {lowStockProducts.length === 0 ? (
          <div className="px-6 py-12 text-center text-body-md text-jds-on-surface-variant">
            All products are currently sufficiently stocked.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-jds-surface-container-low/10">
                <TableRow>
                  <TableHead className="text-jds-on-surface-variant font-bold">Product</TableHead>
                  <TableHead className="text-jds-on-surface-variant font-bold">Type</TableHead>
                  <TableHead className="text-jds-on-surface-variant font-bold">Price</TableHead>
                  <TableHead className="text-jds-on-surface-variant font-bold">Stock</TableHead>
                  <TableHead className="text-jds-on-surface-variant font-bold">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lowStockProducts.map((p) => (
                  <TableRow key={p.id} className="hover:bg-jds-surface-container-low/5 transition-colors">
                    <TableCell className="font-bold text-jds-on-surface">{p.name}</TableCell>
                    <TableCell className="text-jds-on-surface-variant">{p.type}</TableCell>
                    <TableCell className="text-jds-on-surface font-medium">₱{Number(p.price).toLocaleString()}</TableCell>
                    <TableCell className="text-jds-error font-bold">{p.stock}</TableCell>
                    <TableCell>
                      <span className="inline-flex items-center rounded-full bg-jds-error-container/20 px-3 py-1 text-label-sm font-bold text-jds-error uppercase">
                        Low Stock
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  )
}
