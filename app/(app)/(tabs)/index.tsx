import { useRouter } from 'expo-router'
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { API, Colors, LOGO } from '../../../src/constants'
import { usePremium } from '../../../src/hooks/usePremium'

const FREE_TOOLS = [
  { id: 'challenge', icon: '📅', name: 'Challenge 30d', sub: 'Program falas', url: API.challenge },
  { id: 'calculator', icon: '⚖️', name: 'Gjej Sa Kg Humb Me Paketat', sub: 'Llogarit humbjen e peshës', url: API.calculator },
  { id: 'quiz', icon: '✨', name: 'Gjej Paketën Perfekte Për Ty', sub: 'Gjej produktin ideal', url: API.quiz },
  { id: 'bodyCalc', icon: '📊', name: 'Llogaritje Trupi', sub: 'BMI, TDEE, makrot', url: API.bodyCalc },
]

type PremiumTool = {
  id: string
  icon: string
  name: string
  sub: string
  route: string
  params?: Record<string, string>
}

const PREMIUM_TOOLS: PremiumTool[] = [
  { id: 'diet', icon: '🥗', name: 'Plani i Dietës', sub: 'Plani juaj personal', route: '/(app)/diet' },
  { id: 'scanner', icon: '📷', name: 'Skaner Ushqimor', sub: 'Skano çdo ushqim', route: '/(app)/scanner' },
  { id: 'tracker', icon: '📈', name: 'Tracker', sub: 'Gjurmo progresin tënd', route: '/(app)/tracker' },
  { id: 'progress', icon: '🏆', name: 'Progresi', sub: 'Shiko rezultatet', route: '/(app)/progress' },
]

export default function HomeScreen() {
  const router = useRouter()
  const { isPremium, loading } = usePremium()

  function handlePremiumTool(tool: PremiumTool) {
    if (tool.params) {
      router.push({ pathname: tool.route as any, params: tool.params })
    } else {
      router.push(tool.route as any)
    }
  }

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={s.scroll}>

        <View style={s.header}>
          <Image source={LOGO} style={s.logo} resizeMode="contain" />
          <Text style={s.brand}>SoHealthy</Text>
        </View>

        <Text style={s.sectionTitle}>🆓 Mjetet Falas</Text>
        {FREE_TOOLS.map(tool => (
          <TouchableOpacity
            key={tool.id}
            style={s.card}
            onPress={() => router.push({ pathname: "/(app)/webview", params: { url: tool.url, title: tool.name } })}
          >
            <Text style={s.cardIcon}>{tool.icon}</Text>
            <View style={s.cardText}>
              <Text style={s.cardName}>{tool.name}</Text>
              <Text style={s.cardSub}>{tool.sub}</Text>
            </View>
            <Text style={s.cardArrow}>›</Text>
          </TouchableOpacity>
        ))}

        <Text style={s.sectionTitle}>
          {isPremium ? "⭐ Premium" : "🔒 Premium — Aktivizo"}
        </Text>

        {loading ? (
          <ActivityIndicator color={Colors.pine} style={{ marginVertical: 20 }} />
        ) : isPremium ? (
          <>
            {/* My Product card — always visible for premium users */}
            <TouchableOpacity
              style={[s.card, s.myProductCard]}
              onPress={() => router.push('/(app)/select-product')}
            >
              <Text style={s.cardIcon}>📦</Text>
              <View style={s.cardText}>
                <Text style={[s.cardName, { color: Colors.pine }]}>Produkti Im</Text>
                <Text style={s.cardSub}>Shiko udhëzimet e produktit tënd</Text>
              </View>
              <Text style={s.cardArrow}>›</Text>
            </TouchableOpacity>
            {PREMIUM_TOOLS.map(tool => (
              <TouchableOpacity
                key={tool.id}
                style={[s.card, s.premiumCard]}
                onPress={() => handlePremiumTool(tool)}
              >
                <Text style={s.cardIcon}>{tool.icon}</Text>
                <View style={s.cardText}>
                  <Text style={s.cardName}>{tool.name}</Text>
                  <Text style={s.cardSub}>{tool.sub}</Text>
                </View>
                <Text style={s.cardArrow}>›</Text>
              </TouchableOpacity>
            ))}
          </>
        ) : (
          <>
            {PREMIUM_TOOLS.map(tool => (
              <View key={tool.id} style={[s.card, s.lockedCard]}>
                <Text style={s.cardIcon}>{tool.icon}</Text>
                <View style={s.cardText}>
                  <Text style={[s.cardName, s.lockedText]}>{tool.name}</Text>
                  <Text style={s.cardSub}>{tool.sub}</Text>
                </View>
                <Text style={s.lockIcon}>🔒</Text>
              </View>
            ))}
            <TouchableOpacity
              style={s.activateBtn}
              onPress={() => router.push("/(app)/activate")}
            >
              <Text style={s.activateBtnText}>Aktivizo Llogarinë Premium →</Text>
            </TouchableOpacity>
          </>
        )}

      </ScrollView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.alabaster },
  scroll: { padding: 20, paddingBottom: 40 },
  header: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 24 },
  logo: { width: 36, height: 36 },
  brand: { fontSize: 22, fontWeight: "700", color: Colors.pine },
  sectionTitle: { fontSize: 13, fontWeight: "700", color: Colors.pine, letterSpacing: 0.5, marginBottom: 10, marginTop: 8, textTransform: "uppercase" },
  card: {
    backgroundColor: "#fff", borderRadius: 12, padding: 16,
    flexDirection: "row", alignItems: "center", marginBottom: 10,
    shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  premiumCard: { borderLeftWidth: 3, borderLeftColor: Colors.aloe },
  myProductCard: { borderLeftWidth: 3, borderLeftColor: Colors.pine, backgroundColor: Colors.pine + '08' },
  lockedCard: { opacity: 0.5 },
  lockedText: { color: "#999" },
  cardIcon: { fontSize: 24, marginRight: 14 },
  cardText: { flex: 1 },
  cardName: { fontSize: 15, fontWeight: "600", color: Colors.pine },
  cardSub: { fontSize: 12, color: "#888", marginTop: 2 },
  cardArrow: { fontSize: 20, color: Colors.aloe, fontWeight: "300" },
  lockIcon: { fontSize: 16 },
  activateBtn: {
    backgroundColor: Colors.pine, borderRadius: 12,
    padding: 16, alignItems: "center", marginTop: 8,
  },
  activateBtnText: { color: Colors.alabaster, fontWeight: "700", fontSize: 15 },
})
