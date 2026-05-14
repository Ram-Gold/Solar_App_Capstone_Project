import { createContext, useContext, useEffect, useState, useMemo } from 'react'
import { supabase } from '../lib/supabaseClient'

const AuthContext = createContext({})

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [role, setRole] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchProfile = async (userId) => {
    try {
      console.log('Fetching profile for:', userId)
      const { data, error } = await supabase.from('profiles').select('role').eq('id', userId).single()
      if (error) {
        console.error('Error fetching role:', error)
        return 'staff'
      }
      return data?.role || 'staff'
    } catch (err) {
      console.error('Profile fetch error:', err)
      return 'staff'
    }
  }

  useEffect(() => {
    console.log('AuthProvider: Initializing...')
    let mounted = true

    const updateAuthState = async (session) => {
      if (!mounted) return
      
      const currentUser = session?.user ?? null
      setUser(currentUser)
      
      if (currentUser) {
        setLoading(true)
        const userRole = await fetchProfile(currentUser.id)
        if (mounted) {
          setRole(userRole)
          setLoading(false)
        }
      } else {
        if (mounted) {
          setRole(null)
          setLoading(false)
        }
      }
    }

    // Initial check
    supabase.auth.getSession().then(({ data: { session } }) => {
      updateAuthState(session)
    })

    // Listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log('AuthProvider: Auth state changed:', _event)
      updateAuthState(session)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  const handleSignOut = async () => {
    try {
      setLoading(true)
      await supabase.auth.signOut()
    } catch (err) {
      console.error('Sign out error:', err)
    } finally {
      setLoading(false)
    }
  }

  const value = useMemo(() => ({
    user,
    role,
    loading,
    signIn: (email, password) => supabase.auth.signInWithPassword({ email, password }),
    signOut: handleSignOut
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
