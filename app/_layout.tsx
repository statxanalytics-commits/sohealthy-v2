import { Slot, useRouter, useSegments } from 'expo-router'
import { useEffect, useRef, useState } from 'react'
import { Analytics } from '@vercel/analytics/react'
import { supabase } from '../src/lib/supabase'

export default function RootLayout() {
  const [session, setSession] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const recoveryRef = useRef(false)
  const segments = useSegments()
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        recoveryRef.current = true
      }
      if (event === 'USER_UPDATED' || event === 'SIGNED_OUT') {
        recoveryRef.current = false
      }
      setSession(session)
    })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (loading) return
    if (recoveryRef.current) return
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
