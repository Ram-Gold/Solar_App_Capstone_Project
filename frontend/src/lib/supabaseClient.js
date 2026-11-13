import { createClient } from '@supabase/supabase-js'
export const supabaseUrl = import.meta.env?.VITE_SUPABASE_URL || 'https://gkrdwzbxpstpqpvqlwbt.supabase.co'
export const supabaseAnonKey = import.meta.env?.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_v-0oU01z8p2tRSFM64sbjg_Ruqr_y9c'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export function createIsolatedAuthClient() {
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    }
  })
}
