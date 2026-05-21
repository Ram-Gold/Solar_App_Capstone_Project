import { useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { Button } from '../ui/button'
import { ArrowLeft } from 'lucide-react'

const PRODUCT_TYPES = [
  'Aviation Aluminum Solar Light',
  'Aviation Aluminum Solar Road Light',
  'Aviation Aluminum Solar Street Light',
  'Integrated Solar Street Light',
  'Aluminum Solar Street Light',
  'Solar Streetlight',
]

export default function AddProductScreen({ onNavigate }) {
  const [form, setForm] = useState({
    name: '',
    type: PRODUCT_TYPES[0],
    watt: '',
    waterproof_grade: 'IP65',
    method_control: '',
    material: '',
    solar_panel: '',
    battery: '',
    charging_time: '',
    charging_type: 'Solar Charging',
    smd_lamp_beads: '',
    lighting_time: '',
    size: '',
    in_stock: true,
    sales: 0,
    image_url: '',
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
      watt: Number(form.watt) || null,
      waterproof_grade: form.waterproof_grade || null,
      method_control: form.method_control || null,
      material: form.material || null,
      solar_panel: form.solar_panel || null,
      battery: form.battery || null,
      charging_time: form.charging_time || null,
      charging_type: form.charging_type || null,
      smd_lamp_beads: form.smd_lamp_beads || null,
      lighting_time: form.lighting_time || null,
      size: form.size || null,
      in_stock: form.in_stock,
      sales: Number(form.sales) || 0,
      image_url: form.image_url || null,
    }

    const { error: insertError } = await supabase.from('products').insert([payload])

    if (insertError) {
      setError(insertError.message)
    } else {
      onNavigate('products')
    }
    setSaving(false)
  }

  const inputClass = "h-11 w-full rounded-lg border border-jds-outline-variant/30 bg-jds-surface-container-low/20 px-4 text-body-md outline-none focus:border-jds-secondary focus:bg-jds-surface-container-lowest transition-all"

  return (
    <div className="max-w-[1200px] mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => onNavigate('products')} className="h-10 w-10 text-jds-on-surface-variant hover:bg-jds-surface-container-low">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="space-y-1">
          <h1 className="text-headline-md font-bold text-jds-on-surface">Add New Product</h1>
          <p className="text-body-md text-jds-on-surface-variant">Expand the solar catalog with a new inventory item.</p>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-jds-error-container/10 border border-jds-error/20 p-4 text-body-sm text-jds-error">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="rounded-xl border border-jds-outline-variant/30 bg-jds-surface-container-lowest p-8 shadow-sm space-y-8">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-2">
            <label className="text-label-sm font-bold text-jds-on-surface-variant/80 uppercase tracking-wider">Product Name</label>
            <input required value={form.name} onChange={(e) => handleChange('name', e.target.value)} className={inputClass} placeholder="e.g. Aviation Aluminum Solar Street Light 200W" />
          </div>
          <div className="space-y-2">
            <label className="text-label-sm font-bold text-jds-on-surface-variant/80 uppercase tracking-wider">Type</label>
            <select value={form.type} onChange={(e) => handleChange('type', e.target.value)} className={inputClass}>
              {PRODUCT_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-label-sm font-bold text-jds-on-surface-variant/80 uppercase tracking-wider">Wattage (W)</label>
            <input type="number" required value={form.watt} onChange={(e) => handleChange('watt', e.target.value)} className={inputClass} placeholder="200" />
          </div>
          <div className="space-y-2">
            <label className="text-label-sm font-bold text-jds-on-surface-variant/80 uppercase tracking-wider">Waterproof Grade</label>
            <select value={form.waterproof_grade} onChange={(e) => handleChange('waterproof_grade', e.target.value)} className={inputClass}>
              <option>IP65</option>
              <option>IP67</option>
              <option>IP68</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-label-sm font-bold text-jds-on-surface-variant/80 uppercase tracking-wider">Control Method</label>
            <input value={form.method_control} onChange={(e) => handleChange('method_control', e.target.value)} className={inputClass} placeholder="Light Control + Remote Control + Radar Sensor" />
          </div>
          <div className="space-y-2">
            <label className="text-label-sm font-bold text-jds-on-surface-variant/80 uppercase tracking-wider">Material</label>
            <input value={form.material} onChange={(e) => handleChange('material', e.target.value)} className={inputClass} placeholder="Aviation Aluminum + Optical Lens" />
          </div>
          <div className="space-y-2">
            <label className="text-label-sm font-bold text-jds-on-surface-variant/80 uppercase tracking-wider">Solar Panel</label>
            <input value={form.solar_panel} onChange={(e) => handleChange('solar_panel', e.target.value)} className={inputClass} placeholder="Monocrystalline (5v/25w)" />
          </div>
          <div className="space-y-2">
            <label className="text-label-sm font-bold text-jds-on-surface-variant/80 uppercase tracking-wider">Battery</label>
            <input value={form.battery} onChange={(e) => handleChange('battery', e.target.value)} className={inputClass} placeholder="26000mAh Lithium Iron Phosphate Battery" />
          </div>
          <div className="space-y-2">
            <label className="text-label-sm font-bold text-jds-on-surface-variant/80 uppercase tracking-wider">Charging Time</label>
            <input value={form.charging_time} onChange={(e) => handleChange('charging_time', e.target.value)} className={inputClass} placeholder="4~6 hours" />
          </div>
          <div className="space-y-2">
            <label className="text-label-sm font-bold text-jds-on-surface-variant/80 uppercase tracking-wider">Charging Type</label>
            <input value={form.charging_type} onChange={(e) => handleChange('charging_type', e.target.value)} className={inputClass} placeholder="Solar Charging" />
          </div>
          <div className="space-y-2">
            <label className="text-label-sm font-bold text-jds-on-surface-variant/80 uppercase tracking-wider">SMD Lamp Beads</label>
            <input value={form.smd_lamp_beads} onChange={(e) => handleChange('smd_lamp_beads', e.target.value)} className={inputClass} placeholder="Sanan chip 360 pcs 5054 LED" />
          </div>
          <div className="space-y-2">
            <label className="text-label-sm font-bold text-jds-on-surface-variant/80 uppercase tracking-wider">Lighting Time</label>
            <input value={form.lighting_time} onChange={(e) => handleChange('lighting_time', e.target.value)} className={inputClass} placeholder="12~16 hours" />
          </div>
          <div className="space-y-2">
            <label className="text-label-sm font-bold text-jds-on-surface-variant/80 uppercase tracking-wider">Size / Dimensions</label>
            <input value={form.size} onChange={(e) => handleChange('size', e.target.value)} className={inputClass} placeholder="750mm x 237mm x 82mm (L/W/H)" />
          </div>
          <div className="space-y-2">
            <label className="text-label-sm font-bold text-jds-on-surface-variant/80 uppercase tracking-wider">Initial Sales</label>
            <input type="number" value={form.sales} onChange={(e) => handleChange('sales', e.target.value)} className={inputClass} placeholder="0" />
          </div>
          <div className="flex items-center gap-3 pt-8">
            <input type="checkbox" id="in-stock" checked={form.in_stock} onChange={(e) => handleChange('in_stock', e.target.checked)} className="h-5 w-5 rounded border-jds-outline-variant/30 accent-jds-primary cursor-pointer" />
            <label htmlFor="in-stock" className="text-body-md font-medium text-jds-on-surface cursor-pointer">In Stock</label>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-label-sm font-bold text-jds-on-surface-variant/80 uppercase tracking-wider">Image URL</label>
          <input value={form.image_url} onChange={(e) => handleChange('image_url', e.target.value)} className={inputClass} placeholder="https://images.unsplash.com/..." />
        </div>

        <div className="flex gap-4 pt-6 border-t border-jds-outline-variant/20">
          <Button type="submit" disabled={saving} className="bg-jds-primary text-jds-on-primary hover:opacity-90 px-10 h-12 text-body-md font-bold rounded-lg">
            {saving ? (
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Saving Product...
              </div>
            ) : 'Publish Product'}
          </Button>
          <Button type="button" variant="outline" onClick={() => onNavigate('products')} className="border-jds-outline-variant text-jds-on-surface-variant px-8 h-12 text-body-md rounded-lg">
            Cancel
          </Button>
        </div>
      </form>
    </div>
  )
}
