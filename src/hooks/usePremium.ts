import { useCallback, useState } from 'react'
import { useFocusEffect } from 'expo-router'
import { supabase } from '../lib/supabase'

export function usePremium() {
  const [isPremium, setIsPremium] = useState(false)
  const [loading, setLoading] = useState(true)

  useFocusEffect(
    useCallback(() => {
      checkPremium()
    }, [])
  )

  async function checkPremium() {
    console.log('🔍 usePremium: checking...')
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      console.log('👤 user:', user?.id, 'error:', userError?.message)
      
      if (!user) { 
        console.log('❌ no user')
        setIsPremium(false); setLoading(false); return 
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('is_premium')
        .eq('id', user.id)
        .single()

      console.log('📋 profile data:', JSON.stringify(data), 'error:', error?.message)
      console.log('⭐ isPremium:', data?.is_premium)

      setIsPremium(data?.is_premium === true)
    } catch (e) {
      console.log('💥 exception:', e)
      setIsPremium(false)
    } finally {
      setLoading(false)
    }
  }

  return { isPremium, loading, refresh: checkPremium }
}
