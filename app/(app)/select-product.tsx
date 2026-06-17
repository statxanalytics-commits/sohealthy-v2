import { useCallback, useState } from 'react'
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useFocusEffect, useRouter } from 'expo-router'
import { Colors, PRODUCT_IMAGES, PRODUCTS } from '../../src/constants'
import { supabase } from '../../src/lib/supabase'

// All selectable products with display info
const PRODUCT_LIST = [
  { slug: 'detox-shot', name: 'Detox Shot', emoji: '🌿', desc: 'Nxit metabolizmin & pastron trupin' },
  { slug: 'detox-2', name: 'Detox 2.0', emoji: '⚡', desc: 'Djeg dhjamin e barkut & ul fryrjen' },
  { slug: 'green-shot', name: 'Green Shot', emoji: '💚', desc: 'Heq fryrjen & djeg yndyrnat' },
  { slug: 'berry-bliss', name: 'Berry Bliss', emoji: '🫐', desc: 'Stabilizon sheqerin & pastron mëlçinë' },
  { slug: 'aloe-shot', name: 'Aloe Shot', emoji: '🌵', desc: 'Qetëson zorrët & pastron lëkurën' },
  { slug: 'metabolic-shot', name: 'Metabolic Shot', emoji: '🔥', desc: 'Nxit metabolizmin & rrit energjinë' },
  { slug: 'g1', name: 'G1 Sachet', emoji: '🌿', desc: 'Efekt Ozempik natyral & ngopje' },
  { slug: 'nf01', name: 'NF-01', emoji: '🌙', desc: 'Zëvendëso darkën & përmirëso gjumin' },
  { slug: 'fiber-plus', name: 'Fiber+', emoji: '🌾', desc: 'Rregullon tretjen & ngop' },
  { slug: 'green-organics', name: 'Green Organics', emoji: '🌱', desc: 'Zëvendëso 2 vakte & humb deri 4kg/10 ditë' },
]

export default function SelectProductScreen() {
  const router = useRouter()
  const [selected, setSelected] = useState<string | null>(null)
  const [currentSelection, setCurrentSelection] = useState<string | null>(null)

  useFocusEffect(useCallback(() => {
    checkExistingSelection()
  }, []))

  async function checkExistingSelection() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: profile } = await supabase
        .from('profiles').select('order_code').eq('id', user.id).single()
      if (!profile?.order_code) return
      const { data: sel } = await supabase
        .from('product_selections')
        .select('product_slug')
        .eq('user_id', user.id)
        .eq('order_code', profile.order_code)
        .eq('is_active', true)
        .single()
      if (sel?.product_slug) {
        setCurrentSelection(sel.product_slug)
        setSelected(sel.product_slug) // pre-select current product
      }
    } catch (e) {}
  }
  const [saving, setSaving] = useState(false)

  async function confirmSelection() {
    if (!selected) return
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Get current order_code from profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('order_code')
        .eq('id', user.id)
        .single()

      if (!profile?.order_code) return

      // 1. Deactivate any previous selection for this order_code
      await supabase
        .from('product_selections')
        .update({ is_active: false })
        .eq('user_id', user.id)
        .eq('order_code', profile.order_code)

      // 2. Insert new active selection
      await supabase.from('product_selections').upsert({
        user_id: user.id,
        order_code: profile.order_code,
        product_slug: selected,
        is_active: true,
        selected_at: new Date().toISOString(),
      }, { onConflict: 'user_id,order_code' })

      // 3. Update purchase_history with product info
      await supabase.from('purchase_history')
        .update({ product_slug: selected })
        .eq('user_id', user.id)
        .eq('order_code', profile.order_code)

      // Navigate to product detail screen
      router.replace({ pathname: '/(app)/product-detail', params: { slug: selected } })
    } catch (e) {
      console.log('Select product error:', e)
    } finally {
      setSaving(false)
    }
  }

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <Text style={s.headerTitle}>SoHealthy</Text>
        <Text style={s.headerSub}>Zgjidhni produktin tuaj</Text>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <Text style={s.intro}>
          {currentSelection
            ? `Produkti aktual: ${PRODUCT_LIST.find(p => p.slug === currentSelection)?.name || currentSelection}\nZgjidhni produktin tuaj për të ndryshuar ose konfirmuar.`
            : 'Zgjidhni produktin që keni blerë për të parë udhëzimet e personalizuara.'}
        </Text>

        <View style={s.grid}>
          {PRODUCT_LIST.map(p => {
            const isSelected = selected === p.slug
            return (
              <TouchableOpacity
                key={p.slug}
                style={[s.productCard, isSelected && s.productCardSelected]}
                onPress={() => setSelected(p.slug)}
                activeOpacity={0.7}
              >
                {isSelected && <View style={s.checkBadge}><Text style={s.checkText}>✓</Text></View>}
                {PRODUCT_IMAGES[p.slug]
                  ? <Image source={{ uri: PRODUCT_IMAGES[p.slug] }} style={s.productImg} resizeMode="contain" />
                  : <Text style={s.productEmoji}>{p.emoji}</Text>}
                <Text style={[s.productName, isSelected && s.productNameSelected]}>{p.name}</Text>
                <Text style={s.productDesc}>{p.desc}</Text>
              </TouchableOpacity>
            )
          })}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Sticky confirm button */}
      {selected && (
        <View style={s.footer}>
          <TouchableOpacity
            style={[s.confirmBtn, saving && { opacity: 0.7 }]}
            onPress={confirmSelection}
            disabled={saving}
          >
            {saving
              ? <ActivityIndicator color="#fff" />
              : <Text style={s.confirmText}>
                  Konfirmo — {PRODUCT_LIST.find(p => p.slug === selected)?.name} →
                </Text>
            }
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.alabaster },
  header: {
    backgroundColor: Colors.pine, paddingHorizontal: 20,
    paddingTop: 8, paddingBottom: 20, alignItems: 'center',
  },
  headerTitle: { color: Colors.aloe, fontSize: 12, letterSpacing: 3, fontWeight: '700', marginBottom: 4 },
  headerSub: { color: Colors.alabaster, fontSize: 22, fontWeight: '700' },
  scroll: { padding: 16 },
  intro: {
    fontSize: 14, color: '#555', lineHeight: 22, textAlign: 'center',
    marginBottom: 20, backgroundColor: '#fff', borderRadius: 12,
    padding: 16, borderLeftWidth: 3, borderLeftColor: Colors.aloe,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  productCard: {
    width: '47%', backgroundColor: '#fff', borderRadius: 14, padding: 16,
    alignItems: 'center', borderWidth: 2, borderColor: 'transparent',
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
    position: 'relative',
  },
  productCardSelected: {
    borderColor: Colors.pine, backgroundColor: Colors.pine + '08',
  },
  checkBadge: {
    position: 'absolute', top: 8, right: 8,
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: Colors.pine, alignItems: 'center', justifyContent: 'center',
  },
  checkText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  productEmoji: { fontSize: 32, marginBottom: 10 },
  productImg: { width: 80, height: 80, marginBottom: 8 },
  productName: { fontSize: 13, fontWeight: '700', color: Colors.pine, textAlign: 'center', marginBottom: 4 },
  productNameSelected: { color: Colors.pine },
  productDesc: { fontSize: 11, color: '#888', textAlign: 'center', lineHeight: 16 },
  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: Colors.alabaster, padding: 16, paddingBottom: 32,
    borderTopWidth: 1, borderTopColor: '#e0e0e0',
  },
  confirmBtn: {
    backgroundColor: Colors.pine, borderRadius: 14,
    padding: 16, alignItems: 'center',
  },
  confirmText: { color: Colors.alabaster, fontWeight: '700', fontSize: 16 },
})
