import { useLocalSearchParams, useRouter } from 'expo-router'
import { useState } from 'react'
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { WebView } from 'react-native-webview'
import { Colors } from '../../src/constants'

export default function WebViewScreen() {
  const { url, title } = useLocalSearchParams<{ url: string; title: string }>()
  const router = useRouter()
  const [loading, setLoading] = useState(true)

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
      <WebView
        source={{ uri: url }}
        style={{ flex: 1 }}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        allowsInlineMediaPlayback={true}
        userAgent="Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
        onLoadStart={() => setLoading(true)}
        onLoadEnd={() => setLoading(false)}
        onError={() => setLoading(false)}
      />
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
