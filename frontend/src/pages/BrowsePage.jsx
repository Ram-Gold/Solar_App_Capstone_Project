import { useState, useEffect, useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { supabase } from '../lib/supabaseClient'
import {
  HiOutlineMagnifyingGlass,
  HiOutlineCheck,
  HiOutlineShieldCheck,
  HiOutlineLifebuoy,
  HiOutlineBolt,
  HiOutlineFunnel,
  HiOutlineSparkles,
} from 'react-icons/hi2'
import MultiCriteriaMatchModal from '../components/MultiCriteriaMatchModal'
import { useAuth } from '../context/AuthContext'
import { getStockTier } from '../lib/inventoryUtils'
import { getCatalogBounds, parseProductPrice } from '../lib/multiCriteriaMatcher'
import { getMainProductImage } from '../lib/productImageUtils'

const INITIAL_CATEGORIES = [
  'All Products',
  'Aluminum Solar Street Light (Gray)',
  'Aviation Aluminum Solar Light',
  'Aviation Aluminum Solar Road Light',
  'Aviation Aluminum Solar Street Light',
  'Eco COB Flood Light',
  'Eco LED Flood Light',
  'Electric Streetlight',
  'Electric Streetlight Cobra',
  'Integrated Solar Street Light',
  'Integrated Solar Street Light (Warm White)',
  'JD Star COB Floodlight',
  'JDSTAR 220V LED Flood Light',
  'JDSTAR Street Light',
  'KKSKY Solar Floodlight',
  'LW SO LED Outdoor Flood Light',
  'Solar Flood Light HPC',
  'Solar Flood Light UP39',
  'Solar Flood Light UP39 (Warm White)',
  'Solar Floodlight JDL',
  'Solar Streetlight',
]

const ITEMS_PER_PAGE = 16

function ProductCardImage({ src, alt, priority = false }) {
  const [loaded, setLoaded] = useState(false)
  const [hasError, setHasError] = useState(false)

  if (hasError) {
    return (
      <div className="flex flex-col items-center justify-center gap-1.5 text-jds-on-surface-variant/40 p-4 text-center">
        <HiOutlineBolt className="text-3xl" />
        <span className="text-[11px] font-medium">Image unavailable</span>
      </div>
    )
  }

  return (
    <>
      {!loaded && (
        <div className="absolute inset-0 bg-jds-surface-variant/70 animate-pulse flex items-center justify-center">
          <HiOutlineBolt className="text-2xl text-jds-on-surface-variant/20 animate-bounce" />
        </div>
      )}
      <img
        src={src}
        alt={alt}
        loading={priority ? 'eager' : 'lazy'}
        fetchPriority={priority ? 'high' : 'auto'}
        decoding="async"
        onLoad={() => setLoaded(true)}
        onError={() => setHasError(true)}
        className={`w-full h-full object-cover transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'
          }`}
      />
    </>
  )
}

export default function BrowsePage() {
  const [searchParams] = useSearchParams()
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState(INITIAL_CATEGORIES)
  const [loading, setLoading] = useState(true)

  const [search, setSearch] = useState(searchParams.get('search') || '')
  const [activeCategory, setActiveCategory] = useState('All Products')
  const [sortBy, setSortBy] = useState('newest')
  const [showFilters, setShowFilters] = useState(false)
  const [powerFilter, setPowerFilter] = useState('All Power')
  const [waterproofFilter, setWaterproofFilter] = useState('All Ratings')
  const [budgetFilter, setBudgetFilter] = useState(null)
  const [batteryFilter, setBatteryFilter] = useState('All')
  const [showMatcher, setShowMatcher] = useState(false)
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE)

  const catalogBounds = useMemo(() => getCatalogBounds(products), [products])
  const isBudgetUnconstrained = budgetFilter === null || budgetFilter >= catalogBounds.maxPrice

  useEffect(() => {
    setVisibleCount(ITEMS_PER_PAGE)
  }, [search, activeCategory, sortBy, powerFilter, waterproofFilter, budgetFilter, batteryFilter])

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

    const fetchCategories = async () => {
      try {
        const { data, error } = await supabase.from('categories').select('name').order('name')
        if (!error && data && data.length > 0) {
          setCategories(['All Products', ...data.map(c => c.name)])
        }
      } catch (err) {
        console.warn('Failed to load categories on BrowsePage:', err)
      }
    }
    fetchCategories()
  }, [])

  const { role } = useAuth()
  const isPrivileged = role === 'admin' || role === 'staff'

  const filtered = products
    .filter(p => {
      // Out of stock products shouldn't appear on the guest, only visible on staff and admin panels
      if (!isPrivileged) {
        const tier = getStockTier(p)
        if (tier === 'out' || p.in_stock === false) return false
      }

      const matchesSearch = (p.name || '').toLowerCase().includes(search.toLowerCase())
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

      let matchesBudget = true
      if (!isBudgetUnconstrained) {
        const parsed = parseProductPrice(p)
        if (!parsed.hasPrice) {
          matchesBudget = false
        } else {
          const { min: pMin, max: pMax } = parsed
          // Range inclusion: Target budget must fall within the product price range [min, max]
          matchesBudget = pMin !== null && pMax !== null && pMin <= budgetFilter && budgetFilter <= pMax
        }
      }

      let matchesBattery = true
      if (batteryFilter === 'Included') {
        matchesBattery = p.battery && p.battery.trim() !== '' && p.battery.toLowerCase() !== 'none'
      } else if (batteryFilter === 'Not Included') {
        matchesBattery = !p.battery || p.battery.trim() === '' || p.battery.toLowerCase() === 'none'
      }

      return matchesSearch && matchesCategory && matchesPower && matchesWaterproof && matchesBudget && matchesBattery
    })
    .sort((a, b) => {
      if (sortBy === 'watt-low') return (a.watt || 0) - (b.watt || 0)
      if (sortBy === 'watt-high') return (b.watt || 0) - (a.watt || 0)
      if (sortBy === 'name') return (a.name || '').localeCompare(b.name || '')
      return b.id - a.id // newest
    })

  const displayedProducts = filtered.slice(0, visibleCount)
  const hasMore = visibleCount < filtered.length
  const remainingCount = Math.max(0, filtered.length - visibleCount)

  return (
    <div className="jds-page-bg font-inter text-jds-on-surface min-h-screen">
      <main className="max-w-screen-2xl mx-auto px-3 sm:px-6 lg:px-8 py-5 sm:py-10 overflow-x-hidden">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-6 sm:mb-10">
          <div className="flex flex-col gap-1 sm:gap-2">
            <h1 className="text-xl sm:text-2xl md:text-headline-xl text-jds-on-surface font-extrabold tracking-tight">Digital Product Guide</h1>
            <p className="text-xs sm:text-sm md:text-body-lg text-jds-on-surface-variant max-w-2xl leading-relaxed">
              Discover our complete range of solar-powered lights and streetlights. Built for durability, designed for Manila's streets.
            </p>
          </div>
          <Link
            to="/match"
            className="self-start sm:self-auto flex items-center gap-1.5 sm:gap-2 bg-jds-primary hover:bg-jds-primary/90 text-white font-bold text-xs sm:text-label-md px-3.5 py-2 sm:px-5 sm:py-3 rounded-xl shadow-xs hover:shadow-md transition-all active:scale-95 shrink-0"
          >
            <HiOutlineSparkles className="text-base sm:text-lg" />
            <span>Product Matcher</span>
          </Link>
        </div>

        <div className="flex flex-col md:flex-row gap-4 md:gap-8 items-stretch md:items-start w-full">
          {/* Mobile Filter Toggle Button */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="md:hidden flex items-center justify-center gap-2 w-full py-2.5 px-3 bg-jds-surface-container-high rounded-xl text-xs font-bold text-jds-on-surface border border-jds-outline-variant hover:bg-jds-surface-container-highest transition-colors cursor-pointer"
          >
            <HiOutlineFunnel className="text-base" />
            {showFilters ? 'Hide Filters' : 'Show Filters'}
          </button>

          {/* Sidebar */}
          <aside className={`w-full md:w-80 md:flex-shrink-0 flex-col gap-4 sm:gap-6 md:gap-8 ${showFilters ? 'flex' : 'hidden md:flex'}`}>
            {/* Search */}
            <div className="relative">
              <HiOutlineMagnifyingGlass className="absolute left-3.5 top-1/2 -translate-y-1/2 text-jds-on-surface-variant text-base sm:text-lg" />
              <input
                className="w-full pl-10 pr-3 py-2.5 sm:py-3 bg-jds-surface-container-highest border-none rounded-xl focus:ring-2 focus:ring-jds-secondary focus:bg-jds-surface transition-all text-xs sm:text-body-md outline-none"
                placeholder="Search solar lights..."
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {/* Categories */}
            <div className="flex flex-col gap-2.5 sm:gap-4">
              <h3 className="text-xs sm:text-label-md text-jds-on-surface font-bold uppercase tracking-wider">Categories</h3>
              <div className="flex flex-col gap-1.5 max-h-60 md:max-h-none overflow-y-auto">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`flex items-center justify-between px-3 py-1.5 rounded-lg text-xs sm:text-label-md w-full text-left transition-colors ${activeCategory === cat
                      ? 'bg-jds-secondary/10 text-jds-secondary font-semibold'
                      : 'text-jds-on-surface-variant hover:bg-jds-surface-container-high'
                      }`}
                  >
                    <span className="truncate">{cat === 'All Products' ? cat : cat.replace('Solar ', '').replace('Aviation Aluminum ', 'Avi. Alum. ')}</span>
                    {activeCategory === cat && <HiOutlineCheck className="text-xs flex-shrink-0" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Waterproof Filter */}
            <div className="flex flex-col gap-2.5 sm:gap-4">
              <h3 className="text-xs sm:text-label-md text-jds-on-surface font-bold uppercase tracking-wider">Waterproof Rating</h3>
              <div className="flex flex-col gap-1.5 sm:gap-2">
                {[
                  { label: 'All Ratings', value: 'All Ratings' },
                  { label: 'IP65', value: 'IP65' },
                  { label: 'IP66', value: 'IP66' },
                  { label: 'IP67', value: 'IP67' }
                ].map((opt) => (
                  <label
                    key={opt.value}
                    className={`flex items-center gap-2.5 px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl border text-xs sm:text-sm font-medium cursor-pointer transition-all ${waterproofFilter === opt.value
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
                      className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-jds-secondary accent-jds-secondary cursor-pointer border-jds-outline-variant focus:ring-jds-secondary"
                    />
                    <span>{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Power Output */}
            <div className="flex flex-col gap-2.5 sm:gap-4">
              <h3 className="text-xs sm:text-label-md text-jds-on-surface font-bold uppercase tracking-wider">Power Output</h3>
              <div className="flex flex-col gap-1.5 sm:gap-2">
                {[
                  { label: 'All Power', value: 'All Power' },
                  { label: 'Under 200W', value: 'Under 200W' },
                  { label: '200W - 400W', value: '200W - 400W' },
                  { label: 'Above 400W', value: 'Above 400W' }
                ].map((opt) => (
                  <label
                    key={opt.value}
                    className={`flex items-center gap-2.5 px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl border text-xs sm:text-sm font-medium cursor-pointer transition-all ${powerFilter === opt.value
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
                      className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-jds-secondary accent-jds-secondary cursor-pointer border-jds-outline-variant focus:ring-jds-secondary"
                    />
                    <span>{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Target Budget Slider */}
            <div className="flex flex-col gap-2.5 sm:gap-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs sm:text-label-md text-jds-on-surface font-bold uppercase tracking-wider">Target Budget</h3>
                {!isBudgetUnconstrained && (
                  <button
                    type="button"
                    onClick={() => setBudgetFilter(null)}
                    className="text-[11px] text-jds-primary hover:underline font-semibold cursor-pointer"
                  >
                    Reset
                  </button>
                )}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-jds-on-surface-variant font-medium">Budget per unit</span>
                <span className="text-xs font-bold text-jds-primary bg-jds-primary/10 px-2.5 py-0.5 rounded-lg">
                  {isBudgetUnconstrained
                    ? `₱${catalogBounds.maxPrice.toLocaleString()}+ (Any Budget)`
                    : `₱${Number(budgetFilter).toLocaleString()}`}
                </span>
              </div>
              <input
                type="range"
                min={catalogBounds.minPrice}
                max={catalogBounds.maxPrice}
                step={250}
                value={isBudgetUnconstrained ? catalogBounds.maxPrice : budgetFilter}
                onChange={(e) => {
                  const val = Number(e.target.value)
                  setBudgetFilter(val >= catalogBounds.maxPrice ? null : val)
                }}
                className="w-full h-1.5 sm:h-2 bg-jds-surface-variant rounded-lg appearance-none cursor-pointer accent-jds-primary"
                aria-label="Target budget slider in Philippine Pesos"
              />
              <div className="flex items-center justify-between text-[10px] text-jds-on-surface-variant/60 font-mono">
                <span>₱{catalogBounds.minPrice.toLocaleString()}</span>
                <span>Any Budget</span>
              </div>
            </div>

            {/* Battery Filter */}
            <div className="flex flex-col gap-2.5 sm:gap-4">
              <h3 className="text-xs sm:text-label-md text-jds-on-surface font-bold uppercase tracking-wider">Battery</h3>
              <div className="flex flex-col gap-1.5 sm:gap-2">
                {[
                  { label: 'All', value: 'All' },
                  { label: 'Included', value: 'Included' },
                  { label: 'Not Included', value: 'Not Included' }
                ].map((opt) => (
                  <label
                    key={opt.value}
                    className={`flex items-center gap-2.5 px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl border text-xs sm:text-sm font-medium cursor-pointer transition-all ${batteryFilter === opt.value
                      ? 'border-jds-secondary bg-jds-secondary/10 text-jds-secondary'
                      : 'border-jds-outline-variant/30 bg-jds-surface-container-lowest text-jds-on-surface-variant hover:bg-jds-surface-container-high'
                      }`}
                  >
                    <input
                      type="radio"
                      name="batteryFilterBrowse"
                      value={opt.value}
                      checked={batteryFilter === opt.value}
                      onChange={() => setBatteryFilter(opt.value)}
                      className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-jds-secondary accent-jds-secondary cursor-pointer border-jds-outline-variant focus:ring-jds-secondary"
                    />
                    <span>{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </aside>

          {/* Main Content Grid */}
          <div className="flex-grow min-w-0 w-full">
            <div className="flex justify-between items-center mb-6">
              <p className="text-label-md text-jds-on-surface-variant">
                Showing {loading ? '...' : `${Math.min(visibleCount, filtered.length)} of ${filtered.length}`} products
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
              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-6">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="bg-jds-surface-container-lowest border border-jds-outline-variant rounded-lg p-2.5 sm:p-4 animate-pulse">
                    <div className="aspect-square rounded-lg bg-jds-surface-variant mb-2.5 sm:mb-4" />
                    <div className="h-3 sm:h-4 bg-jds-surface-variant rounded w-3/4 mb-1.5 sm:mb-2" />
                    <div className="h-3 sm:h-4 bg-jds-surface-variant rounded w-1/2 mb-2.5 sm:mb-4" />
                    <div className="h-7 sm:h-10 bg-jds-surface-variant rounded" />
                  </div>
                ))}
              </div>
            ) : filtered.length > 0 ? (
              <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.4 }}
                  className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-6"
                >
                  {displayedProducts.map((product, index) => (
                    <Link
                      key={product.id}
                      to={`/product/${product.id}`}
                      className="bg-jds-surface-container-lowest flex flex-col border border-jds-outline-variant card-shadow rounded-lg p-2.5 sm:p-4 cursor-pointer no-underline text-inherit group hover:border-jds-primary/40 transition-colors"
                    >
                      <div className="aspect-square rounded-lg bg-jds-surface-variant mb-2 sm:mb-4 overflow-hidden relative flex items-center justify-center">
                        {getMainProductImage(product.image_url) ? (
                          <ProductCardImage
                            src={getMainProductImage(product.image_url)}
                            alt={product.name}
                            priority={index < 4}
                          />
                        ) : (
                          <div className="flex flex-col items-center gap-2 text-jds-on-surface-variant/40">
                            <HiOutlineBolt className="text-3xl sm:text-4xl" />
                            <span className="text-[10px] sm:text-label-sm">{product.watt}W</span>
                          </div>
                        )}
                        {product.waterproof_grade && (
                          <span className="absolute top-1.5 left-1.5 sm:top-2 sm:left-2 bg-jds-secondary-container text-jds-on-secondary-container px-1.5 sm:px-2 py-0.5 rounded text-[9px] sm:text-[10px] font-bold uppercase z-10">
                            {product.waterproof_grade}
                          </span>
                        )}
                      </div>
                      <div className="flex-grow mb-2 sm:mb-4 min-w-0">
                        <h3 className="text-xs sm:text-label-md text-jds-on-surface font-bold line-clamp-2 leading-tight">{product.name}</h3>
                        <div className="flex items-center gap-1.5 sm:gap-2 mt-1">
                          <span className="text-jds-secondary font-bold text-xs sm:text-label-md">
                            {product.watt}W
                          </span>
                          <span className="text-jds-on-surface-variant text-[10px] sm:text-label-sm truncate">
                            · {product.waterproof_grade || 'IP65'}
                          </span>
                        </div>
                        {product.min_price && product.max_price ? (
                          <div className="text-jds-primary font-bold text-xs sm:text-body-lg mt-0.5 sm:mt-1 truncate">
                            ₱{Number(product.min_price).toLocaleString()} - ₱{Number(product.max_price).toLocaleString()}
                          </div>
                        ) : product.min_price ? (
                          <div className="text-jds-primary font-bold text-xs sm:text-body-lg mt-0.5 sm:mt-1 truncate">
                            ₱{Number(product.min_price).toLocaleString()}+
                          </div>
                        ) : product.price_range ? (
                          <div className="text-jds-primary font-bold text-xs sm:text-body-lg mt-0.5 sm:mt-1 truncate">
                            ₱{product.price_range}
                          </div>
                        ) : (
                          <div className="text-jds-on-surface-variant font-medium text-[10px] sm:text-label-sm mt-0.5 sm:mt-1 truncate">
                            Inquire at Branch
                          </div>
                        )}
                        {product.material && (
                          <p className="text-[10px] sm:text-label-sm text-jds-on-surface-variant mt-0.5 sm:mt-1 truncate">
                            {product.material}
                          </p>
                        )}
                      </div>
                      <div
                        className="w-full border border-jds-secondary text-jds-secondary py-1.5 sm:py-2 rounded text-[11px] sm:text-label-md font-semibold text-center block mt-auto group-hover:bg-jds-secondary group-hover:text-white transition-colors"
                      >
                        View Details
                      </div>
                    </Link>
                  ))}
                </motion.div>

                {hasMore && (
                  <div className="mt-10 flex flex-col items-center justify-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => setVisibleCount((prev) => prev + ITEMS_PER_PAGE)}
                      className="w-full sm:w-auto min-w-[280px] px-8 py-3.5 rounded-xl bg-jds-surface-container border border-jds-outline-variant hover:border-jds-primary/40 hover:bg-jds-surface-container-high text-jds-on-surface text-label-md font-bold transition-all shadow-xs active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <span>Load More Products (+{Math.min(ITEMS_PER_PAGE, remainingCount)})</span>
                    </button>
                    <span className="text-xs text-jds-on-surface-variant font-medium">
                      Showing {Math.min(visibleCount, filtered.length)} of {filtered.length} products
                    </span>
                  </div>
                )}
              </>
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
                    setBudgetFilter(null)
                    setBatteryFilter('All')
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
                Ask Solar Assistant
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
                <div className="text-label-md text-jds-on-surface">Mon–Sat Technical Support</div>
                <div className="text-xs text-jds-on-surface-variant">Quiapo & Cavite branch staff</div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Multi-Criteria Product Matching Modal */}
      <MultiCriteriaMatchModal
        isOpen={showMatcher}
        onClose={() => setShowMatcher(false)}
        products={products}
      />
    </div>
  )
}
