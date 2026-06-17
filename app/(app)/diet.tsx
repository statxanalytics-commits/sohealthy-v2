import { useEffect, useRef, useState } from 'react'
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { WebView } from 'react-native-webview'
import { Colors } from '../../src/constants'
import { supabase } from '../../src/lib/supabase'

const DIET_APP_URL = 'https://sohealthy-diet.vercel.app'

export default function DietScreen() {
  const router = useRouter()
  const webviewRef = useRef<WebView>(null)
  const [loading, setLoading] = useState(true)
  const [url, setUrl] = useState<string | null>(null)
  const [webLoading, setWebLoading] = useState(true)
  const [canGoBack, setCanGoBack] = useState(false)

  useEffect(() => {
    loadDietUrl()
  }, [])

  async function loadDietUrl() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setUrl(DIET_APP_URL)
        setLoading(false)
        return
      }

      // Get order_code from profile — passed to diet app via URL param
      // The diet app reads ?code= and auto-skips the code entry screen
      const { data: profile } = await supabase
        .from('profiles')
        .select('order_code')
        .eq('id', user.id)
        .single()

      if (profile?.order_code) {
        setUrl(`${DIET_APP_URL}?code=${encodeURIComponent(profile.order_code)}`)
      } else {
        setUrl(DIET_APP_URL)
      }
    } catch {
      setUrl(DIET_APP_URL)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.center}>
          <ActivityIndicator size="large" color={Colors.pine} />
          <Text style={s.loadingText}>Duke hapur planin tuaj...</Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity
          onPress={() => {
            if (canGoBack && webviewRef.current) {
              webviewRef.current.goBack()
            } else {
              router.back()
            }
          }}
          style={s.backBtn}
        >
          <Text style={s.backText}>‹ Kthehu</Text>
        </TouchableOpacity>
        <Text style={s.title}>🥗 Plani i Dietës</Text>
        {webLoading && (
          <ActivityIndicator size="small" color={Colors.alabaster} style={s.headerLoader} />
        )}
      </View>

      {/* WebView — diet app reads ?code= from URL and auto-validates */}
      <WebView
        ref={webviewRef}
        source={{ uri: url! }}
        style={s.webview}
        onLoadStart={() => setWebLoading(true)}
        onLoadEnd={() => setWebLoading(false)}
        onNavigationStateChange={(navState) => setCanGoBack(navState.canGoBack)}
        javaScriptEnabled
        domStorageEnabled
        allowsInlineMediaPlayback
        startInLoadingState
        renderLoading={() => (
          <View style={s.webLoading}>
            <ActivityIndicator size="large" color={Colors.pine} />
            <Text style={s.loadingText}>Duke ngarkuar...</Text>
          </View>
        )}
      />
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.alabaster },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  loadingText: { marginTop: 16, color: Colors.pine, fontSize: 15 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.pine,
    gap: 12,
  },
  backBtn: { padding: 4 },
  backText: { color: Colors.alabaster, fontSize: 17, fontWeight: '600' },
  title: { color: Colors.alabaster, fontSize: 18, fontWeight: '700', flex: 1 },
  headerLoader: { marginLeft: 8 },
  webview: { flex: 1 },
  webLoading: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: Colors.alabaster,
  },
})
