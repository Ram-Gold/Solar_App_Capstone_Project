import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../lib/supabaseClient'
import { useChat } from '../context/ChatContext'
import {
  HiOutlineArrowLeft,
  HiOutlineBolt,
  HiOutlineCurrencyDollar,
  HiOutlineClock,
  HiOutlineSquare2Stack,
  HiOutlineDocumentText,
  HiOutlineCog6Tooth,
  HiOutlineArrowsRightLeft,
  HiOutlineChatBubbleLeftRight,
  HiOutlineChevronDown,
} from 'react-icons/hi2'

const mockProducts = [
  { id: 1, name: 'EcoPro 400W Panel', type: 'Monocrystalline', price: 12500, watt: 400, efficiency: 22.8, battery: true, image: 'https://images.unsplash.com/photo-1509391366360-120015d1df0a?w=800&auto=format&fit=crop&q=60', description: 'Lead-free solar panel with excellent temperature coefficient for high performance in hot climates. Designed for maximum power density in residential applications where roof space is at a premium.' },
  { id: 2, name: 'SmartGrid Inverter 5kW', type: 'Accessories', price: 45000, watt: 0, efficiency: 0, battery: false, image: 'https://images.unsplash.com/photo-1508514177221-188b1cf16e9d?w=800&auto=format&fit=crop&q=60', description: 'Advanced string inverter with cloud monitoring and smart power optimization for residential systems.' },
  { id: 3, name: 'Titan Rail Mount System', type: 'Accessories', price: 3200, watt: 0, efficiency: 0, battery: false, image: 'https://images.unsplash.com/photo-1497440001374-f26997328c1b?w=800&auto=format&fit=crop&q=60', description: 'Universal mounting rail system compatible with all standard residential rooftops.' },
  { id: 4, name: 'Zenith Bifacial 450W', type: 'Monocrystalline', price: 18900, watt: 450, efficiency: 22.3, battery: false, image: 'https://images.unsplash.com/photo-1611365892117-00ac5ef43c90?w=800&auto=format&fit=crop&q=60', description: 'Bifacial panel that captures light on both sides for up to 30% more energy yield.' },
]

export default function ProductInfoPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { sendMessage } = useChat()

  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedThumb, setSelectedThumb] = useState(0)
  const [openSection, setOpenSection] = useState(null)

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
          const mockItem = mockProducts.find(p => p.id === parseInt(id))
          if (mockItem) setProduct(mockItem)
          else setError('Product not found.')
        } else {
          setProduct(data)
        }
      } catch {
        const mockItem = mockProducts.find(p => p.id === parseInt(id))
        if (mockItem) setProduct(mockItem)
        else setError('Product not found.')
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
      sendMessage(`Tell me more about the ${product.name}. Is it a good fit for me?`)
    }, 300)
  }

  const relatedProducts = mockProducts.filter(p => p.id !== parseInt(id)).slice(0, 4)

  if (loading) {
    return (
      <div className="jds-page-bg font-inter min-h-screen">
        <div className="max-w-screen-2xl mx-auto px-0 py-10">
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

  return (
    <div className="jds-page-bg font-inter text-jds-on-surface min-h-screen">
      <main className="max-w-screen-2xl mx-auto px-0 py-10">
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
              <img
                alt={product.name}
                className="w-full h-full object-contain"
                src={product.image || product.image_url}
              />
            </div>
            {/* Thumbnail Strip */}
            <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
              {[0, 1, 2, 3].map((i) => (
                <button
                  key={i}
                  onClick={() => setSelectedThumb(i)}
                  className={`flex-shrink-0 w-24 h-24 rounded-lg border-2 overflow-hidden bg-white cursor-pointer transition-colors ${
                    selectedThumb === i
                      ? 'border-jds-secondary'
                      : 'border-jds-outline-variant hover:border-jds-secondary'
                  }`}
                >
                  <img
                    className="w-full h-full object-cover"
                    src={product.image || product.image_url}
                    alt={`${product.name} view ${i + 1}`}
                  />
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
                <span className="bg-jds-surface-container-high text-jds-on-surface-variant px-3 py-1 rounded-full text-label-sm">
                  In Stock
                </span>
              </div>
              <h1 className="text-headline-xl text-jds-on-surface">{product.name}</h1>
              <p className="text-body-lg text-jds-on-surface-variant italic">
                The gold standard for high-density power generation.
              </p>
            </div>

            {/* Specs At-a-glance */}
            <div className="bg-jds-surface-container-lowest border border-jds-outline-variant rounded-xl p-6 shadow-[0px_4px_12px_rgba(0,0,0,0.05)]">
              <div className="grid grid-cols-2 gap-y-8 gap-x-4">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2 text-jds-on-surface-variant">
                    <HiOutlineBolt className="text-lg" />
                    <span className="text-label-md">Power Output</span>
                  </div>
                  <span className="text-headline-md text-jds-on-surface">{product.watt}W</span>
                </div>
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2 text-jds-on-surface-variant">
                    <HiOutlineCurrencyDollar className="text-lg" />
                    <span className="text-label-md">Est. Price</span>
                  </div>
                  <span className="text-headline-md text-jds-primary">₱{product.price?.toLocaleString()}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2 text-jds-on-surface-variant">
                    <HiOutlineClock className="text-lg" />
                    <span className="text-label-md">Efficiency</span>
                  </div>
                  <span className="text-headline-md text-jds-on-surface">{product.efficiency}%</span>
                </div>
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2 text-jds-on-surface-variant">
                    <HiOutlineSquare2Stack className="text-lg" />
                    <span className="text-label-md">Roof Size</span>
                  </div>
                  <span className="text-headline-md text-jds-on-surface">Standard</span>
                </div>
              </div>
            </div>

            {/* Accordion Sections */}
            <div className="flex flex-col gap-4">
              {/* Overview */}
              <div className="border-b border-jds-outline-variant pb-6">
                <div className="flex items-center gap-2 mb-3 text-jds-on-surface">
                  <HiOutlineDocumentText className="text-jds-primary text-xl" />
                  <h3 className="text-headline-md">Product Overview</h3>
                </div>
                <p className="text-body-md text-jds-on-surface-variant leading-relaxed">
                  {product.description || `Lead-free solar panel with excellent temperature coefficient for high performance in hot climates. Designed for maximum power density in residential applications where roof space is at a premium.`}
                </p>
              </div>

              {/* Details Dropdown */}
              <div
                className="border-b border-jds-outline-variant py-4 cursor-pointer group"
                onClick={() => setOpenSection(openSection === 'details' ? null : 'details')}
              >
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2 text-jds-on-surface">
                    <HiOutlineCog6Tooth className="text-jds-on-surface-variant text-xl" />
                    <span className="text-label-md text-[18px]">Product Details</span>
                  </div>
                  <HiOutlineChevronDown className={`text-jds-on-surface-variant group-hover:text-jds-primary transition-all ${openSection === 'details' ? 'rotate-180' : ''}`} />
                </div>
                <AnimatePresence>
                  {openSection === 'details' && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden mt-4"
                    >
                      <ul className="space-y-2 text-body-md text-jds-on-surface-variant">
                        <li>• Cell Type: {product.type}</li>
                        <li>• Temperature Coefficient: -0.26%/°C</li>
                        <li>• Weight: 21.5 kg</li>
                        <li>• Warranty: 25 years product, 25 years performance</li>
                      </ul>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Measurements Dropdown */}
              <div
                className="border-b border-jds-outline-variant py-4 cursor-pointer group"
                onClick={() => setOpenSection(openSection === 'measurements' ? null : 'measurements')}
              >
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2 text-jds-on-surface">
                    <HiOutlineArrowsRightLeft className="text-jds-on-surface-variant text-xl" />
                    <span className="text-label-md text-[18px]">Measurements</span>
                  </div>
                  <HiOutlineChevronDown className={`text-jds-on-surface-variant group-hover:text-jds-primary transition-all ${openSection === 'measurements' ? 'rotate-180' : ''}`} />
                </div>
                <AnimatePresence>
                  {openSection === 'measurements' && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden mt-4"
                    >
                      <ul className="space-y-2 text-body-md text-jds-on-surface-variant">
                        <li>• Length: 1,755 mm</li>
                        <li>• Width: 1,038 mm</li>
                        <li>• Depth: 30 mm</li>
                        <li>• Frame: Anodized aluminum alloy</li>
                      </ul>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* CTA */}
            <div className="flex flex-col gap-4 mt-4">
              <button
                onClick={handleAskAI}
                className="w-full py-4 bg-gradient-to-r from-[#fdb813] to-[#ffdea7] text-jds-on-primary-fixed font-bold rounded-lg shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2"
              >
                <HiOutlineChatBubbleLeftRight className="text-xl" />
                Ask SolarAI About This
              </button>
              <button className="w-full py-4 border-2 border-jds-secondary text-jds-secondary font-bold rounded-lg hover:bg-jds-secondary-fixed/20 transition-all">
                Add to Quote
              </button>
            </div>
          </motion.div>
        </div>

        {/* Related Products */}
        <section className="mt-20">
          <h2 className="text-headline-lg text-jds-on-surface mb-8">Similar Solutions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {relatedProducts.map((rp) => (
              <div
                key={rp.id}
                className="bg-jds-surface-container-lowest border border-jds-outline-variant rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow group"
              >
                <div className="aspect-square bg-white flex items-center justify-center p-4">
                  <img
                    alt={rp.name}
                    className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                    src={rp.image || rp.image_url}
                  />
                </div>
                <div className="p-4 flex flex-col gap-2">
                  <span className="bg-jds-surface-container-high text-jds-on-surface-variant px-2 py-0.5 rounded-full text-[10px] uppercase w-fit tracking-tight font-semibold">
                    In Stock
                  </span>
                  <h3 className="text-label-md font-bold text-jds-on-surface truncate">{rp.name}</h3>
                  <p className="text-headline-md text-jds-primary text-[18px]">₱{rp.price?.toLocaleString()}</p>
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
      </main>
    </div>
  )
}
