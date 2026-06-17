import { useCallback, useState } from 'react'
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router'
import { Colors, PRODUCTS } from '../../src/constants'
import { supabase } from '../../src/lib/supabase'

const PRODUCT_LIST: Record<string, { name: string; emoji: string; desc: string }> = {
  'detox-shot':     { name: 'Detox Shot',      emoji: '🌿', desc: 'Nxit metabolizmin & pastron trupin' },
  'detox-2':        { name: 'Detox 2.0',        emoji: '⚡', desc: 'Djeg dhjamin e barkut & ul fryrjen' },
  'green-shot':     { name: 'Green Shot',       emoji: '💚', desc: 'Heq fryrjen & djeg yndyrnat' },
  'berry-bliss':    { name: 'Berry Bliss',      emoji: '🫐', desc: 'Stabilizon sheqerin & pastron mëlçinë' },
  'aloe-shot':      { name: 'Aloe Shot',        emoji: '🌵', desc: 'Qetëson zorrët & pastron lëkurën' },
  'metabolic-shot': { name: 'Metabolic Shot',   emoji: '🔥', desc: 'Nxit metabolizmin & rrit energjinë' },
  'g1':             { name: 'G1 Sachet',        emoji: '🌿', desc: 'Efekt Ozempik natyral & ngopje' },
  'nf01':           { name: 'NF-01',            emoji: '🌙', desc: 'Zëvendëso darkën & përmirëso gjumin' },
  'fiber-plus':     { name: 'Fiber+',           emoji: '🌾', desc: 'Rregullon tretjen & ngop' },
  'green-organics': { name: 'Green Organics',   emoji: '🌱', desc: 'Zëvendëso 2 vakte & humb deri 4kg/10 ditë' },
}

export default function ProductDetailScreen() {
  const router = useRouter()
  const params = useLocalSearchParams<{ slug: string }>()
  const [slug, setSlug] = useState(params.slug || '')
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
      if (!user) return

      // Get current active selection + order code
      const { data: profile } = await supabase
        .from('profiles')
        .select('order_code')
        .eq('id', user.id)
        .single()
      if (profile?.order_code) setOrderCode(profile.order_code)

      // Get active product selection (in case navigating from profile)
      const { data: sel } = await supabase
        .from('product_selections')
        .select('product_slug')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('selected_at', { ascending: false })
        .limit(1)
        .single()
      if (sel?.product_slug) setSlug(sel.product_slug)

      // Get purchase count for loyalty message
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

  const product = PRODUCT_LIST[slug]
  const productConfig = PRODUCTS[slug]

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
        <Text style={s.headerTitle}>Produkti Im</Text>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Hero */}
        <View style={s.hero}>
          <Text style={s.heroEmoji}>{product.emoji}</Text>
          <Text style={s.heroName}>{product.name}</Text>
          <Text style={s.heroDesc}>{product.desc}</Text>
          {purchaseCount > 1 && (
            <View style={s.loyaltyBadge}>
              <Text style={s.loyaltyText}>⭐ Klient besnik — {purchaseCount} paketa</Text>
            </View>
          )}
        </View>

        {/* How to use */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>📋 Si të përdorni</Text>
          <View style={s.infoCard}>
            <Text style={s.infoText}>{productConfig.how}</Text>
          </View>
        </View>

        {/* When */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>⏰ Kur ta përdorni</Text>
          <View style={s.infoCard}>
            <Text style={s.infoText}>{productConfig.when}</Text>
          </View>
        </View>

        {/* Storage */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>🧊 Ruajtja</Text>
          <View style={s.infoCard}>
            <Text style={s.infoText}>{productConfig.storage}</Text>
          </View>
        </View>

        {/* Combo tip if available */}
        {productConfig.combo && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>💡 Kombinim i rekomanduar</Text>
            <View style={[s.infoCard, { borderLeftColor: Colors.aloe }]}>
              <Text style={s.infoText}>{productConfig.combo}</Text>
            </View>
          </View>
        )}

        {/* Reminder time */}
        <View style={s.reminderCard}>
          <Text style={s.reminderTitle}>🔔 Kujtues ditor</Text>
          <Text style={s.reminderTime}>{productConfig.notif_time}</Text>
          <Text style={s.reminderMsg}>{productConfig.notif_msg}</Text>
        </View>

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
  heroEmoji: { fontSize: 64, marginBottom: 12 },
  heroName: { fontSize: 26, fontWeight: '700', color: Colors.alabaster, marginBottom: 6 },
  heroDesc: { fontSize: 14, color: Colors.aloe, textAlign: 'center', lineHeight: 20 },
  loyaltyBadge: {
    marginTop: 14, backgroundColor: Colors.aloe + '30',
    borderRadius: 20, paddingHorizontal: 16, paddingVertical: 6,
  },
  loyaltyText: { color: Colors.aloe, fontSize: 13, fontWeight: '600' },
  section: { paddingHorizontal: 16, marginTop: 16 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: Colors.pine, marginBottom: 8 },
  infoCard: {
    backgroundColor: '#fff', borderRadius: 12, padding: 16,
    borderLeftWidth: 3, borderLeftColor: Colors.pine,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  infoText: { fontSize: 14, color: '#444', lineHeight: 22 },
  reminderCard: {
    marginHorizontal: 16, marginTop: 16, backgroundColor: Colors.pine + '10',
    borderRadius: 14, padding: 16, alignItems: 'center',
    borderWidth: 1, borderColor: Colors.pine + '20',
  },
  reminderTitle: { fontSize: 12, fontWeight: '700', color: Colors.pine, marginBottom: 8, letterSpacing: 1 },
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
