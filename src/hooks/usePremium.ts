import { useCallback, useState } from 'react'
import { useFocusEffect } from 'expo-router'
import { supabase } from '../lib/supabase'
import { DEFAULT_PACKAGE, MyPackage, fetchMyPackage } from '../lib/package'

// Orders from 20 Oct 2026: premium lasts the package days + 2, in calendar days from the activation day (day 1):
//   7-day → through day 9 · 14-day → day 16 · 28-day → day 30 (28 shared by 2 people → day 16 each).
// Older orders: as before, 14 × 24 h from the activation time.
// The server works this out (my_package). The local count below (the old 14-day rule) is only a fallback if that call fails.
// A new activation resets plan_start and switches the account to the new order.
export const PREMIUM_WINDOW_DAYS = 14
const MS_PER_DAY = 24 * 60 * 60 * 1000

export function usePremium() {
  const [isPremium, setIsPremium] = useState(false)
  const [daysRemaining, setDaysRemaining] = useState<number | null>(null)
  const [pkg, setPkg] = useState<MyPackage>(DEFAULT_PACKAGE)
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
        setPkg(DEFAULT_PACKAGE)
        return
      }

      const p = await fetchMyPackage()
      setPkg(p)

      if (typeof p.premium_active === 'boolean') {
        setIsPremium(p.premium_active)
        setDaysRemaining(p.premium_active ? p.days_left : null)
        return
      }

      // Fallback: count locally from the profile
      const { data } = await supabase
        .from('profiles')
        .select('is_premium, plan_start')
        .eq('id', user.id)
        .single()

      if (data?.is_premium !== true) {
        setIsPremium(false)
        setDaysRemaining(null)
        return
      }

      // Premium without an activation date (very old accounts) keeps access
      if (!data.plan_start) {
        setIsPremium(true)
        setDaysRemaining(null)
        return
      }

      const elapsedDays = Math.floor((Date.now() - new Date(data.plan_start).getTime()) / MS_PER_DAY)
      const remaining = Math.max(0, PREMIUM_WINDOW_DAYS - elapsedDays)

      setDaysRemaining(remaining > 0 ? remaining : null)
      setIsPremium(remaining > 0)
    } catch {
      setIsPremium(false)
      setDaysRemaining(null)
    } finally {
      setLoading(false)
    }
  }

  return { isPremium, daysRemaining, pkg, loading, refresh: checkPremium }
}
