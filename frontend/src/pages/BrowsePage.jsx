import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { supabase } from '../lib/supabaseClient'
import { useChat } from '../context/ChatContext'
import {
  HiOutlineMagnifyingGlass,
  HiOutlineCheck,
  HiOutlineShieldCheck,
  HiOutlineTruck,
  HiOutlineLifebuoy,
} from 'react-icons/hi2'

const mockProducts = [
  { id: 1, name: 'EcoPro 400W Panel', type: 'Monocrystalline', price: 12500, watt: 400, efficiency: 22.8, battery: true, image: 'https://images.unsplash.com/photo-1509391366360-120015d1df0a?w=800&auto=format&fit=crop&q=60', best_seller: true },
  { id: 2, name: 'SmartGrid Inverter 5kW', type: 'Accessories', price: 45000, watt: 0, efficiency: 0, battery: false, image: 'https://images.unsplash.com/photo-1508514177221-188b1cf16e9d?w=800&auto=format&fit=crop&q=60' },
  { id: 3, name: 'Titan Rail Mount System', type: 'Accessories', price: 3200, watt: 0, efficiency: 0, battery: false, image: 'https://images.unsplash.com/photo-1497440001374-f26997328c1b?w=800&auto=format&fit=crop&q=60' },
  { id: 4, name: 'Zenith Bifacial 450W', type: 'Monocrystalline', price: 18900, watt: 450, efficiency: 22.3, battery: false, image: 'https://images.unsplash.com/photo-1611365892117-00ac5ef43c90?w=800&auto=format&fit=crop&q=60' },
]

const categories = ['All Products', 'Residential', 'Commercial', 'Accessories']

export default function BrowsePage() {
  const navigate = useNavigate()
  const { sendMessage } = useChat()
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)

  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState('All Products')
  const [maxPrice, setMaxPrice] = useState(100000)
  const [sortBy, setSortBy] = useState('newest')

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true)
      try {
        const { data, error } = await supabase.from('products').select('*')
        if (error || !data || data.length === 0) {
          setProducts(mockProducts)
        } else {
          setProducts(data)
        }
      } catch {
        setProducts(mockProducts)
      } finally {
        setTimeout(() => setLoading(false), 600)
      }
    }
    fetchProducts()
  }, [])

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) &&
    (activeCategory === 'All Products' || p.type === activeCategory) &&
    p.price <= maxPrice
  )

  return (
    <div className="jds-page-bg font-inter text-jds-on-surface min-h-screen">
      <main className="max-w-screen-2xl mx-auto px-0 py-12">
        {/* Page Header */}
        <div className="flex flex-col gap-2 mb-12">
          <h1 className="text-headline-xl text-jds-on-surface">Digital Product Guide</h1>
          <p className="text-body-lg text-jds-on-surface-variant max-w-2xl">
            Discover clean energy solutions tailored for Manila's rooftops. Simplified, transparent, and built for a sustainable future.
          </p>
        </div>

        <div className="flex flex-col md:flex-row gap-8 items-start">
          {/* Sidebar */}
          <aside className="w-full md:w-80 flex-shrink-0 flex flex-col gap-8">
            {/* Search */}
            <div className="relative">
              <HiOutlineMagnifyingGlass className="absolute left-4 top-1/2 -translate-y-1/2 text-jds-on-surface-variant text-xl" />
              <input
                className="w-full pl-12 pr-4 py-4 bg-jds-surface-container-highest border-none rounded-xl focus:ring-2 focus:ring-jds-secondary focus:bg-jds-surface transition-all text-body-md outline-none"
                placeholder="Search products..."
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
                    {cat}
                    {activeCategory === cat && <HiOutlineCheck className="text-sm" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Price Range */}
            <div className="flex flex-col gap-4">
              <h3 className="text-label-md text-jds-on-surface font-bold uppercase tracking-wider">Price Range</h3>
              <div className="flex flex-col gap-3 px-2">
                <input
                  className="w-full accent-jds-secondary"
                  max={100000}
                  min={0}
                  type="range"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(Number(e.target.value))}
                />
                <div className="flex justify-between text-label-sm text-jds-on-surface-variant">
                  <span>₱0</span>
                  <span>₱100,000+</span>
                </div>
              </div>
            </div>

            {/* Power Output */}
            <div className="flex flex-col gap-4">
              <h3 className="text-label-md text-jds-on-surface font-bold uppercase tracking-wider">Power Output</h3>
              <div className="flex flex-col gap-2">
                {['Under 400W', '400W - 500W', 'Above 500W'].map((label) => (
                  <label key={label} className="flex items-center gap-3 cursor-pointer">
                    <input className="rounded border-jds-outline-variant text-jds-secondary focus:ring-jds-secondary" type="checkbox" />
                    <span className="text-body-md text-jds-on-surface-variant">{label}</span>
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
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
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
                    <div className="aspect-square rounded-lg bg-jds-surface-variant mb-4 overflow-hidden relative">
                      <img
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        src={product.image || product.image_url}
                        alt={product.name}
                      />
                      {product.best_seller && (
                        <span className="absolute top-2 left-2 bg-jds-primary-container text-jds-on-primary-container px-2 py-0.5 rounded text-[10px] font-bold uppercase">
                          Best Seller
                        </span>
                      )}
                    </div>
                    <div className="flex-grow mb-4">
                      <h3 className="text-label-md text-jds-on-surface font-bold line-clamp-2">{product.name}</h3>
                      <p className="text-jds-secondary font-bold text-label-md mt-1">
                        ₱{product.price?.toLocaleString()}
                      </p>
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
                    setMaxPrice(100000)
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
            <h2 className="text-headline-lg text-jds-on-surface mb-4">Unsure which panel fits your roof?</h2>
            <p className="text-body-md text-jds-on-surface-variant mb-8">
              Our Quiapo-based engineering team provides a technical site assessment to determine the optimal configuration for your energy needs.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link
                to="/chat"
                className="bg-jds-primary text-jds-on-primary px-8 py-4 rounded-lg text-label-md font-bold hover:scale-105 transition-transform"
              >
                Schedule Free Consult
              </Link>
              <button className="bg-transparent border-2 border-jds-primary text-jds-primary px-8 py-4 rounded-lg text-label-md font-bold hover:bg-jds-primary/5 transition-all">
                Download Guide
              </button>
            </div>
          </div>
          <div className="w-full md:w-1/3 aspect-video rounded-xl bg-white/50 backdrop-blur-md p-8 flex flex-col justify-center gap-6 card-shadow border border-white">
            <div className="flex items-center gap-4">
              <HiOutlineShieldCheck className="text-jds-secondary text-3xl flex-shrink-0" />
              <div>
                <div className="text-label-md text-jds-on-surface">Standardized Quality</div>
                <div className="text-xs text-jds-on-surface-variant">TUV & CE Certified</div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <HiOutlineTruck className="text-jds-secondary text-3xl flex-shrink-0" />
              <div>
                <div className="text-label-md text-jds-on-surface">Metro Manila Delivery</div>
                <div className="text-xs text-jds-on-surface-variant">Free within 20km of Quiapo</div>
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
