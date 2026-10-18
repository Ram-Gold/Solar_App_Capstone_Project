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
} from 'react-icons/hi2'

export default function ProductInfoPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { sendMessage } = useChat()

  const [product, setProduct] = useState(null)
  const [relatedProducts, setRelatedProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedThumb, setSelectedThumb] = useState(0)
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState('reserve')

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
      { label: 'Warranty', value: p.warranty, icon: HiOutlineShieldCheck },
      { label: 'Life Span', value: p.life_span, icon: HiOutlineCalendarDays },
      { label: 'Place of Use', value: p.place_of_use, icon: HiOutlineMapPin },
      { label: 'Availability', value: p.in_stock ? 'In Stock' : 'Out of Stock', icon: HiOutlineShieldCheck },
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

  return (
    <div className="jds-page-bg font-inter text-jds-on-surface min-h-screen">
      <main className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Back Navigation */}
        <Link
          to="/browse"
          className="inline-flex items-center gap-2 text-jds-on-surface-variant hover:text-jds-primary transition-colors mb-10 group"
        >
          <HiOutlineArrowLeft className="text-xl" />
          <span className="text-label-md">Back to Browse</span>
        </Link>

        {/* Product Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12 items-start">
          {/* Left: Gallery */}
          <motion.div
            className="md:col-span-7 flex flex-col gap-6"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="bg-jds-surface-container-lowest rounded-xl overflow-hidden shadow-[0px_4px_12px_rgba(0,0,0,0.05)] aspect-[4/3] relative flex items-center justify-center p-8">
              {product.image_url ? (
                <img
                  alt={product.name}
                  className="w-full h-full object-contain"
                  src={product.image_url}
                />
              ) : (
                <div className="flex flex-col items-center gap-4 text-jds-on-surface-variant/30">
                  <HiOutlineBolt className="text-7xl" />
                  <span className="text-headline-md">{product.watt}W</span>
                  <span className="text-body-md">{product.type}</span>
                </div>
              )}
            </div>
            {/* Thumbnail Strip */}
            <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
              {[0, 1, 2, 3].map((i) => (
                <button
                  key={i}
                  onClick={() => setSelectedThumb(i)}
                  className={`flex-shrink-0 w-24 h-24 rounded-lg border-2 overflow-hidden bg-white cursor-pointer transition-colors flex items-center justify-center ${
                    selectedThumb === i
                      ? 'border-jds-secondary'
                      : 'border-jds-outline-variant hover:border-jds-secondary'
                  }`}
                >
                  {product.image_url ? (
                    <img
                      className="w-full h-full object-cover"
                      src={product.image_url}
                      alt={`${product.name} view ${i + 1}`}
                    />
                  ) : (
                    <HiOutlineBolt className="text-2xl text-jds-on-surface-variant/30" />
                  )}
                </button>
              ))}
            </div>
          </motion.div>

          {/* Right: Details */}
          <motion.div
            className="md:col-span-5 flex flex-col gap-8"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            {/* Header */}
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap gap-2">
                <span className="bg-jds-secondary-fixed text-jds-on-secondary-fixed-variant px-3 py-1 rounded-full text-label-sm uppercase tracking-wider">
                  {product.type}
                </span>
                {product.waterproof_grade && (
                  <span className="bg-jds-surface-container-high text-jds-on-surface-variant px-3 py-1 rounded-full text-label-sm">
                    {product.waterproof_grade}
                  </span>
                )}
                <span className={`px-3 py-1 rounded-full text-label-sm ${
                  product.in_stock
                    ? 'bg-jds-secondary-container/20 text-jds-secondary'
                    : 'bg-jds-error-container/20 text-jds-error'
                }`}>
                  {product.in_stock ? 'In Stock' : 'Out of Stock'}
                </span>
              </div>
              <h1 className="text-headline-lg-mobile md:text-headline-xl text-jds-on-surface">{product.name}</h1>
              {product.price_range && (
                <div className="text-display-sm text-jds-primary font-bold my-1">
                  ₱{product.price_range}
                </div>
              )}
              <p className="text-body-lg text-jds-on-surface-variant italic">
                {product.watt}W solar-powered light — built for durability and performance.
              </p>
            </div>

            {/* 2-Column Specs Bullet Grid */}
            <div className="bg-jds-surface-container-lowest border border-jds-outline-variant rounded-xl p-6 shadow-[0px_4px_12px_rgba(0,0,0,0.05)]">
              <h3 className="text-headline-md text-jds-on-surface mb-6 flex items-center gap-2">
                <HiOutlineCog6Tooth className="text-jds-primary" />
                Technical Specifications
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {specs.map((spec) => {
                  const Icon = spec.icon
                  return (
                    <div key={spec.label} className="flex items-start gap-3 py-2">
                      <Icon className="text-jds-secondary text-lg flex-shrink-0 mt-0.5" />
                      <div className="flex flex-col gap-0.5 min-w-0">
                        <span className="text-label-sm text-jds-on-surface-variant uppercase tracking-wider">{spec.label}</span>
                        <span className="text-body-md text-jds-on-surface font-medium break-words">{spec.value}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Dual CTA Actions */}
            <div className="flex flex-col gap-3 mt-4">
              {/* Primary Action: Reserve for Store Pickup */}
              {product.in_stock ? (
                <button
                  onClick={() => {
                    setModalMode('reserve')
                    setIsQuoteModalOpen(true)
                  }}
                  className="w-full py-4 bg-gradient-to-r from-[#fdb813] via-[#f7ad0c] to-[#e69f05] text-stone-950 font-black rounded-xl shadow-md hover:shadow-xl hover:brightness-105 active:scale-[0.99] transition-all flex items-center justify-center gap-2.5 text-base border border-[#f5b311]"
                >
                  <HiOutlineBuildingStorefront className="text-2xl" />
                  <span>Reserve for Store Pickup</span>
                </button>
              ) : (
                <button
                  disabled
                  className="w-full py-4 bg-stone-200 text-stone-500 font-bold rounded-xl cursor-not-allowed flex items-center justify-center gap-2 text-base border border-stone-300"
                >
                  <HiOutlineLockClosed className="text-xl" />
                  <span>Out of Stock — Pickup Unavailable</span>
                </button>
              )}

              {/* Secondary 2-Column Row: Inquire / Request Quote & Ask Solar Assistant */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  onClick={() => {
                    setModalMode('inquire')
                    setIsQuoteModalOpen(true)
                  }}
                  className="w-full py-3.5 border-2 border-jds-secondary text-jds-secondary font-bold rounded-xl hover:bg-jds-secondary-fixed/20 transition-all flex items-center justify-center gap-2 text-sm shadow-sm"
                >
                  <HiOutlineDocumentText className="text-lg" />
                  <span>Inquire / Request Quote</span>
                </button>

                <button
                  onClick={handleAskAI}
                  className="w-full py-3.5 bg-jds-surface-container-high border border-jds-outline-variant/60 text-jds-on-surface font-semibold rounded-xl hover:bg-jds-surface-container-highest transition-all flex items-center justify-center gap-2 text-sm shadow-sm"
                >
                  <HiOutlineChatBubbleLeftRight className="text-lg text-amber-500" />
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
                        src={rp.image_url}
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
        product={product}
        initialMode={modalMode}
      />
    </div>
  )
}
