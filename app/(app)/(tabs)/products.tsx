import { useCallback } from 'react'
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useFocusEffect, useRouter } from 'expo-router'
import { useState } from 'react'
import { Colors, PRODUCT_IMAGES, PRODUCTS } from '../../../src/constants'
import { supabase } from '../../../src/lib/supabase'

const PRODUCT_NAMES: Record<string, string> = {
  'detox-shot': 'Detox Shot', 'detox-2': 'Detox 2.0',
  'green-shot': 'Green Shot', 'berry-bliss': 'Berry Bliss',
  'aloe-shot': 'Aloe Shot', 'metabolic-shot': 'Metabolic Shot',
  'g1': 'G1 Sachet', 'nf01': 'NF-01',
  'fiber-plus': 'Fiber+', 'green-organics': 'Green Organics',
}

const PRODUCT_EMOJIS: Record<string, string> = {
  'detox-shot': '🌿', 'detox-2': '⚡', 'green-shot': '💚',
  'berry-bliss': '🫐', 'aloe-shot': '🌵', 'metabolic-shot': '🔥',
  'g1': '🌿', 'nf01': '🌙', 'fiber-plus': '🌾', 'green-organics': '🌱',
}

type ActivePackage = {
  order_code: string
  product_slug: string | null
  package_type: string | null
  start_weight: number | null
  current_weight: number | null
}

export default function ProductsScreen() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [isPremium, setIsPremium] = useState(false)
  const [activePackage, setActivePackage] = useState<ActivePackage | null>(null)
  const [purchaseCount, setPurchaseCount] = useState(0)

  useFocusEffect(useCallback(() => {
    loadData()
  }, []))

  async function loadData() {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }

      const { data: profile } = await supabase
        .from('profiles')
        .select('is_premium, order_code')
        .eq('id', user.id)
        .single()

      setIsPremium(profile?.is_premium || false)

      if (profile?.order_code) {
        // Get active product selection
        const { data: sel } = await supabase
          .from('product_selections')
          .select('product_slug')
          .eq('user_id', user.id)
          .eq('order_code', profile.order_code)
          .eq('is_active', true)
          .single()

        // Get package type from order
        const { data: order } = await supabase
          .from('orders')
          .select('sheet_source')
          .eq('order_code', profile.order_code)
          .single()

        // Get weights
        const { data: weights } = await supabase
          .from('tracker_entries')
          .select('product_slug, date')
          .eq('user_id', user.id)
          .ilike('product_slug', 'weight:%')
          .order('date', { ascending: true })

        const wEntries = (weights || []).map(w => ({
          weight: parseFloat(w.product_slug.replace('weight:', ''))
        })).filter(w => !isNaN(w.weight))

        setActivePackage({
          order_code: profile.order_code,
          product_slug: sel?.product_slug || null,
          package_type: order?.sheet_source || (profile.order_code.startsWith('HY') ? 'ULTRA' : 'QUIK'),
          start_weight: wEntries[0]?.weight || null,
          current_weight: wEntries[wEntries.length - 1]?.weight || null,
        })
      }

      // Get total purchases for loyalty badge
      const { count } = await supabase
        .from('product_selections')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
      setPurchaseCount(count || 0)

    } catch (e) {
      console.log('products load error:', e)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.center}><ActivityIndicator size="large" color={Colors.pine} /></View>
      </SafeAreaView>
    )
  }

  const slug = activePackage?.product_slug
  const productConfig = slug ? PRODUCTS[slug] : null
  const weightLoss = activePackage?.start_weight && activePackage?.current_weight
    ? (activePackage.start_weight - activePackage.current_weight).toFixed(1)
    : null

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <Text style={s.headerSub}>SOHEALTHY</Text>
        <Text style={s.headerTitle}>Paketat e Mia</Text>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* NOT PREMIUM */}
        {!isPremium && (
          <View style={s.emptyState}>
            <Text style={s.emptyEmoji}>📦</Text>
            <Text style={s.emptyTitle}>Nuk keni paketë aktive</Text>
            <Text style={s.emptyText}>Aktivizoni llogarinë tuaj me kodin e porosisë për të parë produktin tuaj.</Text>
            <TouchableOpacity style={s.activateBtn} onPress={() => router.push('/(app)/activate')}>
              <Text style={s.activateBtnText}>Aktivizo Kodin →</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* PREMIUM — Active Package */}
        {isPremium && activePackage && (
          <>
            {/* Hero card */}
            <View style={s.heroCard}>
              <View style={s.heroLeft}>
                <View style={s.codeBadge}>
                  <Text style={s.codeBadgeLabel}>KOD AKTIV</Text>
                  <Text style={s.codeBadgeVal}>{activePackage.order_code}</Text>
                </View>
                {activePackage.package_type && (
                  <View style={s.typeBadge}>
                    <Text style={s.typeBadgeText}>{activePackage.package_type}</Text>
                  </View>
                )}
                {purchaseCount > 1 && (
                  <View style={s.loyaltyBadge}>
                    <Text style={s.loyaltyText}>⭐ {purchaseCount} paketa</Text>
                  </View>
                )}
              </View>
              <View style={s.heroRight}>
                {slug && PRODUCT_IMAGES[slug]
                  ? <Image source={{ uri: PRODUCT_IMAGES[slug] }} style={s.heroImg} resizeMode="contain" />
                  : <Text style={s.heroEmoji}>{slug ? PRODUCT_EMOJIS[slug] : '📦'}</Text>
                }
              </View>
            </View>

            {/* Product name + instructions */}
            {slug && productConfig ? (
              <View style={s.instructionsCard}>
                <Text style={s.productName}>{PRODUCT_NAMES[slug]}</Text>

                <View style={s.infoRow}>
                  <Text style={s.infoLabel}>⏰ Kur</Text>
                  <Text style={s.infoVal}>{productConfig.when}</Text>
                </View>
                <View style={s.divider} />
                <View style={s.infoRow}>
                  <Text style={s.infoLabel}>📋 Si</Text>
                  <Text style={s.infoVal}>{productConfig.how}</Text>
                </View>
                <View style={s.divider} />
                <View style={s.infoRow}>
                  <Text style={s.infoLabel}>🧊 Ruajtja</Text>
                  <Text style={s.infoVal}>{productConfig.storage}</Text>
                </View>
                {productConfig.combo && (
                  <>
                    <View style={s.divider} />
                    <View style={s.infoRow}>
                      <Text style={s.infoLabel}>💡 Kombinim</Text>
                      <Text style={s.infoVal}>{productConfig.combo}</Text>
                    </View>
                  </>
                )}

                <View style={s.reminderBox}>
                  <Text style={s.reminderTime}>{productConfig.notif_time}</Text>
                  <Text style={s.reminderMsg}>{productConfig.notif_msg}</Text>
                </View>

                <TouchableOpacity
                  style={s.changeBtn}
                  onPress={() => router.push('/(app)/my-packages')}
                >
                  <Text style={s.changeBtnText}>Ndrysho Produktin</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={s.noProductCard}>
                <Text style={s.noProductText}>Nuk keni zgjedhur produktin ende.</Text>
                <TouchableOpacity
                  style={s.activateBtn}
                  onPress={() => router.push('/(app)/my-packages')}
                >
                  <Text style={s.activateBtnText}>Zgjidh Produktin →</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Weight loss card */}
            <View style={s.weightCard}>
              <Text style={s.weightTitle}>⚖️ Humbja e Peshës</Text>
              {weightLoss !== null ? (
                <View style={s.weightRow}>
                  <View style={s.weightStat}>
                    <Text style={s.weightStatLbl}>Fillimi</Text>
                    <Text style={s.weightStatVal}>{activePackage.start_weight} kg</Text>
                  </View>
                  <Text style={s.weightArrow}>→</Text>
                  <View style={s.weightStat}>
                    <Text style={s.weightStatLbl}>Tani</Text>
                    <Text style={s.weightStatVal}>{activePackage.current_weight} kg</Text>
                  </View>
                  <View style={[s.weightStat, s.weightLossStat]}>
                    <Text style={s.weightStatLbl}>Humbur</Text>
                    <Text style={[s.weightStatVal, { color: Colors.aloe, fontSize: 22 }]}>
                      -{weightLoss} kg
                    </Text>
                  </View>
                </View>
              ) : (
                <TouchableOpacity
                  style={s.addWeightBtn}
                  onPress={() => router.push('/(app)/tracker')}
                >
                  <Text style={s.addWeightText}>+ Shto Peshën në Tracker →</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* ADD NEW CODE button */}
            <View style={s.newCodeSection}>
              <Text style={s.newCodeTitle}>Bleve paketë të re?</Text>
              <Text style={s.newCodeSub}>Aktivizo kodin e ri për të filluar me produktin dhe dietën e re.</Text>
              <TouchableOpacity
                style={s.newCodeBtn}
                onPress={() => router.push('/(app)/activate')}
              >
                <Text style={s.newCodeBtnText}>+ Aktivizo Kod të Ri</Text>
              </TouchableOpacity>
            </View>

            {/* History button */}
            <TouchableOpacity
              style={s.historyBtn}
              onPress={() => router.push('/(app)/my-packages')}
            >
              <Text style={s.historyBtnText}>📋 Shiko Historinë e Blerjeve</Text>
            </TouchableOpacity>
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.alabaster },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    backgroundColor: Colors.pine, paddingHorizontal: 20,
    paddingTop: 8, paddingBottom: 20,
  },
  headerSub: { color: Colors.aloe, fontSize: 11, letterSpacing: 3, fontWeight: '700', marginBottom: 4 },
  headerTitle: { color: Colors.alabaster, fontSize: 24, fontWeight: '700' },
  scroll: { padding: 16 },
  emptyState: { alignItems: 'center', padding: 40 },
  emptyEmoji: { fontSize: 52, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: Colors.pine, marginBottom: 8 },
  emptyText: { fontSize: 14, color: '#888', textAlign: 'center', lineHeight: 22, marginBottom: 20 },
  heroCard: {
    backgroundColor: Colors.pine, borderRadius: 16, padding: 20,
    flexDirection: 'row', alignItems: 'center', marginBottom: 12,
  },
  heroLeft: { flex: 1, gap: 8 },
  heroRight: { alignItems: 'center' },
  heroImg: { width: 100, height: 100 },
  heroEmoji: { fontSize: 64 },
  codeBadge: { marginBottom: 4 },
  codeBadgeLabel: { fontSize: 9, letterSpacing: 2, color: Colors.aloe, fontWeight: '700' },
  codeBadgeVal: { fontSize: 20, fontWeight: '700', color: Colors.alabaster, letterSpacing: 1 },
  typeBadge: {
    backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 3, alignSelf: 'flex-start',
  },
  typeBadgeText: { color: Colors.aloe, fontSize: 11, fontWeight: '700' },
  loyaltyBadge: {
    backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 3, alignSelf: 'flex-start',
  },
  loyaltyText: { color: 'rgba(255,255,255,0.7)', fontSize: 11 },
  instructionsCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  productName: { fontSize: 20, fontWeight: '700', color: Colors.pine, marginBottom: 16 },
  infoRow: { flexDirection: 'row', gap: 12, paddingVertical: 10 },
  infoLabel: { fontSize: 13, fontWeight: '700', color: Colors.pine, width: 80 },
  infoVal: { flex: 1, fontSize: 13, color: '#555', lineHeight: 20 },
  divider: { height: 1, backgroundColor: '#f0f0f0' },
  reminderBox: {
    backgroundColor: Colors.pine + '10', borderRadius: 12,
    padding: 14, alignItems: 'center', marginTop: 16, marginBottom: 12,
  },
  reminderTime: { fontSize: 32, fontWeight: '700', color: Colors.pine, marginBottom: 4 },
  reminderMsg: { fontSize: 13, color: '#555', textAlign: 'center' },
  changeBtn: {
    borderWidth: 1.5, borderColor: Colors.pine + '30', borderRadius: 10,
    padding: 12, alignItems: 'center',
  },
  changeBtnText: { color: Colors.pine, fontWeight: '600', fontSize: 13 },
  noProductCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 24,
    alignItems: 'center', marginBottom: 12,
  },
  noProductText: { fontSize: 14, color: '#888', marginBottom: 16 },
  activateBtn: { backgroundColor: Colors.pine, borderRadius: 12, paddingHorizontal: 28, paddingVertical: 14 },
  activateBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  weightCard: {
    backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 12,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 1,
  },
  weightTitle: { fontSize: 15, fontWeight: '700', color: Colors.pine, marginBottom: 12 },
  weightRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  weightStat: { alignItems: 'center', flex: 1 },
  weightLossStat: {
    backgroundColor: Colors.aloe + '15', borderRadius: 10, padding: 8,
  },
  weightStatLbl: { fontSize: 11, color: '#888', marginBottom: 4 },
  weightStatVal: { fontSize: 18, fontWeight: '700', color: Colors.pine },
  weightArrow: { fontSize: 18, color: '#ccc', marginHorizontal: 4 },
  addWeightBtn: {
    backgroundColor: Colors.aloe + '20', borderRadius: 10,
    padding: 12, alignItems: 'center',
  },
  addWeightText: { color: Colors.pine, fontWeight: '600', fontSize: 13 },
  newCodeSection: {
    backgroundColor: Colors.pine + '08', borderRadius: 14, padding: 16,
    marginBottom: 10, borderWidth: 1, borderColor: Colors.pine + '15',
  },
  newCodeTitle: { fontSize: 15, fontWeight: '700', color: Colors.pine, marginBottom: 4 },
  newCodeSub: { fontSize: 13, color: '#666', lineHeight: 20, marginBottom: 12 },
  newCodeBtn: {
    backgroundColor: Colors.pine, borderRadius: 10,
    padding: 14, alignItems: 'center',
  },
  newCodeBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  historyBtn: {
    borderWidth: 1.5, borderColor: Colors.pine + '30', borderRadius: 10,
    padding: 14, alignItems: 'center', marginBottom: 8,
  },
  historyBtnText: { color: Colors.pine, fontWeight: '600', fontSize: 14 },
})
