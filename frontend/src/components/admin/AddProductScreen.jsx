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
    measurements: '',
    product_overview: '',
    sales: 0,
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
      measurements: form.measurements,
      product_overview: form.product_overview,
      sales: Number(form.sales),
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
    <div className="max-w-[1200px] mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center gap-4">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => onNavigate('products')}
          className="h-10 w-10 text-jds-on-surface-variant hover:bg-jds-surface-container-low"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="space-y-1">
          <h1 className="text-headline-md font-bold text-jds-on-surface">Add New Product</h1>
          <p className="text-body-md text-jds-on-surface-variant">Expand the solar catalog with a new inventory item.</p>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-jds-error-container/10 border border-jds-error/20 p-4 text-body-sm text-jds-error">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="rounded-xl border border-jds-outline-variant/30 bg-jds-surface-container-lowest p-8 shadow-sm space-y-8">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-2">
            <label className="text-label-sm font-bold text-jds-on-surface-variant/80 uppercase tracking-wider">Product Name</label>
            <input
              required
              value={form.name}
              onChange={(e) => handleChange('name', e.target.value)}
              className="h-11 w-full rounded-lg border border-jds-outline-variant/30 bg-jds-surface-container-low/20 px-4 text-body-md outline-none focus:border-jds-secondary focus:bg-jds-surface-container-lowest transition-all"
              placeholder="e.g. SunPower Maxeon 7"
            />
          </div>
          <div className="space-y-2">
            <label className="text-label-sm font-bold text-jds-on-surface-variant/80 uppercase tracking-wider">Type</label>
            <select
              value={form.type}
              onChange={(e) => handleChange('type', e.target.value)}
              className="h-11 w-full rounded-lg border border-jds-outline-variant/30 bg-jds-surface-container-low/20 px-4 text-body-md outline-none focus:border-jds-secondary focus:bg-jds-surface-container-lowest transition-all"
            >
              <option>Monocrystalline</option>
              <option>Polycrystalline</option>
              <option>Heterojunction</option>
              <option>BIPV</option>
              <option>AC Battery</option>
              <option>AC/DC Battery</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-label-sm font-bold text-jds-on-surface-variant/80 uppercase tracking-wider">Wattage (W)</label>
            <input
              type="number"
              required
              value={form.watt}
              onChange={(e) => handleChange('watt', e.target.value)}
              className="h-11 w-full rounded-lg border border-jds-outline-variant/30 bg-jds-surface-container-low/20 px-4 text-body-md outline-none focus:border-jds-secondary focus:bg-jds-surface-container-lowest transition-all"
              placeholder="440"
            />
          </div>
          <div className="space-y-2">
            <label className="text-label-sm font-bold text-jds-on-surface-variant/80 uppercase tracking-wider">Price (₱)</label>
            <input
              type="number"
              required
              value={form.price}
              onChange={(e) => handleChange('price', e.target.value)}
              className="h-11 w-full rounded-lg border border-input bg-jds-surface-container-low/20 px-4 text-body-md outline-none focus:border-jds-secondary focus:bg-jds-surface-container-lowest transition-all"
              placeholder="35000"
            />
          </div>
          <div className="space-y-2">
            <label className="text-label-sm font-bold text-jds-on-surface-variant/80 uppercase tracking-wider">Efficiency (%)</label>
            <input
              type="number"
              step="0.1"
              required
              value={form.efficiency}
              onChange={(e) => handleChange('efficiency', e.target.value)}
              className="h-11 w-full rounded-lg border border-jds-outline-variant/30 bg-jds-surface-container-low/20 px-4 text-body-md outline-none focus:border-jds-secondary focus:bg-jds-surface-container-lowest transition-all"
              placeholder="22.8"
            />
          </div>
          <div className="space-y-2">
            <label className="text-label-sm font-bold text-jds-on-surface-variant/80 uppercase tracking-wider">Measurements</label>
            <input
              value={form.measurements}
              onChange={(e) => handleChange('measurements', e.target.value)}
              className="h-11 w-full rounded-lg border border-jds-outline-variant/30 bg-jds-surface-container-low/20 px-4 text-body-md outline-none focus:border-jds-secondary focus:bg-jds-surface-container-lowest transition-all"
              placeholder="e.g. 1046mm x 1690mm x 40mm"
            />
          </div>
          <div className="space-y-2">
            <label className="text-label-sm font-bold text-jds-on-surface-variant/80 uppercase tracking-wider">Stock Count</label>
            <input
              type="number"
              required
              value={form.stock}
              onChange={(e) => handleChange('stock', e.target.value)}
              className="h-11 w-full rounded-lg border border-jds-outline-variant/30 bg-jds-surface-container-low/20 px-4 text-body-md outline-none focus:border-jds-secondary focus:bg-jds-surface-container-lowest transition-all"
              placeholder="25"
            />
          </div>
          <div className="space-y-2">
            <label className="text-label-sm font-bold text-jds-on-surface-variant/80 uppercase tracking-wider">Initial Sales</label>
            <input
              type="number"
              value={form.sales}
              onChange={(e) => handleChange('sales', e.target.value)}
              className="h-11 w-full rounded-lg border border-jds-outline-variant/30 bg-jds-surface-container-low/20 px-4 text-body-md outline-none focus:border-jds-secondary focus:bg-jds-surface-container-lowest transition-all"
              placeholder="0"
            />
          </div>
          <div className="flex items-center gap-3 pt-8">
            <input
              type="checkbox"
              id="includes-battery"
              checked={form.battery}
              onChange={(e) => handleChange('battery', e.target.checked)}
              className="h-5 w-5 rounded border-jds-outline-variant/30 accent-jds-primary cursor-pointer"
            />
            <label htmlFor="includes-battery" className="text-body-md font-medium text-jds-on-surface cursor-pointer">Includes Battery</label>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-label-sm font-bold text-jds-on-surface-variant/80 uppercase tracking-wider">Image URL</label>
          <input
            value={form.image_url}
            onChange={(e) => handleChange('image_url', e.target.value)}
            className="h-11 w-full rounded-lg border border-jds-outline-variant/30 bg-jds-surface-container-low/20 px-4 text-body-md outline-none focus:border-jds-secondary focus:bg-jds-surface-container-lowest transition-all"
            placeholder="https://images.unsplash.com/..."
          />
        </div>

        <div className="space-y-2">
          <label className="text-label-sm font-bold text-jds-on-surface-variant/80 uppercase tracking-wider">Brief Description</label>
          <textarea
            value={form.description}
            onChange={(e) => handleChange('description', e.target.value)}
            rows={2}
            className="w-full rounded-lg border border-jds-outline-variant/30 bg-jds-surface-container-low/20 px-4 py-3 text-body-md outline-none focus:border-jds-secondary focus:bg-jds-surface-container-lowest transition-all"
            placeholder="Short marketing hook..."
          />
        </div>

        <div className="space-y-2">
          <label className="text-label-sm font-bold text-jds-on-surface-variant/80 uppercase tracking-wider">Technical Overview</label>
          <textarea
            value={form.product_overview}
            onChange={(e) => handleChange('product_overview', e.target.value)}
            rows={4}
            className="w-full rounded-lg border border-jds-outline-variant/30 bg-jds-surface-container-low/20 px-4 py-3 text-body-md outline-none focus:border-jds-secondary focus:bg-jds-surface-container-lowest transition-all"
            placeholder="Detailed technical specifications and features..."
          />
        </div>

        <div className="flex gap-4 pt-6 border-t border-jds-outline-variant/20">
          <Button 
            type="submit" 
            disabled={saving} 
            className="bg-jds-primary text-jds-on-primary hover:opacity-90 px-10 h-12 text-body-md font-bold rounded-lg"
          >
            {saving ? (
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Saving Product...
              </div>
            ) : 'Publish Product'}
          </Button>
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => onNavigate('products')}
            className="border-jds-outline-variant text-jds-on-surface-variant px-8 h-12 text-body-md rounded-lg"
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  )
}
