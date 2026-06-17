import { useCallback, useState } from 'react'
import {
  ActivityIndicator, Alert, Image, Modal, ScrollView,
  StyleSheet, Text, TextInput, TouchableOpacity, View, KeyboardAvoidingView, Platform
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useFocusEffect, useRouter } from 'expo-router'
import { Colors, PRODUCT_IMAGES, PRODUCTS } from '../../src/constants'
import { supabase } from '../../src/lib/supabase'

const PRODUCT_NAMES: Record<string, string> = {
  'detox-shot': 'Detox Shot', 'detox-2': 'Detox 2.0',
  'green-shot': 'Green Shot', 'berry-bliss': 'Berry Bliss',
  'aloe-shot': 'Aloe Shot', 'metabolic-shot': 'Metabolic Shot',
  'g1': 'G1 Sachet', 'nf01': 'NF-01',
  'fiber-plus': 'Fiber+', 'green-organics': 'Green Organics',
}

const ALL_PRODUCTS = [
  { slug: 'detox-shot', name: 'Detox Shot', emoji: '🌿' },
  { slug: 'detox-2', name: 'Detox 2.0', emoji: '⚡' },
  { slug: 'green-shot', name: 'Green Shot', emoji: '💚' },
  { slug: 'berry-bliss', name: 'Berry Bliss', emoji: '🫐' },
  { slug: 'aloe-shot', name: 'Aloe Shot', emoji: '🌵' },
  { slug: 'metabolic-shot', name: 'Metabolic Shot', emoji: '🔥' },
  { slug: 'g1', name: 'G1 Sachet', emoji: '🌿' },
  { slug: 'nf01', name: 'NF-01', emoji: '🌙' },
  { slug: 'fiber-plus', name: 'Fiber+', emoji: '🌾' },
  { slug: 'green-organics', name: 'Green Organics', emoji: '🌱' },
]

type Package = {
  order_code: string
  product_slug: string | null  // primary product
  product_slugs: string[]      // all products
  package_type: string | null
  activated_at: string
  is_active: boolean
  start_weight: number | null
  current_weight: number | null
}

export default function MyPackagesScreen() {
  const router = useRouter()
  const [packages, setPackages] = useState<Package[]>([])
  const [loading, setLoading] = useState(true)
  const [showProductModal, setShowProductModal] = useState(false)
  const [selectedPackageCode, setSelectedPackageCode] = useState('')
  const [selectedProducts, setSelectedProducts] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [showWeightModal, setShowWeightModal] = useState(false)
  const [weightInput, setWeightInput] = useState('')
  const [activePackageCode, setActivePackageCode] = useState('')

  useFocusEffect(useCallback(() => { loadPackages() }, []))

  async function loadPackages() {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Get active profile order_code
      const { data: profile } = await supabase
        .from('profiles').select('order_code').eq('id', user.id).single()
      const activeCode = profile?.order_code || ''
      setActivePackageCode(activeCode)

      // Get all product selections (one per order_code)
      const { data: selections } = await supabase
        .from('product_selections')
        .select('order_code, product_slug, selected_at, is_active')
        .eq('user_id', user.id)
        .order('selected_at', { ascending: false })

      // Get purchase_history for package_type info
      const { data: history } = await supabase
        .from('purchase_history')
        .select('order_code, package_type, activated_at')
        .eq('user_id', user.id)
        .order('activated_at', { ascending: false })

      // Get weight entries from tracker
      const { data: weights } = await supabase
        .from('tracker_entries')
        .select('product_slug, date')
        .eq('user_id', user.id)
        .ilike('product_slug', 'weight:%')
        .order('date', { ascending: true })

      const weightEntries = (weights || []).map(w => ({
        date: w.date,
        weight: parseFloat(w.product_slug.replace('weight:', ''))
      })).filter(w => !isNaN(w.weight))

      // Build packages list — combine selections + history
      const codeMap: Record<string, Package> = {}

      // Group selections by order_code (multiple products per order)
      const selByCode: Record<string, string[]> = {}
      for (const sel of selections || []) {
        if (!selByCode[sel.order_code]) selByCode[sel.order_code] = []
        if (sel.product_slug) selByCode[sel.order_code].push(sel.product_slug)
      }
      // Add from selections
      for (const [code, slugs] of Object.entries(selByCode)) {
        if (!codeMap[code]) {
          const firstSel = (selections || []).find(s => s.order_code === code)
          codeMap[code] = {
            order_code: code,
            product_slug: slugs[0] || null,
            product_slugs: slugs,
            package_type: null,
            activated_at: firstSel?.selected_at || new Date().toISOString(),
            is_active: code === activeCode,
            start_weight: null,
            current_weight: null,
          }
        }
      }

      // Add from history (may have ones without selections)
      for (const h of history || []) {
        if (!codeMap[h.order_code]) {
          codeMap[h.order_code] = {
            order_code: h.order_code,
            product_slug: null,
            product_slugs: [],
            package_type: h.package_type,
            activated_at: h.activated_at,
            is_active: h.order_code === activeCode,
            start_weight: null,
            current_weight: null,
          }
        }
        codeMap[h.order_code].package_type = h.package_type
      }

      // Add active profile code if not in either list
      if (activeCode && !codeMap[activeCode]) {
        const { data: activeSel } = await supabase
          .from('product_selections')
          .select('product_slug')
          .eq('user_id', user.id)
          .eq('order_code', activeCode)
          .eq('is_active', true)
          .single()
        codeMap[activeCode] = {
          order_code: activeCode,
          product_slug: activeSel?.product_slug || null,
          product_slugs: activeSel?.product_slug ? [activeSel.product_slug] : [],
          package_type: activeCode.startsWith('HY') ? 'ULTRA' : 'QUIK',
          activated_at: new Date().toISOString(),
          is_active: true,
          start_weight: null,
          current_weight: null,
        }
      }

      // Assign weights to packages
      if (weightEntries.length > 0) {
        const pkgList = Object.values(codeMap).sort((a, b) =>
          new Date(a.activated_at).getTime() - new Date(b.activated_at).getTime()
        )
        // First weight = start weight of oldest active package
        if (pkgList.length > 0 && weightEntries.length > 0) {
          pkgList[pkgList.length - 1].start_weight = weightEntries[0].weight
          pkgList[pkgList.length - 1].current_weight = weightEntries[weightEntries.length - 1].weight
        }
      }

      setPackages(Object.values(codeMap).sort((a, b) =>
        new Date(b.activated_at).getTime() - new Date(a.activated_at).getTime()
      ))
    } catch (e) {
      console.log('loadPackages error:', e)
    } finally {
      setLoading(false)
    }
  }

  async function saveProductSelection() {
    if (selectedProducts.length === 0) return
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const isActive = selectedPackageCode === activePackageCode

      // Delete existing selections for this order_code first
      await supabase.from('product_selections')
        .delete()
        .eq('user_id', user.id)
        .eq('order_code', selectedPackageCode)

      // Insert all selected products
      const rows = selectedProducts.map(slug => ({
        user_id: user.id,
        order_code: selectedPackageCode,
        product_slug: slug,
        is_active: isActive,
        selected_at: new Date().toISOString(),
      }))
      await supabase.from('product_selections').insert(rows)

      setShowProductModal(false)
      setSelectedProducts([])
      await loadPackages()
    } catch (e) {
      Alert.alert('Gabim', 'Nuk u ruajt produkti.')
    } finally {
      setSaving(false)
    }
  }

  async function saveWeight() {
    const kg = parseFloat(weightInput.replace(',', '.'))
    if (isNaN(kg) || kg < 30 || kg > 300) {
      Alert.alert('Vlerë e pavlefshme', 'Fut peshën në kg (p.sh. 65.5)')
      return
    }
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const today = new Date().toISOString().slice(0, 10)
      const { data: existing } = await supabase
        .from('tracker_entries')
        .select('id')
        .eq('user_id', user.id)
        .eq('date', today)
        .ilike('product_slug', 'weight:%')
        .single()
      if (existing) {
        await supabase.from('tracker_entries').update({ product_slug: `weight:${kg}` }).eq('id', existing.id)
      } else {
        await supabase.from('tracker_entries').insert({
          user_id: user.id, product_slug: `weight:${kg}`,
          date: today, checked: true,
        })
      }
      setShowWeightModal(false)
      setWeightInput('')
      await loadPackages()
    } catch (e) {
      Alert.alert('Gabim', 'Nuk u ruajt pesha.')
    }
  }

  function formatDate(iso: string) {
    const d = new Date(iso)
    return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`
  }

  if (loading) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.center}><ActivityIndicator size="large" color={Colors.pine} /></View>
      </SafeAreaView>
    )
  }

  const activePackage = packages.find(p => p.is_active)

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <Text style={s.headerSub}>SOHEALTHY</Text>
        <Text style={s.headerTitle}>Paketat e Mia</Text>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Active package hero */}
        {activePackage && (
          <View style={s.activeHero}>
            <View style={s.activeHeroLeft}>
              <Text style={s.activeLabel}>📦 PAKETA AKTIVE</Text>
              <Text style={s.activeCode}>{activePackage.order_code}</Text>
              <Text style={s.activeType}>{activePackage.package_type || 'Premium'}</Text>
              <Text style={s.activeDate}>Aktivizuar: {formatDate(activePackage.activated_at)}</Text>
            </View>
            {activePackage.product_slug && PRODUCT_IMAGES[activePackage.product_slug] ? (
              <Image
                source={{ uri: PRODUCT_IMAGES[activePackage.product_slug] }}
                style={s.activeProductImg}
                resizeMode="contain"
              />
            ) : (
              <Text style={s.activeProductEmoji}>
                {ALL_PRODUCTS.find(p => p.slug === activePackage.product_slug)?.emoji || '📦'}
              </Text>
            )}
          </View>
        )}

        {/* Active package product info */}
        {activePackage && (
          <View style={s.activeDetails}>
            {activePackage.product_slug ? (
              <>
                <Text style={s.activeProductName}>
                  {PRODUCT_NAMES[activePackage.product_slug] || activePackage.product_slug}
                </Text>
                {PRODUCTS[activePackage.product_slug] && (
                  <>
                    <Text style={s.activeDetailRow}>
                      ⏰ {PRODUCTS[activePackage.product_slug].when}
                    </Text>
                    <Text style={s.activeDetailRow}>
                      🔔 {PRODUCTS[activePackage.product_slug].notif_time} — {PRODUCTS[activePackage.product_slug].notif_msg}
                    </Text>
                  </>
                )}
                <View style={s.activeActions}>
                  <TouchableOpacity
                    style={s.changeBtn}
                    onPress={() => {
                      setSelectedPackageCode(activePackage.order_code)
                      setSelectedProducts(activePackage.product_slug)
                      setShowProductModal(true)
                    }}
                  >
                    <Text style={s.changeBtnText}>Ndrysho Produktin</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={s.detailBtn}
                    onPress={() => router.push({ pathname: '/(app)/product-detail', params: { slug: activePackage.product_slug! } })}
                  >
                    <Text style={s.detailBtnText}>Shiko Detajet →</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <TouchableOpacity
                style={s.selectBtn}
                onPress={() => {
                  setSelectedPackageCode(activePackage.order_code)
                  setSelectedProducts([])
                  setShowProductModal(true)
                }}
              >
                <Text style={s.selectBtnText}>+ Zgjidh Produktin Tuaj</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Weight tracking for active package */}
        {activePackage && (
          <View style={s.weightSection}>
            <View style={s.weightHeader}>
              <Text style={s.sectionTitle}>⚖️ Humbja e Peshës</Text>
              <TouchableOpacity style={s.addWeightBtn} onPress={() => setShowWeightModal(true)}>
                <Text style={s.addWeightText}>+ Shto Peshën</Text>
              </TouchableOpacity>
            </View>
            {activePackage.start_weight ? (
              <View style={s.weightCard}>
                <View style={s.weightStat}>
                  <Text style={s.weightStatLabel}>Pesha fillestare</Text>
                  <Text style={s.weightStatVal}>{activePackage.start_weight} kg</Text>
                </View>
                {activePackage.current_weight && activePackage.current_weight !== activePackage.start_weight && (
                  <>
                    <View style={s.weightDivider} />
                    <View style={s.weightStat}>
                      <Text style={s.weightStatLabel}>Tani</Text>
                      <Text style={s.weightStatVal}>{activePackage.current_weight} kg</Text>
                    </View>
                    <View style={s.weightDivider} />
                    <View style={s.weightStat}>
                      <Text style={s.weightStatLabel}>Humbur</Text>
                      <Text style={[s.weightStatVal, { color: Colors.aloe }]}>
                        {(activePackage.start_weight - activePackage.current_weight).toFixed(1)} kg
                      </Text>
                    </View>
                  </>
                )}
              </View>
            ) : (
              <TouchableOpacity style={s.emptyWeight} onPress={() => setShowWeightModal(true)}>
                <Text style={s.emptyWeightText}>Shto peshën fillestare për të gjurmuar progresin tuaj 📊</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Purchase history */}
        {packages.filter(p => !p.is_active).length > 0 && (
          <View style={s.historySection}>
            <Text style={s.sectionTitle}>📋 Historia e Blerjeve</Text>
            {packages.filter(p => !p.is_active).map(pkg => (
              <View key={pkg.order_code} style={s.historyCard}>
                <View style={s.historyLeft}>
                  {pkg.product_slug && PRODUCT_IMAGES[pkg.product_slug]
                    ? <Image source={{ uri: PRODUCT_IMAGES[pkg.product_slug] }} style={s.historyImg} resizeMode="contain" />
                    : <Text style={s.historyEmoji}>
                        {ALL_PRODUCTS.find(p => p.slug === pkg.product_slug)?.emoji || '📦'}
                      </Text>
                  }
                </View>
                <View style={s.historyInfo}>
                  <Text style={s.historyProduct}>
                    {pkg.product_slug ? PRODUCT_NAMES[pkg.product_slug] : 'Produkt i papërcaktuar'}
                  </Text>
                  <Text style={s.historyCode}>{pkg.order_code}</Text>
                  <Text style={s.historyDate}>{formatDate(pkg.activated_at)}</Text>
  
                </View>
                {!pkg.product_slug && (
                  <TouchableOpacity
                    style={s.historySelectBtn}
                    onPress={() => {
                      setSelectedPackageCode(pkg.order_code)
                      setSelectedProducts([])
                      setShowProductModal(true)
                    }}
                  >
                    <Text style={s.historySelectText}>Cakto</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Empty state */}
        {packages.length === 0 && (
          <View style={s.emptyState}>
            <Text style={s.emptyEmoji}>📦</Text>
            <Text style={s.emptyTitle}>Nuk keni paketa aktive</Text>
            <Text style={s.emptyText}>Aktivizoni llogarinë tuaj me kodin e porosisë.</Text>
            <TouchableOpacity style={s.activateBtn} onPress={() => router.push('/(app)/activate')}>
              <Text style={s.activateBtnText}>Aktivizo Tani →</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Product selection modal */}
      <Modal visible={showProductModal} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.modalSheet}>
            <Text style={s.modalTitle}>Zgjidh Produktin</Text>
            <Text style={s.modalSub}>Cili produkt ishte në paketën tuaj?</Text>
            <ScrollView style={{ maxHeight: 400 }} showsVerticalScrollIndicator={false}>
              <Text style={{ fontSize: 12, color: '#888', marginBottom: 8 }}>
                Mund të zgjidhni më shumë se një produkt
              </Text>
              {ALL_PRODUCTS.map(p => {
                const isSelected = selectedProducts.includes(p.slug)
                return (
                  <TouchableOpacity
                    key={p.slug}
                    style={[s.productRow, isSelected && s.productRowSelected]}
                    onPress={() => {
                      setSelectedProducts(prev =>
                        prev.includes(p.slug)
                          ? prev.filter(x => x !== p.slug)
                          : [...prev, p.slug]
                      )
                    }}
                  >
                    {PRODUCT_IMAGES[p.slug]
                      ? <Image source={{ uri: PRODUCT_IMAGES[p.slug] }} style={s.productRowImg} resizeMode="contain" />
                      : <Text style={s.productRowEmoji}>{p.emoji}</Text>
                    }
                    <Text style={[s.productRowName, isSelected && { color: Colors.pine, fontWeight: '700' }]}>
                      {p.name}
                    </Text>
                    {isSelected && <Text style={s.checkMark}>✓</Text>}
                  </TouchableOpacity>
                )
              })}
            </ScrollView>
            <TouchableOpacity
              style={[s.modalBtn, selectedProducts.length === 0 && { opacity: 0.5 }]}
              onPress={saveProductSelection}
              disabled={selectedProducts.length === 0 || saving}
            >
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={s.modalBtnText}>Konfirmo</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={s.modalCancel} onPress={() => { setShowProductModal(false); setSelectedProducts([]) }}>
              <Text style={s.modalCancelText}>Anulo</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Weight modal */}
      <Modal visible={showWeightModal} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.modalOverlay}>
          <View style={s.modalSheet}>
            <Text style={s.modalTitle}>Regjistro Peshën</Text>
            <Text style={s.modalSub}>Fut peshën e sotme në kg</Text>
            <TextInput
              style={s.weightInput}
              value={weightInput}
              onChangeText={setWeightInput}
              placeholder="p.sh. 65.5"
              keyboardType="decimal-pad"
              autoFocus
              placeholderTextColor="#aaa"
            />
            <TouchableOpacity style={s.modalBtn} onPress={saveWeight}>
              <Text style={s.modalBtnText}>Ruaj</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.modalCancel} onPress={() => { setShowWeightModal(false); setWeightInput('') }}>
              <Text style={s.modalCancelText}>Anulo</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.alabaster },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { backgroundColor: Colors.pine, paddingHorizontal: 20, paddingTop: 8, paddingBottom: 20 },
  headerSub: { color: Colors.aloe, fontSize: 11, letterSpacing: 3, fontWeight: '700', marginBottom: 4 },
  headerTitle: { color: Colors.alabaster, fontSize: 24, fontWeight: '700' },
  scroll: { padding: 16 },
  activeHero: {
    backgroundColor: Colors.pine, borderRadius: 16, padding: 20,
    flexDirection: 'row', alignItems: 'center', marginBottom: 0,
    borderBottomLeftRadius: 0, borderBottomRightRadius: 0,
  },
  activeHeroLeft: { flex: 1 },
  activeLabel: { fontSize: 10, letterSpacing: 2, color: Colors.aloe, fontWeight: '700', marginBottom: 8 },
  activeCode: { fontSize: 22, fontWeight: '700', color: Colors.alabaster, letterSpacing: 1, marginBottom: 4 },
  activeType: { fontSize: 13, color: Colors.aloe, fontWeight: '600', marginBottom: 4 },
  activeDate: { fontSize: 12, color: 'rgba(255,255,255,0.5)' },
  activeProductImg: { width: 90, height: 90 },
  activeProductEmoji: { fontSize: 56 },
  activeDetails: {
    backgroundColor: '#fff', borderRadius: 0, padding: 16, marginBottom: 12,
    borderBottomLeftRadius: 14, borderBottomRightRadius: 14,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  activeProductName: { fontSize: 18, fontWeight: '700', color: Colors.pine, marginBottom: 10 },
  activeDetailRow: { fontSize: 13, color: '#555', lineHeight: 22, marginBottom: 4 },
  activeActions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  changeBtn: {
    flex: 1, borderWidth: 1.5, borderColor: Colors.pine + '40',
    borderRadius: 10, padding: 10, alignItems: 'center',
  },
  changeBtnText: { color: Colors.pine, fontWeight: '600', fontSize: 13 },
  detailBtn: {
    flex: 1, backgroundColor: Colors.pine,
    borderRadius: 10, padding: 10, alignItems: 'center',
  },
  detailBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  selectBtn: {
    backgroundColor: Colors.pine, borderRadius: 12,
    padding: 14, alignItems: 'center',
  },
  selectBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  weightSection: { marginBottom: 16 },
  weightHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: Colors.pine },
  addWeightBtn: { backgroundColor: Colors.pine, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6 },
  addWeightText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  weightCard: {
    backgroundColor: '#fff', borderRadius: 14, padding: 16,
    flexDirection: 'row', alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  weightStat: { flex: 1, alignItems: 'center' },
  weightStatLabel: { fontSize: 11, color: '#888', marginBottom: 4 },
  weightStatVal: { fontSize: 22, fontWeight: '700', color: Colors.pine },
  weightDivider: { width: 1, height: 40, backgroundColor: '#eee' },
  emptyWeight: {
    backgroundColor: Colors.aloe + '15', borderRadius: 12,
    padding: 16, alignItems: 'center', borderWidth: 1,
    borderColor: Colors.aloe + '30', borderStyle: 'dashed',
  },
  emptyWeightText: { fontSize: 13, color: Colors.pine, textAlign: 'center', lineHeight: 20 },
  historySection: { marginBottom: 16 },
  historyCard: {
    backgroundColor: '#fff', borderRadius: 12, padding: 14,
    flexDirection: 'row', alignItems: 'center', marginBottom: 8,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
    opacity: 0.85,
  },
  historyLeft: { width: 56, alignItems: 'center' },
  historyImg: { width: 50, height: 50 },
  historyEmoji: { fontSize: 32 },
  historyInfo: { flex: 1, paddingHorizontal: 12 },
  historyProduct: { fontSize: 14, fontWeight: '700', color: Colors.pine },
  historyCode: { fontSize: 12, color: '#888', marginTop: 2, letterSpacing: 1 },
  historyDate: { fontSize: 11, color: '#aaa', marginTop: 2 },
  typeBadge: {
    marginTop: 4, backgroundColor: Colors.pine + '15',
    borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2, alignSelf: 'flex-start',
  },
  typeBadgeText: { fontSize: 10, color: Colors.pine, fontWeight: '700' },
  historySelectBtn: {
    backgroundColor: Colors.pine + '15', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 6,
  },
  historySelectText: { fontSize: 12, color: Colors.pine, fontWeight: '600' },
  emptyState: { alignItems: 'center', padding: 40 },
  emptyEmoji: { fontSize: 52, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: Colors.pine, marginBottom: 8 },
  emptyText: { fontSize: 14, color: '#888', textAlign: 'center', lineHeight: 22, marginBottom: 20 },
  activateBtn: { backgroundColor: Colors.pine, borderRadius: 12, paddingHorizontal: 28, paddingVertical: 14 },
  activateBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: '#fff', borderRadius: 24, padding: 24, paddingBottom: 40 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: Colors.pine, marginBottom: 4 },
  modalSub: { fontSize: 14, color: '#888', marginBottom: 16 },
  productRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 10,
    paddingHorizontal: 12, borderRadius: 10, marginBottom: 6,
    backgroundColor: '#f8f8f8',
  },
  productRowSelected: { backgroundColor: Colors.pine + '12', borderWidth: 1.5, borderColor: Colors.pine },
  productRowImg: { width: 44, height: 44, marginRight: 12 },
  productRowEmoji: { fontSize: 28, marginRight: 12, width: 44, textAlign: 'center' },
  productRowName: { flex: 1, fontSize: 14, color: '#444', fontWeight: '500' },
  checkMark: { fontSize: 16, color: Colors.pine, fontWeight: '700' },
  modalBtn: { backgroundColor: Colors.pine, borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 12 },
  modalBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  modalCancel: { alignItems: 'center', padding: 12 },
  modalCancelText: { color: '#888', fontSize: 14 },
  weightInput: {
    borderWidth: 1.5, borderColor: Colors.pine + '40', borderRadius: 12,
    padding: 16, fontSize: 24, fontWeight: '700', color: Colors.pine,
    textAlign: 'center', marginBottom: 8,
  },
})
