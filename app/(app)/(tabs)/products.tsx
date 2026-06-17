import { useRouter } from 'expo-router'
import { useEffect, useState } from 'react'
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Colors, PRODUCTS } from '../../../src/constants'
import { supabase } from '../../../src/lib/supabase'

export default function ProductsScreen() {
  const router = useRouter()
  const [isPremium, setIsPremium] = useState(false)
  const [selectedProducts, setSelectedProducts] = useState<string[]>([])
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }
    const { data: profile } = await supabase.from('profiles').select('is_premium').eq('id', user.id).single()
    setIsPremium(profile?.is_premium || false)
    const { data: products } = await supabase.from('client_products').select('product_slug').eq('user_id', user.id)
    if (products && products.length > 0) {
      setSelectedProducts(products.map((p: any) => p.product_slug))
      setSaved(true)
    }
    setLoading(false)
  }

  const toggleProduct = (slug: string) => {
    setSelectedProducts(prev => prev.includes(slug) ? prev.filter(p => p !== slug) : [...prev, slug])
    setSaved(false)
  }

  const saveProducts = async () => {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('client_products').delete().eq('user_id', user.id)
    if (selectedProducts.length > 0) {
      await supabase.from('client_products').insert(
        selectedProducts.map(slug => ({
          user_id: user.id,
          product_slug: slug,
          plan_start: new Date().toISOString().split('T')[0],
          plan_day: 1,
          notif_time_1: PRODUCTS[slug]?.notif_time || '08:00',
          notif_time_2: PRODUCTS[slug]?.notif_time_2 || null,
        }))
      )
    }
    setSaved(true)
    setSaving(false)
  }

  if (loading) return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.alabaster }}>
      <ActivityIndicator color={Colors.pine} size="large" />
    </View>
  )

  if (!isPremium) return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <Text style={s.title}>Produktet e mia</Text>
      </View>
      <View style={s.center}>
        <Text style={s.emptyIcon}>📦</Text>
        <Text style={s.emptyText}>Aktivizo premium</Text>
        <Text style={s.emptySub}>Blej një produkt SoHealthy dhe fut kodin</Text>
        <TouchableOpacity style={s.activateBtn} onPress={() => router.push('/activate' as any)}>
          <Text style={s.activateBtnText}>Aktivizo tani →</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <Text style={s.title}>Produktet e mia</Text>
        <Text style={s.sub}>Zgjedh produktet që ke blerë</Text>
      </View>
      <ScrollView style={s.body} showsVerticalScrollIndicator={false}>
        <Text style={s.sectionLabel}>Zgjedh produktet tuaja</Text>
        {Object.entries(PRODUCTS).map(([slug, product]) => {
          const selected = selectedProducts.includes(slug)
          return (
            <TouchableOpacity key={slug} style={[s.productCard, selected && s.productCardSelected]} onPress={() => toggleProduct(slug)}>
              <View style={[s.checkbox, selected && s.checkboxSelected]}>
                {selected && <Text style={s.checkmark}>✓</Text>}
              </View>
              <View style={s.productInfo}>
                <Text style={s.productName}>{product.icon} {product.name}</Text>
                <Text style={s.productTime}>⏰ {product.notif_time}{product.notif_time_2 ? ` & ${product.notif_time_2}` : ''}</Text>
                <Text style={s.productStorage}>{product.storage}</Text>
              </View>
            </TouchableOpacity>
          )
        })}

        {selectedProducts.length > 0 && (
          <TouchableOpacity style={[s.saveBtn, saving && { opacity: 0.6 }]} onPress={saveProducts} disabled={saving}>
            {saving
              ? <ActivityIndicator color={Colors.white} />
              : <Text style={s.saveBtnText}>{saved ? '✓ Ruajtur' : `Ruaj ${selectedProducts.length} produkte →`}</Text>
            }
          </TouchableOpacity>
        )}

        {saved && selectedProducts.length > 0 && (
          <View>
            <Text style={[s.sectionLabel, { marginTop: 24 }]}>Guidat e produkteve</Text>
            {selectedProducts.map(slug => {
              const p = PRODUCTS[slug]
              if (!p) return null
              return (
                <View key={slug} style={s.guideCard}>
                  <View style={s.guideHeader}>
                    <Text style={s.guideName}>{p.icon} {p.name}</Text>
                    <Text style={s.guideTime}>{p.notif_time}</Text>
                  </View>
                  <View style={s.guideBody}>
                    <View style={s.guideRow}>
                      <Text style={s.guideLabel}>🕐 Kur</Text>
                      <Text style={s.guideValue}>{p.when}</Text>
                    </View>
                    <View style={s.guideRow}>
                      <Text style={s.guideLabel}>💧 Si</Text>
                      <Text style={s.guideValue}>{p.how}</Text>
                    </View>
                    <View style={s.guideRow}>
                      <Text style={s.guideLabel}>❄️ Ruajtja</Text>
                      <Text style={s.guideValue}>{p.storage}</Text>
                    </View>
                  </View>
                </View>
              )
            })}
          </View>
        )}
        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.alabaster },
  header: { backgroundColor: Colors.pine, paddingHorizontal: 20, paddingTop: 8, paddingBottom: 20 },
  title: { fontSize: 18, fontWeight: '700', color: Colors.white },
  sub: { fontSize: 12, color: Colors.aloe, marginTop: 3 },
  body: { flex: 1, padding: 16 },
  sectionLabel: { fontSize: 10, fontWeight: '600', color: Colors.muted, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 8 },
  productCard: { backgroundColor: Colors.white, borderRadius: 12, padding: 14, marginBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1.5, borderColor: 'transparent' },
  productCardSelected: { borderColor: Colors.pine, backgroundColor: '#f0f5f2' },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  checkboxSelected: { backgroundColor: Colors.pine, borderColor: Colors.pine },
  checkmark: { color: Colors.white, fontSize: 13, fontWeight: '700' },
  productInfo: { flex: 1 },
  productName: { fontSize: 14, fontWeight: '600', color: Colors.pine, marginBottom: 2 },
  productTime: { fontSize: 11, color: Colors.muted },
  productStorage: { fontSize: 11, color: Colors.aloe, marginTop: 1 },
  saveBtn: { backgroundColor: Colors.pine, borderRadius: 12, paddingVertical: 15, alignItems: 'center', marginTop: 8 },
  saveBtnText: { fontSize: 15, fontWeight: '600', color: Colors.white },
  guideCard: { backgroundColor: Colors.white, borderRadius: 14, marginBottom: 12, overflow: 'hidden' },
  guideHeader: { backgroundColor: Colors.pine, padding: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  guideName: { fontSize: 14, fontWeight: '600', color: Colors.white },
  guideTime: { fontSize: 12, color: Colors.aloe, backgroundColor: 'rgba(113,181,162,0.2)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  guideBody: { padding: 12 },
  guideRow: { flexDirection: 'row', paddingVertical: 8, borderBottomWidth: 0.5, borderBottomColor: Colors.border, gap: 12 },
  guideLabel: { fontSize: 12, fontWeight: '600', color: Colors.pine, width: 80 },
  guideValue: { fontSize: 12, color: Colors.muted, flex: 1, lineHeight: 18 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyText: { fontSize: 18, fontWeight: '600', color: Colors.pine, marginBottom: 8 },
  emptySub: { fontSize: 13, color: Colors.muted, textAlign: 'center', marginBottom: 24 },
  activateBtn: { backgroundColor: Colors.pine, borderRadius: 12, paddingVertical: 13, paddingHorizontal: 32 },
  activateBtnText: { fontSize: 14, fontWeight: '600', color: Colors.white },
})
