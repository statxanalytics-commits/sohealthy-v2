import { useCallback, useState } from 'react'
import { ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useFocusEffect, useRouter } from 'expo-router'
import { Scale, Flame, TrendingUp, Plus } from 'lucide-react-native'
import { Colors } from '../../src/constants'
import { supabase } from '../../src/lib/supabase'

type DayScan = { date: string; calories: number; protein_g: number; carbs_g: number; fat_g: number; count: number }
type WeightEntry = { id: string; date: string; weight: number }
const DEFAULT_GOAL = 1400

export default function TrackerScreen() {
  const router = useRouter()
  const [scans, setScans] = useState<DayScan[]>([])
  const [weights, setWeights] = useState<WeightEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [showWeightModal, setShowWeightModal] = useState(false)
  const [weightInput, setWeightInput] = useState('')
  const [savingWeight, setSavingWeight] = useState(false)
  const [goalCalories, setGoalCalories] = useState(DEFAULT_GOAL)

  useFocusEffect(useCallback(() => { loadData() }, []))

  async function loadData() {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: prof } = await supabase.from('profiles').select('order_code').eq('id', user.id).single()
      const code = prof?.order_code || ''
      const { data: plansByCode } = code ? await supabase.from('diet_plans').select('plan_content').eq('order_code', code).order('generated_at', { ascending: false }).limit(1) : { data: null }
      const { data: plansByUser } = plansByCode?.length ? { data: null } : await supabase.from('diet_plans').select('plan_content').eq('user_id', user.id).order('generated_at', { ascending: false }).limit(1)
      const dietPlan = plansByCode?.[0] || plansByUser?.[0]
      if (dietPlan?.plan_content?.target_calories) setGoalCalories(dietPlan.plan_content.target_calories)
      const { data: scanData } = await supabase.from('scan_history').select('calories, protein_g, carbs_g, fat_g, scanned_at').eq('user_id', user.id).order('scanned_at', { ascending: false }).limit(100)
      const byDate: Record<string, DayScan> = {}
      scanData?.forEach(row => {
        const date = row.scanned_at.slice(0, 10)
        if (!byDate[date]) byDate[date] = { date, calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, count: 0 }
        byDate[date].calories += row.calories || 0; byDate[date].protein_g += row.protein_g || 0
        byDate[date].carbs_g += row.carbs_g || 0; byDate[date].fat_g += row.fat_g || 0; byDate[date].count += 1
      })
      setScans(Object.values(byDate).slice(0, 14))
      const { data: weightData } = await supabase.from('tracker_entries').select('id, date, product_slug').eq('user_id', user.id).ilike('product_slug', 'weight:%').order('date', { ascending: false }).limit(30)
      const parsed: WeightEntry[] = (weightData || []).map(row => ({ id: row.id, date: row.date, weight: parseFloat(row.product_slug.replace('weight:', '')) })).filter(w => !isNaN(w.weight))
      setWeights(parsed)
    } catch (e) { console.log('Tracker load error:', e) } finally { setLoading(false) }
  }

  async function saveWeight() {
    const kg = parseFloat(weightInput.replace(',', '.'))
    if (isNaN(kg) || kg < 30 || kg > 300) { Alert.alert('Vlerë e pavlefshme', 'Fut peshën në kg (p.sh. 65.5)'); return }
    setSavingWeight(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const today = new Date().toISOString().slice(0, 10)
      const existing = weights.find(w => w.date === today)
      if (existing) { await supabase.from('tracker_entries').update({ product_slug: `weight:${kg}` }).eq('id', existing.id) }
      else { await supabase.from('tracker_entries').insert({ user_id: user.id, product_slug: `weight:${kg}`, date: today, checked: true }) }
      setShowWeightModal(false); setWeightInput(''); await loadData()
    } catch (e) { Alert.alert('Gabim', 'Nuk u ruajt pesha. Provo përsëri.') } finally { setSavingWeight(false) }
  }

  async function deleteWeight(id: string) {
    Alert.alert('Fshi Hyrjen', 'Jeni të sigurt?', [
      { text: 'Anulo', style: 'cancel' },
      { text: 'Fshi', style: 'destructive', onPress: async () => { await supabase.from('tracker_entries').delete().eq('id', id); await loadData() } }
    ])
  }

  const todayScan = scans.find(s => s.date === new Date().toISOString().slice(0, 10))
  const todayCalories = todayScan?.calories || 0
  const caloriePercent = Math.min(100, (todayCalories / goalCalories) * 100)
  const latestWeight = weights[0]

  function formatDate(dateStr: string) {
    const d = new Date(dateStr + 'T00:00:00')
    const days = ['Diel', 'Hënë', 'Martë', 'Mërkurë', 'Enjte', 'Premte', 'Shtunë']
    return `${days[d.getDay()]} ${d.getDate()}/${d.getMonth() + 1}`
  }

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}><Text style={s.backText}>‹ Kthehu</Text></TouchableOpacity>
        <View style={s.titleRow}><TrendingUp size={18} color={Colors.alabaster} strokeWidth={1.75} /><Text style={s.title}>Tracker</Text></View>
      </View>
      {loading ? <View style={s.center}><ActivityIndicator size="large" color={Colors.pine} /></View> : (
        <ScrollView contentContainerStyle={s.scroll}>
          <View style={s.todayCard}>
            <Text style={s.todayLabel}>SOT</Text>
            <Text style={s.todayCalories}>{todayCalories} <Text style={s.todayUnit}>kcal</Text></Text>
            <View style={s.progressBg}><View style={[s.progressFg, { width: `${caloriePercent}%` as any }]} /></View>
            <Text style={s.progressText}>{todayCalories} / {goalCalories} kcal — {Math.round(caloriePercent)}% e qëllimit</Text>
            {todayScan && (
              <View style={s.macroRow}>
                {[['P', todayScan.protein_g], ['K', todayScan.carbs_g], ['Y', todayScan.fat_g]].map(([l, v]) => (
                  <View key={l as string} style={s.macroBadge}><Text style={s.macroL}>{l}</Text><Text style={s.macroV}>{Math.round(v as number)}g</Text></View>
                ))}
              </View>
            )}
            {!todayScan && <Text style={s.noScanText}>Nuk keni skanuar asgjë sot ende</Text>}
          </View>

          <View style={s.section}>
            <View style={s.sectionHeader}>
              <View style={s.sectionTitleRow}><Scale size={16} color={Colors.pine} strokeWidth={1.75} /><Text style={s.sectionTitle}>Pesha</Text></View>
              <TouchableOpacity style={s.addBtn} onPress={() => setShowWeightModal(true)}>
                <Plus size={14} color='#fff' strokeWidth={2} /><Text style={s.addBtnText}>Shto</Text>
              </TouchableOpacity>
            </View>
            {latestWeight ? (
              <View style={s.weightCard}>
                <Text style={s.weightNum}>{latestWeight.weight} <Text style={s.weightUnit}>kg</Text></Text>
                <Text style={s.weightDate}>{formatDate(latestWeight.date)}</Text>
              </View>
            ) : <View style={s.emptyCard}><Text style={s.emptyText}>Ende nuk keni regjistruar peshën</Text></View>}
            {weights.length > 1 && (
              <View style={s.weightHistory}>
                {weights.slice(0, 7).map((w, i) => {
                  const prev = weights[i + 1]
                  const diff = prev ? (w.weight - prev.weight) : null
                  return (
                    <TouchableOpacity key={w.id} style={s.weightRow} onLongPress={() => deleteWeight(w.id)}>
                      <Text style={s.weightRowDate}>{formatDate(w.date)}</Text>
                      <View style={s.weightRowRight}>
                        {diff !== null && <Text style={[s.weightDiff, { color: diff < 0 ? Colors.aloe : Colors.goji }]}>{diff > 0 ? '+' : ''}{diff.toFixed(1)}kg</Text>}
                        <Text style={s.weightRowVal}>{w.weight} kg</Text>
                      </View>
                    </TouchableOpacity>
                  )
                })}
              </View>
            )}
          </View>

          <View style={s.section}>
            <View style={s.sectionTitleRow}><Flame size={16} color={Colors.pine} strokeWidth={1.75} /><Text style={s.sectionTitle}>Historia e Kalorive</Text></View>
            {scans.length === 0 ? <View style={s.emptyCard}><Text style={s.emptyText}>Skano ushqimet tuaja për të parë historikun</Text></View> : (
              scans.slice(0, 10).map(day => {
                const pct = Math.min(100, (day.calories / goalCalories) * 100)
                const isToday = day.date === new Date().toISOString().slice(0, 10)
                const barColor = pct > 100 ? Colors.goji : pct > 80 ? '#D58D3C' : Colors.aloe
                return (
                  <View key={day.date} style={[s.dayRow, isToday && s.dayRowToday]}>
                    <View style={s.dayLeft}><Text style={s.dayDate}>{isToday ? 'Sot' : formatDate(day.date)}</Text><Text style={s.daySubs}>{day.count} skane</Text></View>
                    <View style={s.dayRight}>
                      <Text style={s.dayKcal}>{day.calories} kcal</Text>
                      <View style={s.dayBarTrack}><View style={[s.dayBarFill, { width: `${pct}%` as any, backgroundColor: barColor }]} /></View>
                      <Text style={[s.dayPct, { color: barColor }]}>{Math.round(pct)}%</Text>
                    </View>
                  </View>
                )
              })
            )}
          </View>
          <View style={{ height: 40 }} />
        </ScrollView>
      )}
      <Modal visible={showWeightModal} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.modalOverlay}>
          <View style={s.modalSheet}>
            <Text style={s.modalTitle}>Regjistro Peshën</Text>
            <Text style={s.modalSub}>Fut peshën e sotme në kg</Text>
            <TextInput style={s.weightInput} value={weightInput} onChangeText={setWeightInput} placeholder="p.sh. 65.5" keyboardType="decimal-pad" autoFocus placeholderTextColor="#aaa" />
            <TouchableOpacity style={s.modalBtn} onPress={saveWeight} disabled={savingWeight}>
              {savingWeight ? <ActivityIndicator color="#fff" /> : <Text style={s.modalBtnText}>Ruaj</Text>}
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
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: Colors.pine, gap: 12 },
  titleRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  backBtn: { padding: 4 }, backText: { color: Colors.alabaster, fontSize: 17, fontWeight: '600' },
  title: { color: Colors.alabaster, fontSize: 18, fontWeight: '700' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { padding: 16 },
  todayCard: { backgroundColor: Colors.pine, borderRadius: 16, padding: 20, marginBottom: 16 },
  todayLabel: { fontSize: 10, letterSpacing: 2, color: Colors.aloe, fontWeight: '700', marginBottom: 8 },
  todayCalories: { fontSize: 48, fontWeight: '700', color: '#fff', marginBottom: 12 },
  todayUnit: { fontSize: 20, fontWeight: '400' },
  progressBg: { height: 8, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 4, overflow: 'hidden', marginBottom: 6 },
  progressFg: { height: '100%', backgroundColor: Colors.aloe, borderRadius: 4 },
  progressText: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginBottom: 14 },
  macroRow: { flexDirection: 'row', gap: 8 },
  macroBadge: { flex: 1, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 8, padding: 10, alignItems: 'center' },
  macroL: { fontSize: 10, color: Colors.aloe, marginBottom: 2 }, macroV: { fontSize: 16, fontWeight: '700', color: '#fff' },
  noScanText: { fontSize: 13, color: 'rgba(255,255,255,0.5)', textAlign: 'center', marginTop: 8 },
  section: { marginBottom: 20 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: Colors.pine },
  addBtn: { backgroundColor: Colors.pine, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6, flexDirection: 'row', alignItems: 'center', gap: 4 },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  weightCard: { backgroundColor: '#fff', borderRadius: 14, padding: 20, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  weightNum: { fontSize: 48, fontWeight: '700', color: Colors.pine }, weightUnit: { fontSize: 20, fontWeight: '400' },
  weightDate: { fontSize: 13, color: '#888', marginTop: 4 },
  weightHistory: { backgroundColor: '#fff', borderRadius: 12, marginTop: 10, overflow: 'hidden' },
  weightRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  weightRowDate: { fontSize: 13, color: '#666' },
  weightRowRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  weightDiff: { fontSize: 12, fontWeight: '600' }, weightRowVal: { fontSize: 14, fontWeight: '700', color: Colors.pine },
  emptyCard: { backgroundColor: '#fff', borderRadius: 12, padding: 20, alignItems: 'center' },
  emptyText: { fontSize: 13, color: '#aaa', textAlign: 'center' },
  dayRow: { backgroundColor: '#fff', borderRadius: 10, padding: 12, marginBottom: 8, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 4, elevation: 1 },
  dayRowToday: { borderLeftWidth: 3, borderLeftColor: Colors.aloe },
  dayLeft: { width: 90 }, dayDate: { fontSize: 13, fontWeight: '600', color: Colors.pine },
  daySubs: { fontSize: 11, color: '#aaa', marginTop: 2 },
  dayRight: { flex: 1, paddingLeft: 12 },
  dayKcal: { fontSize: 14, fontWeight: '700', color: Colors.pine, marginBottom: 4 },
  dayPct: { fontSize: 10, fontWeight: '600', marginTop: 2 },
  dayBarTrack: { height: 6, backgroundColor: '#f0f0f0', borderRadius: 3, overflow: 'hidden' },
  dayBarFill: { height: '100%', borderRadius: 3 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: '#fff', borderRadius: 24, padding: 28, paddingBottom: 40 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: Colors.pine, marginBottom: 4 },
  modalSub: { fontSize: 14, color: '#888', marginBottom: 20 },
  weightInput: { borderWidth: 1.5, borderColor: Colors.pine + '40', borderRadius: 12, padding: 16, fontSize: 24, fontWeight: '700', color: Colors.pine, textAlign: 'center', marginBottom: 16 },
  modalBtn: { backgroundColor: Colors.pine, borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 10 },
  modalBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  modalCancel: { alignItems: 'center', padding: 10 }, modalCancelText: { color: '#888', fontSize: 14 },
})
