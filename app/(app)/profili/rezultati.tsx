import { ReactNode } from 'react'
import { ScrollView, StyleSheet, Text, TouchableOpacity, View, Linking } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { Check, X, ArrowRight } from 'lucide-react-native'
import { Colors } from '../../../src/constants'
import { PROFILES, type Profile, type ProductRec } from '../../../constants/quiz-data'

export default function ResultScreen() {
  const router = useRouter()
  const { profileKey } = useLocalSearchParams<{ profileKey: string }>()
  const profile: Profile = PROFILES[profileKey] ?? PROFILES['ekuilibruar']
  const isBalanced = profile.key === 'ekuilibruar'

  function openProduct(url: string) {
    Linking.openURL(url).catch(() => {})
  }

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Hero */}
        <View style={s.hero}>
          <Text style={s.heroLabel}>PROFILI YT</Text>
          <Text style={s.heroName}>{profile.name}</Text>
          <Text style={s.heroTagline}>{profile.tagline}</Text>
        </View>

        {/* Foods to prioritize */}
        <Section title="Ushqime për të prioritizuar">
          {profile.foods.map((item, i) => (
            <View key={i} style={s.iconRow}>
              <Check size={16} color={Colors.aloe} strokeWidth={2.5} style={s.rowIcon} />
              <Text style={s.rowText}>{item}</Text>
            </View>
          ))}
        </Section>

        {/* Foods to avoid */}
        <Section title="Ushqime për t'u shmangur">
          {profile.avoid.map((item, i) => (
            <View key={i} style={s.iconRow}>
              <X size={16} color="#B74949" strokeWidth={2.5} style={s.rowIcon} />
              <Text style={s.rowText}>{item}</Text>
            </View>
          ))}
        </Section>

        {/* 3 key habits */}
        <Section title="3 zakone kyçe">
          {profile.habits.map((item, i) => (
            <View key={i} style={s.habitRow}>
              <View style={s.habitNum}>
                <Text style={s.habitNumText}>{i + 1}</Text>
              </View>
              <Text style={s.habitText}>{item}</Text>
            </View>
          ))}
        </Section>

        {/* Fasting — only when genuinely recommended */}
        {profile.showFasting && (
          <Section title="Fasting për ty">
            <View style={[s.fastingBox, { borderColor: Colors.aloe }]}>
              <Text style={[s.fastingBadge, { backgroundColor: Colors.aloe }]}>
                Po — i rekomanduar
              </Text>
              <Text style={s.fastingText}>{profile.fastingText}</Text>
            </View>
          </Section>
        )}

        {/* Products */}
        {!isBalanced && profile.primaryProducts.length > 0 && (
          <Section title="Produkti i rekomanduar SoHealthy">
            {profile.primaryProducts.map((prod) => (
              <ProductCard key={prod.slug} prod={prod} onPress={() => openProduct(prod.url)} />
            ))}
            {profile.secondaryProduct && (
              <View style={s.secondaryWrap}>
                <Text style={s.secondaryLabel}>Mund të provosh edhe</Text>
                <ProductCard
                  prod={profile.secondaryProduct}
                  secondary
                  onPress={() => openProduct(profile.secondaryProduct!.url)}
                />
              </View>
            )}
          </Section>
        )}

        {/* Balanced profile message */}
        {isBalanced && (
          <View style={s.balancedBox}>
            <Text style={s.balancedTitle}>Vazhdo kështu</Text>
            <Text style={s.balancedText}>
              Trupi yt është në balancë — nuk ke nevojë për ndërhyrje specifike. Mirëmbaje rutinën e shëndetshme.
            </Text>
          </View>
        )}

        {/* Actions */}
        <View style={s.actions}>
          <TouchableOpacity style={s.retakeBtn} onPress={() => router.push('/(app)/profili' as any)}>
            <Text style={s.retakeBtnText}>Bëj testin përsëri</Text>
          </TouchableOpacity>
          {!isBalanced && (
            <TouchableOpacity
              style={s.productsBtn}
              onPress={() => router.push('/(app)/(tabs)/products' as any)}
            >
              <Text style={s.productsBtnText}>Shiko të gjitha produktet →</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={{ height: 60 }} />
      </ScrollView>
    </SafeAreaView>
  )
}

// ─── Sub-components ───

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={s.section}>
      <Text style={s.sectionTitle}>{title}</Text>
      {children}
    </View>
  )
}

function ProductCard({ prod, secondary = false, onPress }: { prod: ProductRec; secondary?: boolean; onPress: () => void }) {
  return (
    <View style={[s.prodCard, secondary && s.prodCardSecondary]}>
      <Text style={s.prodName}>{prod.name}</Text>
      <Text style={s.prodReason}>{prod.reason}</Text>
      <View style={s.prodFooter}>
        <Text style={s.prodPrice}>{prod.price}</Text>
        <TouchableOpacity style={s.prodBtn} onPress={onPress}>
          <Text style={s.prodBtnText}>Shiko produktin</Text>
          <ArrowRight size={14} color={Colors.alabaster} strokeWidth={2.5} />
        </TouchableOpacity>
      </View>
    </View>
  )
}

// ─── Styles ───

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.alabaster },
  scroll: { paddingBottom: 20 },

  hero: {
    backgroundColor: Colors.pine,
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 32,
  },
  heroLabel: {
    fontSize: 10,
    letterSpacing: 3,
    color: Colors.aloe,
    fontWeight: '700',
    marginBottom: 10,
  },
  heroName: {
    fontSize: 26,
    fontWeight: '700',
    color: Colors.alabaster,
    lineHeight: 32,
    marginBottom: 12,
  },
  heroTagline: {
    fontSize: 14,
    color: 'rgba(236,239,232,0.75)',
    lineHeight: 21,
  },

  section: {
    marginHorizontal: 16,
    marginTop: 20,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 11,
    letterSpacing: 1.5,
    color: Colors.muted,
    fontWeight: '700',
    marginBottom: 14,
    textTransform: 'uppercase',
  },

  iconRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10, gap: 10 },
  rowIcon: { marginTop: 3, flexShrink: 0 },
  rowText: { fontSize: 14, color: Colors.pine, lineHeight: 22, flex: 1 },

  habitRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12, gap: 12 },
  habitNum: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: Colors.aloe,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  habitNumText: { fontSize: 12, fontWeight: '700', color: Colors.pine },
  habitText: { fontSize: 14, color: Colors.pine, lineHeight: 22, flex: 1 },

  fastingBox: {
    borderWidth: 1.5,
    borderRadius: 12,
    padding: 16,
  },
  fastingBadge: {
    alignSelf: 'flex-start',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.5,
    marginBottom: 10,
    overflow: 'hidden',
  },
  fastingText: { fontSize: 14, color: Colors.pine, lineHeight: 21 },

  prodCard: {
    backgroundColor: Colors.alabaster,
    borderRadius: 14,
    padding: 18,
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: Colors.aloe,
  },
  prodCardSecondary: {
    borderColor: Colors.border,
    backgroundColor: '#FAFBF8',
  },
  prodName: { fontSize: 17, fontWeight: '700', color: Colors.pine, marginBottom: 6 },
  prodReason: { fontSize: 13, color: Colors.muted, lineHeight: 20, marginBottom: 14 },
  prodFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  prodPrice: { fontSize: 13, fontWeight: '600', color: Colors.pine },
  prodBtn: {
    backgroundColor: Colors.pine,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 9,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  prodBtnText: { fontSize: 13, fontWeight: '700', color: Colors.alabaster },

  secondaryWrap: { marginTop: 4 },
  secondaryLabel: {
    fontSize: 11,
    color: Colors.muted,
    fontWeight: '600',
    letterSpacing: 1,
    marginBottom: 8,
    textTransform: 'uppercase',
  },

  balancedBox: {
    marginHorizontal: 16,
    marginTop: 20,
    backgroundColor: Colors.aloe,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  balancedTitle: { fontSize: 20, fontWeight: '700', color: Colors.pine, marginBottom: 8 },
  balancedText: { fontSize: 14, color: Colors.pine, lineHeight: 21, textAlign: 'center', opacity: 0.8 },

  actions: { marginHorizontal: 16, marginTop: 24, gap: 12 },
  retakeBtn: {
    borderWidth: 1.5,
    borderColor: Colors.pine,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  retakeBtnText: { fontSize: 15, fontWeight: '600', color: Colors.pine },
  productsBtn: {
    backgroundColor: Colors.pine,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  productsBtnText: { fontSize: 15, fontWeight: '700', color: Colors.alabaster },
})
