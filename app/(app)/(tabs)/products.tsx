import { useCallback } from 'react'
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useFocusEffect, useRouter } from 'expo-router'
import { useState } from 'react'
import { Package, Star, Calendar, Clock, ClipboardList, Snowflake, Scale, Leaf, ArrowRight } from 'lucide-react-native'
import { Colors, getComboSchedule, PRODUCT_IMAGES, PRODUCTS } from '../../../src/constants'
import { supabase } from '../../../src/lib/supabase'

const PRODUCT_NAMES: Record<string, string> = {
  'detox-shot': 'Detox Shot', 'detox-2': 'Detox 2.0',
  'green-shot': 'Green Shot', 'berry-bliss': 'Berry Bliss',
  'aloe-shot': 'Aloe Shot', 'metabolic-shot': 'Metabolic Shot',
  'g1': 'G1 Sachet', 'nf01': 'NF-01',
  'fiber-plus': 'Fiber+', 'green-organics': 'Green Organics',
}

type ActivePackage = {
  order_code: string
  product_slugs: string[]
  product_slug: string | null  // primary product (first one)
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
        // Get ALL active product selections for this order
        const { data: selData } = await supabase
          .from('product_selections')
          .select('product_slug')
          .eq('user_id', user.id)
          .eq('order_code', profile.order_code)
          .eq('is_active', true)
          .order('selected_at', { ascending: true })
        const sel = selData && selData.length > 0 ? selData[0] : null
        const allSlugs = (selData || []).map(s => s.product_slug).filter(Boolean) as string[]

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
          product_slugs: allSlugs,
          product_slug: allSlugs[0] || null,
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
        <View style={s.headerTop}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <Text style={s.backText}>‹ Kthehu</Text>
          </TouchableOpacity>
        </View>
        <Text style={s.headerSub}>SOHEALTHY</Text>
        <Text style={s.headerTitle}>Paketat e Mia</Text>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* NOT PREMIUM */}
        {!isPremium && (
          <View style={s.emptyState}>
            <View style={s.emptyIconWrap}><Package size={40} color={Colors.pine} strokeWidth={1.5} /></View>
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

                {purchaseCount > 1 && (
                  <View style={s.loyaltyBadge}>
                    <Star size={11} color="rgba(255,255,255,0.8)" strokeWidth={2} />
                    <Text style={s.loyaltyText}>{purchaseCount} paketa</Text>
                  </View>
                )}
              </View>
              <View style={s.heroRight}>
                {slug && PRODUCT_IMAGES[slug]
                  ? <Image source={{ uri: PRODUCT_IMAGES[slug] }} style={s.heroImg} resizeMode="contain" />
                  : <View style={s.heroIconWrap}><Leaf size={48} color={Colors.alabaster} strokeWidth={1.5} /></View>
                }
              </View>
            </View>

            {/* Product name + instructions */}
            {activePackage.product_slugs.length > 0 ? (
              <View style={s.instructionsCard}>
                {/* Product images row */}
                <View style={s.productImagesRow}>
                  {activePackage.product_slugs.map(s2 => (
                    <View key={s2} style={s.productImgWrap}>
                      {PRODUCT_IMAGES[s2]
                        ? <Image source={{ uri: PRODUCT_IMAGES[s2] }} style={s.productImgSmall} resizeMode="contain" />
                        : <Leaf size={32} color={Colors.aloe} strokeWidth={1.5} />
                      }
                      <Text style={s.productImgLabel}>{PRODUCT_NAMES[s2]}</Text>
                    </View>
                  ))}
                </View>

                {/* Combo schedule OR single product schedule */}
                {(() => {
                  const combo = getComboSchedule(activePackage.product_slugs)
                  if (combo) {
                    return (
                      <>
                        <View style={s.scheduleTitleRow}><Calendar size={15} color={Colors.pine} strokeWidth={1.75} /><Text style={s.scheduleTitle}>Orari i Ditës</Text></View>
                        {combo.map((item, i) => (
                          <View key={i} style={s.scheduleRow}>
                            <View style={s.scheduleTime}>
                              <Text style={s.scheduleTimeText}>{item.time}</Text>
                            </View>
                            <View style={s.scheduleInfo}>
                              {PRODUCT_IMAGES[item.slug]
                                ? <Image source={{ uri: PRODUCT_IMAGES[item.slug] }} style={s.scheduleImg} resizeMode="contain" />
                                : null
                              }
                              <Text style={s.scheduleInstruction}>{item.instruction}</Text>
                            </View>
                          </View>
                        ))}
                      </>
                    )
                  } else if (slug && productConfig) {
                    return (
                      <>
                        <View style={s.infoRow}>
                          <View style={s.infoLabelWrap}><Clock size={14} color={Colors.pine} strokeWidth={1.75} /><Text style={s.infoLabel}>Kur</Text></View>
                          <Text style={s.infoVal}>{productConfig.when}</Text>
                        </View>
                        <View style={s.divider} />
                        <View style={s.infoRow}>
                          <View style={s.infoLabelWrap}><ClipboardList size={14} color={Colors.pine} strokeWidth={1.75} /><Text style={s.infoLabel}>Si</Text></View>
                          <Text style={s.infoVal}>{productConfig.how}</Text>
                        </View>
                        <View style={s.divider} />
                        <View style={s.infoRow}>
                          <View style={s.infoLabelWrap}><Snowflake size={14} color={Colors.pine} strokeWidth={1.75} /><Text style={s.infoLabel}>Ruajtja</Text></View>
                          <Text style={s.infoVal}>{productConfig.storage}</Text>
                        </View>
                        <View style={s.reminderBox}>
                          <Text style={s.reminderTime}>{productConfig.notif_time}</Text>
                          <Text style={s.reminderMsg}>{productConfig.notif_msg}</Text>
                        </View>
                      </>
                    )
                  }
                  return null
                })()}

                <View style={s.btnRow}>
                  <TouchableOpacity
                    style={[s.changeBtn, s.btnFlex]}
                    onPress={() => router.push('/(app)/my-packages')}
                  >
                    <Text style={s.changeBtnText}>Ndrysho Produktet</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[s.detailBtnP, s.btnFlex]}
                    onPress={() => router.push({ pathname: '/(app)/product-detail', params: { slug: activePackage.product_slug! } })}
                  >
                    <Text style={s.detailBtnPText}>Detajet e Përdorimit →</Text>
                  </TouchableOpacity>
                </View>
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
              <View style={s.weightTitleRow}><Scale size={15} color={Colors.pine} strokeWidth={1.75} /><Text style={s.weightTitle}>Humbja e Peshës</Text></View>
              {weightLoss !== null ? (
                <View style={s.weightRow}>
                  <View style={s.weightStat}>
                    <Text style={s.weightStatLbl}>Fillimi</Text>
                    <Text style={s.weightStatVal}>{activePackage.start_weight} kg</Text>
                  </View>
                  <ArrowRight size={18} color="#ccc" strokeWidth={2} style={{ marginHorizontal: 4 }} />
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
              <ClipboardList size={16} color={Colors.pine} strokeWidth={1.75} />
              <Text style={s.historyBtnText}>Shiko Historinë e Blerjeve</Text>
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
  headerTop: { flexDirection: 'row', marginBottom: 8 },
  backBtn: { padding: 4 },
  backText: { color: Colors.aloe, fontSize: 16, fontWeight: '600' },
  headerSub: { color: Colors.aloe, fontSize: 11, letterSpacing: 3, fontWeight: '700', marginBottom: 4 },
  headerTitle: { color: Colors.alabaster, fontSize: 24, fontWeight: '700' },
  scroll: { padding: 16 },
  emptyState: { alignItems: 'center', padding: 40 },
  emptyIconWrap: { width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.pine + '12', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: Colors.pine, marginBottom: 8 },
  emptyText: { fontSize: 14, color: '#888', textAlign: 'center', lineHeight: 22, marginBottom: 20 },
  heroCard: {
    backgroundColor: Colors.pine, borderRadius: 16, padding: 20,
    flexDirection: 'row', alignItems: 'center', marginBottom: 12,
  },
  heroLeft: { flex: 1, gap: 8 },
  heroRight: { alignItems: 'center' },
  heroImg: { width: 100, height: 100 },
  heroIconWrap: { width: 88, height: 88, borderRadius: 44, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' },
  codeBadge: { marginBottom: 4 },
  codeBadgeLabel: { fontSize: 9, letterSpacing: 2, color: Colors.aloe, fontWeight: '700' },
  codeBadgeVal: { fontSize: 20, fontWeight: '700', color: Colors.alabaster, letterSpacing: 1 },
  typeBadge: {
    backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 3, alignSelf: 'flex-start',
  },
  typeBadgeText: { color: Colors.aloe, fontSize: 11, fontWeight: '700' },
  loyaltyBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start',
  },
  loyaltyText: { color: 'rgba(255,255,255,0.7)', fontSize: 11 },
  instructionsCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  productName: { fontSize: 20, fontWeight: '700', color: Colors.pine, marginBottom: 16 },
  infoRow: { flexDirection: 'row', gap: 12, paddingVertical: 10, alignItems: 'flex-start' },
  infoLabelWrap: { flexDirection: 'row', alignItems: 'center', gap: 6, width: 92 },
  infoLabel: { fontSize: 13, fontWeight: '700', color: Colors.pine },
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
  btnRow: { flexDirection: 'row', gap: 10 },
  btnFlex: { flex: 1 },
  detailBtnP: {
    backgroundColor: Colors.pine, borderRadius: 10,
    padding: 12, alignItems: 'center',
  },
  detailBtnPText: { color: '#fff', fontWeight: '700', fontSize: 13 },
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
  weightTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  weightTitle: { fontSize: 15, fontWeight: '700', color: Colors.pine },
  weightRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  weightStat: { alignItems: 'center', flex: 1 },
  weightLossStat: {
    backgroundColor: Colors.aloe + '15', borderRadius: 10, padding: 8,
  },
  weightStatLbl: { fontSize: 11, color: '#888', marginBottom: 4 },
  weightStatVal: { fontSize: 18, fontWeight: '700', color: Colors.pine },
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
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderWidth: 1.5, borderColor: Colors.pine + '30', borderRadius: 10,
    padding: 14, marginBottom: 8,
  },
  historyBtnText: { color: Colors.pine, fontWeight: '600', fontSize: 14 },
  productImagesRow: { flexDirection: 'row', justifyContent: 'center', gap: 16, marginBottom: 16, flexWrap: 'wrap' },
  productImgWrap: { alignItems: 'center', maxWidth: 80 },
  productImgSmall: { width: 60, height: 60 },
  productImgLabel: { fontSize: 11, color: Colors.pine, fontWeight: '600', textAlign: 'center', marginTop: 4 },
  scheduleTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  scheduleTitle: { fontSize: 14, fontWeight: '700', color: Colors.pine },
  scheduleRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  scheduleTime: { backgroundColor: Colors.pine, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, minWidth: 56, alignItems: 'center' },
  scheduleTimeText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  scheduleInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  scheduleImg: { width: 36, height: 36 },
  scheduleInstruction: { flex: 1, fontSize: 13, color: '#444', lineHeight: 18 },
})
