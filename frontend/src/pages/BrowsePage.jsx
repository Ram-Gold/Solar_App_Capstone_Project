import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { supabase } from '../lib/supabaseClient'
import { useChat } from '../context/ChatContext'
import {
  HiOutlineMagnifyingGlass,
  HiOutlineCheck,
  HiOutlineShieldCheck,
  HiOutlineLifebuoy,
  HiOutlineBolt,
  HiOutlineFunnel,
} from 'react-icons/hi2'

const categories = ['All Products', 'Aviation Aluminum Solar Light', 'Aviation Aluminum Solar Road Light', 'Aviation Aluminum Solar Street Light', 'Integrated Solar Street Light', 'Aluminum Solar Street Light', 'Solar Streetlight']

export default function BrowsePage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { sendMessage } = useChat()
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)

  const [search, setSearch] = useState(searchParams.get('search') || '')
  const [activeCategory, setActiveCategory] = useState('All Products')
  const [sortBy, setSortBy] = useState('newest')
  const [showFilters, setShowFilters] = useState(false)
  const [powerFilter, setPowerFilter] = useState('All Power')
  const [waterproofFilter, setWaterproofFilter] = useState('All Ratings')

  useEffect(() => {
    const query = searchParams.get('search')
    if (query !== null) {
      setSearch(query)
    }
  }, [searchParams])

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true)
      try {
        const { data, error } = await supabase.from('products').select('*')
        if (error || !data || data.length === 0) {
          setProducts([])
        } else {
          setProducts(data)
        }
      } catch {
        setProducts([])
      } finally {
        setTimeout(() => setLoading(false), 600)
      }
    }
    fetchProducts()
  }, [])

  const filtered = products
    .filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase())
      const matchesCategory = activeCategory === 'All Products' || p.type === activeCategory
      
      let matchesPower = true
      if (powerFilter !== 'All Power') {
        if (powerFilter === 'Under 200W') matchesPower = (p.watt || 0) < 200
        else if (powerFilter === '200W - 400W') matchesPower = (p.watt || 0) >= 200 && (p.watt || 0) <= 400
        else if (powerFilter === 'Above 400W') matchesPower = (p.watt || 0) > 400
      }

      let matchesWaterproof = true
      if (waterproofFilter !== 'All Ratings') {
        matchesWaterproof = p.waterproof_grade === waterproofFilter
      }

      return matchesSearch && matchesCategory && matchesPower && matchesWaterproof
    })
    .sort((a, b) => {
      if (sortBy === 'watt-low') return (a.watt || 0) - (b.watt || 0)
      if (sortBy === 'watt-high') return (b.watt || 0) - (a.watt || 0)
      if (sortBy === 'name') return a.name.localeCompare(b.name)
      return b.id - a.id // newest
    })

  return (
    <div className="jds-page-bg font-inter text-jds-on-surface min-h-screen">
      <main className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Page Header */}
        <div className="flex flex-col gap-2 mb-12">
          <h1 className="text-headline-lg-mobile md:text-headline-xl text-jds-on-surface">Digital Product Guide</h1>
          <p className="text-body-lg text-jds-on-surface-variant max-w-2xl">
            Discover our complete range of solar-powered lights and streetlights. Built for durability, designed for Manila's streets.
          </p>
        </div>

        <div className="flex flex-col md:flex-row gap-8 items-start w-full">
          {/* Mobile Filter Toggle Button */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="md:hidden flex items-center justify-center gap-2 w-full py-3 px-4 bg-jds-surface-container-high rounded-xl text-label-md font-bold text-jds-on-surface border border-jds-outline-variant hover:bg-jds-surface-container-highest transition-colors"
          >
            <HiOutlineFunnel className="text-lg" />
            {showFilters ? 'Hide Filters' : 'Show Filters'}
          </button>

          {/* Sidebar */}
          <aside className={`w-full md:w-80 flex-shrink-0 flex flex-col gap-8 ${showFilters ? 'block' : 'hidden md:flex'}`}>
            {/* Search */}
            <div className="relative">
              <HiOutlineMagnifyingGlass className="absolute left-4 top-1/2 -translate-y-1/2 text-jds-on-surface-variant text-xl" />
              <input
                className="w-full pl-12 pr-4 py-4 bg-jds-surface-container-highest border-none rounded-xl focus:ring-2 focus:ring-jds-secondary focus:bg-jds-surface transition-all text-body-md outline-none"
                placeholder="Search solar lights..."
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {/* Categories */}
            <div className="flex flex-col gap-4">
              <h3 className="text-label-md text-jds-on-surface font-bold uppercase tracking-wider">Categories</h3>
              <div className="flex flex-col gap-2">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`flex items-center justify-between px-4 py-2 rounded-lg text-label-md w-full text-left transition-colors ${
                      activeCategory === cat
                        ? 'bg-jds-secondary/10 text-jds-secondary font-semibold'
                        : 'text-jds-on-surface-variant hover:bg-jds-surface-container-high'
                    }`}
                  >
                    <span className="truncate">{cat === 'All Products' ? cat : cat.replace('Solar ', '').replace('Aviation Aluminum ', 'Avi. Alum. ')}</span>
                    {activeCategory === cat && <HiOutlineCheck className="text-sm flex-shrink-0" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Waterproof Filter */}
            <div className="flex flex-col gap-4">
              <h3 className="text-label-md text-jds-on-surface font-bold uppercase tracking-wider">Waterproof Rating</h3>
              <div className="flex flex-col gap-2">
                {[
                  { label: 'All Ratings', value: 'All Ratings' },
                  { label: 'IP65', value: 'IP65' },
                  { label: 'IP67', value: 'IP67' }
                ].map((opt) => (
                  <label 
                    key={opt.value} 
                    className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border text-body-sm font-medium cursor-pointer transition-all ${
                      waterproofFilter === opt.value 
                        ? 'border-jds-secondary bg-jds-secondary/10 text-jds-secondary' 
                        : 'border-jds-outline-variant/30 bg-jds-surface-container-lowest text-jds-on-surface-variant hover:bg-jds-surface-container-high'
                    }`}
                  >
                    <input
                      type="radio"
                      name="waterproofFilterBrowse"
                      value={opt.value}
                      checked={waterproofFilter === opt.value}
                      onChange={() => setWaterproofFilter(opt.value)}
                      className="h-4 w-4 text-jds-secondary accent-jds-secondary cursor-pointer border-jds-outline-variant focus:ring-jds-secondary"
                    />
                    <span className="text-body-md">{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Power Output */}
            <div className="flex flex-col gap-4">
              <h3 className="text-label-md text-jds-on-surface font-bold uppercase tracking-wider">Power Output</h3>
              <div className="flex flex-col gap-2">
                {[
                  { label: 'All Power', value: 'All Power' },
                  { label: 'Under 200W', value: 'Under 200W' },
                  { label: '200W - 400W', value: '200W - 400W' },
                  { label: 'Above 400W', value: 'Above 400W' }
                ].map((opt) => (
                  <label 
                    key={opt.value} 
                    className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border text-body-sm font-medium cursor-pointer transition-all ${
                      powerFilter === opt.value 
                        ? 'border-jds-secondary bg-jds-secondary/10 text-jds-secondary' 
                        : 'border-jds-outline-variant/30 bg-jds-surface-container-lowest text-jds-on-surface-variant hover:bg-jds-surface-container-high'
                    }`}
                  >
                    <input
                      type="radio"
                      name="powerFilterBrowse"
                      value={opt.value}
                      checked={powerFilter === opt.value}
                      onChange={() => setPowerFilter(opt.value)}
                      className="h-4 w-4 text-jds-secondary accent-jds-secondary cursor-pointer border-jds-outline-variant focus:ring-jds-secondary"
                    />
                    <span className="text-body-md">{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </aside>

          {/* Main Content Grid */}
          <div className="flex-grow">
            <div className="flex justify-between items-center mb-6">
              <p className="text-label-md text-jds-on-surface-variant">
                Showing {loading ? '...' : filtered.length} products
              </p>
              <select
                className="bg-transparent border-none text-label-md text-jds-primary focus:ring-0 cursor-pointer"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="newest">Sort by: Newest</option>
                <option value="watt-low">Wattage: Low to High</option>
                <option value="watt-high">Wattage: High to Low</option>
                <option value="name">Name: A-Z</option>
              </select>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="bg-jds-surface-container-lowest border border-jds-outline-variant rounded-lg p-4 animate-pulse">
                    <div className="aspect-square rounded-lg bg-jds-surface-variant mb-4" />
                    <div className="h-4 bg-jds-surface-variant rounded w-3/4 mb-2" />
                    <div className="h-4 bg-jds-surface-variant rounded w-1/2 mb-4" />
                    <div className="h-10 bg-jds-surface-variant rounded" />
                  </div>
                ))}
              </div>
            ) : filtered.length > 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4 }}
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
              >
                {filtered.map((product) => (
                  <div
                    key={product.id}
                    className="bg-jds-surface-container-lowest flex flex-col border border-jds-outline-variant card-shadow rounded-lg p-4 group"
                  >
                    <div className="aspect-square rounded-lg bg-jds-surface-variant mb-4 overflow-hidden relative flex items-center justify-center">
                      {product.image_url ? (
                        <img
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          src={product.image_url}
                          alt={product.name}
                        />
                      ) : (
                        <div className="flex flex-col items-center gap-2 text-jds-on-surface-variant/40">
                          <HiOutlineBolt className="text-4xl" />
                          <span className="text-label-sm">{product.watt}W</span>
                        </div>
                      )}
                      {product.waterproof_grade && (
                        <span className="absolute top-2 left-2 bg-jds-secondary-container text-jds-on-secondary-container px-2 py-0.5 rounded text-[10px] font-bold uppercase">
                          {product.waterproof_grade}
                        </span>
                      )}
                    </div>
                    <div className="flex-grow mb-4">
                      <h3 className="text-label-md text-jds-on-surface font-bold line-clamp-2">{product.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-jds-secondary font-bold text-label-md">
                          {product.watt}W
                        </span>
                        <span className="text-jds-on-surface-variant text-label-sm">
                          · {product.waterproof_grade || 'IP65'}
                        </span>
                      </div>
                      {product.price_range && (
                        <div className="text-jds-primary font-bold text-body-lg mt-1">
                          ₱{product.price_range}
                        </div>
                      )}
                      {product.material && (
                        <p className="text-label-sm text-jds-on-surface-variant mt-1 truncate">
                          {product.material}
                        </p>
                      )}
                    </div>
                    <Link
                      to={`/product/${product.id}`}
                      className="w-full border border-jds-secondary text-jds-secondary py-2 rounded text-label-md hover:bg-jds-secondary hover:text-white transition-colors text-center block"
                    >
                      View Details
                    </Link>
                  </div>
                ))}
              </motion.div>
            ) : (
              <div className="text-center py-20 bg-jds-surface-container-high/30 rounded-lg border border-dashed border-jds-outline-variant">
                <h3 className="text-headline-md mb-2">No products found</h3>
                <p className="text-jds-on-surface-variant mb-6">Try adjusting your filters to see more results.</p>
                <button
                  onClick={() => {
                    setSearch('')
                    setActiveCategory('All Products')
                    setPowerFilter('All Power')
                    setWaterproofFilter('All Ratings')
                  }}
                  className="border border-jds-secondary text-jds-secondary px-6 py-2 rounded-lg text-label-md hover:bg-jds-secondary hover:text-white transition-colors"
                >
                  Clear Filters
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Technical Precision Banner */}
        <section className="mt-20 bg-jds-surface-container-high rounded-2xl p-8 md:p-12 flex flex-col md:flex-row items-center justify-between gap-12">
          <div className="max-w-xl">
            <h2 className="text-headline-lg text-jds-on-surface mb-4">Unsure which light fits your needs?</h2>
            <p className="text-body-md text-jds-on-surface-variant mb-8">
              Our Quiapo-based team can help you choose the right solar light for your street, road, or property. Free consultation available.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link
                to="/chat"
                className="bg-jds-primary text-jds-on-primary px-8 py-4 rounded-lg text-label-md font-bold hover:scale-105 transition-transform"
              >
                Ask SolarAI
              </Link>
            </div>
          </div>
          <div className="w-full md:w-1/3 aspect-video rounded-xl bg-white/50 backdrop-blur-md p-8 flex flex-col justify-center gap-6 card-shadow border border-white">
            <div className="flex items-center gap-4">
              <HiOutlineShieldCheck className="text-jds-secondary text-3xl flex-shrink-0" />
              <div>
                <div className="text-label-md text-jds-on-surface">IP65/IP67 Rated</div>
                <div className="text-xs text-jds-on-surface-variant">Weather & Dust Resistant</div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <HiOutlineLifebuoy className="text-jds-secondary text-3xl flex-shrink-0" />
              <div>
                <div className="text-label-md text-jds-on-surface">24/7 Local Support</div>
                <div className="text-xs text-jds-on-surface-variant">Immediate Manila response</div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
