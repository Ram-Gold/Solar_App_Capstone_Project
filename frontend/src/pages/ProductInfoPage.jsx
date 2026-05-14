import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { supabase } from '../lib/supabaseClient'
import { useChat } from '../context/ChatContext'
import { Card, CardContent } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Separator } from '../components/ui/separator'
import { Skeleton } from '../components/ui/skeleton'
import { ArrowLeft, MessageSquare, Zap, DollarSign, Battery, Maximize, AlertCircle } from 'lucide-react'

// Same mock data as BrowsePage for fallback
const mockProducts = [
  { id: 1, name: 'SunPower Maxeon 6', type: 'Monocrystalline', price: 450, watt: 425, efficiency: 22.8, battery: true, image: 'https://images.unsplash.com/photo-1509391366360-120015d1df0a?w=800&auto=format&fit=crop&q=60', description: 'The SunPower Maxeon 6 solar panel offers the highest efficiency available on the market today. Featuring advanced back-contact technology, it delivers more power over time, exceptionally low degradation, and unparalleled reliability in harsh weather conditions.' },
  { id: 2, name: 'LG NeON R', type: 'Monocrystalline', price: 380, watt: 400, efficiency: 22.3, battery: false, image: 'https://images.unsplash.com/photo-1508514177221-188b1cf16e9d?w=800&auto=format&fit=crop&q=60', description: 'LG NeON R is a powerful solar module that provides top-tier performance. Its innovative cell structure eliminates electrodes on the front, maximizing light absorption. It guarantees exceptional durability and high output even in low-light environments.' },
  { id: 3, name: 'Canadian Solar HiKu', type: 'Polycrystalline', price: 250, watt: 450, efficiency: 20.6, battery: false, image: 'https://images.unsplash.com/photo-1497440001374-f26997328c1b?w=800&auto=format&fit=crop&q=60', description: 'Canadian Solar HiKu panels utilize half-cut cell technology to significantly reduce power loss and improve shading tolerance. A highly cost-effective solution offering solid efficiency for residential and commercial installations.' },
  { id: 4, name: 'Tesla Solar Roof', type: 'Thin-Film', price: 1200, watt: 71.6, efficiency: 18.0, battery: true, image: 'https://images.unsplash.com/photo-1588610015509-35c6328aabfb?w=800&auto=format&fit=crop&q=60', description: 'The Tesla Solar Roof replaces your existing roof entirely with active solar tiles and inactive architectural tiles. It seamlessly integrates solar production into your home’s aesthetic while providing unmatched durability against extreme weather, backed by integrated Powerwall storage.' },
  { id: 5, name: 'Panasonic EverVolt', type: 'Monocrystalline', price: 420, watt: 410, efficiency: 22.2, battery: true, image: 'https://images.unsplash.com/photo-1613665813446-82a78c468a1d?w=800&auto=format&fit=crop&q=60', description: 'Panasonic EverVolt panels feature heterojunction cell technology, minimizing electron loss and maximizing efficiency. They boast one of the lowest temperature coefficients in the industry, meaning they produce more power even on the hottest days.' },
  { id: 6, name: 'Q CELLS Q.PEAK DUO', type: 'Polycrystalline', price: 310, watt: 400, efficiency: 20.4, battery: false, image: 'https://images.unsplash.com/photo-1611365892117-00ac5ef43c90?w=800&auto=format&fit=crop&q=60', description: 'Q CELLS Q.PEAK DUO combines high-tech engineering with affordability. Its Q.ANTUM DUO technology prevents efficiency degradation and ensures robust yield across all weather patterns, making it a reliable choice for budget-conscious homeowners.' },
]

export default function ProductInfoPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { sendMessage } = useChat()
  
  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

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
          console.warn('Supabase fetch failed. Using mock data.')
          // Fallback to mock data
          const mockItem = mockProducts.find(p => p.id === parseInt(id))
          if (mockItem) {
            setProduct(mockItem)
          } else {
            setError('Product not found.')
          }
        } else {
          setProduct(data)
        }
      } catch (err) {
        console.warn('Supabase request failed. Using mock data.', err)
        const mockItem = mockProducts.find(p => p.id === parseInt(id))
        if (mockItem) {
          setProduct(mockItem)
        } else {
          setError('Product not found.')
        }
      } finally {
        setTimeout(() => setLoading(false), 500) // simulated delay
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

  if (loading) {
    return (
      <div className="container mx-auto py-12 px-4 max-w-6xl">
        <Button variant="ghost" disabled className="mb-6"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Browse</Button>
        <div className="grid lg:grid-cols-2 gap-12">
          <Skeleton className="aspect-[4/3] w-full rounded-xl" />
          <div className="space-y-6">
            <Skeleton className="h-10 w-3/4" />
            <Skeleton className="h-6 w-1/4" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </div>
      </div>
    )
  }

  if (error || !product) {
    return (
      <div className="container mx-auto py-24 px-4 text-center">
        <AlertCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
        <h1 className="text-3xl font-bold mb-4">Product Not Found</h1>
        <p className="text-muted-foreground mb-8">We couldn't find the product you're looking for.</p>
        <Button asChild><Link to="/browse">Return to Browse</Link></Button>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-12 px-4 max-w-6xl">
      <Button variant="ghost" asChild className="mb-8 hover:bg-muted">
        <Link to="/browse">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Browse
        </Link>
      </Button>

      <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-start">
        {/* Left Col: Image */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="relative rounded-2xl overflow-hidden shadow-2xl aspect-[4/3] bg-muted group"
        >
          <img 
            src={product.image || product.image_url} 
            alt={product.name} 
            className="object-cover w-full h-full transition-transform duration-500 group-hover:scale-105"
          />
          {product.battery && (
            <Badge className="absolute top-4 right-4 bg-green-500 hover:bg-green-600 text-white shadow-lg border-none px-3 py-1">
              <Battery className="w-4 h-4 mr-1.5" /> Includes Battery
            </Badge>
          )}
        </motion.div>

        {/* Right Col: Details */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex flex-col"
        >
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-3">
              <Badge variant="outline" className="text-primary border-primary/30 uppercase tracking-wider text-xs font-semibold">
                {product.type}
              </Badge>
              <Badge variant="secondary" className="bg-secondary/50">
                In Stock
              </Badge>
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-2 text-foreground">
              {product.name}
            </h1>
          </div>

          <Card className="mb-8 border-primary/10 shadow-sm bg-card/50 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="grid grid-cols-2 gap-y-6 gap-x-4">
                <div className="flex flex-col">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Zap className="w-4 h-4" /> <span className="text-sm font-medium">Power Output</span>
                  </div>
                  <span className="text-2xl font-bold">{product.watt}W</span>
                </div>
                
                <div className="flex flex-col">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <DollarSign className="w-4 h-4" /> <span className="text-sm font-medium">Est. Price</span>
                  </div>
                  <span className="text-2xl font-bold text-primary">${product.price}</span>
                </div>

                <div className="flex flex-col">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <AlertCircle className="w-4 h-4" /> <span className="text-sm font-medium">Efficiency</span>
                  </div>
                  <span className="text-lg font-semibold">{product.efficiency}%</span>
                </div>

                <div className="flex flex-col">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Maximize className="w-4 h-4" /> <span className="text-sm font-medium">Roof Size</span>
                  </div>
                  <span className="text-lg font-semibold">Standard</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="mb-8 space-y-4">
            <h3 className="text-xl font-bold flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-primary" /> Product Overview
            </h3>
            <p className="text-muted-foreground leading-relaxed text-lg">
              {product.description || `The ${product.name} provides highly efficient ${product.type.toLowerCase()} energy solutions for residential roofs. Combining ${product.watt}W of power with a competitive price of $${product.price}, it stands out as an excellent option for maximizing solar yield.`}
            </p>
          </div>

          <Separator className="mb-8" />

          <div className="flex flex-col sm:flex-row gap-4 mt-auto">
            <Button 
              size="lg" 
              className="flex-1 bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600 text-white shadow-lg shadow-orange-500/20 transition-all hover:-translate-y-0.5"
              onClick={handleAskAI}
            >
              <MessageSquare className="mr-2 h-5 w-5" />
              Ask SolarAI About This
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
