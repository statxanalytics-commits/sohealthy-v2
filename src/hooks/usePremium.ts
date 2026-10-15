import { useCallback, useState } from 'react'
import { useFocusEffect } from 'expo-router'
import { supabase } from '../lib/supabase'
import { DEFAULT_PACKAGE, MyPackage, fetchMyPackage } from '../lib/package'

// Premium lasts the package days + 2, counted in calendar days from the activation day (day 1):
//   7-day → through day 9 · 14-day → day 16 · 28-day → day 30 (28 shared by 2 people → day 16 each) · older orders → day 16.
// The server works this out (my_package). The local count below is only a fallback if that call fails.
// A new activation resets plan_start and switches the account to the new order.
export const PREMIUM_WINDOW_DAYS = 16
const MS_PER_DAY = 24 * 60 * 60 * 1000

function dayStart(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
}

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

      const windowDays = Number(p.premium_days) || PREMIUM_WINDOW_DAYS
      const dayIndex = Math.round((dayStart(new Date()) - dayStart(new Date(data.plan_start))) / MS_PER_DAY) // 0 on the activation day
      const remaining = Math.max(0, windowDays - dayIndex)

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
