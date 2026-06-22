import { useCallback, useState } from 'react'
import {
  ActivityIndicator, ScrollView, Share, StyleSheet,
  Text, TouchableOpacity, View
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useFocusEffect, useRouter } from 'expo-router'
import { WebView } from 'react-native-webview'
import { Target, Droplets, CheckSquare, Utensils, Upload, Sparkles } from 'lucide-react-native'
import { Colors } from '../../src/constants'
import { supabase } from '../../src/lib/supabase'

const DIET_APP_URL = 'https://sohealthy-diet.vercel.app'

type DietPlan = {
  id: string
  order_code: string | null
  plan_content: {
    target_calories: number
    plan_text: string
  }
  generated_at: string
  is_active: boolean
}

export default function DietScreen() {
  const router = useRouter()
  const [state, setState] = useState<'loading' | 'saved' | 'webview' | 'empty'>('loading')
  const [plan, setPlan] = useState<DietPlan | null>(null)
  const [orderCode, setOrderCode] = useState('')
  const [webUrl, setWebUrl] = useState('')
  const [activeTab, setActiveTab] = useState(0)

  useFocusEffect(useCallback(() => { loadPlan() }, []))

  async function loadPlan() {
    setState('loading')
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setState('empty'); return }

      const { data: prof } = await supabase.from('profiles').select('order_code').eq('id', user.id).single()
      const code = prof?.order_code || ''
      setOrderCode(code)

      if (!code) { setState('empty'); return }

      // Query by order_code first (correct pattern)
      const { data: plansByCode } = await supabase
        .from('diet_plans').select('*')
        .eq('order_code', code)
        .order('generated_at', { ascending: false })
        .limit(1)

      // Fallback to user_id if nothing found
      const { data: plansByUser } = plansByCode?.length
        ? { data: null }
        : await supabase.from('diet_plans').select('*')
            .eq('user_id', user.id)
            .order('generated_at', { ascending: false })
            .limit(1)

      const found = plansByCode?.[0] || plansByUser?.[0]
      if (found?.plan_content?.plan_text) {
        setPlan(found)
        setState('saved')
      } else {
        setState('empty')
      }
    } catch (e) { setState('empty') }
  }

  async function handleShare() {
    if (!plan) return
    try {
      await Share.share({
        message: `Plani im i Dietes — SoHealthy\n\n${plan.plan_content.plan_text}`,
        title: 'Plani i Dietes — SoHealthy',
      })
    } catch (e) {}
  }

  function handleWebViewNavChange(navState: any) {
    if (navState.url === DIET_APP_URL + '/' || navState.url === DIET_APP_URL) loadPlan()
  }

  function parsePlan(text: string) {
    const lines = text.split('\n')
    const days: { title: string; lines: string[] }[] = []
    const header: string[] = []
    let currentDay: { title: string; lines: string[] } | null = null
    for (const line of lines) {
      if (line.match(/^[\u2550=]+\s*DIT[\u00cb\u00ebEeAa]\s*\d+/i) || line.match(/^[\u2550=]+\s*DAY\s*\d+/i)) {
        if (currentDay) days.push(currentDay)
        currentDay = { title: line.replace(/[\u2550=]/g, '').trim(), lines: [] }
      } else if (currentDay) {
        currentDay.lines.push(line)
      } else {
        header.push(line)
      }
    }
    if (currentDay) days.push(currentDay)
    return { header, days }
  }

  // ── LOADING
  if (state === 'loading') return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}><Text style={s.backText}>\u2039 Kthehu</Text></TouchableOpacity>
        <View style={s.titleRow}><Utensils size={18} color={Colors.alabaster} strokeWidth={1.75} /><Text style={s.title}>Plani i Diet\u00ebs</Text></View>
      </View>
      <View style={s.center}>
        <ActivityIndicator size="large" color={Colors.pine} />
        <Text style={s.loadingText}>Duke ngarkuar planin tuaj...</Text>
      </View>
    </SafeAreaView>
  )

  // ── EMPTY
  if (state === 'empty') return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}><Text style={s.backText}>\u2039 Kthehu</Text></TouchableOpacity>
        <View style={s.titleRow}><Utensils size={18} color={Colors.alabaster} strokeWidth={1.75} /><Text style={s.title}>Plani i Diet\u00ebs</Text></View>
      </View>
      <View style={s.center}>
        <View style={s.emptyIconWrap}><Utensils size={40} color={Colors.pine} strokeWidth={1.5} /></View>
        <Text style={s.emptyTitle}>{orderCode ? 'Gjenero Plan\u00efn T\u00ebnd' : 'Plan nuk u gjet'}</Text>
        <Text style={s.emptyText}>
          {orderCode
            ? 'Plani i diet\u00ebs personalizohet bazuar n\u00eb informacionin tuaj \u2014 mosh\u00ebn, pesh\u00ebn, aktivitetin dhe produktet SoHealthy.'
            : 'Aktivizoni llogarin\u00eb tuaj premium p\u00ebr t\u00eb gjeneruar planin personal t\u00eb diet\u00ebs.'}
        </Text>
        {orderCode ? (
          <TouchableOpacity
            style={s.generateBtn}
            onPress={() => { setWebUrl(`${DIET_APP_URL}?code=${encodeURIComponent(orderCode)}`); setState('webview') }}
          >
            <Sparkles size={16} color={Colors.alabaster} strokeWidth={1.75} />
            <Text style={s.generateBtnText}>Gjenero Plan\u00efn Tim \u2192</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </SafeAreaView>
  )

  // ── WEBVIEW
  if (state === 'webview') return (
    <SafeAreaView style={[s.safe, { flex: 1 }]} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}><Text style={s.backText}>\u2039 Kthehu</Text></TouchableOpacity>
        <View style={s.titleRow}><Utensils size={18} color={Colors.alabaster} strokeWidth={1.75} /><Text style={s.title}>Gjenero Plan\u00efn</Text></View>
      </View>
      <WebView
        source={{ uri: webUrl }}
        style={{ flex: 1 }}
        javaScriptEnabled
        domStorageEnabled
        onNavigationStateChange={handleWebViewNavChange}
      />
    </SafeAreaView>
  )

  // ── SAVED PLAN
  const { header, days } = parsePlan(plan!.plan_content.plan_text)

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}><Text style={s.backText}>\u2039 Kthehu</Text></TouchableOpacity>
        <View style={s.titleRow}><Utensils size={18} color={Colors.alabaster} strokeWidth={1.75} /><Text style={s.title}>Plani i Diet\u00ebs</Text></View>
        <TouchableOpacity onPress={handleShare} style={s.shareBtn}>
          <Upload size={16} color={Colors.aloe} strokeWidth={1.75} /><Text style={s.shareText}>Nda</Text>
        </TouchableOpacity>
      </View>

      {plan!.plan_content.target_calories && (
        <View style={s.targetBar}>
          <Target size={14} color={Colors.pine} strokeWidth={2} />
          <Text style={s.targetText}>Q\u00ebllimi: <Text style={s.targetNum}>{plan!.plan_content.target_calories} kcal/dit\u00eb</Text></Text>
        </View>
      )}

      {days.length > 0 ? (
        <>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.tabsScroll} contentContainerStyle={s.tabs}>
            {days.map((d, i) => (
              <TouchableOpacity key={i} style={[s.tab, activeTab === i && s.tabActive]} onPress={() => setActiveTab(i)}>
                <Text style={[s.tabText, activeTab === i && s.tabTextActive]}>
                  {d.title.replace(/DIT[\u00cb\u00ebEeAa]\s*/i, 'D').replace(/DAY\s*/i, 'D')}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <ScrollView contentContainerStyle={s.scroll}>
            {activeTab === 0 && header.filter(l => l.trim()).map((line, i) => {
              const isHydration = line.startsWith('\uD83D\uDCA7') || line.toLowerCase().includes('hidrat')
              const isSection = line.startsWith('\u2705') || line.startsWith('\uD83D\uDCE6') || line.startsWith('\uD83D\uDCDD')
              return (
                <View key={i} style={[s.planLineWrap, isHydration && s.hydrationWrap, isSection && s.sectionWrap]}>
                  {isHydration && <Droplets size={14} color={Colors.pine} strokeWidth={2} style={{ marginRight: 6, marginTop: 2 }} />}
                  {isSection && !isHydration && <CheckSquare size={14} color={Colors.pine} strokeWidth={2} style={{ marginRight: 6, marginTop: 2 }} />}
                  <Text style={[s.planLine, isHydration && s.planHighlight, isSection && s.planSection]}>
                    {line.replace(/^[\uD83D\uDCA7\u2705\uD83D\uDCE6\uD83D\uDCDD]\s*/, '')}
                  </Text>
                </View>
              )
            })}
            {days[activeTab].lines.map((line, i) => {
              const isMealHeader = line.match(/^[\uD83C\uDF05\u2600\uFE0F\uD83C\uDF19\uD83C\uDF4E]/u)
              const isDayTotal = line.startsWith('\uD83D\uDCCA')
              return (
                <Text key={i} style={[
                  s.planLine,
                  isMealHeader && s.mealHeader,
                  isDayTotal && s.dayTotal,
                  line.trim() === '' && { height: 8 },
                ]}>{line}</Text>
              )
            })}
            <View style={{ height: 40 }} />
          </ScrollView>
        </>
      ) : (
        <ScrollView contentContainerStyle={s.scroll}>
          <Text style={s.rawText}>{plan!.plan_content.plan_text}</Text>
          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.alabaster },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: Colors.pine, gap: 12,
  },
  titleRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  backBtn: { padding: 4 },
  backText: { color: Colors.alabaster, fontSize: 17, fontWeight: '600' },
  title: { color: Colors.alabaster, fontSize: 18, fontWeight: '700' },
  shareBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, padding: 4 },
  shareText: { color: Colors.aloe, fontSize: 14, fontWeight: '600' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  loadingText: { marginTop: 16, color: Colors.pine, fontSize: 15 },
  emptyIconWrap: { width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.pine + '12', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: Colors.pine, marginBottom: 8 },
  emptyText: { fontSize: 14, color: '#666', textAlign: 'center', lineHeight: 22 },
  targetBar: {
    backgroundColor: Colors.pine + '12', paddingHorizontal: 16, paddingVertical: 10,
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderBottomWidth: 1, borderBottomColor: Colors.pine + '20',
  },
  targetText: { fontSize: 13, color: Colors.pine },
  targetNum: { fontWeight: '700' },
  tabsScroll: { maxHeight: 48, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
  tabs: { paddingHorizontal: 10, paddingVertical: 8, gap: 6, flexDirection: 'row', alignItems: 'center' },
  tab: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 16, backgroundColor: '#f0f0f0' },
  tabActive: { backgroundColor: Colors.pine },
  tabText: { fontSize: 12, fontWeight: '600', color: '#666' },
  tabTextActive: { color: '#fff' },
  scroll: { padding: 16 },
  planLineWrap: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 2 },
  hydrationWrap: { backgroundColor: Colors.pine + '08', borderRadius: 8, padding: 8, marginBottom: 8 },
  sectionWrap: { marginTop: 12, marginBottom: 6 },
  planLine: { fontSize: 14, color: '#444', lineHeight: 22, marginBottom: 2, flex: 1 },
  planHighlight: { fontSize: 14, color: Colors.pine, fontWeight: '600' },
  planSection: { fontSize: 14, fontWeight: '700', color: Colors.pine },
  mealHeader: {
    fontSize: 15, fontWeight: '700', color: Colors.pine,
    marginTop: 16, marginBottom: 4,
    backgroundColor: Colors.pine + '10',
    borderRadius: 8, padding: 8, overflow: 'hidden',
  },
  dayTotal: {
    fontSize: 13, fontWeight: '700', color: Colors.aloe,
    backgroundColor: Colors.aloe + '20', borderRadius: 8,
    padding: 8, marginTop: 12,
  },
  rawText: { fontSize: 14, color: '#444', lineHeight: 24, fontFamily: 'monospace' },
  generateBtn: {
    marginTop: 24, backgroundColor: Colors.pine,
    borderRadius: 14, paddingHorizontal: 32, paddingVertical: 16,
    flexDirection: 'row', alignItems: 'center', gap: 8,
  },
  generateBtnText: { color: Colors.alabaster, fontWeight: '700', fontSize: 16 },
})
