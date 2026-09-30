// Tetori Rozë — breast-health guide. Free for everyone (no premium, no order code),
// reachable logged in or out. All copy comes from src/content/tetoriRoze.ts.
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Alert, Animated, Linking, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View,
  type LayoutChangeEvent, type StyleProp, type TextStyle,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { ArrowLeft, Bell, Check, Share2 } from 'lucide-react-native'
import Svg, { Path } from 'react-native-svg'
import { ROZE } from '../src/constants'
import { TR, type AgeRange, type SectionId } from '../src/content/tetoriRoze'
import { supabase } from '../src/lib/supabase'
import {
  cancelMonthlyReminder, loadPlan, loadReminder, savePlan, setMonthlyReminder, shareGuide,
  type ReminderState,
} from '../src/lib/tetoriRoze'

const HEADING = ROZE.deep
const WHITE = '#FFFFFF'

// Renders `**bold**` segments from the content file.
function Rich({ text, style, bold }: { text: string; style?: StyleProp<TextStyle>; bold?: StyleProp<TextStyle> }) {
  const parts = text.split('**')
  return (
    <Text style={style}>
      {parts.map((p, i) => (i % 2 === 1 ? <Text key={i} style={[s.bold, bold]}>{p}</Text> : p))}
    </Text>
  )
}

function Ribbon() {
  // Single thin-line ribbon mark, guide header only.
  return (
    <Svg width={22} height={30} viewBox="0 0 22 30" fill="none">
      <Path
        d="M11 3C7.2 3 6.4 7 8 10.2L16.5 27M11 3c3.8 0 4.6 4 3 7.2L5.5 27"
        stroke={ROZE.soft}
        strokeWidth={1.4}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

export default function TetoriRozeScreen() {
  const router = useRouter()
  const params = useLocalSearchParams<{ section?: string }>()
  const scrollRef = useRef<ScrollView>(null)
  const offsets = useRef<Partial<Record<SectionId, number>>>({})
  const didInitialScroll = useRef(false)

  const [loggedIn, setLoggedIn] = useState<boolean | null>(null)
  const [age, setAge] = useState<AgeRange | null>(null)
  const [plan, setPlan] = useState<number[]>([])
  const [reminder, setReminder] = useState<ReminderState>(null)
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const toastAnim = useRef(new Animated.Value(0)).current

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setLoggedIn(!!session)).catch(() => setLoggedIn(false))
    loadPlan().then(setPlan)
    loadReminder().then(setReminder)
  }, [])

  const showToast = useCallback((msg: string) => {
    setToast(msg)
    Animated.sequence([
      Animated.timing(toastAnim, { toValue: 1, duration: 180, useNativeDriver: Platform.OS !== 'web' }),
      Animated.delay(1800),
      Animated.timing(toastAnim, { toValue: 0, duration: 220, useNativeDriver: Platform.OS !== 'web' }),
    ]).start(() => setToast(null))
  }, [toastAnim])

  const scrollTo = useCallback((id: SectionId, animated = true) => {
    const y = offsets.current[id]
    if (y !== undefined) scrollRef.current?.scrollTo({ y: Math.max(0, y - 8), animated })
  }, [])

  const onSectionLayout = (id: SectionId) => (e: LayoutChangeEvent) => {
    offsets.current[id] = e.nativeEvent.layout.y
    // Deep link (e.g. from the monthly reminder): /tetori-roze?section=njihe
    if (!didInitialScroll.current && params.section === id) {
      didInitialScroll.current = true
      setTimeout(() => scrollTo(id), 250)
    }
  }

  function goBack() {
    if (router.canGoBack()) router.back()
    else router.replace(loggedIn ? '/(app)/(tabs)' : '/(auth)/splash')
  }

  async function togglePlan(week: number) {
    const next = plan.includes(week) ? plan.filter((w) => w !== week) : [...plan, week].sort()
    setPlan(next)
    await savePlan(next)
  }

  async function onRemind() {
    if (busy) return
    setBusy(true)
    const r = await setMonthlyReminder()
    setBusy(false)
    if (r === 'scheduled') setReminder({ method: 'push' })
    else if (r === 'ics') setReminder({ method: 'ics' })
    else if (r === 'denied') {
      Alert.alert(
        'Njoftimet janë të çaktivizuara',
        'Lejo njoftimet për SoHealthy te Cilësimet e telefonit dhe provo përsëri.',
        [{ text: 'Anulo', style: 'cancel' }, { text: 'Hap Cilësimet', onPress: () => Linking.openSettings() }],
      )
    } else {
      Alert.alert('Gabim', 'Kujtesa nuk mund të vendoset tani. Provo përsëri.')
    }
  }

  async function onRemoveReminder() {
    await cancelMonthlyReminder()
    setReminder(null)
  }

  async function onShare() {
    const r = await shareGuide()
    if (r === 'copied') showToast(TR.ui.copied)
  }

  const done = plan.length
  const remindLabel = Platform.OS === 'web' ? TR.ui.addCalendar : TR.ui.remind

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      {/* Top bar */}
      <View style={s.topBar}>
        <TouchableOpacity onPress={goBack} style={s.backBtn} hitSlop={12} accessibilityLabel="Kthehu">
          <ArrowLeft size={22} color={WHITE} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={s.topTitle}>Tetori Rozë</Text>
        <View style={{ width: 30 }} />
      </View>

      <ScrollView ref={scrollRef} contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* 1. Hero */}
        <View style={s.hero}>
          <View style={s.heroTop}>
            <Ribbon />
            <Text style={s.eyebrow}>{TR.hero.eyebrow}</Text>
          </View>
          <Text style={s.heroTitle}>{TR.hero.title}</Text>
          <Text style={s.heroMeta}>{TR.hero.meta}</Text>
        </View>

        {/* 2. Section index */}
        <View style={s.chips}>
          {TR.index.map((c) => (
            <TouchableOpacity key={c.id} style={s.chip} onPress={() => scrollTo(c.id)}>
              <Text style={s.chipText}>{c.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* 3. Hyrje */}
        <View style={s.section} onLayout={onSectionLayout('hyrje')}>
          {TR.hyrje.paragraphs
            .filter((p) => p !== TR.hero.title) // the first line is already the hero title
            .map((p, i) => <Rich key={i} text={p} style={s.body} />)}
        </View>

        {/* 4. Njihe trupin tënd */}
        <View style={s.section} onLayout={onSectionLayout('njihe')}>
          <Text style={s.h2}>{TR.njihe.title}</Text>
          <Rich text={TR.njihe.intro} style={s.body} />
          <Rich text={TR.njihe.when} style={s.body} />
          <Rich text={TR.njihe.stepsLabel} style={[s.body, { marginBottom: 10 }]} />
          {TR.njihe.steps.map((step, i) => (
            <View key={i} style={s.stepCard}>
              <View style={s.stepNum}><Text style={s.stepNumText}>{i + 1}</Text></View>
              <Rich text={step} style={[s.body, s.stepText]} />
            </View>
          ))}
          <Rich text={TR.njihe.shower} style={[s.body, { marginTop: 6 }]} />
          <View style={s.quote}><Rich text={TR.njihe.note} style={s.quoteText} /></View>

          {/* Reminder (Task E) */}
          {reminder ? (
            <View style={s.reminderSet}>
              <View style={[s.btn, s.btnDone]}>
                <Text style={[s.btnText, { color: ROZE.deep }]}>{TR.ui.remindSet}</Text>
              </View>
              <TouchableOpacity onPress={onRemoveReminder} hitSlop={8}>
                <Text style={s.link}>{TR.ui.remindRemove}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={[s.btn, busy && { opacity: 0.6 }]} onPress={onRemind} disabled={busy}>
              <Bell size={16} color={WHITE} strokeWidth={2} />
              <Text style={s.btnText}>{remindLabel}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* 5. Shenjat */}
        <View style={s.section} onLayout={onSectionLayout('shenjat')}>
          <Text style={s.h2}>{TR.shenjat.title}</Text>
          <Rich text={TR.shenjat.intro} style={s.body} />
          {TR.shenjat.items.map((it, i) => (
            <View key={i} style={s.bulletRow}>
              <View style={s.bullet} />
              <Text style={[s.body, s.bulletText]}>{it}</Text>
            </View>
          ))}
          <View style={s.noteBlock}><Rich text={TR.shenjat.note} style={s.noteText} /></View>
        </View>

        {/* 6. Kontrollet sipas moshës */}
        <View style={s.section} onLayout={onSectionLayout('kontrollet')}>
          <Text style={s.h2}>{TR.kontrollet.title}</Text>
          <Text style={[s.body, s.italic]}>{TR.kontrollet.intro}</Text>
          <View style={s.ageChips}>
            {TR.kontrollet.rows.map((r) => {
              const on = age === r.age
              return (
                <TouchableOpacity key={r.age} style={[s.ageChip, on && s.ageChipOn]} onPress={() => setAge(on ? null : r.age)}>
                  <Text style={[s.ageChipText, on && s.ageChipTextOn]}>{r.age}</Text>
                </TouchableOpacity>
              )
            })}
          </View>
          <View style={s.table}>
            <View style={[s.tr, s.thRow]}>
              <Text style={[s.tdAge, s.th]}>{TR.kontrollet.tableHead[0]}</Text>
              <Text style={[s.tdText, s.th]}>{TR.kontrollet.tableHead[1]}</Text>
            </View>
            {TR.kontrollet.rows.map((r, i) => {
              const on = age === r.age
              return (
                <View key={r.age} style={[s.tr, i > 0 && s.trBorder, on && s.trOn]}>
                  <Text style={[s.tdAge, s.bold]}>{r.age}</Text>
                  <Text style={[s.tdText, s.body, { marginBottom: 0 }]}>{r.text}</Text>
                </View>
              )
            })}
          </View>
          <Rich text={TR.kontrollet.highRiskIntro} style={[s.body, { marginTop: 16 }]} />
          {TR.kontrollet.highRisk.map((it, i) => (
            <View key={i} style={s.bulletRow}>
              <View style={s.bullet} />
              <Text style={[s.body, s.bulletText]}>{it}</Text>
            </View>
          ))}
          <View style={s.callout}><Rich text={TR.kontrollet.monthStep} style={s.calloutText} bold={{ color: ROZE.deep }} /></View>
        </View>

        {/* 7. Zakonet */}
        <View style={s.section} onLayout={onSectionLayout('zakonet')}>
          <Text style={s.h2}>{TR.zakonet.title}</Text>
          <Rich text={TR.zakonet.intro} style={s.body} />
          {TR.zakonet.habits.map((h, i) => (
            <View key={i} style={s.habitCard}>
              <Text style={[s.body, { marginBottom: 0 }]}>
                <Text style={[s.bold, { color: HEADING }]}>{h.title}</Text>
                {/* Titles ending in "." get a space; the two mid-sentence ones ("Gjidhënia", "Terapitë hormonale") carry their own punctuation. */}
                {h.text.startsWith(',') || h.text.startsWith(' ') ? h.text : ' ' + h.text}
              </Text>
            </View>
          ))}
        </View>

        {/* 8. Plani i tetorit */}
        <View style={s.section} onLayout={onSectionLayout('plani')}>
          <Text style={s.h2}>{TR.plani.title}</Text>
          <View style={s.progressRow}>
            <View style={s.progressTrack}><View style={[s.progressFill, { width: `${(done / 4) * 100}%` }]} /></View>
            <Text style={s.progressLabel}>{TR.plani.progress(done)}</Text>
          </View>
          {TR.plani.weeks.map((w) => {
            const on = plan.includes(w.week)
            return (
              <TouchableOpacity
                key={w.week}
                style={[s.planItem, on && s.planItemOn]}
                onPress={() => togglePlan(w.week)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: on }}
              >
                <View style={[s.checkbox, on && s.checkboxOn]}>{on && <Check size={14} color={WHITE} strokeWidth={3} />}</View>
                <View style={{ flex: 1 }}>
                  <Text style={s.weekLabel}>{TR.ui.weekLabel(w.week)}</Text>
                  <Text style={[s.body, { marginBottom: 0 }]}>{w.text}</Text>
                </View>
              </TouchableOpacity>
            )
          })}
          {done === 4 && (
            <View style={s.bravo}>
              <Text style={s.bravoText}>{TR.plani.complete}</Text>
            </View>
          )}
        </View>

        {/* 9. Share */}
        <View style={s.section}>
          <TouchableOpacity style={s.btn} onPress={onShare}>
            <Share2 size={16} color={WHITE} strokeWidth={2} />
            <Text style={s.btnText}>{TR.ui.share}</Text>
          </TouchableOpacity>
        </View>

        {/* Logged-out visitors: into the sign-up / login flow */}
        {loggedIn === false && (
          <View style={s.section}>
            <TouchableOpacity style={[s.btn, s.btnOutline]} onPress={() => router.replace('/(auth)/splash')}>
              <Text style={[s.btnText, { color: ROZE.deep }]}>{TR.ui.publicCta}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* 10. Shënim — always visible */}
        <View style={[s.section, s.shenim]} onLayout={onSectionLayout('shenim')}>
          <Text style={s.shenimTitle}>{TR.shenim.title}</Text>
          <Text style={s.shenimText}>{TR.shenim.text}</Text>
        </View>
        <View style={{ height: 40 }} />
      </ScrollView>

      {toast && (
        <Animated.View style={[s.toast, { opacity: toastAnim }]} pointerEvents="none">
          <Text style={s.toastText}>{toast}</Text>
        </Animated.View>
      )}
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: ROZE.deep },
  scroll: { backgroundColor: ROZE.bg, paddingBottom: 20, flexGrow: 1 },
  topBar: { backgroundColor: ROZE.deep, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10 },
  backBtn: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center' },
  topTitle: { color: WHITE, fontSize: 16, fontWeight: '700' },

  hero: { backgroundColor: ROZE.deep, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 28 },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  eyebrow: { color: WHITE, fontSize: 11, letterSpacing: 2.5, fontWeight: '700' },
  heroTitle: { color: WHITE, fontSize: 24, lineHeight: 31, fontWeight: '700' },
  heroMeta: { color: WHITE, fontSize: 13, marginTop: 10, opacity: 0.85 },

  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16, paddingTop: 16 },
  chip: { backgroundColor: ROZE.card, borderWidth: 1, borderColor: ROZE.soft, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7 },
  chipText: { color: ROZE.deep, fontSize: 12, fontWeight: '600' },

  section: { paddingHorizontal: 20, paddingTop: 22 },
  h2: { color: HEADING, fontSize: 19, lineHeight: 25, fontWeight: '700', marginBottom: 12 },
  body: { color: ROZE.text, fontSize: 15, lineHeight: 23, marginBottom: 12 },
  bold: { fontWeight: '700' },
  italic: { fontStyle: 'italic', color: ROZE.muted },

  stepCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, backgroundColor: ROZE.card, borderRadius: 14, borderWidth: 1, borderColor: ROZE.soft, padding: 14, marginBottom: 8 },
  stepNum: { width: 28, height: 28, borderRadius: 14, backgroundColor: ROZE.primary, alignItems: 'center', justifyContent: 'center' },
  stepNumText: { color: WHITE, fontWeight: '700', fontSize: 14 },
  stepText: { flex: 1, marginBottom: 0 },

  quote: { borderLeftWidth: 3, borderLeftColor: ROZE.primary, paddingLeft: 12, paddingVertical: 4, marginVertical: 8 },
  quoteText: { color: ROZE.deep, fontSize: 15, lineHeight: 23, fontWeight: '600' },

  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: ROZE.primary, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 16, marginTop: 12 },
  btnText: { color: WHITE, fontSize: 15, fontWeight: '700' },
  btnDone: { backgroundColor: ROZE.soft },
  btnOutline: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: ROZE.deep, marginTop: 0 },
  reminderSet: { alignItems: 'center', gap: 10 },
  link: { color: ROZE.primary, fontSize: 13, fontWeight: '600', textDecorationLine: 'underline' },

  bulletRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  bullet: { width: 6, height: 6, borderRadius: 3, backgroundColor: ROZE.primary, marginTop: 9 },
  bulletText: { flex: 1, marginBottom: 6 },
  noteBlock: { backgroundColor: ROZE.soft, borderRadius: 12, padding: 14, marginTop: 10 },
  noteText: { color: ROZE.deep, fontSize: 15, lineHeight: 23 },

  ageChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  ageChip: { borderWidth: 1.5, borderColor: ROZE.primary, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7, backgroundColor: ROZE.card },
  ageChipOn: { backgroundColor: ROZE.primary },
  ageChipText: { color: ROZE.primary, fontWeight: '700', fontSize: 13 },
  ageChipTextOn: { color: WHITE },

  table: { backgroundColor: ROZE.card, borderRadius: 14, borderWidth: 1, borderColor: ROZE.soft, overflow: 'hidden' },
  tr: { flexDirection: 'row', paddingVertical: 12, paddingRight: 12, paddingLeft: 12, borderLeftWidth: 4, borderLeftColor: 'transparent' },
  thRow: { backgroundColor: ROZE.bg },
  trBorder: { borderTopWidth: 1, borderTopColor: ROZE.soft },
  trOn: { backgroundColor: ROZE.soft, borderLeftColor: ROZE.deep },
  th: { color: ROZE.muted, fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },
  tdAge: { width: 60, color: ROZE.deep, fontSize: 14, lineHeight: 23 },
  tdText: { flex: 1 },

  callout: { backgroundColor: ROZE.card, borderRadius: 14, borderWidth: 1.5, borderColor: ROZE.primary, padding: 14, marginTop: 12 },
  calloutText: { color: ROZE.text, fontSize: 15, lineHeight: 23 },

  habitCard: { backgroundColor: ROZE.card, borderRadius: 12, borderWidth: 1, borderColor: ROZE.soft, padding: 12, marginBottom: 8 },

  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  progressTrack: { flex: 1, height: 8, borderRadius: 4, backgroundColor: ROZE.soft, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4, backgroundColor: ROZE.primary },
  progressLabel: { color: ROZE.muted, fontSize: 13, fontWeight: '600' },

  planItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, backgroundColor: ROZE.card, borderRadius: 14, borderWidth: 1, borderColor: ROZE.soft, padding: 14, marginBottom: 8 },
  planItemOn: { backgroundColor: ROZE.bg },
  checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: ROZE.primary, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  checkboxOn: { backgroundColor: ROZE.primary },
  weekLabel: { color: ROZE.deep, fontSize: 12, fontWeight: '700', letterSpacing: 0.5, marginBottom: 2 },

  bravo: { backgroundColor: ROZE.deep, borderRadius: 14, padding: 16, marginTop: 8 },
  bravoText: { color: WHITE, fontSize: 16, fontWeight: '700', textAlign: 'center' },

  shenim: { borderTopWidth: 1, borderTopColor: ROZE.soft, marginTop: 24, marginHorizontal: 20, paddingHorizontal: 0 },
  shenimTitle: { color: ROZE.muted, fontSize: 12, fontWeight: '700', marginBottom: 4 },
  shenimText: { color: ROZE.muted, fontSize: 12, lineHeight: 18 },

  toast: { position: 'absolute', bottom: 40, alignSelf: 'center', backgroundColor: ROZE.deep, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10 },
  toastText: { color: WHITE, fontSize: 13, fontWeight: '600' },
})
