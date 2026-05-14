import { useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { Button } from '../ui/button'
import { ArrowLeft } from 'lucide-react'

export default function AddProductScreen({ onNavigate }) {
  const [form, setForm] = useState({
    name: '',
    type: 'Monocrystalline',
    watt: '',
    price: '',
    efficiency: '',
    battery: false,
    roof_size: 'Small',
    stock: '',
    description: '',
    image_url: 'https://via.placeholder.com/150',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleChange = (key, value) => {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSaving(true)

    const payload = {
      name: form.name,
      type: form.type,
      watt: Number(form.watt),
      price: Number(form.price),
      efficiency: Number(form.efficiency),
      battery: form.battery,
      roof_size: form.roof_size,
      stock: Number(form.stock),
      description: form.description,
      image_url: form.image_url,
    }

    const { error: insertError } = await supabase.from('products').insert([payload])

    if (insertError) {
      setError(insertError.message)
    } else {
      onNavigate('products')
    }
    setSaving(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon-sm" onClick={() => onNavigate('products')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Add New Product</h1>
          <p className="text-sm text-muted-foreground">Fill in the details for a new solar product.</p>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="max-w-2xl space-y-5 rounded-xl border bg-card p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Product Name</label>
            <input
              required
              value={form.name}
              onChange={(e) => handleChange('name', e.target.value)}
              className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
              placeholder="e.g. SunPower Maxeon 7"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Type</label>
            <select
              value={form.type}
              onChange={(e) => handleChange('type', e.target.value)}
              className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
            >
              <option>Monocrystalline</option>
              <option>Polycrystalline</option>
              <option>Heterojunction</option>
              <option>BIPV</option>
              <option>AC Battery</option>
              <option>AC/DC Battery</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Wattage</label>
            <input
              type="number"
              required
              value={form.watt}
              onChange={(e) => handleChange('watt', e.target.value)}
              className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
              placeholder="440"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Price (₱)</label>
            <input
              type="number"
              required
              value={form.price}
              onChange={(e) => handleChange('price', e.target.value)}
              className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
              placeholder="350"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Efficiency (%)</label>
            <input
              type="number"
              step="0.1"
              required
              value={form.efficiency}
              onChange={(e) => handleChange('efficiency', e.target.value)}
              className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
              placeholder="22.8"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Roof Size</label>
            <select
              value={form.roof_size}
              onChange={(e) => handleChange('roof_size', e.target.value)}
              className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
            >
              <option>Small</option>
              <option>Medium</option>
              <option>Large</option>
              <option>N/A</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Stock</label>
            <input
              type="number"
              required
              value={form.stock}
              onChange={(e) => handleChange('stock', e.target.value)}
              className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
              placeholder="25"
            />
          </div>
          <div className="flex items-end space-y-1.5">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.battery}
                onChange={(e) => handleChange('battery', e.target.checked)}
                className="h-4 w-4 rounded border-input accent-primary"
              />
              Includes Battery
            </label>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Image URL</label>
          <input
            value={form.image_url}
            onChange={(e) => handleChange('image_url', e.target.value)}
            className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Description</label>
          <textarea
            value={form.description}
            onChange={(e) => handleChange('description', e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
            placeholder="Brief product description..."
          />
        </div>

        <Button type="submit" disabled={saving} className="w-full sm:w-auto">
          {saving ? 'Saving...' : 'Add Product'}
        </Button>
      </form>
    </div>
  )
}
