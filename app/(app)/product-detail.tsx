import { useCallback, useState } from 'react'
import { ActivityIndicator, Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router'
import { Star, Calendar, Clock, ClipboardList, Bell, Snowflake, Lightbulb, Leaf } from 'lucide-react-native'
import { Colors, getComboSchedule, PRODUCT_IMAGES, PRODUCTS } from '../../src/constants'
import { supabase } from '../../src/lib/supabase'

const PRODUCT_LIST: Record<string, { name: string; desc: string }> = {
  'detox-shot':     { name: 'Detox Shot',      desc: 'Nxit metabolizmin & pastron trupin' },
  'detox-2':        { name: 'Detox 2.0',        desc: 'Djeg dhjamin e barkut & ul fryrjen' },
  'green-shot':     { name: 'Green Shot',       desc: 'Heq fryrjen & djeg yndyrnat' },
  'berry-bliss':    { name: 'Berry Bliss',      desc: 'Stabilizon sheqerin & pastron mëlçinë' },
  'aloe-shot':      { name: 'Aloe Shot',        desc: 'Qetëson zorrët & pastron lëkurën' },
  'metabolic-shot': { name: 'Metabolic Shot',   desc: 'Nxit metabolizmin & rrit energjinë' },
  'g1':             { name: 'G1 Sachet',        desc: 'Efekt Ozempik natyral & ngopje' },
  'nf01':           { name: 'NF-01',            desc: 'Zëvendëso darkën & përmirëso gjumin' },
  'fiber-plus':     { name: 'Fiber+',           desc: 'Rregullon tretjen & ngop' },
  'green-organics': { name: 'Green Organics',   desc: 'Zëvendëso 2 vakte & humb deri 4kg/10 ditë' },
}

export default function ProductDetailScreen() {
  const router = useRouter()
  const params = useLocalSearchParams<{ slug: string }>()
  const [dbSlugs, setDbSlugs] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [orderCode, setOrderCode] = useState('')
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
        .select('order_code')
        .eq('id', user.id)
        .single()
      const code = profile?.order_code || ''
      if (code) setOrderCode(code)

      // Load ALL active product selections (combo-aware), filtered to known products.
      let q = supabase
        .from('product_selections')
        .select('product_slug, selected_at')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('selected_at', { ascending: true })
      if (code) q = q.eq('order_code', code)
      const { data: selData } = await q
      const slugs = (selData || [])
        .map(r => r.product_slug as string)
        .filter(sg => sg && !!PRODUCTS[sg])
      if (slugs.length > 0) setDbSlugs(slugs)

      const { count } = await supabase
        .from('purchase_history')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
      setPurchaseCount(count || 0)
    } catch (e) {
      console.log('Product detail load error:', e)
    } finally {
      setLoading(false)
    }
  }

  function handleChangeProduct() {
    Alert.alert(
      'Ndrysho Produktin',
      'Jeni të sigurt që doni të ndryshoni zgjedhjen e produktit për këtë paketë?',
      [
        { text: 'Anulo', style: 'cancel' },
        { text: 'Ndrysho', onPress: () => router.push('/(app)/select-product') }
      ]
    )
  }

  // Resolve which products to show: prefer DB (combo-aware), fall back to the nav param.
  const paramSlug = (params.slug as string) || ''
  const baseSlugs = dbSlugs.length > 0 ? dbSlugs : (paramSlug ? [paramSlug] : [])
  const validSlugs = baseSlugs.filter(sg => PRODUCT_LIST[sg] && PRODUCTS[sg])
  const primary = validSlugs[0] || ''
  const product = PRODUCT_LIST[primary]
  const productConfig = PRODUCTS[primary]
  const isCombo = validSlugs.length >= 2
  const comboSchedule = isCombo ? getComboSchedule(validSlugs) : null

  if (loading) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.center}><ActivityIndicator size="large" color={Colors.pine} /></View>
      </SafeAreaView>
    )
  }

  if (!product || !productConfig) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.center}>
          <Text style={s.errorText}>Produkti nuk u gjet</Text>
          <TouchableOpacity style={s.backBtn2} onPress={() => router.back()}>
            <Text style={s.backBtn2Text}>← Kthehu</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      {/* Header with back button */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Text style={s.backText}>‹ Kthehu</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>{isCombo ? 'Paketa Ime' : 'Produkti Im'}</Text>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Hero */}
        <View style={s.hero}>
          {isCombo ? (
            <>
              <View style={s.heroImagesRow}>
                {validSlugs.map(sg => (
                  <View key={sg} style={s.heroImgWrap}>
                    {PRODUCT_IMAGES[sg]
                      ? <Image source={{ uri: PRODUCT_IMAGES[sg] }} style={s.heroImgSmall} resizeMode="contain" />
                      : <Leaf size={48} color={Colors.alabaster} strokeWidth={1.5} />}
                    <Text style={s.heroImgLabel}>{PRODUCT_LIST[sg]?.name}</Text>
                  </View>
                ))}
              </View>
              <Text style={s.heroName}>Paketa Juaj</Text>
              <Text style={s.heroDesc}>{validSlugs.map(sg => PRODUCT_LIST[sg]?.name).join('  +  ')}</Text>
            </>
          ) : (
            <>
              {PRODUCT_IMAGES[primary]
                ? <Image source={{ uri: PRODUCT_IMAGES[primary] }} style={s.heroImg} resizeMode="contain" />
                : <Leaf size={56} color={Colors.alabaster} strokeWidth={1.5} />}
              <Text style={s.heroName}>{product.name}</Text>
              <Text style={s.heroDesc}>{product.desc}</Text>
            </>
          )}
          {purchaseCount > 1 && (
            <View style={s.loyaltyBadge}>
              <Star size={12} color={Colors.aloe} strokeWidth={2} />
              <Text style={s.loyaltyText}>Klient besnik — {purchaseCount} paketa</Text>
            </View>
          )}
        </View>

        {isCombo ? (
          <>
            {comboSchedule ? (
              /* Combined daily schedule for the two products */
              <View style={s.section}>
                <View style={s.sectionTitleRow}><Calendar size={15} color={Colors.pine} strokeWidth={1.75} /><Text style={s.sectionTitle}>Orari i Ditës</Text></View>
                <View style={s.infoCard}>
                  {comboSchedule.map((item, i) => (
                    <View
                      key={i}
                      style={[s.scheduleRow, i === comboSchedule.length - 1 && s.scheduleRowLast]}
                    >
                      <View style={s.scheduleTime}>
                        <Text style={s.scheduleTimeText}>{item.time}</Text>
                      </View>
                      <View style={s.scheduleInfo}>
                        {PRODUCT_IMAGES[item.slug]
                          ? <Image source={{ uri: PRODUCT_IMAGES[item.slug] }} style={s.scheduleImg} resizeMode="contain" />
                          : null}
                        <Text style={s.scheduleInstruction}>{item.instruction}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            ) : (
              /* No predefined combo schedule — show each product's own instructions */
              validSlugs.map(sg => {
                const cfg = PRODUCTS[sg]
                if (!cfg) return null
                return (
                  <View key={sg} style={s.section}>
                    <View style={s.sectionTitleRow}><Leaf size={15} color={Colors.pine} strokeWidth={1.75} /><Text style={s.sectionTitle}>{PRODUCT_LIST[sg]?.name}</Text></View>
                    <View style={s.infoCard}>
                      <View style={s.infoLine}><Clock size={14} color={Colors.pine} strokeWidth={1.75} /><Text style={s.infoText}>{cfg.when}</Text></View>
                      <View style={[s.infoLine, { marginTop: 8 }]}><ClipboardList size={14} color={Colors.pine} strokeWidth={1.75} /><Text style={s.infoText}>{cfg.how}</Text></View>
                      <View style={[s.infoLine, { marginTop: 8 }]}><Bell size={14} color={Colors.pine} strokeWidth={1.75} /><Text style={s.infoText}>{cfg.notif_time} — {cfg.notif_msg}</Text></View>
                    </View>
                  </View>
                )
              })
            )}

            {/* Storage — per product (shots = fridge, sachets = dry place) */}
            <View style={s.section}>
              <View style={s.sectionTitleRow}><Snowflake size={15} color={Colors.pine} strokeWidth={1.75} /><Text style={s.sectionTitle}>Ruajtja</Text></View>
              <View style={s.infoCard}>
                {validSlugs.map((sg, i) => (
                  PRODUCTS[sg] ? (
                    <Text key={sg} style={[s.infoText, i > 0 && { marginTop: 8 }]}>
                      <Text style={{ fontWeight: '700' }}>{PRODUCT_LIST[sg]?.name}: </Text>{PRODUCTS[sg].storage}
                    </Text>
                  ) : null
                ))}
              </View>
            </View>
          </>
        ) : (
          <>
            {/* How to use */}
            <View style={s.section}>
              <View style={s.sectionTitleRow}><ClipboardList size={15} color={Colors.pine} strokeWidth={1.75} /><Text style={s.sectionTitle}>Si të përdorni</Text></View>
              <View style={s.infoCard}>
                <Text style={s.infoText}>{productConfig.how}</Text>
              </View>
            </View>

            {/* When */}
            <View style={s.section}>
              <View style={s.sectionTitleRow}><Clock size={15} color={Colors.pine} strokeWidth={1.75} /><Text style={s.sectionTitle}>Kur ta përdorni</Text></View>
              <View style={s.infoCard}>
                <Text style={s.infoText}>{productConfig.when}</Text>
              </View>
            </View>

            {/* Storage */}
            <View style={s.section}>
              <View style={s.sectionTitleRow}><Snowflake size={15} color={Colors.pine} strokeWidth={1.75} /><Text style={s.sectionTitle}>Ruajtja</Text></View>
              <View style={s.infoCard}>
                <Text style={s.infoText}>{productConfig.storage}</Text>
              </View>
            </View>

            {/* Combo tip if available */}
            {productConfig.combo && (
              <View style={s.section}>
                <View style={s.sectionTitleRow}><Lightbulb size={15} color={Colors.pine} strokeWidth={1.75} /><Text style={s.sectionTitle}>Kombinim i rekomanduar</Text></View>
                <View style={[s.infoCard, { borderLeftColor: Colors.aloe }]}>
                  <Text style={s.infoText}>{productConfig.combo}</Text>
                </View>
              </View>
            )}

            {/* Reminder time */}
            <View style={s.reminderCard}>
              <View style={s.reminderTitleRow}><Bell size={13} color={Colors.pine} strokeWidth={2} /><Text style={s.reminderTitle}>Kujtues ditor</Text></View>
              <Text style={s.reminderTime}>{productConfig.notif_time}</Text>
              <Text style={s.reminderMsg}>{productConfig.notif_msg}</Text>
            </View>
          </>
        )}

        {/* Order code */}
        <View style={s.codeCard}>
          <Text style={s.codeLabel}>KODI JUAJ AKTIV</Text>
          <Text style={s.codeValue}>{orderCode}</Text>
        </View>

        {/* Change product */}
        <TouchableOpacity style={s.changeBtn} onPress={handleChangeProduct}>
          <Text style={s.changeBtnText}>Ndrysho Produktin</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.alabaster },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  errorText: { fontSize: 16, color: '#888', marginBottom: 16 },
  scroll: { paddingBottom: 40 },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: Colors.pine, gap: 12,
  },
  backBtn: { padding: 4 },
  backText: { color: Colors.alabaster, fontSize: 17, fontWeight: '600' },
  headerTitle: { color: Colors.alabaster, fontSize: 18, fontWeight: '700', flex: 1 },
  hero: {
    backgroundColor: Colors.pine, paddingTop: 24, paddingBottom: 32,
    paddingHorizontal: 24, alignItems: 'center',
  },
  heroImg: { width: 160, height: 160, marginBottom: 8 },
  heroName: { fontSize: 26, fontWeight: '700', color: Colors.alabaster, marginBottom: 6 },
  heroDesc: { fontSize: 14, color: Colors.aloe, textAlign: 'center', lineHeight: 20 },
  heroImagesRow: { flexDirection: 'row', justifyContent: 'center', gap: 20, marginBottom: 14, flexWrap: 'wrap' },
  heroImgWrap: { alignItems: 'center', maxWidth: 110 },
  heroImgSmall: { width: 90, height: 90 },
  heroImgLabel: { fontSize: 12, color: Colors.alabaster, fontWeight: '600', textAlign: 'center', marginTop: 6 },
  loyaltyBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginTop: 14, backgroundColor: Colors.aloe + '30',
    borderRadius: 20, paddingHorizontal: 16, paddingVertical: 6,
  },
  loyaltyText: { color: Colors.aloe, fontSize: 13, fontWeight: '600' },
  section: { paddingHorizontal: 16, marginTop: 16 },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: Colors.pine },
  infoCard: {
    backgroundColor: '#fff', borderRadius: 12, padding: 16,
    borderLeftWidth: 3, borderLeftColor: Colors.pine,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  infoText: { fontSize: 14, color: '#444', lineHeight: 22, flex: 1 },
  infoLine: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  scheduleRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  scheduleRowLast: { borderBottomWidth: 0, marginBottom: 0, paddingBottom: 0 },
  scheduleTime: { backgroundColor: Colors.pine, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, minWidth: 56, alignItems: 'center' },
  scheduleTimeText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  scheduleInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  scheduleImg: { width: 36, height: 36 },
  scheduleInstruction: { flex: 1, fontSize: 13, color: '#444', lineHeight: 18 },
  reminderCard: {
    marginHorizontal: 16, marginTop: 16, backgroundColor: Colors.pine + '10',
    borderRadius: 14, padding: 16, alignItems: 'center',
    borderWidth: 1, borderColor: Colors.pine + '20',
  },
  reminderTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  reminderTitle: { fontSize: 12, fontWeight: '700', color: Colors.pine, letterSpacing: 1 },
  reminderTime: { fontSize: 36, fontWeight: '700', color: Colors.pine, marginBottom: 4 },
  reminderMsg: { fontSize: 13, color: '#555', textAlign: 'center' },
  codeCard: {
    marginHorizontal: 16, marginTop: 16, backgroundColor: '#fff',
    borderRadius: 12, padding: 16, alignItems: 'center',
  },
  codeLabel: { fontSize: 10, letterSpacing: 2, color: '#aaa', fontWeight: '700', marginBottom: 6 },
  codeValue: { fontSize: 20, fontWeight: '700', color: Colors.pine, letterSpacing: 2 },
  changeBtn: {
    marginHorizontal: 16, marginTop: 16, borderRadius: 12,
    borderWidth: 1.5, borderColor: Colors.pine + '40',
    padding: 14, alignItems: 'center',
  },
  changeBtnText: { color: Colors.pine, fontWeight: '600', fontSize: 14 },
  backBtn2: { backgroundColor: Colors.pine, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12 },
  backBtn2Text: { color: '#fff', fontWeight: '700' },
})
