import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Button } from '../components/ui/button'
import { motion } from 'framer-motion'
import { Sun, Lock, Mail, ArrowRight, ShieldCheck, AlertCircle, Loader2 } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [focusedInput, setFocusedInput] = useState(null)
  const { signIn } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const { error } = await signIn(email, password)
      if (error) {
        setError(error.message)
      } else {
        navigate('/admin')
      }
    } catch (err) {
      setError('An unexpected system error occurred.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-[calc(100vh-4rem)] w-full overflow-hidden bg-background flex items-center justify-center px-4 py-12">
      {/* Visual Anchor: Ambient Breathing Solar Sphere */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden flex items-center justify-center">
        <motion.div 
          animate={{ 
            scale: [1, 1.08, 1],
            opacity: [0.15, 0.25, 0.15] 
          }}
          transition={{ 
            duration: 8, 
            repeat: Infinity,
            ease: "easeInOut" 
          }}
          className="absolute w-[600px] h-[600px] rounded-full bg-gradient-to-tr from-[#ff8e3c]/40 via-[#ff5e3a]/20 to-transparent blur-3xl"
        />
        <div className="absolute w-[300px] h-[300px] rounded-full border border-[#ff8e3c]/20 animate-[spin_60s_linear_infinite] border-dashed" />
      </div>

      {/* Main Container */}
      <div className="relative w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        
        {/* Left Column: Editorial Brand Statement */}
        <motion.div 
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="lg:col-span-5 space-y-6 text-left"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold tracking-wide uppercase">
            <ShieldCheck className="w-3.5 h-3.5" /> Secure Authentication
          </div>

          <h1 className="text-4xl lg:text-5xl font-extrabold tracking-tight text-foreground leading-[1.1]">
            Access the <br />
            <span className="solar-text-gradient font-black">Solar Core.</span>
          </h1>

          <p className="text-base text-muted-foreground leading-relaxed max-w-md">
            Enter your authorized administrative credentials to access real-time system metrics, configuration blueprints, and platform overrides.
          </p>

          <div className="pt-4 border-t border-border/60 flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Node Active
            </span>
            <span>•</span>
            <span>TLS 1.3 Encrypted</span>
          </div>
        </motion.div>

        {/* Right Column: Premium Auth Card */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
          className="lg:col-span-7 w-full max-w-md mx-auto lg:ml-auto"
        >
          <div className="relative backdrop-blur-xl bg-card/80 border border-border/80 rounded-2xl shadow-2xl overflow-hidden p-8 space-y-6">
            
            {/* Subtle top border glow */}
            <div className="absolute top-0 left-0 right-0 h-[3px] solar-gradient opacity-80" />

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h2 className="text-xl font-bold tracking-tight text-foreground">Staff Portal</h2>
                <p className="text-xs text-muted-foreground">Session token verification</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <Sun className="w-5 h-5" />
              </div>
            </div>

            {/* Error Message Spell */}
            {error && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-start gap-3 p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm"
              >
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="leading-tight font-medium">{error}</span>
              </motion.div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email Field */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground/90 tracking-wide uppercase" htmlFor="email">
                  Corporate Email
                </label>
                <div className="relative">
                  <Mail className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${focusedInput === 'email' ? 'text-primary' : 'text-muted-foreground'}`} />
                  <input
                    id="email"
                    type="email"
                    className="w-full h-11 pl-10 pr-4 rounded-xl border border-input bg-background/50 text-sm transition-all outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground/60"
                    placeholder="admin@solarapp.io"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onFocus={() => setFocusedInput('email')}
                    onBlur={() => setFocusedInput(null)}
                    required
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground/90 tracking-wide uppercase" htmlFor="password">
                  Security Passkey
                </label>
                <div className="relative">
                  <Lock className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${focusedInput === 'password' ? 'text-primary' : 'text-muted-foreground'}`} />
                  <input
                    id="password"
                    type="password"
                    className="w-full h-11 pl-10 pr-4 rounded-xl border border-input bg-background/50 text-sm transition-all outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground/60"
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={() => setFocusedInput('password')}
                    onBlur={() => setFocusedInput(null)}
                    required
                  />
                </div>
              </div>

              {/* Submit CTA */}
              <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }} className="pt-2">
                <Button 
                  type="submit" 
                  size="lg" 
                  className="w-full h-11 rounded-xl text-sm font-bold shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all flex items-center justify-center gap-2 group"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Authenticating...</span>
                    </>
                  ) : (
                    <>
                      <span>Establish Connection</span>
                      <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                    </>
                  )}
                </Button>
              </motion.div>
            </form>

            <div className="text-center pt-2">
              <p className="text-[11px] text-muted-foreground">
                Protected by strict platform policies. Unauthorized access logs are actively tracked and reported.
              </p>
            </div>
          </div>
        </motion.div>

      </div>
    </div>
  )
}
