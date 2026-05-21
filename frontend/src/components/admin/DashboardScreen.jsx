import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { Package, BarChart3, Zap, AlertTriangle } from 'lucide-react'
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
      .select('id, name, type, watt, waterproof_grade, material, battery, in_stock, sales')
      .order('id')
    if (!error) setProducts(data || [])
    setLoading(false)
  }

  const totalProducts = products.length
  const totalSales = products.reduce((sum, p) => sum + (p.sales || 0), 0)
  const wattRange = products.length > 0
    ? `${Math.min(...products.map(p => p.watt || 0))}W – ${Math.max(...products.map(p => p.watt || 0))}W`
    : '—'
  const outOfStockProducts = products.filter(p => !p.in_stock)

  const cards = [
    { label: 'Total Products', value: totalProducts, icon: Package, color: 'text-jds-secondary', bg: 'bg-jds-secondary-container/20' },
    { label: 'Total Sales', value: totalSales, icon: BarChart3, color: 'text-jds-primary', bg: 'bg-jds-primary-container/20' },
    { label: 'Wattage Range', value: wattRange, icon: Zap, color: 'text-jds-tertiary', bg: 'bg-jds-tertiary-container/20' },
    { label: 'Out of Stock', value: outOfStockProducts.length, icon: AlertTriangle, color: 'text-jds-error', bg: 'bg-jds-error-container/20' },
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

      {/* Product Overview Table */}
      <div className="rounded-xl border border-jds-outline-variant/30 bg-jds-surface-container-lowest overflow-hidden shadow-sm">
        <div className="border-b border-jds-outline-variant/30 px-6 py-5 bg-jds-surface-container-low/20">
          <h2 className="text-body-lg font-bold text-jds-on-surface">Product Overview</h2>
          <p className="text-label-md text-jds-on-surface-variant">All solar lights in the current inventory.</p>
        </div>
        {products.length === 0 ? (
          <div className="px-6 py-12 text-center text-body-md text-jds-on-surface-variant">
            No products in the catalog yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-jds-surface-container-low/10">
                <TableRow>
                  <TableHead className="text-jds-on-surface-variant font-bold">Product</TableHead>
                  <TableHead className="text-jds-on-surface-variant font-bold">Type</TableHead>
                  <TableHead className="text-jds-on-surface-variant font-bold">Power</TableHead>
                  <TableHead className="text-jds-on-surface-variant font-bold">Waterproof</TableHead>
                  <TableHead className="text-jds-on-surface-variant font-bold">Sales</TableHead>
                  <TableHead className="text-jds-on-surface-variant font-bold">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.slice(0, 10).map((p) => (
                  <TableRow key={p.id} className="hover:bg-jds-surface-container-low/5 transition-colors">
                    <TableCell className="font-bold text-jds-on-surface">{p.name}</TableCell>
                    <TableCell className="text-jds-on-surface-variant text-label-sm">{p.type}</TableCell>
                    <TableCell className="text-jds-on-surface font-medium">{p.watt}W</TableCell>
                    <TableCell className="text-jds-on-surface-variant">{p.waterproof_grade || '—'}</TableCell>
                    <TableCell className="text-jds-on-surface-variant">{p.sales || 0}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center rounded-full px-3 py-1 text-label-sm font-bold uppercase ${
                        p.in_stock
                          ? 'bg-jds-secondary-container/10 text-jds-secondary'
                          : 'bg-jds-error-container/20 text-jds-error'
                      }`}>
                        {p.in_stock ? 'In Stock' : 'Out'}
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
