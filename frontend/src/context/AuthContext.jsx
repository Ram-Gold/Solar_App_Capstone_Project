import { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'

const INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000 // 15 minutes
const ACTIVITY_THROTTLE_MS = 10 * 1000 // 10 seconds
const WATCHDOG_INTERVAL_MS = 15 * 1000 // 15 seconds

const AuthContext = createContext({})

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [role, setRole] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchRole = async (userId, userEmail = null) => {
    try {
      console.log('Fetching role for:', userId)

      // Check admins table first
      const { data: adminData, error: adminError } = await supabase
        .from('admins')
        .select('id')
        .eq('id', userId)
        .maybeSingle()

      if (!adminError && adminData) {
        return { role: 'admin', accessToken: null }
      }

      // Check staff table
      const { data: staffData, error: staffError } = await supabase
        .from('staff')
        .select('id')
        .eq('id', userId)
        .maybeSingle()

      if (!staffError && staffData) {
        return { role: 'staff', accessToken: null }
      }

      // Check customer accounts by auth user id (user_id column or id column)
      try {
        const { data: custData, error: custErr } = await supabase
          .from('customers')
          .select('id, user_id, access_token')
          .or(`user_id.eq.${userId},id.eq.${userId}`)
          .maybeSingle()

        if (!custErr && custData) {
          if (custData.access_token) {
            localStorage.setItem('jd_customer_token', custData.access_token)
          }
          return { role: 'customer', accessToken: custData.access_token || null }
        }

        // Fallback: match customer by email if user_id was not yet linked
        const cleanEmail = (userEmail || '').trim().toLowerCase()
        if (cleanEmail) {
          const { data: custByEmail, error: emailErr } = await supabase
            .from('customers')
            .select('id, user_id, access_token')
            .ilike('email', cleanEmail)
            .maybeSingle()

          if (!emailErr && custByEmail) {
            if (custByEmail.access_token) {
              localStorage.setItem('jd_customer_token', custByEmail.access_token)
            }
            return { role: 'customer', accessToken: custByEmail.access_token || null }
          }
        }
      } catch (cErr) {
        console.warn('Customer role check ignored:', cErr)
      }

      console.warn('User not found in admins, staff, or customers tables')
      return { role: null, accessToken: null }
    } catch (err) {
      console.error('Role fetch error:', err)
      return { role: null, accessToken: null }
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
        const { role: userRole, accessToken } = await fetchRole(currentUser.id, currentUser.email)
        if (mounted) {
          if (userRole === 'customer' && accessToken) {
            setUser({ ...currentUser, accessToken })
          }
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
      localStorage.removeItem('jd_last_activity_timestamp')
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

  const handleTimeoutSignOut = useCallback(async () => {
    try {
      setLoading(true)
      // Preserve user email for login screen autofill
      const currentEmail = user?.email || localStorage.getItem('jd_customer_email') || localStorage.getItem('jd_remembered_email')
      if (currentEmail) {
        localStorage.setItem('jd_remembered_email', currentEmail)
        localStorage.setItem('jd_customer_email', currentEmail)
      }

      // Invalidate active auth tokens and purge activity timestamp
      localStorage.removeItem('jd_customer_token')
      localStorage.removeItem('jd_last_activity_timestamp')
      window.dispatchEvent(new Event('jd_customer_auth_change'))
      await supabase.auth.signOut()
    } catch (err) {
      console.error('Session timeout signOut error:', err)
    } finally {
      setUser(null)
      setRole(null)
      setLoading(false)

      if (typeof window !== 'undefined' && (!window.location.pathname.startsWith('/login') || !window.location.search.includes('reason=timeout'))) {
        window.location.href = '/login?reason=timeout'
      }
    }
  }, [user])

  // Inactivity session watchdog for authenticated accounts (Customer, Staff, Admin)
  useEffect(() => {
    if (!user) return

    // Initialize or verify activity timestamp upon authentication
    const currentStamp = localStorage.getItem('jd_last_activity_timestamp')
    if (!currentStamp) {
      localStorage.setItem('jd_last_activity_timestamp', Date.now().toString())
    }

    let lastBroadcast = Date.now()

    const recordUserActivity = () => {
      const now = Date.now()
      if (now - lastBroadcast >= ACTIVITY_THROTTLE_MS) {
        lastBroadcast = now
        try {
          localStorage.setItem('jd_last_activity_timestamp', now.toString())
        } catch {
          // Ignore local storage quota limits
        }
      }
    }

    const activityEvents = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart']
    activityEvents.forEach((evt) => {
      window.addEventListener(evt, recordUserActivity, { passive: true })
    })

    // Synchronize activity across multiple browser tabs
    const handleStorageSync = (e) => {
      if (e.key === 'jd_last_activity_timestamp' && e.newValue) {
        lastBroadcast = Number(e.newValue)
      }
    }
    window.addEventListener('storage', handleStorageSync)

    // Check immediately on tab focus or device wake-up
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const rawStamp = localStorage.getItem('jd_last_activity_timestamp')
        if (rawStamp && (Date.now() - Number(rawStamp) >= INACTIVITY_TIMEOUT_MS)) {
          handleTimeoutSignOut()
        }
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    // Periodic watchdog check every 15 seconds
    const watchdogInterval = setInterval(() => {
      const rawStamp = localStorage.getItem('jd_last_activity_timestamp')
      const lastActive = rawStamp ? Number(rawStamp) : Date.now()
      if (Date.now() - lastActive >= INACTIVITY_TIMEOUT_MS) {
        handleTimeoutSignOut()
      }
    }, WATCHDOG_INTERVAL_MS)

    return () => {
      activityEvents.forEach((evt) => {
        window.removeEventListener(evt, recordUserActivity)
      })
      window.removeEventListener('storage', handleStorageSync)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      clearInterval(watchdogInterval)
    }
  }, [user, handleTimeoutSignOut])

  const setCustomerSession = (token, email) => {
    if (token) {
      localStorage.setItem('jd_customer_token', token)
      localStorage.setItem('jd_last_activity_timestamp', Date.now().toString())
      if (email) localStorage.setItem('jd_customer_email', email)
    } else {
      localStorage.removeItem('jd_customer_token')
      localStorage.removeItem('jd_customer_email')
      localStorage.removeItem('jd_last_activity_timestamp')
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
