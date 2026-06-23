import { useCallback, useState } from 'react'
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useFocusEffect, useRouter } from 'expo-router'
import Svg, { Path, Circle, Line, Text as SvgText, Defs, LinearGradient, Stop } from 'react-native-svg'
import { Trophy, BarChart2, Scale, CheckSquare, Zap, ScanLine, Star } from 'lucide-react-native'
import { Colors } from '../../src/constants'
import { supabase } from '../../src/lib/supabase'

type WeightEntry = { date: string; weight: number }
type ScanDay = { date: string; calories: number; protein_g: number; rating: string }
const DEFAULT_goalCal = 1400

// --- SVG line chart for weight ---
function WeightLineChart({ data }: { data: WeightEntry[] }) {
  const W = 320
  const H = 130
  const PAD = { top: 20, right: 24, bottom: 28, left: 36 }
  const pts = data.slice(-10)
  if (pts.length < 2) return null

  const weights = pts.map(p => p.weight)
  const minW = Math.min(...weights)
  const maxW = Math.max(...weights)
  const range = maxW - minW || 1

  const chartW = W - PAD.left - PAD.right
  const chartH = H - PAD.top - PAD.bottom

  // Map data points to SVG coords
  const coords = pts.map((p, i) => ({
    x: PAD.left + (i / (pts.length - 1)) * chartW,
    y: PAD.top + (1 - (p.weight - minW) / range) * chartH,
    weight: p.weight,
    date: p.date,
  }))

  // Build smooth line path using cubic bezier
  const linePath = coords.reduce((path, pt, i) => {
    if (i === 0) return `M ${pt.x} ${pt.y}`
    const prev = coords[i - 1]
    const cpX = (prev.x + pt.x) / 2
    return `${path} C ${cpX} ${prev.y} ${cpX} ${pt.y} ${pt.x} ${pt.y}`
  }, '')

  // Build filled area path
  const areaPath = `${linePath} L ${coords[coords.length - 1].x} ${PAD.top + chartH} L ${coords[0].x} ${PAD.top + chartH} Z`

  const isDown = weights[weights.length - 1] <= weights[0]
  const lineColor = isDown ? Colors.aloe : Colors.goji
  const gradId = 'wGrad'

  function formatDate(dateStr: string) {
    const d = new Date(dateStr + 'T00:00:00')
    return `${d.getDate()}/${d.getMonth() + 1}`
  }

  // Show labels only at first, last, and midpoint
  const labelIdxs = new Set([0, Math.floor(pts.length / 2), pts.length - 1])

  return (
    <Svg width={W} height={H}>
      <Defs>
        <LinearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={lineColor} stopOpacity="0.18" />
          <Stop offset="1" stopColor={lineColor} stopOpacity="0.01" />
        </LinearGradient>
      </Defs>

      {/* Horizontal grid lines */}
      {[0, 0.5, 1].map((frac, i) => {
        const y = PAD.top + frac * chartH
        const val = (maxW - frac * range).toFixed(1)
        return (
          <React.Fragment key={i}>
            <Line
              x1={PAD.left} y1={y} x2={PAD.left + chartW} y2={y}
              stroke={Colors.pine} strokeOpacity={0.07} strokeWidth={1}
            />
            <SvgText
              x={PAD.left - 4} y={y + 4}
              fontSize={9} fill={Colors.muted} textAnchor="end"
            >{val}</SvgText>
          </React.Fragment>
        )
      })}

      {/* Filled area */}
      <Path d={areaPath} fill={`url(#${gradId})`} />

      {/* Line */}
      <Path d={linePath} stroke={lineColor} strokeWidth={2.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />

      {/* Dots + labels */}
      {coords.map((pt, i) => {
        const isFirst = i === 0
        const isLast = i === coords.length - 1
        const showLabel = labelIdxs.has(i)
        return (
          <React.Fragment key={i}>
            <Circle
              cx={pt.x} cy={pt.y}
              r={isLast ? 5 : 3.5}
              fill={isLast ? lineColor : '#fff'}
              stroke={lineColor}
              strokeWidth={isLast ? 0 : 2}
            />
            {showLabel && (
              <SvgText
                x={pt.x}
                y={pt.y - 10}
                fontSize={9}
                fill={isLast ? Colors.pine : Colors.muted}
                fontWeight={isLast ? '700' : '400'}
                textAnchor="middle"
              >{pt.weight} kg</SvgText>
            )}
            {showLabel && (
              <SvgText
                x={isFirst ? pt.x + 2 : isLast ? pt.x - 2 : pt.x}
                y={H - 4}
                fontSize={9}
                fill={isLast ? Colors.pine : Colors.muted}
                fontWeight={isLast ? '600' : '400'}
                textAnchor={isFirst ? 'start' : isLast ? 'end' : 'middle'}
              >{formatDate(pt.date)}</SvgText>
            )}
          </React.Fragment>
        )
      })}
    </Svg>
  )
}

// Need React for Fragment inside SVG component
import React from 'react'

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

      const { data: scanData, count } = await supabase
        .from('scan_history')
        .select('calories, protein_g, carbs_g, fat_g, rating, scanned_at', { count: 'exact' })
        .eq('user_id', user.id)
        .order('scanned_at', { ascending: false })
        .limit(200)
      setTotalScans(count || 0)

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

          {/* Calorie bar chart */}
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

          {/* Weight LINE chart */}
          {weights.length >= 2 && (
            <View style={s.chartCard}>
              <View style={s.chartHeader}>
                <Scale size={16} color={Colors.pine} strokeWidth={1.75} />
                <Text style={s.chartTitle}>Pesha me Kalimin e Kohës</Text>
              </View>
              <View style={s.lineChartWrap}>
                <WeightLineChart data={weights} />
              </View>
              {weightChange !== null && (
                <View style={[s.weightChangeBadge, { backgroundColor: weightChange < 0 ? Colors.aloe + '20' : Colors.goji + '20' }]}>
                  <Text style={[s.weightChangeText, { color: weightChange < 0 ? Colors.aloe : Colors.goji }]}>
                    {weightChange < 0 ? '↓' : '↑'} {Math.abs(weightChange).toFixed(1)} kg total
                  </Text>
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
                    <View style={s.ratingBarWrap}>
                      <Text style={s.ratingKey}>{key}</Text>
                      <View style={s.ratingBarBg}><View style={[s.ratingBarFg, { width: `${pct}%` as any, backgroundColor: color }]} /></View>
                    </View>
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
  backBtn: { padding: 4 },
  backText: { color: Colors.alabaster, fontSize: 17, fontWeight: '600' },
  title: { color: Colors.alabaster, fontSize: 18, fontWeight: '700' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { padding: 16 },
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  statCard: { flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: '#f0f0f0' },
  statNum: { fontSize: 22, fontWeight: '700', color: Colors.pine },
  statLabel: { fontSize: 10, color: '#888', textAlign: 'center', marginTop: 4 },
  chartCard: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 16 },
  chartHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  chartTitle: { fontSize: 14, fontWeight: '700', color: Colors.pine },
  // Calorie bar chart
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
  // Weight line chart
  lineChartWrap: { alignItems: 'center', marginBottom: 4 },
  weightChangeBadge: { borderRadius: 8, padding: 10, alignItems: 'center', marginTop: 8 },
  weightChangeText: { fontSize: 13, fontWeight: '700' },
  // Ratings
  ratingCard: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 16 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  ratingBarWrap: { flex: 1 },
  ratingKey: { fontSize: 12, color: Colors.pine, marginBottom: 4 },
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
