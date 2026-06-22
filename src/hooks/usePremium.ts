import { useCallback, useState } from 'react'
import { useFocusEffect } from 'expo-router'
import { supabase } from '../lib/supabase'

// Premium access lasts this many days from the activation date (plan_start).
// A new code activation overwrites plan_start, which resets the window.
export const PREMIUM_WINDOW_DAYS = 20
const MS_PER_DAY = 24 * 60 * 60 * 1000

export function usePremium() {
  const [isPremium, setIsPremium] = useState(false)
  const [daysRemaining, setDaysRemaining] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  useFocusEffect(
    useCallback(() => {
      checkPremium()
    }, [])
  )

  async function checkPremium() {
    try {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        setIsPremium(false)
        setDaysRemaining(null)
        setLoading(false)
        return
      }

      const { data } = await supabase
        .from('profiles')
        .select('is_premium, plan_start')
        .eq('id', user.id)
        .single()

      const flagged = data?.is_premium === true

      // Not flagged premium at all → locked.
      if (!flagged) {
        setIsPremium(false)
        setDaysRemaining(null)
        setLoading(false)
        return
      }

      // Flagged premium but no activation date on record → legacy account,
      // keep access (no expiry) so existing customers are never locked out by missing data.
      if (!data?.plan_start) {
        setIsPremium(true)
        setDaysRemaining(null)
        setLoading(false)
        return
      }

      // Expire 20 full days after activation.
      const start = new Date(data.plan_start).getTime()
      const elapsedDays = Math.floor((Date.now() - start) / MS_PER_DAY)
      const remaining = Math.max(0, PREMIUM_WINDOW_DAYS - elapsedDays)

      setDaysRemaining(remaining)
      setIsPremium(remaining > 0)
    } catch {
      setIsPremium(false)
      setDaysRemaining(null)
    } finally {
      setLoading(false)
    }
  }

  return { isPremium, daysRemaining, loading, refresh: checkPremium }
}
