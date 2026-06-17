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
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setIsPremium(false); setLoading(false); return }

      // Check profiles.is_premium — the source of truth
      const { data } = await supabase
        .from('profiles')
        .select('is_premium')
        .eq('id', user.id)
        .single()

      setIsPremium(data?.is_premium === true)
    } catch {
      setIsPremium(false)
    } finally {
      setLoading(false)
    }
  }

  return { isPremium, loading, refresh: checkPremium }
}
