import { useCallback, useState } from 'react'
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useFocusEffect, useRouter } from 'expo-router'
import { Colors } from '../../src/constants'
import { supabase } from '../../src/lib/supabase'

type WeekData = {
  week: string
  avgCalories: number
  totalScans: number
  avgProtein: number
}

type WeightEntry = { date: string; weight: number }
type ScanDay = { date: string; calories: number; protein_g: number; rating: string }

const GOAL_CAL = 1500

export default function ProgressScreen() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [scans, setScans] = useState<ScanDay[]>([])
  const [weights, setWeights] = useState<WeightEntry[]>([])
  const [totalScans, setTotalScans] = useState(0)
  const [avgCalories, setAvgCalories] = useState(0)
  const [bestDay, setBestDay] = useState<ScanDay | null>(null)

  useFocusEffect(useCallback(() => {
    loadProgress()
  }, []))

  async function loadProgress() {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: scanData, count } = await supabase
        .from('scan_history')
        .select('calories, protein_g, carbs_g, fat_g, rating, scanned_at', { count: 'exact' })
        .eq('user_id', user.id)
        .order('scanned_at', { ascending: false })
        .limit(200)

      setTotalScans(count || 0)

      // Group by date
      const byDate: Record<string, ScanDay> = {}
      scanData?.forEach(row => {
        const date = row.scanned_at.slice(0, 10)
        if (!byDate[date]) byDate[date] = { date, calories: 0, protein_g: 0, rating: '' }
        byDate[date].calories += row.calories || 0
        byDate[date].protein_g += row.protein_g || 0
        byDate[date].rating = row.rating || ''
      })
      const days = Object.values(byDate).sort((a, b) => b.date.localeCompare(a.date))
      setScans(days.slice(0, 30))

      if (days.length > 0) {
        const avg = Math.round(days.reduce((s, d) => s + d.calories, 0) / days.length)
        setAvgCalories(avg)
        const best = [...days].sort((a, b) => {
          const scoreA = Math.abs(a.calories - GOAL_CAL)
          const scoreB = Math.abs(b.calories - GOAL_CAL)
          return scoreA - scoreB
        })[0]
        setBestDay(best)
      }

      // Weight
      const { data: weightData } = await supabase
        .from('tracker_entries')
        .select('date, product_slug')
        .eq('user_id', user.id)
        .ilike('product_slug', 'weight:%')
        .order('date', { ascending: true })
        .limit(30)

      const parsed: WeightEntry[] = (weightData || []).map(row => ({
        date: row.date,
        weight: parseFloat(row.product_slug.replace('weight:', ''))
      })).filter(w => !isNaN(w.weight))
      setWeights(parsed)
    } catch (e) {
      console.log('Progress load error:', e)
    } finally {
      setLoading(false)
    }
  }

  function formatDate(dateStr: string) {
    const d = new Date(dateStr + 'T00:00:00')
    return `${d.getDate()}/${d.getMonth() + 1}`
  }

  // Simple bar chart data — last 7 days
  const last7 = scans.slice(0, 7).reverse()
  const maxCal = Math.max(...last7.map(d => d.calories), GOAL_CAL)

  // Weight change
  const weightChange = weights.length >= 2 ? (weights[weights.length - 1].weight - weights[0].weight) : null

  // Rating stats
  const ratingCounts = scans.reduce((acc, s) => {
    if (s.rating) acc[s.rating] = (acc[s.rating] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Text style={s.backText}>‹ Kthehu</Text>
        </TouchableOpacity>
        <Text style={s.title}>🏆 Progresi</Text>
      </View>

      {loading ? (
        <View style={s.center}><ActivityIndicator size="large" color={Colors.pine} /></View>
      ) : (
        <ScrollView contentContainerStyle={s.scroll}>

          {/* Summary stats */}
          <View style={s.statsRow}>
            <View style={s.statCard}>
              <Text style={s.statNum}>{totalScans}</Text>
              <Text style={s.statLabel}>Skane gjithsej</Text>
            </View>
            <View style={s.statCard}>
              <Text style={s.statNum}>{avgCalories || '—'}</Text>
              <Text style={s.statLabel}>Kcal mesatare/ditë</Text>
            </View>
            <View style={[s.statCard, { borderColor: weightChange !== null ? (weightChange < 0 ? Colors.aloe : Colors.goji) : '#f0f0f0' }]}>
              <Text style={[s.statNum, { color: weightChange !== null && weightChange < 0 ? Colors.aloe : weightChange !== null && weightChange > 0 ? Colors.goji : Colors.pine }]}>
                {weightChange !== null ? `${weightChange > 0 ? '+' : ''}${weightChange.toFixed(1)}kg` : '—'}
              </Text>
              <Text style={s.statLabel}>Ndryshimi i Peshës</Text>
            </View>
          </View>

          {/* Calorie chart — last 7 days */}
          {last7.length > 0 && (
            <View style={s.chartCard}>
              <Text style={s.chartTitle}>📊 Kalorit — 7 Ditët e Fundit</Text>
              <View style={s.chart}>
                {last7.map((day, i) => {
                  const height = Math.max(4, (day.calories / maxCal) * 120)
                  const isToday = day.date === new Date().toISOString().slice(0, 10)
                  const color = day.calories > GOAL_CAL * 1.2 ? Colors.goji : day.calories > GOAL_CAL * 0.8 ? Colors.aloe : '#D58D3C'
                  return (
                    <View key={day.date} style={s.barCol}>
                      <Text style={s.barVal}>{day.calories > 0 ? day.calories : ''}</Text>
                      <View style={[s.bar, { height, backgroundColor: isToday ? Colors.pine : color }]} />
                      <Text style={[s.barDate, isToday && { color: Colors.pine, fontWeight: '700' }]}>{formatDate(day.date)}</Text>
                    </View>
                  )
                })}
                {/* Goal line indicator */}
              </View>
              <View style={s.goalLine}>
                <View style={s.goalLineDash} />
                <Text style={s.goalLineText}>Qëllimi: {GOAL_CAL} kcal</Text>
              </View>
            </View>
          )}

          {/* Weight chart */}
          {weights.length >= 2 && (
            <View style={s.chartCard}>
              <Text style={s.chartTitle}>⚖️ Pesha me Kalimin e Kohës</Text>
              <View style={s.weightChartRow}>
                {weights.slice(-10).map((w, i, arr) => {
                  const minW = Math.min(...arr.map(x => x.weight)) - 1
                  const maxW = Math.max(...arr.map(x => x.weight)) + 1
                  const height = Math.max(8, ((w.weight - minW) / (maxW - minW)) * 80 + 20)
                  const isLast = i === arr.length - 1
                  return (
                    <View key={w.date} style={s.wBarCol}>
                      <Text style={s.wBarVal}>{isLast || i === 0 ? w.weight : ''}</Text>
                      <View style={[s.wBar, { height, backgroundColor: isLast ? Colors.pine : Colors.aloe + '80' }]} />
                      <Text style={s.wBarDate}>{formatDate(w.date)}</Text>
                    </View>
                  )
                })}
              </View>
            </View>
          )}

          {/* Rating breakdown */}
          {Object.keys(ratingCounts).length > 0 && (
            <View style={s.ratingCard}>
              <Text style={s.chartTitle}>✅ Cilësia e Vakteve</Text>
              {[
                { key: 'E Shëndetshme', emoji: '✅', color: Colors.aloe },
                { key: 'Mesatare', emoji: '⚡', color: '#D58D3C' },
                { key: 'Duhet Përmirësuar', emoji: '⚠️', color: Colors.goji },
              ].map(({ key, emoji, color }) => {
                const count = ratingCounts[key] || 0
                const pct = scans.length > 0 ? Math.round((count / scans.length) * 100) : 0
                if (!count) return null
                return (
                  <View key={key} style={s.ratingRow}>
                    <Text style={s.ratingEmoji}>{emoji}</Text>
                    <View style={s.ratingBarWrap}>
                      <Text style={s.ratingKey}>{key}</Text>
                      <View style={s.ratingBarBg}>
                        <View style={[s.ratingBarFg, { width: `${pct}%` as any, backgroundColor: color }]} />
                      </View>
                    </View>
                    <Text style={[s.ratingPct, { color }]}>{pct}%</Text>
                  </View>
                )
              })}
            </View>
          )}

          {/* Best day */}
          {bestDay && (
            <View style={s.bestCard}>
              <Text style={s.bestTitle}>🌟 Dita Juaj Më e Mirë</Text>
              <Text style={s.bestDate}>{formatDate(bestDay.date)}</Text>
              <Text style={s.bestVal}>{bestDay.calories} kcal</Text>
              <Text style={s.bestSub}>Më afër qëllimit {GOAL_CAL} kcal</Text>
            </View>
          )}

          {totalScans === 0 && (
            <View style={s.emptyCard}>
              <Text style={s.emptyEmoji}>📷</Text>
              <Text style={s.emptyTitle}>Ende nuk keni të dhëna</Text>
              <Text style={s.emptyText}>Filloni të skanoni ushqimet tuaja për të parë progresin</Text>
              <TouchableOpacity style={s.emptyBtn} onPress={() => router.push('/(app)/scanner')}>
                <Text style={s.emptyBtnText}>Skano Tani →</Text>
              </TouchableOpacity>
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
  backBtn: { padding: 4 },
  backText: { color: Colors.alabaster, fontSize: 17, fontWeight: '600' },
  title: { color: Colors.alabaster, fontSize: 18, fontWeight: '700', flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { padding: 16 },
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  statCard: { flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: '#f0f0f0' },
  statNum: { fontSize: 22, fontWeight: '700', color: Colors.pine },
  statLabel: { fontSize: 10, color: '#888', textAlign: 'center', marginTop: 4 },
  chartCard: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 16 },
  chartTitle: { fontSize: 14, fontWeight: '700', color: Colors.pine, marginBottom: 16 },
  chart: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: 160, paddingBottom: 24 },
  barCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  barVal: { fontSize: 9, color: '#888', marginBottom: 3, textAlign: 'center' },
  bar: { width: '70%', borderRadius: 4, minHeight: 4 },
  barDate: { fontSize: 9, color: '#aaa', marginTop: 4 },
  goalLine: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  goalLineDash: { flex: 1, height: 1, borderWidth: 1, borderColor: Colors.pine + '40', borderStyle: 'dashed' },
  goalLineText: { fontSize: 11, color: Colors.pine + '80' },
  weightChartRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: 120, paddingBottom: 20 },
  wBarCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  wBarVal: { fontSize: 9, color: Colors.pine, fontWeight: '600', marginBottom: 2 },
  wBar: { width: '60%', borderRadius: 4, minHeight: 8 },
  wBarDate: { fontSize: 9, color: '#aaa', marginTop: 4 },
  ratingCard: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 16 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  ratingEmoji: { fontSize: 18, width: 24 },
  ratingBarWrap: { flex: 1 },
  ratingKey: { fontSize: 12, color: Colors.pine, marginBottom: 4 },
  ratingBarBg: { height: 6, backgroundColor: '#f0f0f0', borderRadius: 3, overflow: 'hidden' },
  ratingBarFg: { height: '100%', borderRadius: 3 },
  ratingPct: { fontSize: 13, fontWeight: '700', width: 36, textAlign: 'right' },
  bestCard: { backgroundColor: Colors.pine, borderRadius: 14, padding: 20, marginBottom: 16, alignItems: 'center' },
  bestTitle: { fontSize: 12, color: Colors.aloe, fontWeight: '700', marginBottom: 8 },
  bestDate: { fontSize: 14, color: 'rgba(255,255,255,0.7)', marginBottom: 4 },
  bestVal: { fontSize: 36, fontWeight: '700', color: '#fff' },
  bestSub: { fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 4 },
  emptyCard: { backgroundColor: '#fff', borderRadius: 16, padding: 32, alignItems: 'center' },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: Colors.pine, marginBottom: 8 },
  emptyText: { fontSize: 14, color: '#888', textAlign: 'center', lineHeight: 22, marginBottom: 20 },
  emptyBtn: { backgroundColor: Colors.pine, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12 },
  emptyBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
})
