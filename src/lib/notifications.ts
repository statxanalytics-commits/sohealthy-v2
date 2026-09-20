import { Platform } from 'react-native'
import * as Notifications from 'expo-notifications'
import * as Device from 'expo-device'
import * as WebBrowser from 'expo-web-browser'
import * as Linking from 'expo-linking'
import Constants from 'expo-constants'
import { router } from 'expo-router'
import { supabase } from './supabase'

// Show notifications while the app is in the foreground too.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
})

// URLs that should open in their native app / the OS, not the in-app browser.
const NATIVE_OPEN = /instagram\.com|^mailto:|^tel:|^sohealthyv2:/i

// Route a notification's data payload to the right destination.
// Payload shape (set by the lifecycle-notify edge function):
//   { type, url?, route?, order_code?, code? }
export function handleNotificationData(data: any) {
  if (!data) return
  try {
    if (data.url && typeof data.url === 'string') {
      if (NATIVE_OPEN.test(data.url)) Linking.openURL(data.url)
      else WebBrowser.openBrowserAsync(data.url)
    } else if (data.route && typeof data.route === 'string') {
      router.push(data.route as any)
    }
  } catch (e) {
    console.log('[notifications] handle error', e)
  }
}

// Ask permission (once), get the Expo push token, and save it to the profile.
export async function registerPushToken(): Promise<string | null> {
  try {
    if (!Device.isDevice) return null // push tokens are not issued on simulators

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'SoHealthy',
        importance: Notifications.AndroidImportance.HIGH,
        lightColor: '#71B5A2',
      })
    }

    const { status: existing } = await Notifications.getPermissionsAsync()
    let status = existing
    if (existing !== 'granted') {
      const req = await Notifications.requestPermissionsAsync()
      status = req.status
    }
    if (status !== 'granted') return null

    const projectId =
      (Constants?.expoConfig as any)?.extra?.eas?.projectId ??
      (Constants as any)?.easConfig?.projectId
    const tokenResp = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    )
    const token = tokenResp.data
    if (!token) return null

    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase
        .from('profiles')
        .update({
          expo_push_token: token,
          push_enabled: true,
          push_updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)
    }
    return token
  } catch (e) {
    console.log('[notifications] register error', e)
    return null
  }
}
