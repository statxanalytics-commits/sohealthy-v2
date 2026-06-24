import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient } from '@supabase/supabase-js'
import 'react-native-url-polyfill/auto'

const supabaseUrl = 'https://rquoydwzulecmttrjdzo.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJxdW95ZHd6dWxlY210dHJqZHpvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEwMTAxNzIsImV4cCI6MjA5NjU4NjE3Mn0.GQlCml9nQAXv3A7_pmZSo6Uy82-J1k62M4rPHPjRdSQ'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    flowType: 'implicit',
  },
})
