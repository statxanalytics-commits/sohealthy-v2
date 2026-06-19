import { useCallback, useState } from 'react'
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useFocusEffect, useRouter } from 'expo-router'
import { Trophy, BarChart2, Scale, CheckSquare, Zap, ScanLine, Star } from 'lucide-react-native'
import { Colors } from '../../src/constants'
import { supabase } from '../../src/lib/supabase'

type WeightEntry = { date: string; weight: number }
type ScanDay = { date: string; calories: number; protein_g: number; rating: string }
const DEFAULT_goalCal = 1400

export default function ProgressScreen() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [scans, setScans] = useState<ScanDay[]>([])
  const [weights, setWeights] = useState<WeightEntry[]>([])
  const [totalScans, setTotalScans] = useState(0)
  const [avgCalories, setAvgCalories] = useState(0)
  const [bestDay, setBestDay] = useState<ScanDay | null>(null)
  const [goalCal, setGoalCal] = useState(DEFAULT_goalCal)

  useFocusEffect(useCallback(() => { loadProgress() }, []))

  async function loadProgress() {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: prof } = await supabase.from('profiles').select('order_code').eq('id', user.id).single()
      const code = prof?.order_code || ''
      const { data: plansByCode } = code ? await supabase.from('diet_plans').select('plan_content').eq('order_code', code).order('generated_at', { ascending: false }).limit(1) : { data: null }
      const { data: plansByUser } = plansByCode?.length ? { data: null } : await supabase.from('diet_plans').select('plan_content').eq('user_id', user.id).order('generated_at', { ascending: false }).limit(1)
      const dietPlan = plansByCode?.[0] || plansByUser?.[0]
      if (dietPlan?.plan_content?.target_calories) setGoalCal(dietPlan.plan_content.target_calories)
      const { data: scanData, count } = await supabase.from('scan_history').select('calories, protein_g, carbs_g, fat_g, rating, scanned_at', { count: 'exact' }).eq('user_id', user.id).order('scanned_at', { ascending: false }).limit(200)
      setTotalScans(count || 0)
      const byDate: Record<string, ScanDay> = {}
      scanData?.forEach(row => {
        const date = row.scanned_at.slice(0, 10)
        if (!byDate[date]) byDate[date] = { date, calories: 0, protein_g: 0, rating: '' }
        byDate[date].calories += row.calories || 0; byDate[date].protein_g += row.protein_g || 0; byDate[date].rating = row.rating || ''
      })
      const days = Object.values(byDate).sort((a, b) => b.date.localeCompare(a.date))
      setScans(days.slice(0, 30))
      if (days.length > 0) {
        setAvgCalories(Math.round(days.reduce((s, d) => s + d.calories, 0) / days.length))
        setBestDay([...days].sort((a, b) => Math.abs(a.calories - goalCal) - Math.abs(b.calories - goalCal))[0])
      }
      const { data: weightData } = await supabase.from('tracker_entries').select('date, product_slug').eq('user_id', user.id).ilike('product_slug', 'weight:%').order('date', { ascending: true }).limit(30)
      setWeights((weightData || []).map(row => ({ date: row.date, weight: parseFloat(row.product_slug.replace('weight:', '')) })).filter(w => !isNaN(w.weight)))
    } catch (e) { console.log('Progress load error:', e) } finally { setLoading(false) }
  }

  function formatDate(dateStr: string) {
    const d = new Date(dateStr + 'T00:00:00')
    return `${d.getDate()}/${d.getMonth() + 1}`
  }

  const last7 = scans.slice(0, 7).reverse()
  const maxCal = Math.max(...last7.map(d => d.calories), goalCal)
  const weightChange = weights.length >= 2 ? (weights[weights.length - 1].weight - weights[0].weight) : null
  const ratingCounts = scans.reduce((acc, s) => { if (s.rating) acc[s.rating] = (acc[s.rating] || 0) + 1; return acc }, {} as Record<string, number>)

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}><Text style={s.backText}>‹ Kthehu</Text></TouchableOpacity>
        <View style={s.titleRow}><Trophy size={18} color={Colors.alabaster} strokeWidth={1.75} /><Text style={s.title}>Progresi</Text></View>
      </View>
      {loading ? <View style={s.center}><ActivityIndicator size="large" color={Colors.pine} /></View> : (
        <ScrollView contentContainerStyle={s.scroll}>
          <View style={s.statsRow}>
            <View style={s.statCard}><Text style={s.statNum}>{totalScans}</Text><Text style={s.statLabel}>Skane gjithsej</Text></View>
            <View style={s.statCard}><Text style={s.statNum}>{avgCalories || '—'}</Text><Text style={s.statLabel}>Kcal mesatare/ditë</Text></View>
            <View style={[s.statCard, { borderColor: weightChange !== null ? (weightChange < 0 ? Colors.aloe : Colors.goji) : '#f0f0f0' }]}>
              <Text style={[s.statNum, { color: weightChange !== null && weightChange < 0 ? Colors.aloe : weightChange !== null && weightChange > 0 ? Colors.goji : Colors.pine }]}>
                {weightChange !== null ? `${weightChange > 0 ? '+' : ''}${weightChange.toFixed(1)}kg` : '—'}
              </Text>
              <Text style={s.statLabel}>Ndryshimi i Peshës</Text>
            </View>
          </View>

          {last7.length > 0 && (
            <View style={s.chartCard}>
              <View style={s.chartHeader}><BarChart2 size={16} color={Colors.pine} strokeWidth={1.75} /><Text style={s.chartTitle}>Kalorit — 7 Ditët e Fundit</Text></View>
              <View style={s.chart}>
                {last7.map((day) => {
                  const pct = Math.min(100, (day.calories / maxCal) * 100)
                  const barH = Math.max(4, (pct / 100) * 110)
                  const isToday = day.date === new Date().toISOString().slice(0, 10)
                  const barColor = isToday ? Colors.pine : day.calories > goalCal * 1.1 ? Colors.goji : Colors.aloe
                  return (
                    <View key={day.date} style={s.barCol}>
                      <Text style={s.barVal}>{day.calories > 0 ? day.calories : ''}</Text>
                      <View style={s.barTrack}><View style={[s.bar, { height: barH, backgroundColor: barColor }, isToday && s.barToday]} /></View>
                      <Text style={[s.barDate, isToday && s.barDateToday]}>{formatDate(day.date)}</Text>
                    </View>
                  )
                })}
              </View>
              <View style={s.goalRow}><View style={s.goalDash} /><Text style={s.goalText}>Qëllimi: {goalCal} kcal</Text></View>
            </View>
          )}

          {weights.length >= 2 && (
            <View style={s.chartCard}>
              <View style={s.chartHeader}><Scale size={16} color={Colors.pine} strokeWidth={1.75} /><Text style={s.chartTitle}>Pesha me Kalimin e Kohës</Text></View>
              <View style={s.weightChartRow}>
                {weights.slice(-10).map((w, i, arr) => {
                  const minW = Math.min(...arr.map(x => x.weight)) - 0.5
                  const maxW = Math.max(...arr.map(x => x.weight)) + 0.5
                  const barH = Math.max(12, ((w.weight - minW) / (maxW - minW || 1)) * 80 + 20)
                  const isLast = i === arr.length - 1
                  return (
                    <View key={w.date} style={s.wBarCol}>
                      <Text style={[s.wBarVal, isLast && { color: Colors.pine, fontWeight: '700' }]}>{(isLast || i === 0) ? w.weight : ''}</Text>
                      <View style={s.wBarTrack}><View style={[s.wBar, { height: barH, backgroundColor: isLast ? Colors.pine : Colors.aloe + '70' }, isLast && s.wBarLast]} /></View>
                      <Text style={[s.wBarDate, isLast && { color: Colors.pine, fontWeight: '600' }]}>{formatDate(w.date)}</Text>
                    </View>
                  )
                })}
              </View>
              {weightChange !== null && (
                <View style={[s.weightChangeBadge, { backgroundColor: weightChange < 0 ? Colors.aloe + '20' : Colors.goji + '20' }]}>
                  <Text style={[s.weightChangeText, { color: weightChange < 0 ? Colors.aloe : Colors.goji }]}>{weightChange < 0 ? '↓' : '↑'} {Math.abs(weightChange).toFixed(1)} kg total</Text>
                </View>
              )}
            </View>
          )}

          {Object.keys(ratingCounts).length > 0 && (
            <View style={s.ratingCard}>
              <View style={s.chartHeader}><CheckSquare size={16} color={Colors.pine} strokeWidth={1.75} /><Text style={s.chartTitle}>Cilësia e Vakteve</Text></View>
              {[
                { key: 'E Shëndetshme', Icon: CheckSquare, color: Colors.aloe },
                { key: 'Mesatare', Icon: Zap, color: '#D58D3C' },
                { key: 'Duhet Përmirësuar', Icon: Zap, color: Colors.goji },
              ].map(({ key, Icon, color }) => {
                const count = ratingCounts[key] || 0
                const pct = scans.length > 0 ? Math.round((count / scans.length) * 100) : 0
                if (!count) return null
                return (
                  <View key={key} style={s.ratingRow}>
                    <Icon size={16} color={color} strokeWidth={1.75} style={{ width: 22 }} />
                    <View style={s.ratingBarWrap}><Text style={s.ratingKey}>{key}</Text><View style={s.ratingBarBg}><View style={[s.ratingBarFg, { width: `${pct}%` as any, backgroundColor: color }]} /></View></View>
                    <Text style={[s.ratingPct, { color }]}>{pct}%</Text>
                  </View>
                )
              })}
            </View>
          )}

          {bestDay && (
            <View style={s.bestCard}>
              <View style={s.bestHeader}><Star size={14} color={Colors.aloe} strokeWidth={2} /><Text style={s.bestTitle}>Dita Juaj Më e Mirë</Text></View>
              <Text style={s.bestDate}>{formatDate(bestDay.date)}</Text>
              <Text style={s.bestVal}>{bestDay.calories} kcal</Text>
              <Text style={s.bestSub}>Më afër qëllimit {goalCal} kcal</Text>
            </View>
          )}

          {totalScans === 0 && (
            <View style={s.emptyCard}>
              <View style={s.emptyIconWrap}><ScanLine size={40} color={Colors.pine} strokeWidth={1.5} /></View>
              <Text style={s.emptyTitle}>Ende nuk keni të dhëna</Text>
              <Text style={s.emptyText}>Filloni të skanoni ushqimet tuaja për të parë progresin</Text>
              <TouchableOpacity style={s.emptyBtn} onPress={() => router.push('/(app)/scanner')}><Text style={s.emptyBtnText}>Skano Tani →</Text></TouchableOpacity>
            </View>
          )}
          <View style={{ height: 40 }} />
        </ScrollView>
      )}
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
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  statCard: { flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: '#f0f0f0' },
  statNum: { fontSize: 22, fontWeight: '700', color: Colors.pine }, statLabel: { fontSize: 10, color: '#888', textAlign: 'center', marginTop: 4 },
  chartCard: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 16 },
  chartHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  chartTitle: { fontSize: 14, fontWeight: '700', color: Colors.pine },
  chart: { flexDirection: 'row', alignItems: 'flex-end', height: 140, paddingBottom: 4 },
  barCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  barVal: { fontSize: 9, color: '#888', marginBottom: 4, textAlign: 'center' },
  barTrack: { width: '75%', alignItems: 'center', justifyContent: 'flex-end' },
  bar: { width: '100%', borderRadius: 6, minHeight: 4 },
  barToday: { shadowColor: Colors.pine, shadowOpacity: 0.3, shadowRadius: 4, elevation: 4 },
  barDate: { fontSize: 9, color: '#aaa', marginTop: 6, textAlign: 'center' },
  barDateToday: { color: Colors.pine, fontWeight: '700' },
  goalRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#f5f5f5' },
  goalDash: { flex: 1, height: 1, borderWidth: 1, borderColor: Colors.pine + '30', borderStyle: 'dashed' },
  goalText: { fontSize: 11, color: Colors.pine + '80' },
  weightChartRow: { flexDirection: 'row', alignItems: 'flex-end', height: 120, paddingBottom: 4 },
  wBarCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  wBarVal: { fontSize: 9, color: '#aaa', marginBottom: 4 },
  wBarTrack: { width: '65%', alignItems: 'center', justifyContent: 'flex-end' },
  wBar: { width: '100%', borderRadius: 6, minHeight: 8, backgroundColor: Colors.aloe + '70' },
  wBarLast: { shadowColor: Colors.pine, shadowOpacity: 0.25, shadowRadius: 4, elevation: 3 },
  wBarDate: { fontSize: 9, color: '#aaa', marginTop: 6, textAlign: 'center' },
  weightChangeBadge: { borderRadius: 8, padding: 10, alignItems: 'center', marginTop: 12 },
  weightChangeText: { fontSize: 13, fontWeight: '700' },
  ratingCard: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 16 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  ratingBarWrap: { flex: 1 }, ratingKey: { fontSize: 12, color: Colors.pine, marginBottom: 4 },
  ratingBarBg: { height: 6, backgroundColor: '#f0f0f0', borderRadius: 3, overflow: 'hidden' },
  ratingBarFg: { height: '100%', borderRadius: 3 },
  ratingPct: { fontSize: 13, fontWeight: '700', width: 36, textAlign: 'right' },
  bestCard: { backgroundColor: Colors.pine, borderRadius: 14, padding: 20, marginBottom: 16, alignItems: 'center' },
  bestHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  bestTitle: { fontSize: 12, color: Colors.aloe, fontWeight: '700' },
  bestDate: { fontSize: 14, color: 'rgba(255,255,255,0.7)', marginBottom: 4 },
  bestVal: { fontSize: 36, fontWeight: '700', color: '#fff' },
  bestSub: { fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 4 },
  emptyCard: { backgroundColor: '#fff', borderRadius: 16, padding: 32, alignItems: 'center' },
  emptyIconWrap: { width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.pine + '12', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: Colors.pine, marginBottom: 8 },
  emptyText: { fontSize: 14, color: '#888', textAlign: 'center', lineHeight: 22, marginBottom: 20 },
  emptyBtn: { backgroundColor: Colors.pine, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12 },
  emptyBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
})
