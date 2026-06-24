import { Slot, useRouter, useSegments } from 'expo-router'
import { useEffect, useState } from 'react'
import { recoveryState } from '../src/lib/recoveryState'
import { supabase } from '../src/lib/supabase'

export default function RootLayout() {
  const [session, setSession] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const segments = useSegments()
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        recoveryState.active = true
      }
      setSession(session)
    })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (loading) return
    const inAuth = segments[0] === '(auth)'
    if (!session && !inAuth) router.replace('/(auth)/splash')
    // Gjatë recovery mos ridrejto: përdoruesi duhet të caktojë fjalëkalimin e ri në login.tsx
    else if (session && inAuth && !recoveryState.active) router.replace('/(app)/(tabs)')
  }, [session, loading, segments])

  return <Slot />
}
