import { useLocalSearchParams, useRouter } from 'expo-router'
import { useEffect, useState } from 'react'
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { WebView } from 'react-native-webview'
import { Colors } from '../../src/constants'
import { supabase } from '../../src/lib/supabase'

// The Challenge tool reads ?uid=<user.id> and skips its own login.
const CHALLENGE_URL = 'https://index-blush-phi.vercel.app'

export default function WebViewScreen() {
  const { url, title } = useLocalSearchParams<{ url: string; title: string }>()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    async function resolve() {
      let finalUrl = url || ''
      // For the Challenge tool, attach the logged-in user's id so it auto-logs-in
      // (no separate Challenge account needed).
      if (finalUrl.startsWith(CHALLENGE_URL)) {
        try {
          const { data: { user } } = await supabase.auth.getUser()
          if (user) finalUrl += (finalUrl.includes('?') ? '&' : '?') + 'uid=' + encodeURIComponent(user.id)
        } catch (e) {}
      }
      if (active) setResolvedUrl(finalUrl)
    }
    resolve()
    return () => { active = false }
  }, [url])

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={s.back}>← Kthehu</Text>
        </TouchableOpacity>
        <Text style={s.title} numberOfLines={1}>{title}</Text>
        <View style={{ width: 60 }} />
      </View>
      {loading && (
        <View style={s.loadingOverlay}>
          <ActivityIndicator color={Colors.pine} size="large" />
        </View>
      )}
      {resolvedUrl ? (
        <WebView
          source={{ uri: resolvedUrl }}
          style={{ flex: 1 }}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          allowsInlineMediaPlayback={true}
          userAgent="Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
          onLoadStart={() => setLoading(true)}
          onLoadEnd={() => setLoading(false)}
          onError={() => setLoading(false)}
        />
      ) : null}
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.pine },
  header: { backgroundColor: Colors.pine, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12 },
  back: { color: Colors.aloe, fontSize: 14 },
  title: { fontSize: 14, fontWeight: '600', color: Colors.white, flex: 1, textAlign: 'center' },
  loadingOverlay: { position: 'absolute', top: 60, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', zIndex: 10, backgroundColor: Colors.alabaster },
})
