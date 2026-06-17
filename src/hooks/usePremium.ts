import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export function usePremium() {
  const [isPremium, setIsPremium] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkPremium()
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      checkPremium()
    })
    return () => subscription.unsubscribe()
  }, [])

  async function checkPremium() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setIsPremium(false); setLoading(false); return }

      const { data } = await supabase
        .from('orders')
        .select('id')
        .eq('activated_by', user.id)
        .eq('used', true)
        .limit(1)
        .single()

      setIsPremium(!!data)
    } catch {
      setIsPremium(false)
    } finally {
      setLoading(false)
    }
  }

  return { isPremium, loading, refresh: checkPremium }
}
