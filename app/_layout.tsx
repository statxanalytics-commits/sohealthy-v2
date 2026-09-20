import { Slot, useRouter, useSegments } from 'expo-router'
import { useEffect, useRef, useState } from 'react'
import * as Notifications from 'expo-notifications'
import { recoveryState } from '../src/lib/recoveryState'
import { supabase } from '../src/lib/supabase'
import { registerPushToken, handleNotificationData } from '../src/lib/notifications'

export default function RootLayout() {
  const [session, setSession] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const segments = useSegments()
  const router = useRouter()
  const pushRegistered = useRef(false)

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

  // Register the push token once the user is signed in (asks permission the first time).
  useEffect(() => {
    if (session && !pushRegistered.current) {
      pushRegistered.current = true
      registerPushToken()
    }
  }, [session])

  // Open the right place when a notification is tapped (cold start + while running).
  useEffect(() => {
    Notifications.getLastNotificationResponseAsync().then((resp) => {
      if (resp) handleNotificationData(resp.notification.request.content.data)
    })
    const sub = Notifications.addNotificationResponseReceivedListener((resp) => {
      handleNotificationData(resp.notification.request.content.data)
    })
    return () => sub.remove()
  }, [])

  useEffect(() => {
    if (loading) return
    const inAuth = segments[0] === '(auth)'
    // The FAQ (Pyetjet e Shpeshta) is a public screen — reachable whether the
    // user is logged in or not — so it must be exempt from the auth redirects.
    const isPublic = segments[0] === 'faq'
    if (isPublic) return
    if (!session && !inAuth) router.replace('/(auth)/splash')
    // Gjatë recovery mos ridrejto: përdoruesi duhet të caktojë fjalëkalimin e ri në login.tsx
    else if (session && inAuth && !recoveryState.active) router.replace('/(app)/(tabs)')
  }, [session, loading, segments])

  return <Slot />
}
