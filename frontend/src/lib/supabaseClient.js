import { createClient } from '@supabase/supabase-js'
const supabaseUrl = import.meta.env?.VITE_SUPABASE_URL || 'https://gkrdwzbxpstpqpvqlwbt.supabase.co'
const supabaseAnonKey = import.meta.env?.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_v-0oU01z8p2tRSFM64sbjg_Ruqr_y9c'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
