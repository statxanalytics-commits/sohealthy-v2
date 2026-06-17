import { useRouter } from 'expo-router'
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Colors, LOGO } from '../../src/constants'

export default function SplashScreen() {
  const router = useRouter()
  return (
    <SafeAreaView style={s.container}>
      <View style={s.center}>
        <Image source={{ uri: LOGO }} style={s.logo} />
        <Text style={s.title}>{'Shëndeti\nfillon këtu'}</Text>
        <Text style={s.sub}>{'Mjetet, planet dhe produktet\nSoHealthy — gjithçka në një vend'}</Text>
      </View>
      <View style={s.buttons}>
        <TouchableOpacity style={s.btnMain} onPress={() => router.push('/(auth)/signup')}>
          <Text style={s.btnMainText}>Krijo llogari falas</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.btnSec} onPress={() => router.push('/(auth)/login')}>
          <Text style={s.btnSecText}>Kam llogari — hyr</Text>
        </TouchableOpacity>
        <Text style={s.hint}>Ke blerë? <Text style={s.hintBold}>Fut kodin pas hyrjes →</Text></Text>
      </View>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.pine, paddingHorizontal: 24, justifyContent: 'space-between', paddingBottom: 32 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  logo: { width: 72, height: 72, borderRadius: 20, marginBottom: 24 },
  title: { fontSize: 36, fontWeight: '700', color: Colors.white, textAlign: 'center', lineHeight: 42, marginBottom: 16 },
  sub: { fontSize: 14, color: Colors.aloe, textAlign: 'center', lineHeight: 22 },
  buttons: { gap: 12 },
  btnMain: { backgroundColor: Colors.aloe, borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  btnMainText: { fontSize: 15, fontWeight: '600', color: Colors.pine },
  btnSec: { backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12, paddingVertical: 15, alignItems: 'center' },
  btnSecText: { fontSize: 15, fontWeight: '500', color: Colors.white },
  hint: { fontSize: 12, color: Colors.aloe, textAlign: 'center', marginTop: 8 },
  hintBold: { fontWeight: '700', color: Colors.white },
})
