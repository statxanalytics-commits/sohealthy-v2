import { Slot, useRouter, useSegments } from 'expo-router'
import { useEffect, useRef, useState } from 'react'
import { supabase } from '../src/lib/supabase'

export default function RootLayout() {
  const [session, setSession] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const recoveringRef = useRef(false)
  const segments = useSegments()
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      // Gjatë recovery: mos ridrejto automatikisht në app.
      // Përdoruesi duhet të caktojë fjalëkalimin e ri fillimisht.
      if (event === 'PASSWORD_RECOVERY') {
        recoveringRef.current = true
      }
      setSession(session)
    })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (loading) return
    const inAuth = segments[0] === '(auth)'
    if (!session && !inAuth) router.replace('/(auth)/splash')
    else if (session && inAuth && !recoveringRef.current) router.replace('/(app)/(tabs)')
  }, [session, loading, segments])

  return <Slot />
}
