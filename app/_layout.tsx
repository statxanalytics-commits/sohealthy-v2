import { Slot, useRouter, useSegments } from 'expo-router'
import { useEffect, useState } from 'react'
import { Analytics } from '@vercel/analytics/react'
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
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (loading) return
    const inAuth = segments[0] === '(auth)'
    if (!session && !inAuth) router.replace('/(auth)/splash')
    else if (session && inAuth) router.replace('/(app)/(tabs)')
  }, [session, loading, segments])

  return (
    <>
      <Slot />
      <Analytics />
    </>
  )
}
