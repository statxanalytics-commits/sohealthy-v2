import { useCallback, useState } from 'react'
import { useFocusEffect } from 'expo-router'
import { supabase } from '../lib/supabase'
import { fetchMyPackage } from '../lib/package'

// Premium access lasts this many days from the activation date (plan_start) unless the package says otherwise
// (28-day packages get 28 days; see my_package().premium_days). A new activation overwrites plan_start.
export const PREMIUM_WINDOW_DAYS = 14
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

      const pkg = await fetchMyPackage()
      const windowDays = Math.max(PREMIUM_WINDOW_DAYS, Number(pkg.premium_days) || PREMIUM_WINDOW_DAYS)

      // Expire windowDays full days after activation.
      const start = new Date(data.plan_start).getTime()
      const elapsedDays = Math.floor((Date.now() - start) / MS_PER_DAY)
      const remaining = Math.max(0, windowDays - elapsedDays)

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
