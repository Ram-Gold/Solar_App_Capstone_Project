import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { supabase } from '../lib/supabaseClient'
import { useChat } from '../context/ChatContext'
import QuoteModal from '../components/QuoteModal'
import {
  HiOutlineArrowLeft,
  HiOutlineBolt,
  HiOutlineShieldCheck,
  HiOutlineCog6Tooth,
  HiOutlineSun,
  HiOutlineClock,
  HiOutlineSquare2Stack,
  HiOutlineChatBubbleLeftRight,
  HiOutlineSignal,
  HiOutlineCpuChip,
  HiOutlineBattery100,
  HiOutlineBanknotes,
  HiOutlineBuildingStorefront,
  HiOutlineDocumentText,
  HiOutlineLockClosed,
  HiOutlineLightBulb,
  HiOutlineArrowsPointingOut,
  HiOutlineSwatch,
  HiOutlineCalendarDays,
  HiOutlineMapPin,
  HiOutlineChevronLeft,
  HiOutlineChevronRight,
} from 'react-icons/hi2'
import {
  getMainProductImage,
  fetchDynamicProductImages
} from '../lib/productImageUtils'
import {
  getStockBadgeConfig,
  getBranchBreakdown,
  getAvailableQuantity
} from '../lib/inventoryUtils'

export default function ProductInfoPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { sendMessage } = useChat()

  const [product, setProduct] = useState(null)
  const [productImages, setProductImages] = useState([])
  const [relatedProducts, setRelatedProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedThumb, setSelectedThumb] = useState(0)
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState('reserve')
  const [showBranchTooltip, setShowBranchTooltip] = useState(false)

  const stockBadge = product ? getStockBadgeConfig(product) : null
  const branchBreakdown = product ? getBranchBreakdown(product) : null

  useEffect(() => {
    const fetchProduct = async () => {
      setLoading(true)
      try {
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .eq('id', id)
          .single()

        if (error || !data) {
          setError('Product not found.')
        } else {
          setProduct(data)
          setSelectedThumb(0)

          // Fetch dynamic pictures for this product (handles multiple pictures and staff added pictures)
          const dynamicImgs = await fetchDynamicProductImages(data, supabase)
          setProductImages(dynamicImgs)

          // Fetch related products of same type
          const { data: related } = await supabase
            .from('products')
            .select('id, name, type, watt, waterproof_grade, material, image_url, in_stock, price_range')
            .eq('type', data.type)
            .neq('id', data.id)
            .limit(4)

          setRelatedProducts(related || [])
        }
      } catch {
        setError('Product not found.')
      } finally {
        setTimeout(() => setLoading(false), 500)
      }
    }
    fetchProduct()
  }, [id])

  const handleAskAI = () => {
    if (!product) return
    navigate('/chat')
    setTimeout(() => {
      sendMessage(`Tell me more about the ${product.name}. Is it a good fit for my needs?`)
    }, 300)
  }

  // Build specs array for the 2-column bullet-point grid
  const getSpecsList = (p) => {
    if (!p) return []
    return [
      { label: 'Price Range', value: p.price_range ? `₱${p.price_range}` : null, icon: HiOutlineBanknotes },
      { label: 'Power Output', value: p.watt ? `${p.watt}W` : null, icon: HiOutlineBolt },
      { label: 'Lumens', value: p.lumens, icon: HiOutlineLightBulb },
      { label: 'Beaming Angle', value: p.beaming_angle, icon: HiOutlineArrowsPointingOut },
      { label: 'Color Temperature', value: p.color_temperature, icon: HiOutlineSun },
      { label: 'Voltage', value: p.voltage, icon: HiOutlineBolt },
      { label: 'Waterproof Grade', value: p.waterproof_grade, icon: HiOutlineShieldCheck },
      { label: 'Control Method', value: p.method_control, icon: HiOutlineSignal },
      { label: 'Material', value: p.material, icon: HiOutlineCog6Tooth },
      { label: 'Lamp Body Color', value: p.lamp_body_color, icon: HiOutlineSwatch },
      { label: 'Solar Panel', value: p.solar_panel, icon: HiOutlineSun },
      { label: 'Battery', value: p.battery, icon: HiOutlineBattery100 },
      { label: 'Charging Time', value: p.charging_time, icon: HiOutlineClock },
      { label: 'Charging Type', value: p.charging_type, icon: HiOutlineBolt },
      { label: 'SMD Lamp Beads', value: p.smd_lamp_beads, icon: HiOutlineCpuChip },
      { label: 'Lighting Time', value: p.lighting_time, icon: HiOutlineClock },
      { label: 'Size', value: p.size, icon: HiOutlineSquare2Stack },
      { label: 'Warranty', value: p.warranty || '2 Years (Case-by-case evaluation)', icon: HiOutlineShieldCheck },
      { label: 'Life Span', value: p.life_span, icon: HiOutlineCalendarDays },
      { label: 'Place of Use', value: p.place_of_use, icon: HiOutlineMapPin },
      {
        label: 'Availability',
        value: stockBadge
          ? `${stockBadge.quantity} unit${stockBadge.quantity === 1 ? '' : 's'} available (Quiapo: ${branchBreakdown?.quiapo.available || 0}${branchBreakdown?.hasCaviteStock ? `, Cavite: ${branchBreakdown.cavite.available}` : ''})`
          : (p.in_stock ? 'In Stock' : 'Out of Stock'),
        icon: HiOutlineShieldCheck,
      },
    ].filter(spec => spec.value)
  }

  if (loading) {
    return (
      <div className="jds-page-bg font-inter min-h-screen">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="h-6 w-32 bg-jds-surface-variant rounded mb-10 animate-pulse" />
          <div className="grid grid-cols-1 md:grid-cols-12 gap-12">
            <div className="md:col-span-7">
              <div className="aspect-[4/3] bg-jds-surface-variant rounded-xl animate-pulse" />
            </div>
            <div className="md:col-span-5 space-y-6">
              <div className="h-10 bg-jds-surface-variant rounded w-3/4 animate-pulse" />
              <div className="h-6 bg-jds-surface-variant rounded w-1/2 animate-pulse" />
              <div className="h-32 bg-jds-surface-variant rounded animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !product) {
    return (
      <div className="jds-page-bg font-inter min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-headline-lg text-jds-on-surface mb-4">Product Not Found</h1>
          <p className="text-jds-on-surface-variant mb-8">We couldn't find the product you're looking for.</p>
          <Link to="/browse" className="bg-jds-primary-container text-jds-on-primary-container px-8 py-3 rounded-lg text-label-md font-bold">
            Return to Browse
          </Link>
        </div>
      </div>
    )
  }

  const specs = getSpecsList(product)
  const activeImage = (productImages.length > 0 && productImages[selectedThumb])
    ? productImages[selectedThumb]
    : getMainProductImage(product?.image_url)
  const hasMultipleImages = productImages.length > 1

  return (
    <div className="jds-page-bg font-inter text-jds-on-surface min-h-screen">
      <main className="max-w-screen-2xl mx-auto px-3 sm:px-6 lg:px-8 py-5 sm:py-8">
        {/* Back Navigation */}
        <Link
          to="/browse"
          className="inline-flex items-center gap-1.5 sm:gap-2 text-jds-on-surface-variant hover:text-jds-primary transition-colors mb-4 sm:mb-8 group"
        >
          <HiOutlineArrowLeft className="text-lg sm:text-xl" />
          <span className="text-xs sm:text-label-md">Back to Browse</span>
        </Link>

        {/* Product Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 sm:gap-10 md:gap-12 items-start">
          {/* Left: Gallery */}
          <motion.div
            className="md:col-span-7 flex flex-col gap-3 sm:gap-6"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            {/* Main Picture Viewport */}
            <div className="bg-jds-surface-container-lowest rounded-2xl overflow-hidden shadow-xs sm:shadow-sm aspect-[4/3] relative flex items-center justify-center p-4 sm:p-8 group">
              {activeImage ? (
                <img
                  alt={`${product.name} - Picture ${selectedThumb + 1}`}
                  className="w-full h-full object-contain transition-all duration-300"
                  src={activeImage}
                />
              ) : (
                <div className="flex flex-col items-center gap-2 sm:gap-4 text-jds-on-surface-variant/30">
                  <HiOutlineBolt className="text-5xl sm:text-7xl" />
                  <span className="text-lg sm:text-headline-md font-bold">{product.watt}W</span>
                  <span className="text-xs sm:text-body-md">{product.type}</span>
                </div>
              )}

              {/* Multi-image indicators & navigation controls (Only rendered when there are multiple pictures) */}
              {hasMultipleImages && (
                <>
                  {/* Photo Counter Badge */}
                  <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-xs text-white text-[11px] font-mono font-medium select-none z-10">
                    {selectedThumb + 1} / {productImages.length}
                  </div>

                  {/* Previous Button */}
                  <button
                    type="button"
                    onClick={() => setSelectedThumb((prev) => (prev > 0 ? prev - 1 : productImages.length - 1))}
                    aria-label="Previous picture"
                    className="absolute left-2.5 sm:left-4 top-1/2 -translate-y-1/2 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white/85 dark:bg-stone-900/85 backdrop-blur-xs text-jds-on-surface flex items-center justify-center shadow-md hover:bg-white dark:hover:bg-stone-800 transition-all opacity-80 group-hover:opacity-100 cursor-pointer focus:outline-none focus:ring-2 focus:ring-jds-primary z-10"
                  >
                    <HiOutlineChevronLeft className="text-lg sm:text-xl" />
                  </button>

                  {/* Next Button */}
                  <button
                    type="button"
                    onClick={() => setSelectedThumb((prev) => (prev < productImages.length - 1 ? prev + 1 : 0))}
                    aria-label="Next picture"
                    className="absolute right-2.5 sm:right-4 top-1/2 -translate-y-1/2 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white/85 dark:bg-stone-900/85 backdrop-blur-xs text-jds-on-surface flex items-center justify-center shadow-md hover:bg-white dark:hover:bg-stone-800 transition-all opacity-80 group-hover:opacity-100 cursor-pointer focus:outline-none focus:ring-2 focus:ring-jds-primary z-10"
                  >
                    <HiOutlineChevronRight className="text-lg sm:text-xl" />
                  </button>
                </>
              )}
            </div>

            {/* Thumbnail Strip: ONLY displayed when multiple pictures exist */}
            {hasMultipleImages && (
              <div className="flex gap-2.5 sm:gap-4 overflow-x-auto no-scrollbar pb-1">
                {productImages.map((imgUrl, i) => (
                  <button
                    key={`${imgUrl}-${i}`}
                    type="button"
                    onClick={() => setSelectedThumb(i)}
                    aria-label={`View picture ${i + 1}`}
                    className={`flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-xl border-2 overflow-hidden bg-white cursor-pointer transition-all flex items-center justify-center p-1 ${
                      selectedThumb === i
                        ? 'border-jds-secondary shadow-xs ring-2 ring-jds-secondary/30 scale-102'
                        : 'border-jds-outline-variant/60 hover:border-jds-secondary opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img
                      className="w-full h-full object-contain"
                      src={imgUrl}
                      alt={`${product.name} view ${i + 1}`}
                    />
                  </button>
                ))}
              </div>
            )}
          </motion.div>

          {/* Right: Details */}
          <motion.div
            className="md:col-span-5 flex flex-col gap-4 sm:gap-6"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            {/* Header */}
            <div className="flex flex-col gap-2 sm:gap-3">
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <span className="bg-jds-secondary-fixed text-jds-on-secondary-fixed-variant px-2.5 py-0.5 rounded-full text-[11px] sm:text-label-sm uppercase tracking-wider font-semibold">
                  {product.type}
                </span>
                {product.waterproof_grade && (
                  <span className="bg-jds-surface-container-high text-jds-on-surface-variant px-2.5 py-0.5 rounded-full text-[11px] sm:text-label-sm font-medium">
                    {product.waterproof_grade}
                  </span>
                )}
                <div className="relative inline-flex items-center gap-1.5">
                  <span className={`px-2.5 py-0.5 rounded-full text-[11px] sm:text-label-sm font-semibold ${
                    stockBadge?.tier === 'out'
                      ? 'bg-jds-error-container/20 text-jds-error'
                      : stockBadge?.tier === 'low'
                        ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400'
                        : 'bg-jds-secondary-container/20 text-jds-secondary'
                  }`}>
                    {stockBadge?.tier === 'out'
                      ? (stockBadge.reserved > 0 ? `Out of Stock (${stockBadge.reserved} Reserved)` : 'Out of Stock')
                      : `In Stock (${stockBadge.quantity} available)`}
                  </span>

                  {/* Branch Breakdown "Where?" Popover / Hover Button */}
                  <div className="relative inline-block">
                    <button
                      type="button"
                      onMouseEnter={() => setShowBranchTooltip(true)}
                      onMouseLeave={() => setShowBranchTooltip(false)}
                      onClick={() => setShowBranchTooltip(!showBranchTooltip)}
                      className="px-2 py-0.5 rounded-full text-[10px] sm:text-label-sm font-bold bg-jds-surface-container-high text-jds-on-surface hover:bg-jds-surface-container-highest transition-colors flex items-center gap-1 border border-jds-outline-variant/30 cursor-pointer"
                      title="View branch showroom stock"
                    >
                      <HiOutlineMapPin className="text-xs text-jds-primary" />
                      <span>Where?</span>
                    </button>

                    {showBranchTooltip && branchBreakdown && (
                      <div className="absolute left-0 sm:left-auto sm:right-0 top-full mt-1.5 w-64 p-3 rounded-xl bg-jds-surface border border-jds-outline-variant/60 shadow-lg text-xs z-30 space-y-2">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-jds-on-surface-variant">
                          Showroom Availability
                        </div>
                        <div className="flex items-center justify-between py-1 border-b border-jds-outline-variant/10">
                          <span className="font-semibold text-jds-on-surface">Quiapo Showroom</span>
                          <span className={`font-mono font-bold ${branchBreakdown.quiapo.available > 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-stone-400'}`}>
                            {branchBreakdown.quiapo.available > 0 ? `${branchBreakdown.quiapo.available} available` : '0 available'}
                          </span>
                        </div>
                        {branchBreakdown.hasCaviteStock && (
                          <div className="flex items-center justify-between py-1 border-b border-jds-outline-variant/10">
                            <span className="font-semibold text-jds-on-surface">Cavite Hub</span>
                            <span className={`font-mono font-bold ${branchBreakdown.cavite.available > 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-stone-400'}`}>
                              {branchBreakdown.cavite.available > 0 ? `${branchBreakdown.cavite.available} available` : '0 available'}
                            </span>
                          </div>
                        )}
                        <div className="text-[10px] text-jds-on-surface-variant/80 pt-0.5 leading-tight">
                          Units are held only after staff confirmation of your visit.
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <h1 className="text-xl sm:text-2xl md:text-headline-xl text-jds-on-surface font-extrabold tracking-tight">{product.name}</h1>
              {product.price_range ? (
                <div className="text-lg sm:text-2xl text-jds-primary font-extrabold my-0.5">
                  ₱{product.price_range}
                </div>
              ) : (
                <div className="text-xs sm:text-body-md font-semibold text-jds-on-surface-variant my-0.5">
                  Inquire at Branch for Price (Quiapo / Cavite)
                </div>
              )}
              <p className="text-xs sm:text-sm md:text-body-lg text-jds-on-surface-variant italic leading-relaxed">
                {product.watt}W solar light equipped with internal lithium storage and automatic dusk-to-dawn lighting.
              </p>
            </div>

            {/* 2-Column Specs Bullet Grid */}
            <div className="bg-jds-surface-container-lowest border border-jds-outline-variant rounded-2xl p-4 sm:p-6 shadow-xs">
              <h3 className="text-sm sm:text-headline-md text-jds-on-surface mb-3 sm:mb-5 flex items-center gap-2 font-bold">
                <HiOutlineCog6Tooth className="text-jds-primary text-base sm:text-lg" />
                Technical Specifications
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4">
                {specs.map((spec) => {
                  const Icon = spec.icon
                  return (
                    <div key={spec.label} className="flex items-start gap-2.5 py-1.5 border-b border-jds-outline-variant/10 sm:border-none">
                      <Icon className="text-jds-secondary text-base flex-shrink-0 mt-0.5" />
                      <div className="flex flex-col gap-0.5 min-w-0">
                        <span className="text-[10px] sm:text-label-sm text-jds-on-surface-variant uppercase tracking-wider">{spec.label}</span>
                        <span className="text-xs sm:text-body-md text-jds-on-surface font-medium break-words">{spec.value}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Dual CTA Actions */}
            <div className="flex flex-col gap-2.5 sm:gap-3 mt-2 sm:mt-4">
              {/* Primary Action: Reserve for Store Pickup */}
              {(stockBadge?.quantity || 0) > 0 && product.in_stock !== false ? (
                <button
                  onClick={() => {
                    setModalMode('reserve')
                    setIsQuoteModalOpen(true)
                  }}
                  className="w-full py-3 sm:py-3.5 bg-gradient-to-r from-[#fdb813] via-[#f7ad0c] to-[#e69f05] text-stone-950 font-black rounded-xl shadow-xs hover:shadow-md hover:brightness-105 active:scale-[0.99] transition-all flex items-center justify-center gap-2 text-xs sm:text-sm border border-[#f5b311] cursor-pointer"
                >
                  <HiOutlineBuildingStorefront className="text-lg sm:text-xl" />
                  <span>Reserve for Store Pickup</span>
                </button>
              ) : (
                <button
                  disabled
                  className="w-full py-3 sm:py-3.5 bg-stone-200 text-stone-500 font-bold rounded-xl cursor-not-allowed flex items-center justify-center gap-2 text-xs sm:text-sm border border-stone-300"
                >
                  <HiOutlineLockClosed className="text-base sm:text-lg" />
                  <span>{stockBadge?.reserved > 0 ? 'Fully Reserved (Pickup Unavailable)' : 'Out of Stock (Pickup Unavailable)'}</span>
                </button>
              )}

              {/* Secondary 2-Column Row: Inquire / Request Quote & Ask Solar Assistant */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                <button
                  onClick={() => {
                    setModalMode('inquire')
                    setIsQuoteModalOpen(true)
                  }}
                  className="w-full py-2.5 sm:py-3 border-2 border-jds-secondary text-jds-secondary font-bold rounded-xl hover:bg-jds-secondary-fixed/20 transition-all flex items-center justify-center gap-1.5 text-xs sm:text-sm shadow-2xs cursor-pointer"
                >
                  <HiOutlineDocumentText className="text-base" />
                  <span>Inquire / Request Quote</span>
                </button>

                <button
                  onClick={handleAskAI}
                  className="w-full py-2.5 sm:py-3 bg-jds-surface-container-high border border-jds-outline-variant/60 text-jds-on-surface font-semibold rounded-xl hover:bg-jds-surface-container-highest transition-all flex items-center justify-center gap-1.5 text-xs sm:text-sm shadow-2xs cursor-pointer"
                >
                  <HiOutlineChatBubbleLeftRight className="text-base text-amber-500" />
                  <span>Ask Solar Assistant</span>
                </button>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <section className="mt-20">
            <h2 className="text-headline-lg text-jds-on-surface mb-8">Similar Solutions</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {relatedProducts.map((rp) => (
                <div
                  key={rp.id}
                  className="bg-jds-surface-container-lowest border border-jds-outline-variant rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow group"
                >
                  <div className="aspect-square bg-white flex items-center justify-center p-4">
                    {rp.image_url ? (
                      <img
                        alt={rp.name}
                        className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                        src={getMainProductImage(rp.image_url)}
                      />
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-jds-on-surface-variant/30">
                        <HiOutlineBolt className="text-4xl" />
                        <span className="text-label-sm">{rp.watt}W</span>
                      </div>
                    )}
                  </div>
                  <div className="p-4 flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      {rp.waterproof_grade && (
                        <span className="bg-jds-surface-container-high text-jds-on-surface-variant px-2 py-0.5 rounded-full text-[10px] uppercase w-fit tracking-tight font-semibold">
                          {rp.waterproof_grade}
                        </span>
                      )}
                      <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase tracking-tight font-semibold ${
                        rp.in_stock !== false
                          ? 'bg-jds-secondary-container/10 text-jds-secondary'
                          : 'bg-jds-error-container/10 text-jds-error'
                      }`}>
                        {rp.in_stock !== false ? 'In Stock' : 'Out of Stock'}
                      </span>
                    </div>
                    <h3 className="text-label-md font-bold text-jds-on-surface truncate">{rp.name}</h3>
                    <p className="text-headline-md text-jds-secondary text-[18px]">{rp.watt}W</p>
                    {rp.price_range && (
                      <p className="text-label-md text-jds-primary font-bold">₱{rp.price_range}</p>
                    )}
                    <Link
                      to={`/product/${rp.id}`}
                      className="mt-2 w-full py-2 border border-jds-secondary text-jds-secondary text-label-md rounded-lg hover:bg-jds-secondary-fixed/20 transition-colors text-center block"
                    >
                      View Details
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      {/* Quote & Store Visit Modal */}
      <QuoteModal
        isOpen={isQuoteModalOpen}
        onClose={() => setIsQuoteModalOpen(false)}
        product={product ? { ...product, image_url: activeImage || getMainProductImage(product.image_url) } : null}
        initialMode={modalMode}
      />
    </div>
  )
}
