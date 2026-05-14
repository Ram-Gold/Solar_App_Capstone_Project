import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { supabase } from '../lib/supabaseClient'
import { Input } from '../components/ui/input'
import { Slider } from '../components/ui/slider'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'
import { Switch } from '../components/ui/switch'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Skeleton } from '../components/ui/skeleton'
import { Search, Filter, Battery, Zap, DollarSign, MessageSquare } from 'lucide-react'
import { useChat } from '../context/ChatContext'

// Mock data as fallback for unconfigured Supabase
const mockProducts = [
  { id: 1, name: 'SunPower Maxeon 6', type: 'Monocrystalline', price: 450, watt: 425, efficiency: 22.8, battery: true, image: 'https://images.unsplash.com/photo-1509391366360-120015d1df0a?w=800&auto=format&fit=crop&q=60' },
  { id: 2, name: 'LG NeON R', type: 'Monocrystalline', price: 380, watt: 400, efficiency: 22.3, battery: false, image: 'https://images.unsplash.com/photo-1508514177221-188b1cf16e9d?w=800&auto=format&fit=crop&q=60' },
  { id: 3, name: 'Canadian Solar HiKu', type: 'Polycrystalline', price: 250, watt: 450, efficiency: 20.6, battery: false, image: 'https://images.unsplash.com/photo-1497440001374-f26997328c1b?w=800&auto=format&fit=crop&q=60' },
  { id: 4, name: 'Tesla Solar Roof', type: 'Thin-Film', price: 1200, watt: 71.6, efficiency: 18.0, battery: true, image: 'https://images.unsplash.com/photo-1588610015509-35c6328aabfb?w=800&auto=format&fit=crop&q=60' },
  { id: 5, name: 'Panasonic EverVolt', type: 'Monocrystalline', price: 420, watt: 410, efficiency: 22.2, battery: true, image: 'https://images.unsplash.com/photo-1613665813446-82a78c468a1d?w=800&auto=format&fit=crop&q=60' },
  { id: 6, name: 'Q CELLS Q.PEAK DUO', type: 'Polycrystalline', price: 310, watt: 400, efficiency: 20.4, battery: false, image: 'https://images.unsplash.com/photo-1611365892117-00ac5ef43c90?w=800&auto=format&fit=crop&q=60' },
]

export default function BrowsePage() {
  const navigate = useNavigate()
  const { sendMessage } = useChat()
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  
  // Filters state
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('All')
  const [maxBudget, setMaxBudget] = useState(1500)
  const [batteryOnly, setBatteryOnly] = useState(false)

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true)
      try {
        const { data, error } = await supabase.from('products').select('*')
        
        if (error || !data || data.length === 0) {
          console.warn('Supabase fetch failed or returned empty. Using mock data.')
          setProducts(mockProducts)
        } else {
          setProducts(data)
        }
      } catch (err) {
        console.warn('Supabase request failed. Using mock data.', err)
        setProducts(mockProducts)
      } finally {
        // Simulate network delay for mock data realism
        setTimeout(() => setLoading(false), 800)
      }
    }

    fetchProducts()
  }, [])

  const handleAskAI = (product) => {
    navigate('/chat')
    setTimeout(() => {
      sendMessage(`Tell me more about the ${product.name}. Is it a good fit for me?`)
    }, 300)
  }

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) &&
    (typeFilter === 'All' || p.type === typeFilter) &&
    p.price <= maxBudget &&
    (!batteryOnly || p.battery === true)
  )

  return (
    <div className="container mx-auto py-12 px-4">
      <div className="mb-10 text-center">
        <h1 className="text-4xl font-extrabold mb-4">Explore <span className="solar-text-gradient">Solar Solutions</span></h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Find the perfect solar panels for your home. Use our advanced filters to match your exact needs.
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Filters Sidebar */}
        <aside className="w-full lg:w-1/4 space-y-8">
          <Card className="sticky top-24">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="w-5 h-5 text-primary" />
                Filters
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Search */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Search</label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Search panels..."
                    className="pl-8"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
              </div>

              {/* Panel Type */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Panel Type</label>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All Types</SelectItem>
                    <SelectItem value="Monocrystalline">Monocrystalline</SelectItem>
                    <SelectItem value="Polycrystalline">Polycrystalline</SelectItem>
                    <SelectItem value="Thin-Film">Thin-Film</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Max Price */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Max Price</label>
                  <span className="text-sm font-bold text-primary">${maxBudget}</span>
                </div>
                <Slider
                  value={[maxBudget]}
                  max={2000}
                  step={50}
                  onValueChange={(val) => setMaxBudget(val[0])}
                  className="w-full"
                />
              </div>

              {/* Battery Toggle */}
              <div className="flex items-center justify-between pt-2 border-t">
                <div className="space-y-0.5">
                  <label className="text-sm font-medium">Include Battery</label>
                  <p className="text-xs text-muted-foreground">Systems with storage</p>
                </div>
                <Switch
                  checked={batteryOnly}
                  onCheckedChange={setBatteryOnly}
                />
              </div>
            </CardContent>
          </Card>
        </aside>

        {/* Product Grid */}
        <main className="w-full lg:w-3/4">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">Results ({loading ? '-' : filtered.length})</h2>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="overflow-hidden">
                  <Skeleton className="h-48 w-full rounded-none" />
                  <CardHeader className="space-y-2">
                    <Skeleton className="h-5 w-2/3" />
                    <Skeleton className="h-4 w-1/3" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-4 w-1/2 mb-2" />
                    <Skeleton className="h-4 w-1/2" />
                  </CardContent>
                  <CardFooter>
                    <Skeleton className="h-10 w-full" />
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : filtered.length > 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"
            >
              {filtered.map((product) => (
                <Card key={product.id} className="overflow-hidden flex flex-col hover:border-primary/50 transition-colors group">
                  <div className="relative overflow-hidden aspect-video bg-muted">
                    <img
                      src={product.image || product.image_url}
                      alt={product.name}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    {product.battery && (
                      <Badge className="absolute top-2 right-2 bg-green-500 hover:bg-green-600 border-none">
                        <Battery className="w-3 h-3 mr-1" /> Battery
                      </Badge>
                    )}
                  </div>
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg line-clamp-1">{product.name}</CardTitle>
                      <Badge variant="outline" className="ml-2 whitespace-nowrap bg-background">
                        {product.efficiency}% eff
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{product.type}</p>
                  </CardHeader>
                  <CardContent className="flex-grow">
                    <div className="grid grid-cols-2 gap-4 text-sm mt-2">
                      <div className="flex items-center gap-2">
                        <Zap className="w-4 h-4 text-primary" />
                        <span className="font-medium">{product.watt}W</span>
                      </div>
                      <div className="flex items-center gap-2 text-right justify-end">
                        <DollarSign className="w-4 h-4 text-primary" />
                        <span className="font-bold text-lg">{product.price}</span>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="pt-2 border-t mt-auto gap-2">
                    <Button asChild className="flex-1" variant="outline">
                      <Link to={`/product/${product.id}`}>
                        View Specs
                      </Link>
                    </Button>
                    <button 
                      onClick={() => handleAskAI(product)}
                      className="bg-orange-500 hover:bg-orange-600 text-white p-2 rounded-lg transition-all shadow-lg shadow-orange-500/20 active:scale-95"
                    >
                      <MessageSquare className="h-5 w-5" />
                    </button>
                  </CardFooter>
                </Card>
              ))}
            </motion.div>
          ) : (
            <div className="text-center py-20 bg-muted/30 rounded-lg border border-dashed">
              <Filter className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-20" />
              <h3 className="text-xl font-bold mb-2">No products found</h3>
              <p className="text-muted-foreground mb-6">Try adjusting your filters to see more results.</p>
              <Button variant="outline" onClick={() => {
                setSearch('')
                setTypeFilter('All')
                setMaxBudget(1500)
                setBatteryOnly(false)
              }}>
                Clear Filters
              </Button>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
