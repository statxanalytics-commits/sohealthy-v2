import { useCallback, useState } from 'react'
import type { ReactNode } from 'react'
import {
  ActivityIndicator, Linking, ScrollView, Share, StyleSheet,
  Text, TouchableOpacity, View
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useFocusEffect, useRouter } from 'expo-router'
import { WebView } from 'react-native-webview'
import { Target, Droplets, CheckSquare, Utensils, Upload, Sparkles, Lightbulb, Lock } from 'lucide-react-native'
import { Colors } from '../../src/constants'
import { supabase } from '../../src/lib/supabase'
import { DEFAULT_PACKAGE, DailyTip, MyPackage, fetchMyPackage, fetchTips, localDate, markTipSeen, weekdayOf } from '../../src/lib/package'

const DIET_APP_URL = 'https://sohealthy-diet.vercel.app'
const SHOP_URL = 'https://sohealthy.al'

// Strip ALL emoji / pictographic / symbol characters from a line.
// The diet API sometimes emits emojis that don't render on-device (show as ◇/boxes),
// so we remove them entirely and rely on Lucide icons + styling instead.
function stripEmoji(input: string): string {
  return input
    .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2190}-\u{21FF}\u{2B00}-\u{2BFF}\u{FE00}-\u{FE0F}\u{1F1E6}-\u{1F1FF}\u{200D}\u{20E3}\u{2049}\u{203C}]/gu, '')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

type DietPlan = {
  id: string
  order_code: string | null
  plan_content: {
    kind?: 'diet' | 'tips'
    target_calories: number | null
    plan_text: string
    diet_days?: number
  }
  generated_at: string
  is_active: boolean
}

type ScreenState = 'loading' | 'saved' | 'tips' | 'locked7' | 'webview' | 'empty'

const SLOT_LABEL: Record<string, string> = { morning: 'Mëngjes', midday: 'Mesditë', evening: 'Mbrëmje' }

export default function DietScreen() {
  const router = useRouter()
  const [state, setState] = useState<ScreenState>('loading')
  const [plan, setPlan] = useState<DietPlan | null>(null)
  const [tips, setTips] = useState<DailyTip[]>([])
  const [pkg, setPkg] = useState<MyPackage>(DEFAULT_PACKAGE)
  const [orderCode, setOrderCode] = useState('')
  const [webUrl, setWebUrl] = useState('')
  const [activeTab, setActiveTab] = useState(0)

  useFocusEffect(useCallback(() => { loadPlan() }, []))

  async function loadPlan() {
    setState('loading')
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setState('empty'); return }
      const [{ data: prof }, p] = await Promise.all([
        supabase.from('profiles').select('order_code').eq('id', user.id).single(),
        fetchMyPackage(),
      ])
      setPkg(p)
      const code = prof?.order_code || ''
      setOrderCode(code)
      if (!code) { setState('empty'); return }

      // 7-day packages: no diet and no tips
      if (p.deliverable === 'none') { setState('locked7'); return }

      // 14-day packages: daily tips
      if (p.deliverable === 'tips') {
        const t = await fetchTips(code)
        if (t.length) { showTips(t); return }
        setState('empty'); return
      }

      const { data: plansByCode } = await supabase.from('diet_plans').select('*').eq('order_code', code).order('generated_at', { ascending: false }).limit(1)
      // Fallback only considers plans from BEFORE order codes existed (order_code IS NULL) —
      // prevents a stale plan from a previous activation leaking into a newly re-activated account.
      const { data: plansByUser } = plansByCode?.length ? { data: null } : await supabase.from('diet_plans').select('*').eq('user_id', user.id).is('order_code', null).order('generated_at', { ascending: false }).limit(1)
      const found = plansByCode?.[0] || plansByUser?.[0]
      if (found?.plan_content?.kind === 'tips') {
        const t = await fetchTips(code)
        if (t.length) { showTips(t); return }
      }
      if (found?.plan_content?.plan_text) { setPlan(found); setActiveTab(0); setState('saved') } else { setState('empty') }
    } catch (e) { setState('empty') }
  }

  function showTips(t: DailyTip[]) {
    setTips(t)
    setState('tips')
    const today = t.find(x => x.scheduled_date === localDate())
    if (today && !today.seen_at) markTipSeen(today.id)
  }

  async function openGenerator() {
    // The access token goes in the URL fragment (never sent to a server) so the generator knows who you are —
    // needed for the second person of a shared package.
    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token ? `#t=${encodeURIComponent(session.access_token)}` : ''
    setWebUrl(`${DIET_APP_URL}?code=${encodeURIComponent(orderCode)}${token}`)
    setState('webview')
  }

  async function handleShare() {
    if (!plan) return
    try { await Share.share({ message: `Plani im i Dietës — SoHealthy\n\n${plan.plan_content.plan_text}`, title: 'Plani i Dietës — SoHealthy' }) } catch (e) {}
  }

  function handleWebViewNavChange(navState: any) {
    if (navState.url === DIET_APP_URL + '/' || navState.url === DIET_APP_URL) loadPlan()
  }

  // The generator posts { type: 'sohealthy:plan_ready' } once the plan or tips are saved
  function handleWebViewMessage(e: any) {
    try {
      const msg = JSON.parse(e?.nativeEvent?.data || '{}')
      if (msg?.type === 'sohealthy:plan_ready') setTimeout(loadPlan, 1500)
    } catch {}
  }

  function parsePlan(text: string) {
    const lines = text.split('\n')
    const days: { title: string; lines: string[] }[] = []
    const header: string[] = []
    let currentDay: { title: string; lines: string[] } | null = null
    for (const line of lines) {
      if (line.match(/^[═=]+\s*DIT[ËëEeAa]\s*\d+/i) || line.match(/^[═=]+\s*DAY\s*\d+/i)) {
        if (currentDay) days.push(currentDay)
        currentDay = { title: line.replace(/[═=]/g, '').trim(), lines: [] }
      } else if (currentDay) { currentDay.lines.push(line) } else { header.push(line) }
    }
    if (currentDay) days.push(currentDay)
    return { header, days }
  }

  const isTipsPackage = pkg.deliverable === 'tips'
  const screenTitle = isTipsPackage ? 'Këshillat e Tua' : 'Plani i Dietës'
  const TitleIcon = isTipsPackage ? Lightbulb : Utensils

  const headerBar = (right?: ReactNode) => (
    <View style={s.header}>
      <TouchableOpacity onPress={() => router.back()} style={s.backBtn}><Text style={s.backText}>‹ Kthehu</Text></TouchableOpacity>
      <View style={s.titleRow}><TitleIcon size={18} color={Colors.alabaster} strokeWidth={1.75} /><Text style={s.title}>{screenTitle}</Text></View>
      {right}
    </View>
  )

  if (state === 'loading') return (
    <SafeAreaView style={s.safe}>
      {headerBar()}
      <View style={s.center}><ActivityIndicator size="large" color={Colors.pine} /><Text style={s.loadingText}>Duke ngarkuar...</Text></View>
    </SafeAreaView>
  )

  // ── 7-day package: what's included + the packages that include a plan ──
  if (state === 'locked7') return (
    <SafeAreaView style={s.safe}>
      {headerBar()}
      <ScrollView contentContainerStyle={s.lockedWrap}>
        <View style={s.emptyIconWrap}><Lock size={36} color={Colors.pine} strokeWidth={1.5} /></View>
        <Text style={s.emptyTitle}>Paketa jote 7-ditore</Text>
        <Text style={s.emptyText}>Paketa 7-ditore përfshin produktet SoHealthy dhe udhëzimet e përdorimit, por jo plan diete ose këshilla personale.</Text>
        <View style={s.upsellBox}>
          <Text style={s.upsellLine}><Text style={s.upsellStrong}>Paketa 14-ditore: </Text>14 këshilla personale, një çdo ditë në aplikacion.</Text>
          <Text style={s.upsellLine}><Text style={s.upsellStrong}>Paketa 28-ditore: </Text>plani yt personal i dietës për 28 ditë.</Text>
        </View>
        <TouchableOpacity style={s.generateBtn} onPress={() => Linking.openURL(SHOP_URL)}>
          <Text style={s.generateBtnText}>Shiko paketat 14 dhe 28-ditore</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  )

  if (state === 'empty') return (
    <SafeAreaView style={s.safe}>
      {headerBar()}
      <View style={s.center}>
        <View style={s.emptyIconWrap}><TitleIcon size={40} color={Colors.pine} strokeWidth={1.5} /></View>
        <Text style={s.emptyTitle}>{!orderCode ? 'Plan nuk u gjet' : isTipsPackage ? 'Këshillat e tua personale' : 'Gjenero Planin Tënd'}</Text>
        <Text style={s.emptyText}>{!orderCode
          ? 'Aktivizoni llogarinë tuaj premium për të gjeneruar planin personal të dietës.'
          : isTipsPackage
            ? 'Plotëso pyetësorin e shkurtër dhe merr 14 këshilla, një për çdo ditë, të përshtatura për ty dhe produktet e tua.'
            : `Plani i dietës${pkg.diet_days ? ` (${pkg.diet_days} ditë)` : ''} personalizohet bazuar në informacionin tuaj — moshën, peshën, aktivitetin dhe produktet SoHealthy.`}</Text>
        {orderCode ? (
          <TouchableOpacity style={s.generateBtn} onPress={openGenerator}>
            <Sparkles size={16} color={Colors.alabaster} strokeWidth={1.75} />
            <Text style={s.generateBtnText}>{isTipsPackage ? 'Plotëso pyetësorin →' : 'Gjenero Planin Tim →'}</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </SafeAreaView>
  )

  if (state === 'webview') return (
    <SafeAreaView style={[s.safe, { flex: 1 }]} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => loadPlan()} style={s.backBtn}><Text style={s.backText}>‹ Kthehu</Text></TouchableOpacity>
        <View style={s.titleRow}><TitleIcon size={18} color={Colors.alabaster} strokeWidth={1.75} /><Text style={s.title}>{isTipsPackage ? 'Pyetësori' : 'Gjenero Planin'}</Text></View>
      </View>
      <WebView source={{ uri: webUrl }} style={{ flex: 1 }} javaScriptEnabled domStorageEnabled onNavigationStateChange={handleWebViewNavChange} onMessage={handleWebViewMessage} />
    </SafeAreaView>
  )

  // ── 14-day package: one tip per day; future days unlock on their date ──
  if (state === 'tips') {
    const today = localDate()
    const dayNow = tips.filter(t => t.scheduled_date <= today).length
    return (
      <SafeAreaView style={s.safe} edges={['top']}>
        {headerBar()}
        <View style={s.targetBar}>
          <Lightbulb size={14} color={Colors.pine} strokeWidth={2} />
          <Text style={s.targetText}>{dayNow > 0 ? <>Dita <Text style={s.targetNum}>{Math.min(dayNow, 14)}</Text> nga 14 · një këshillë e re çdo ditë</> : 'Këshilla e parë hapet nesër'}</Text>
        </View>
        <ScrollView contentContainerStyle={s.scroll}>
          {tips.map(t => {
            const open = t.scheduled_date <= today
            const isToday = t.scheduled_date === today
            return open ? (
              <View key={t.id} style={[s.tipCard, isToday && s.tipCardToday]}>
                <Text style={[s.tipMeta, isToday && s.tipMetaToday]}>{isToday ? 'SOT' : `DITA ${t.day}`} · {weekdayOf(t.scheduled_date)} · {SLOT_LABEL[t.slot] || ''}</Text>
                <Text style={s.tipTitle}>{t.title}</Text>
                <Text style={s.tipBody}>{t.body}</Text>
                <Text style={s.tipDetail}>{t.detail}</Text>
              </View>
            ) : (
              <View key={t.id} style={s.tipLocked}>
                <Lock size={14} color={Colors.muted} strokeWidth={2} />
                <Text style={s.tipLockedText}>Dita {t.day} · hapet {weekdayOf(t.scheduled_date)}</Text>
              </View>
            )
          })}
          <Text style={s.disclaimer}>Këshillat janë të përgjithshme dhe shërbejnë vetëm për orientim. Nëse keni probleme shëndetësore, konsultohuni me mjekun tuaj.</Text>
          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    )
  }

  const { header, days } = parsePlan(plan!.plan_content.plan_text)

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      {headerBar(
        <TouchableOpacity onPress={handleShare} style={s.shareBtn}><Upload size={16} color={Colors.aloe} strokeWidth={1.75} /><Text style={s.shareText}>Nda</Text></TouchableOpacity>
      )}

      {plan!.plan_content.target_calories ? (
        <View style={s.targetBar}>
          <Target size={14} color={Colors.pine} strokeWidth={2} />
          <Text style={s.targetText}>Qëllimi: <Text style={s.targetNum}>{plan!.plan_content.target_calories} kcal/ditë</Text></Text>
        </View>
      ) : null}

      {days.length > 0 ? (
        <>
          <View style={s.tabsWrap}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.tabs}>
              {days.map((d, i) => (
                <TouchableOpacity key={i} style={[s.tab, activeTab === i && s.tabActive]} onPress={() => setActiveTab(i)}>
                  <Text style={[s.tabText, activeTab === i && s.tabTextActive]} numberOfLines={1}>
                    {stripEmoji(d.title).replace(/DIT[ËëEeAa]\s*/i, 'D').replace(/DAY\s*/i, 'D')}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
          <ScrollView contentContainerStyle={s.scroll}>
            {activeTab === 0 && header.filter(l => l.trim()).map((line, i) => {
              const lower = line.toLowerCase()
              const isHydration = lower.includes('hidrat')
              const isSection = /^[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(line) && !isHydration
              const clean = stripEmoji(line)
              if (!clean) return null
              return (
                <View key={i} style={[s.planLineWrap, isHydration && s.hydrationWrap, isSection && s.sectionWrap]}>
                  {isHydration && <Droplets size={14} color={Colors.pine} strokeWidth={2} style={{ marginRight: 6, marginTop: 2 }} />}
                  {isSection && !isHydration && <CheckSquare size={14} color={Colors.pine} strokeWidth={2} style={{ marginRight: 6, marginTop: 2 }} />}
                  <Text style={[s.planLine, isHydration && s.planHighlight, isSection && s.planSection]}>{clean}</Text>
                </View>
              )
            })}
            {(days[activeTab] || days[0]).lines.map((line, i) => {
              const isMealHeader = /^[\u{1F305}\u{2600}\u{1F319}\u{1F34E}\u{1F37D}]/u.test(line)
              const isDayTotal = /^[\u{1F4CA}]/u.test(line) || line.toLowerCase().startsWith('total')
              const clean = stripEmoji(line)
              if (line.trim() === '') return <View key={i} style={{ height: 8 }} />
              return (
                <Text key={i} style={[s.planLine, isMealHeader && s.mealHeader, isDayTotal && s.dayTotal]}>{clean}</Text>
              )
            })}
            <Text style={s.disclaimer}>Ky plan është i përgjithshëm dhe shërben vetëm për orientim. Konsultohuni me një mjek ose nutricionist para se të filloni një dietë të re, veçanërisht nëse keni probleme shëndetësore.</Text>
            <View style={{ height: 40 }} />
          </ScrollView>
        </>
      ) : (
        <ScrollView contentContainerStyle={s.scroll}>
          <Text style={s.rawText}>{stripEmoji(plan!.plan_content.plan_text)}</Text>
          <Text style={s.disclaimer}>Ky plan është i përgjithshëm dhe shërben vetëm për orientim. Konsultohuni me një mjek ose nutricionist para se të filloni një dietë të re, veçanërisht nëse keni probleme shëndetësore.</Text>
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
  shareBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, padding: 4 },
  shareText: { color: Colors.aloe, fontSize: 14, fontWeight: '600' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  lockedWrap: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  loadingText: { marginTop: 16, color: Colors.pine, fontSize: 15 },
  emptyIconWrap: { width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.pine + '12', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: Colors.pine, marginBottom: 8, textAlign: 'center' },
  emptyText: { fontSize: 14, color: '#666', textAlign: 'center', lineHeight: 22 },
  upsellBox: { backgroundColor: Colors.aloe + '22', borderRadius: 12, padding: 14, marginTop: 20, alignSelf: 'stretch', gap: 6 },
  upsellLine: { fontSize: 13, color: Colors.pine, lineHeight: 20 },
  upsellStrong: { fontWeight: '700' },
  targetBar: { backgroundColor: Colors.pine + '12', paddingHorizontal: 16, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 8, borderBottomWidth: 1, borderBottomColor: Colors.pine + '20' },
  targetText: { fontSize: 13, color: Colors.pine },
  targetNum: { fontWeight: '700' },
  tabsWrap: { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
  tabs: { paddingHorizontal: 10, paddingVertical: 10, gap: 6, flexDirection: 'row', alignItems: 'center' },
  tab: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 18, backgroundColor: '#f0f0f0', minWidth: 48, alignItems: 'center', justifyContent: 'center' },
  tabActive: { backgroundColor: Colors.pine },
  tabText: { fontSize: 13, fontWeight: '600', color: '#666', includeFontPadding: false },
  tabTextActive: { color: '#fff' },
  scroll: { padding: 16 },
  planLineWrap: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 2 },
  hydrationWrap: { backgroundColor: Colors.pine + '08', borderRadius: 8, padding: 8, marginBottom: 8 },
  sectionWrap: { marginTop: 12, marginBottom: 6 },
  planLine: { fontSize: 14, color: '#444', lineHeight: 22, marginBottom: 2, flex: 1 },
  planHighlight: { fontSize: 14, color: Colors.pine, fontWeight: '600' },
  planSection: { fontSize: 14, fontWeight: '700', color: Colors.pine },
  mealHeader: { fontSize: 15, fontWeight: '700', color: Colors.pine, marginTop: 16, marginBottom: 4, backgroundColor: Colors.pine + '10', borderRadius: 8, padding: 8, overflow: 'hidden' },
  dayTotal: { fontSize: 13, fontWeight: '700', color: Colors.aloe, backgroundColor: Colors.aloe + '20', borderRadius: 8, padding: 8, marginTop: 12 },
  rawText: { fontSize: 14, color: '#444', lineHeight: 24, fontFamily: 'monospace' },
  disclaimer: { fontSize: 11, color: '#999', textAlign: 'center', lineHeight: 16, marginTop: 20, paddingHorizontal: 8 },
  generateBtn: { marginTop: 24, backgroundColor: Colors.pine, borderRadius: 14, paddingHorizontal: 32, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', gap: 8 },
  generateBtnText: { color: Colors.alabaster, fontWeight: '700', fontSize: 16 },
  tipCard: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: '#eee' },
  tipCardToday: { borderColor: Colors.pine, borderWidth: 1.5 },
  tipMeta: { fontSize: 11, fontWeight: '700', color: Colors.muted, letterSpacing: 0.6, marginBottom: 6 },
  tipMetaToday: { color: Colors.pine },
  tipTitle: { fontSize: 16, fontWeight: '700', color: Colors.pine, marginBottom: 4 },
  tipBody: { fontSize: 14, color: '#333', lineHeight: 21, marginBottom: 8 },
  tipDetail: { fontSize: 14, color: '#555', lineHeight: 22 },
  tipLocked: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12, backgroundColor: '#f3f4f1', marginBottom: 8 },
  tipLockedText: { fontSize: 13, color: Colors.muted },
})
