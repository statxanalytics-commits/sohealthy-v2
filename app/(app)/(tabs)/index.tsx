import { useRouter } from 'expo-router'
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { API, Colors, LOGO } from '../../../src/constants'

const FREE_TOOLS = [
  { id: 'challenge', icon: '📅', name: 'Challenge 30d', sub: 'Program falas', url: API.challenge },
  { id: 'calculator', icon: '⚖️', name: 'Gjej Sa Kg Humb Me Paketat', sub: 'Llogarit humbjen e peshës', url: API.calculator },
  { id: 'quiz', icon: '✨', name: 'Gjej Paketën Perfekte Për Ty', sub: 'Gjej produktin ideal', url: API.quiz },
  { id: 'bodyCalc', icon: '📊', name: 'Llogaritje Trupi', sub: 'BMI, TDEE, makrot', url: API.bodyCalc },
]

export default function HomeScreen() {
  const router = useRouter()
  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <View style={s.topRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Image source={{ uri: LOGO }} style={s.logoImg} />
            <Text style={s.logoText}>SoHealthy</Text>
          </View>
        </View>
        <View style={s.greetBox}>
          <Text style={s.greetTitle}>Mirë se erdhe 👋</Text>
          <Text style={s.greetSub}>Fillo udhëtimin tënd të shëndetit</Text>
        </View>
      </View>
      <ScrollView style={s.body} showsVerticalScrollIndicator={false}>
        <Text style={s.sectionLabel}>Mjetet falas</Text>
        <View style={s.grid}>
          {FREE_TOOLS.map(tool => (
            <TouchableOpacity key={tool.id} style={s.freeTile} onPress={() => router.push({ pathname: '/webview', params: { url: tool.url, title: tool.name } } as any)}>
              <Text style={s.tileIcon}>{tool.icon}</Text>
              <Text style={s.tileName}>{tool.name}</Text>
              <Text style={s.tileSub}>{tool.sub}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={s.sectionLabel}>Premium</Text>
        <TouchableOpacity style={s.unlockBanner} onPress={() => router.push('/activate' as any)}>
          <View style={s.unlockIcon}><Text style={{ fontSize: 20 }}>🔓</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={s.unlockTitle}>Zhblloko mjetet premium</Text>
            <Text style={s.unlockSub}>Fut kodin e porosisë tënde</Text>
          </View>
          <Text style={{ color: Colors.aloe, fontSize: 20 }}>›</Text>
        </TouchableOpacity>
        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.alabaster },
  header: { backgroundColor: Colors.pine, paddingHorizontal: 20, paddingTop: 8, paddingBottom: 20 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  logoImg: { width: 28, height: 28, borderRadius: 8 },
  logoText: { fontSize: 16, fontWeight: '700', color: Colors.white },
  greetBox: { backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12, padding: 12 },
  greetTitle: { fontSize: 16, fontWeight: '600', color: Colors.white, marginBottom: 3 },
  greetSub: { fontSize: 12, color: Colors.aloe },
  body: { flex: 1, padding: 16 },
  sectionLabel: { fontSize: 10, fontWeight: '600', color: Colors.muted, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 8, marginTop: 16 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  freeTile: { width: '48%', backgroundColor: Colors.white, borderRadius: 12, padding: 12 },
  tileIcon: { fontSize: 22, marginBottom: 8 },
  tileName: { fontSize: 12, fontWeight: '600', color: Colors.pine, marginBottom: 2 },
  tileSub: { fontSize: 11, color: Colors.muted },
  unlockBanner: { backgroundColor: Colors.pine, borderRadius: 12, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12 },
  unlockIcon: { width: 40, height: 40, borderRadius: 10, backgroundColor: 'rgba(113,181,162,0.2)', alignItems: 'center', justifyContent: 'center' },
  unlockTitle: { fontSize: 14, fontWeight: '600', color: Colors.white, marginBottom: 2 },
  unlockSub: { fontSize: 12, color: Colors.aloe },
})
