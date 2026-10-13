import { createContext, useContext, useEffect, useState, useMemo } from 'react'
import { supabase } from '../lib/supabaseClient'

const AuthContext = createContext({})

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [role, setRole] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchRole = async (userId) => {
    try {
      console.log('Fetching role for:', userId)

      // Check admins table first
      const { data: adminData, error: adminError } = await supabase
        .from('admins')
        .select('id')
        .eq('id', userId)
        .maybeSingle()

      if (!adminError && adminData) {
        return 'admin'
      }

      // Check staff table
      const { data: staffData, error: staffError } = await supabase
        .from('staff')
        .select('id')
        .eq('id', userId)
        .maybeSingle()

      if (!staffError && staffData) {
        return 'staff'
      }

      // Check customer accounts by auth user id if table/column exists
      try {
        const { data: custData, error: custErr } = await supabase
          .from('customers')
          .select('id, access_token')
          .eq('id', userId)
          .maybeSingle()

        if (!custErr && custData) {
          if (custData.access_token) {
            localStorage.setItem('jd_customer_token', custData.access_token)
          }
          return 'customer'
        }
      } catch (cErr) {
        console.warn('Customer role check ignored:', cErr)
      }

      console.warn('User not found in admins or staff tables')
      return 'staff' // Default fallback
    } catch (err) {
      console.error('Role fetch error:', err)
      return 'staff'
    }
  }

  useEffect(() => {
    console.log('AuthProvider: Initializing...')
    let mounted = true

    const updateAuthState = async (session) => {
      if (!mounted) return
      
      const currentUser = session?.user ?? null
      
      if (currentUser) {
        setUser(currentUser)
        setLoading(true)
        const userRole = await fetchRole(currentUser.id)
        if (mounted) {
          setRole(userRole)
          setLoading(false)
        }
      } else {
        // Check if there is an active logged-in customer token in localStorage
        const custToken = localStorage.getItem('jd_customer_token')
        const custEmail = localStorage.getItem('jd_customer_email')
        if (custToken) {
          setUser({ id: custToken, email: custEmail || 'customer@account.local', isCustomer: true })
          setRole('customer')
          setLoading(false)
        } else {
          setUser(null)
          setRole(null)
          setLoading(false)
        }
      }
    }

    // Initial check
    supabase.auth.getSession().then(({ data: { session } }) => {
      updateAuthState(session)
    })

    // Custom event listener for customer direct login/logout events
    const handleCustomerSessionChange = () => {
      if (!mounted) return
      const custToken = localStorage.getItem('jd_customer_token')
      const custEmail = localStorage.getItem('jd_customer_email')
      if (custToken) {
        setUser({ id: custToken, email: custEmail || 'customer@account.local', isCustomer: true })
        setRole('customer')
        setLoading(false)
      } else {
        supabase.auth.getSession().then(({ data: { session } }) => {
          updateAuthState(session)
        })
      }
    }

    window.addEventListener('jd_customer_auth_change', handleCustomerSessionChange)

    // Listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log('AuthProvider: Auth state changed:', _event)
      updateAuthState(session)
    })

    return () => {
      mounted = false
      window.removeEventListener('jd_customer_auth_change', handleCustomerSessionChange)
      subscription.unsubscribe()
    }
  }, [])

  const handleSignOut = async () => {
    try {
      setLoading(true)
      // Clear customer local session
      localStorage.removeItem('jd_customer_token')
      localStorage.removeItem('jd_customer_email')
      window.dispatchEvent(new Event('jd_customer_auth_change'))
      await supabase.auth.signOut()
    } catch (err) {
      console.error('Sign out error:', err)
    } finally {
      setUser(null)
      setRole(null)
      setLoading(false)
    }
  }

  const setCustomerSession = (token, email) => {
    if (token) {
      localStorage.setItem('jd_customer_token', token)
      if (email) localStorage.setItem('jd_customer_email', email)
    } else {
      localStorage.removeItem('jd_customer_token')
      localStorage.removeItem('jd_customer_email')
    }
    window.dispatchEvent(new Event('jd_customer_auth_change'))
  }

  const value = useMemo(() => ({
    user,
    role,
    loading,
    signIn: (email, password) => supabase.auth.signInWithPassword({ email, password }),
    signOut: handleSignOut,
    setCustomerSession
  }), [user, role, loading])

  console.log('AuthProvider: Rendering, user=', user?.id, 'role=', role, 'loading=', loading)

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  return useContext(AuthContext)
}
