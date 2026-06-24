import { useLocalSearchParams, useRouter } from 'expo-router'
import { useState } from 'react'
import { ActivityIndicator, Dimensions, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Pdf from 'react-native-pdf'
import { Colors } from '../../src/constants'

export default function PdfViewerScreen() {
  const { url, title } = useLocalSearchParams<{ url: string; title: string }>()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={s.back}>‹ Kthehu</Text>
        </TouchableOpacity>
        <Text style={s.title} numberOfLines={1}>{title || 'Libri'}</Text>
        <View style={{ width: 60 }} />
      </View>

      {loading && !error && (
        <View style={s.loadingOverlay}>
          <ActivityIndicator color={Colors.pine} size="large" />
          <Text style={s.loadingText}>Duke ngarkuar librin...</Text>
        </View>
      )}

      {error ? (
        <View style={s.errorWrap}>
          <Text style={s.errorText}>Nuk u hap dot libri. Kontrollo lidhjen me internetin dhe provo përsëri.</Text>
        </View>
      ) : (
        <Pdf
          source={{ uri: url, cache: true }}
          style={s.pdf}
          trustAllCerts={false}
          onLoadComplete={() => setLoading(false)}
          onError={() => { setLoading(false); setError('error') }}
        />
      )}
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.pine },
  header: { backgroundColor: Colors.pine, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12 },
  back: { color: Colors.aloe, fontSize: 16, fontWeight: '600', width: 60 },
  title: { fontSize: 15, fontWeight: '700', color: Colors.white, flex: 1, textAlign: 'center' },
  pdf: { flex: 1, width: Dimensions.get('window').width, backgroundColor: Colors.alabaster },
  loadingOverlay: { position: 'absolute', top: 60, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', zIndex: 10, backgroundColor: Colors.alabaster },
  loadingText: { marginTop: 14, color: Colors.pine, fontSize: 14 },
  errorWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, backgroundColor: Colors.alabaster },
  errorText: { fontSize: 14, color: Colors.muted, textAlign: 'center', lineHeight: 22 },
})
