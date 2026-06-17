import { useCallback, useState } from 'react'
import {
  ActivityIndicator, ScrollView, Share, StyleSheet,
  Text, TouchableOpacity, View
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useFocusEffect, useRouter } from 'expo-router'
import { WebView } from 'react-native-webview'
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
  const [activeTab, setActiveTab] = useState(0) // which day tab is active

  useFocusEffect(useCallback(() => {
    loadPlan()
  }, []))

  async function loadPlan() {
    setState('loading')
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('profiles')
        .select('order_code')
        .eq('id', user.id)
        .single()

      const code = profile?.order_code || ''
      setOrderCode(code)

      // Check if plan exists in Supabase
      const { data: plans } = await supabase
        .from('diet_plans')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('generated_at', { ascending: false })
        .limit(1)

      if (plans && plans.length > 0 && plans[0].plan_content?.plan_text) {
        setPlan(plans[0])
        setState('saved')
      } else if (code) {
        // No saved plan — open diet web app to generate
        setWebUrl(`${DIET_APP_URL}?code=${encodeURIComponent(code)}`)
        setState('webview')
      } else {
        setState('empty')
      }
    } catch (e) {
      setState('empty')
    }
  }

  async function handleShare() {
    if (!plan) return
    try {
      await Share.share({
        message: `🥗 Plani im i Dietës — SoHealthy\n\n${plan.plan_content.plan_text}`,
        title: 'Plani i Dietës — SoHealthy',
      })
    } catch (e) {}
  }

  function handleWebViewNavChange(navState: any) {
    // If diet was generated and we're back on the main page, reload to check Supabase
    if (navState.url === DIET_APP_URL + '/' || navState.url === DIET_APP_URL) {
      loadPlan()
    }
  }

  // Parse plan text into days
  function parsePlan(text: string) {
    const lines = text.split('\n')
    const days: { title: string; lines: string[] }[] = []
    const header: string[] = []
    let currentDay: { title: string; lines: string[] } | null = null

    for (const line of lines) {
      if (line.match(/^═+\s*DIT[Ëë]\s*\d+/i) || line.match(/^═+\s*DAY\s*\d+/i)) {
        if (currentDay) days.push(currentDay)
        currentDay = { title: line.replace(/═/g, '').trim(), lines: [] }
      } else if (currentDay) {
        currentDay.lines.push(line)
      } else {
        header.push(line)
      }
    }
    if (currentDay) days.push(currentDay)
    return { header, days }
  }

  // ── LOADING ──────────────────────────────────────────────────
  if (state === 'loading') {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <Text style={s.backText}>‹ Kthehu</Text>
          </TouchableOpacity>
          <Text style={s.title}>🥗 Plani i Dietës</Text>
        </View>
        <View style={s.center}>
          <ActivityIndicator size="large" color={Colors.pine} />
          <Text style={s.loadingText}>Duke ngarkuar planin tuaj...</Text>
        </View>
      </SafeAreaView>
    )
  }

  // ── EMPTY ────────────────────────────────────────────────────
  if (state === 'empty') {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <Text style={s.backText}>‹ Kthehu</Text>
          </TouchableOpacity>
          <Text style={s.title}>🥗 Plani i Dietës</Text>
        </View>
        <View style={s.center}>
          <Text style={s.emptyEmoji}>🥗</Text>
          <Text style={s.emptyTitle}>Plan nuk u gjet</Text>
          <Text style={s.emptyText}>Aktivizoni llogarinë tuaj premium për të gjeneruar planin personal të dietës.</Text>
        </View>
      </SafeAreaView>
    )
  }

  // ── WEBVIEW (generate new plan) ──────────────────────────────
  if (state === 'webview') {
    return (
      <SafeAreaView style={s.safe} edges={['top']}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <Text style={s.backText}>‹ Kthehu</Text>
          </TouchableOpacity>
          <Text style={s.title}>🥗 Gjenero Planin</Text>
        </View>
        <WebView
          source={{ uri: webUrl }}
          style={{ flex: 1 }}
          javaScriptEnabled
          domStorageEnabled
          onNavigationStateChange={handleWebViewNavChange}
          onLoadEnd={() => {
            // After load, check if plan was saved
            setTimeout(loadPlan, 3000)
          }}
        />
      </SafeAreaView>
    )
  }

  // ── SAVED PLAN — show in app ─────────────────────────────────
  const { header, days } = parsePlan(plan!.plan_content.plan_text)

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Text style={s.backText}>‹ Kthehu</Text>
        </TouchableOpacity>
        <Text style={s.title}>🥗 Plani i Dietës</Text>
        <TouchableOpacity onPress={handleShare} style={s.shareBtn}>
          <Text style={s.shareText}>⬆️ Nda</Text>
        </TouchableOpacity>
      </View>

      {/* Target calories bar */}
      {plan!.plan_content.target_calories && (
        <View style={s.targetBar}>
          <Text style={s.targetText}>
            🎯 Qëllimi: <Text style={s.targetNum}>{plan!.plan_content.target_calories} kcal/ditë</Text>
          </Text>
          <TouchableOpacity onPress={() => {
            setWebUrl(`${DIET_APP_URL}?code=${encodeURIComponent(orderCode)}`)
            setState('webview')
          }}>
            <Text style={s.regenText}>🔄 Rigjenero</Text>
          </TouchableOpacity>
        </View>
      )}

      {days.length > 0 ? (
        <>
          {/* Day tabs */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={s.tabsScroll}
            contentContainerStyle={s.tabs}
          >
            {days.map((d, i) => (
              <TouchableOpacity
                key={i}
                style={[s.tab, activeTab === i && s.tabActive]}
                onPress={() => setActiveTab(i)}
              >
                <Text style={[s.tabText, activeTab === i && s.tabTextActive]}>
                  {d.title.replace(/DITË\s*/i, 'D').replace(/DAY\s*/i, 'D')}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Day content */}
          <ScrollView contentContainerStyle={s.scroll}>
            {/* Header (hydration + habits) — only on day 1 */}
            {activeTab === 0 && header.filter(l => l.trim()).map((line, i) => (
              <Text key={i} style={[
                s.planLine,
                line.startsWith('💧') && s.planHighlight,
                line.startsWith('✅') && s.planSection,
                line.startsWith('📦') && s.planSection,
              ]}>{line}</Text>
            ))}

            {/* Day meals */}
            {days[activeTab].lines.map((line, i) => {
              const isMealHeader = line.match(/^[🌅☀️🌙🍎]/u)
              const isDayTotal = line.startsWith('📊')
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
        // No days parsed — show raw text
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
  backBtn: { padding: 4 },
  backText: { color: Colors.alabaster, fontSize: 17, fontWeight: '600' },
  title: { color: Colors.alabaster, fontSize: 18, fontWeight: '700', flex: 1 },
  shareBtn: { padding: 4 },
  shareText: { color: Colors.aloe, fontSize: 14, fontWeight: '600' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  loadingText: { marginTop: 16, color: Colors.pine, fontSize: 15 },
  emptyEmoji: { fontSize: 52, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: Colors.pine, marginBottom: 8 },
  emptyText: { fontSize: 14, color: '#666', textAlign: 'center', lineHeight: 22 },
  targetBar: {
    backgroundColor: Colors.pine + '15', paddingHorizontal: 16,
    paddingVertical: 10, flexDirection: 'row',
    justifyContent: 'space-between', alignItems: 'center',
    borderBottomWidth: 1, borderBottomColor: Colors.pine + '20',
  },
  targetText: { fontSize: 13, color: Colors.pine },
  targetNum: { fontWeight: '700' },
  regenText: { fontSize: 13, color: Colors.aloe, fontWeight: '600' },
  tabsScroll: { maxHeight: 48, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
  tabs: { paddingHorizontal: 10, paddingVertical: 8, gap: 6, flexDirection: 'row', alignItems: 'center' },
  tab: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 16, backgroundColor: '#f0f0f0' },
  tabActive: { backgroundColor: Colors.pine },
  tabText: { fontSize: 12, fontWeight: '600', color: '#666' },
  tabTextActive: { color: '#fff' },
  scroll: { padding: 16 },
  planLine: { fontSize: 14, color: '#444', lineHeight: 22, marginBottom: 2 },
  planHighlight: { fontSize: 14, color: Colors.pine, fontWeight: '600', marginBottom: 8, marginTop: 4 },
  planSection: { fontSize: 14, fontWeight: '700', color: Colors.pine, marginTop: 12, marginBottom: 6 },
  mealHeader: {
    fontSize: 15, fontWeight: '700', color: Colors.pine,
    marginTop: 16, marginBottom: 4,
    backgroundColor: Colors.pine + '10',
    borderRadius: 8, padding: 8,
    overflow: 'hidden',
  },
  dayTotal: {
    fontSize: 13, fontWeight: '700', color: Colors.aloe,
    backgroundColor: Colors.aloe + '20', borderRadius: 8,
    padding: 8, marginTop: 12,
  },
  rawText: { fontSize: 14, color: '#444', lineHeight: 24, fontFamily: 'monospace' },
})
