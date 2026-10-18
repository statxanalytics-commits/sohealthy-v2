import { useCallback, useState } from 'react'
import { useRouter } from 'expo-router'
import { Image, Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import {
  BookOpen, CalendarCheck, Sparkles, Calculator,
  ScanLine, TrendingUp, Trophy, Package, Lock, ClipboardList, ArrowRight, Flame, UtensilsCrossed, MessageCircle, Lightbulb,
} from 'lucide-react-native'
import type { LucideIcon } from 'lucide-react-native'
import { API, Colors, IS_ROZE_THEME, LOGO, PRODUCT_IMAGES, ROZE, tint } from '../../../src/constants'
import { usePremium } from '../../../src/hooks/usePremium'
import { supabase } from '../../../src/lib/supabase'
import { useFocusEffect } from 'expo-router'
import * as WebBrowser from 'expo-web-browser'
import { ORDER_URL, isTetoriRozeLive } from '../../../src/campaigns/tetoriRoze'
import { TR } from '../../../src/content/tetoriRoze'
import { loadPlan } from '../../../src/lib/tetoriRoze'
import { DEFAULT_PACKAGE, DailyTip, MyPackage, fetchMyPackage, fetchTips, todaysTip } from '../../../src/lib/package'

// NOTE: the standalone "Gjej Sa Kg Humb" calculator card was merged INTO the quiz —
// the quiz now ends with the recommended package + expected kg result & benefits.
const FREE_TOOLS = [
  { id: 'quiz', Icon: Sparkles, name: 'Gjej Paketën Perfekte Për Ty', sub: 'Quiz · paketa jote + sa kg humb me të', url: API.quiz },
  { id: 'challenge', Icon: CalendarCheck, name: 'Challenge 30d', sub: 'Program falas', url: API.challenge },
  { id: 'bodyCalc', Icon: Calculator, name: 'Llogaritje Trupi', sub: 'BMI, TDEE, makro', url: API.bodyCalc },
  { id: 'metabolicAge', Icon: Flame, name: 'Mosha Metabolike', sub: 'Sa vjeç është metabolizmi yt?', url: API.metabolicAge },
  { id: 'dietPlan', Icon: UtensilsCrossed, name: 'Plan Diete Falas 7 Ditë', sub: '21 receta · listë blerjesh', url: API.dietPlan },
]

type PremiumTool = {
  id: string; Icon: LucideIcon; name: string; sub: string
  route: string; params?: Record<string, string>
}

const PREMIUM_TOOLS: PremiumTool[] = [
  { id: 'scanner', Icon: ScanLine, name: 'Skaner', sub: 'Skano ushqimet', route: '/(app)/scanner' },
  { id: 'tracker', Icon: TrendingUp, name: 'Tracker', sub: 'Gjurmo kalorite', route: '/(app)/tracker' },
  { id: 'progress', Icon: Trophy, name: 'Progresi', sub: 'Shiko rezultatet', route: '/(app)/progress' },
]

// Albanian day label: 1 ditë / N ditë
function daysLabel(n: number) {
  return n === 1 ? '1 ditë e mbetur' : `${n} ditë të mbetura`
}

// Title + subtitle of the Premium plan card for each package (7 → none, 14 → tips, 28 → diet; older orders → 14-day diet)
function planCardText(pkg: MyPackage): { title: string; sub: string } {
  if (pkg.deliverable === 'tips') return { title: 'Këshillat e Tua', sub: '14 këshilla personale · një çdo ditë' }
  if (pkg.deliverable === 'none') return { title: 'Plani i Dietës', sub: 'Shiko çfarë përfshin paketa 7-ditore' }
  if (pkg.deliverable === 'diet') return { title: 'Plani i Dietës', sub: `Plan ${pkg.diet_days || 14}-ditor personal` }
  if (pkg.model === 'new') return { title: 'Plani Yt Personal', sub: 'Plotëso pyetësorin e shkurtër' }
  return { title: 'Plani i Dietës', sub: 'Plan 14-ditor personal' }
}

export default function HomeScreen() {
  const router = useRouter()
  const { isPremium, daysRemaining, loading } = usePremium()
  const [userName, setUserName] = useState('')
  const [activeProduct, setActiveProduct] = useState<{ slug: string; code: string } | null>(null)
  const [trPlanDone, setTrPlanDone] = useState(0)
  const [pkg, setPkg] = useState<MyPackage>(DEFAULT_PACKAGE)
  const [tipToday, setTipToday] = useState<DailyTip | null>(null)
  // Tetori Rozë (1–31 Oct, Tirana): guide card first on Home + offer banner below it.
  // After 1 Nov both leave Home; the guide stays reachable from Profili.
  const tetoriLive = isTetoriRozeLive()

  useFocusEffect(useCallback(() => {
    loadUserData()
    loadPlan().then(p => setTrPlanDone(p.length))
  }, []))

  async function loadUserData() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: profile } = await supabase
        .from('profiles').select('name, order_code').eq('id', user.id).single()
      if (profile?.name) setUserName(profile.name.split(' ')[0])
      if (profile?.order_code) {
        const { data: sel } = await supabase
          .from('product_selections').select('product_slug')
          .eq('user_id', user.id).eq('order_code', profile.order_code)
          .eq('is_active', true).order('selected_at', { ascending: true }).limit(1).single()
        if (sel?.product_slug) setActiveProduct({ slug: sel.product_slug, code: profile.order_code })
        const p = await fetchMyPackage()
        setPkg(p)
        setTipToday(p.deliverable === 'tips' ? todaysTip(await fetchTips(profile.order_code)) : null)
      }

    } catch {}
  }

  function handlePremiumTool(tool: PremiumTool) {
    if (tool.params) router.push({ pathname: tool.route as any, params: tool.params })
    else router.push(tool.route as any)
  }

  const greeting = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Mirëmëngjes'
    if (h < 18) return 'Mirëdita'
    return 'Mirëmbrëma'
  }

  const showCountdown = isPremium && daysRemaining !== null
  const countdownUrgent = showCountdown && (daysRemaining as number) <= 5
  // Premium over: the plan / tips of the last package stay open; everything else locks until a new activation
  const packageEnded = !isPremium && !!pkg.order_code
  const planStaysOpen = packageEnded && pkg.has_plan && pkg.deliverable !== 'none'

  const tipCard = tipToday ? (
    <TouchableOpacity style={s.tipCard} onPress={() => router.push('/(app)/diet')}>
      <View style={s.tipCardHead}>
        <Lightbulb size={16} color={Colors.pine} strokeWidth={2} />
        <Text style={s.tipCardLabel}>KËSHILLA E DITËS · DITA {tipToday.day}</Text>
      </View>
      <Text style={s.tipCardTitle}>{tipToday.title}</Text>
      <Text style={s.tipCardBody} numberOfLines={3}>{tipToday.body}</Text>
      <Text style={s.tipCardMore}>Lexo më shumë →</Text>
    </TouchableOpacity>
  ) : null

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={s.header}>
          <View>
            <Text style={s.brandLabel}>SOHEALTHY</Text>
            <Text style={s.greeting}>{greeting()}{userName ? `, ${userName}` : ''}</Text>
          </View>
          <View style={s.avatar}>
            <Text style={s.avatarText}>{userName ? userName[0].toUpperCase() : 'S'}</Text>
          </View>
        </View>

        {/* Active package banner */}
        {isPremium && activeProduct && (
          <TouchableOpacity style={s.packageBanner} onPress={() => router.push('/(app)/(tabs)/products' as any)}>
            <View style={s.packageBannerLeft}>
              <Text style={s.packageBannerLabel}>PAKETA AKTIVE</Text>
              <Text style={s.packageBannerCode}>{activeProduct.code}</Text>
              {showCountdown && (
                <View style={[s.countdownPill, countdownUrgent && s.countdownPillUrgent]}>
                  <Text style={[s.countdownText, countdownUrgent && s.countdownTextUrgent]}>
                    {daysLabel(daysRemaining as number)}
                  </Text>
                </View>
              )}
            </View>
            {PRODUCT_IMAGES[activeProduct.slug]
              ? <Image source={{ uri: PRODUCT_IMAGES[activeProduct.slug] }} style={s.packageBannerImg} resizeMode="contain" />
              : <Package size={40} color={Colors.alabaster} strokeWidth={1.75} />
            }
          </TouchableOpacity>
        )}

        {/* Premium without a selected product yet — still show countdown */}
        {isPremium && !activeProduct && showCountdown && (
          <View style={s.countdownBanner}>
            <Text style={s.packageBannerLabel}>PAKETA AKTIVE</Text>
            <View style={[s.countdownPill, countdownUrgent && s.countdownPillUrgent, { marginTop: 6 }]}>
              <Text style={[s.countdownText, countdownUrgent && s.countdownTextUrgent]}>
                {daysLabel(daysRemaining as number)}
              </Text>
            </View>
          </View>
        )}

        {/* Tetori Rozë — guide card (first card on Home in October; free for everyone) */}
        {tetoriLive && (
          <>
            <TouchableOpacity style={s.trCard} activeOpacity={0.9} onPress={() => router.push('/tetori-roze?source=home_card' as any)}>
              <Text style={s.trEyebrow}>{TR.homeCard.eyebrow}</Text>
              <Text style={s.trTitle}>{TR.homeCard.title}</Text>
              <Text style={s.trSub}>{TR.homeCard.sub}</Text>
              <View style={s.trFooter}>
                <View style={s.trBtn}><Text style={s.trBtnText}>{TR.homeCard.cta}</Text></View>
                {trPlanDone > 0 && <Text style={s.trProgress}>{TR.plani.progress(trPlanDone)}</Text>}
              </View>
            </TouchableOpacity>

            {/* Offer banner — below the guide card, never inside the guide */}
            <View style={s.offerBanner}>
              <Text style={s.offerText}>{TR.offer.text}</Text>
              <TouchableOpacity style={s.offerBtn} onPress={() => Linking.openURL(ORDER_URL)}>
                <Text style={s.offerBtnText}>{TR.offer.cta}</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* Quiz Nutricional — featured free card */}
        <TouchableOpacity style={s.quizCard} onPress={() => router.push('/(app)/profili' as any)}>
          <View style={s.quizCardIcon}>
            <ClipboardList size={22} color={Colors.pine} strokeWidth={1.75} />
          </View>
          <View style={s.quizCardLeft}>
            <Text style={s.quizCardBadge}>FALAS</Text>
            <Text style={s.quizCardTitle}>Zbulo Profilin Tënd Nutricional</Text>
            <Text style={s.quizCardSub}>12 pyetje · 2 minuta · plan personal</Text>
          </View>
          <View style={s.quizCardArrow}>
            <ArrowRight size={16} color={Colors.pine} strokeWidth={2.5} />
          </View>
        </TouchableOpacity>

        {/* Free tools */}
        <Text style={s.sectionLabel}>MJETET FALAS</Text>
        <View style={s.freeGrid}>
          {FREE_TOOLS.map(tool => {
            const Icon = tool.Icon
            const isFeatured = tool.id === 'metabolicAge' || tool.id === 'dietPlan'
            const isMetabolic = tool.id === 'metabolicAge'
            const isDiet = tool.id === 'dietPlan'
            const isQuiz = tool.id === 'quiz' // full-width white row card (merged quiz + kg calculator)
            const isRow = isFeatured || isQuiz
            return (
              <TouchableOpacity
                key={tool.id}
                style={[
                  s.freeCard,
                  isFeatured && s.freeCardFeatured,
                  isDiet && s.freeCardDiet,
                  isQuiz && s.freeCardQuiz,
                ]}
                onPress={() => router.push({ pathname: '/(app)/webview', params: { url: tool.url, title: tool.name } })}
              >
                <View style={[
                  s.freeIconWrap,
                  isMetabolic && s.freeIconWrapFeatured,
                  isDiet && s.freeIconWrapDiet,
                  isQuiz && s.freeIconWrapQuiz,
                ]}>
                  <Icon
                    size={22}
                    color={isFeatured && !(isDiet && IS_ROZE_THEME) ? Colors.alabaster : Colors.pine}
                    strokeWidth={1.75}
                  />
                </View>
                <View style={isRow ? { flex: 1 } : undefined}>
                  <Text style={[s.freeName, isFeatured && s.freeNameFeatured, isQuiz && s.freeNameQuiz, isDiet && IS_ROZE_THEME && s.freeNameOnSoft]}>{tool.name}</Text>
                  <Text style={[s.freeSub, isFeatured && s.freeSubFeatured, isDiet && IS_ROZE_THEME && s.freeSubOnSoft]}>{tool.sub}</Text>
                </View>
                {isQuiz && (
                  <View style={s.freeQuizArrow}>
                    <ArrowRight size={16} color={Colors.pine} strokeWidth={2.5} />
                  </View>
                )}
              </TouchableOpacity>
            )
          })}
        </View>

        {/* Premium section */}
        {isPremium ? (
          <>
            <Text style={s.sectionLabel}>PREMIUM</Text>

            {/* Today's tip (14-day packages) */}
            {tipCard}

            {/* Diet Plan / Tips */}
            <TouchableOpacity style={s.dietCard} onPress={() => router.push('/(app)/diet')}>
              <View style={{ flex: 1 }}>
                <Text style={s.dietLabel}>PREMIUM</Text>
                <Text style={s.dietTitle}>{planCardText(pkg).title}</Text>
                <Text style={s.dietSub}>{planCardText(pkg).sub}</Text>
              </View>
              <View style={s.dietArrow}>
                <Text style={s.dietArrowText}>Hap →</Text>
              </View>
            </TouchableOpacity>

            {/* RESET Book — open in in-app browser (react-native-pdf incompatible with New Architecture) */}
            <TouchableOpacity
              style={s.bookCard}
              onPress={() => WebBrowser.openBrowserAsync(API.resetBook, { presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET, controlsColor: Colors.pine, toolbarColor: Colors.alabaster })}
            >
              <View style={s.bookCardLeft}>
                <Text style={s.bookLabel}>PREMIUM</Text>
                <View style={s.bookTitleRow}>
                  <BookOpen size={18} color={Colors.pine} strokeWidth={1.75} />
                  <Text style={s.bookTitle}>Libri RESET</Text>
                </View>
                <Text style={s.bookSub}>Udhëzuesi i shpejtë nga Pavli</Text>
              </View>
              <View style={s.bookArrow}>
                <Text style={s.bookArrowText}>Lexo →</Text>
              </View>
            </TouchableOpacity>

            {/* Pyet Nutricionistin */}
            <TouchableOpacity style={s.askCard} onPress={() => router.push('/(app)/pyetje' as any)}>
              <View style={s.quizCardIcon}>
                <MessageCircle size={22} color={Colors.pine} strokeWidth={1.75} />
              </View>
              <View style={s.quizCardLeft}>
                <Text style={[s.quizCardBadge, { color: Colors.goji }]}>PREMIUM</Text>
                <Text style={s.quizCardTitle}>Pyet Nutricionistin</Text>
                <Text style={s.quizCardSub}>Bëj pyetjen tënde direkt Pavlit</Text>
              </View>
              <View style={s.askCardArrow}>
                <ArrowRight size={16} color={Colors.white} strokeWidth={2.5} />
              </View>
            </TouchableOpacity>

            {/* Premium tools */}
            <View style={s.premiumRow}>
              {PREMIUM_TOOLS.map(tool => {
                const Icon = tool.Icon
                return (
                  <TouchableOpacity
                    key={tool.id}
                    style={s.premiumSmall}
                    onPress={() => handlePremiumTool(tool)}
                  >
                    <Icon size={22} color={Colors.pine} strokeWidth={1.75} style={s.premiumSmallIcon} />
                    <Text style={s.premiumSmallName}>{tool.name}</Text>
                    <Text style={s.premiumSmallSub}>{tool.sub}</Text>
                  </TouchableOpacity>
                )
              })}
            </View>
          </>
        ) : !loading ? (
          <>
            <Text style={s.sectionLabel}>PREMIUM</Text>
            {planStaysOpen ? (
              <>
                {/* Tips that started late keep coming after premium ends */}
                {tipCard}
                {/* Plan / tips of the last package stay open */}
                <TouchableOpacity style={[s.dietCard, { marginTop: tipCard ? 10 : 0, marginBottom: 8 }]} onPress={() => router.push('/(app)/diet')}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.dietLabel}>{pkg.deliverable === 'tips' ? 'MBETEN TË HAPURA' : 'MBETET I HAPUR'}</Text>
                    <Text style={s.dietTitle}>{planCardText(pkg).title}</Text>
                    <Text style={s.dietSub}>Nga paketa jote e fundit</Text>
                  </View>
                  <View style={s.dietArrow}>
                    <Text style={s.dietArrowText}>Hap →</Text>
                  </View>
                </TouchableOpacity>
              </>
            ) : (
              /* Locked premium tools */
              <TouchableOpacity style={s.lockedDiet} onPress={() => router.push('/(app)/activate')}>
                <View>
                  <Text style={s.lockedDietTitle}>Plani i Dietës</Text>
                  <Text style={s.lockedDietSub}>Këshilla ose plan diete personal, sipas paketës</Text>
                </View>
                <View style={s.lockIcon}>
                  <Lock size={18} color={Colors.pine} strokeWidth={1.75} />
                </View>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={s.lockedDiet} onPress={() => router.push('/(app)/activate')}>
              <View>
                <Text style={s.lockedDietTitle}>Pyet Nutricionistin</Text>
                <Text style={s.lockedDietSub}>Bëj pyetjen tënde direkt Pavlit</Text>
              </View>
              <View style={s.lockIcon}>
                <Lock size={18} color={Colors.pine} strokeWidth={1.75} />
              </View>
            </TouchableOpacity>
            <View style={s.lockedRow}>
              {[
                { Icon: ScanLine, name: 'Skaner' },
                { Icon: TrendingUp, name: 'Tracker' },
                { Icon: Trophy, name: 'Progresi' },
              ].map(t => {
                const Icon = t.Icon
                return (
                  <TouchableOpacity key={t.name} style={s.lockedSmall} onPress={() => router.push('/(app)/activate')}>
                    <Icon size={22} color={Colors.pine} strokeWidth={1.75} style={s.lockedSmallIcon} />
                    <Text style={s.lockedSmallName}>{t.name}</Text>
                    <Lock size={10} color={Colors.muted} strokeWidth={2} />
                  </TouchableOpacity>
                )
              })}
            </View>
            {/* Big activate CTA */}
            <TouchableOpacity style={s.bigActivateCard} onPress={() => router.push('/(app)/activate')}>
              <Text style={s.bigActivateTitle}>{packageEnded ? 'Paketa jote përfundoi' : 'Aktivizo Paketën Tende'}</Text>
              <Text style={s.bigActivateSub}>{packageEnded
                ? 'Kur të porosisësh sërish, aktivizo paketën e re me numrin e telefonit dhe Premium hapet përsëri.'
                : 'Vendos numrin e telefonit që përdore për porosinë për të aktivizuar Premium'}</Text>
              <View style={s.bigActivateBtn}>
                <Text style={s.bigActivateBtnText}>{packageEnded ? 'Aktivizo paketën e re →' : 'Aktivizo Tani →'}</Text>
              </View>
            </TouchableOpacity>
          </>
        ) : null}

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.alabaster },
  scroll: { paddingBottom: 20 },
  header: {
    backgroundColor: Colors.pine, paddingHorizontal: 20,
    paddingTop: 12, paddingBottom: 20,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  brandLabel: { fontSize: 11, letterSpacing: 2.5, color: Colors.aloe, fontWeight: '600', marginBottom: 4 },
  greeting: { fontSize: 20, fontWeight: '600', color: Colors.alabaster },
  avatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.aloe,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 16, fontWeight: '600', color: Colors.pine },
  packageBanner: {
    backgroundColor: Colors.pine, marginHorizontal: 16, marginTop: 12,
    borderRadius: 16, padding: 16,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  packageBannerLeft: {},
  packageBannerLabel: { fontSize: 9, letterSpacing: 2, color: Colors.aloe, fontWeight: '600', marginBottom: 4 },
  packageBannerCode: { fontSize: 17, color: Colors.alabaster, fontWeight: '600', letterSpacing: 0.5 },
  packageBannerImg: { width: 56, height: 56 },

  // Countdown pill (inside banner)
  countdownPill: {
    alignSelf: 'flex-start',
    backgroundColor: tint(Colors.aloe, 0.25),
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginTop: 8,
  },
  countdownPillUrgent: {
    backgroundColor: 'rgba(183,73,73,0.9)',
  },
  countdownText: { fontSize: 11, fontWeight: '700', color: Colors.alabaster, letterSpacing: 0.3 },
  countdownTextUrgent: { color: '#fff' },

  // Standalone countdown banner (premium but no product selected)
  countdownBanner: {
    backgroundColor: Colors.pine, marginHorizontal: 16, marginTop: 12,
    borderRadius: 16, padding: 16,
  },

  // Quiz card
  quizCard: {
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.aloe,
  },
  quizCardIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: tint(Colors.aloe, 0.15),
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  quizCardLeft: { flex: 1, marginRight: 10 },
  quizCardBadge: {
    alignSelf: 'flex-start',
    fontSize: 9,
    letterSpacing: 2,
    fontWeight: '700',
    color: Colors.aloeInk,
    marginBottom: 4,
  },
  quizCardTitle: { fontSize: 15, fontWeight: '700', color: Colors.pine, lineHeight: 20 },
  quizCardSub: { fontSize: 12, color: Colors.muted, marginTop: 3 },
  quizCardArrow: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.aloe,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Ask card (Pyet Nutricionistin)
  askCard: {
    marginHorizontal: 16, marginTop: 10, backgroundColor: '#fff', borderRadius: 16, padding: 16,
    flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: Colors.goji,
  },
  askCardArrow: {
    width: 34, height: 34, borderRadius: 17, backgroundColor: Colors.goji,
    alignItems: 'center', justifyContent: 'center',
  },

  dietCard: {
    backgroundColor: Colors.pine, marginHorizontal: 16, marginTop: 10,
    borderRadius: 16, padding: 16,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  dietLabel: { fontSize: 9, letterSpacing: 2, color: Colors.aloe, fontWeight: '600', marginBottom: 4 },
  dietTitle: { fontSize: 17, color: Colors.alabaster, fontWeight: '600' },
  dietSub: { fontSize: 12, color: tint(Colors.alabaster, 0.6), marginTop: 2 },
  dietArrow: { backgroundColor: Colors.aloe, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  dietArrowText: { fontSize: 13, fontWeight: '600', color: Colors.pine },

  tipCard: {
    backgroundColor: Colors.white, marginHorizontal: 16, marginTop: 10, borderRadius: 16, padding: 16,
    borderWidth: 1.5, borderColor: Colors.aloe,
  },
  tipCardHead: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  tipCardLabel: { fontSize: 10, letterSpacing: 1.5, color: Colors.pine, fontWeight: '700' },
  tipCardTitle: { fontSize: 16, color: Colors.pine, fontWeight: '700', marginBottom: 4 },
  tipCardBody: { fontSize: 13, color: '#444', lineHeight: 19 },
  tipCardMore: { fontSize: 12, color: Colors.aloeInk, fontWeight: '700', marginTop: 8 },

  // Tetori Rozë card + offer banner (Rozë palette via tokens in October)
  trCard: { backgroundColor: ROZE.deep, marginHorizontal: 16, marginTop: 12, borderRadius: 16, padding: 18 },
  trEyebrow: { fontSize: 10, letterSpacing: 2.5, color: '#FFFFFF', fontWeight: '700', marginBottom: 6 },
  trTitle: { fontSize: 20, color: '#FFFFFF', fontWeight: '700', marginBottom: 4 },
  trSub: { fontSize: 13, color: '#FFFFFF', opacity: 0.9, lineHeight: 19 },
  trFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14, gap: 10 },
  trBtn: { backgroundColor: '#FFFFFF', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 9 },
  trBtnText: { fontSize: 13, fontWeight: '700', color: ROZE.deep },
  trProgress: { fontSize: 12, fontWeight: '700', color: '#FFFFFF' },
  offerBanner: {
    backgroundColor: ROZE.card, borderWidth: 1, borderColor: ROZE.soft, borderRadius: 14,
    marginHorizontal: 16, marginTop: 10, padding: 14,
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  offerText: { flex: 1, fontSize: 13, lineHeight: 19, color: ROZE.text },
  offerBtn: { backgroundColor: ROZE.primary, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 9 },
  offerBtnText: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },

  bookCard: {
    backgroundColor: Colors.aloe, marginHorizontal: 16, marginTop: 10,
    borderRadius: 14, padding: 16,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 12,
  },
  bookCardLeft: { flex: 1 },
  bookLabel: { fontSize: 9, letterSpacing: 2, color: Colors.pine, fontWeight: '700', marginBottom: 4, opacity: 0.7 },
  bookTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  bookTitle: { fontSize: 17, color: Colors.pine, fontWeight: '700', marginBottom: 2 },
  bookSub: { fontSize: 12, color: Colors.pine, opacity: 0.7, marginTop: 2 },
  bookArrow: { backgroundColor: Colors.pine, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8, marginLeft: 12 },
  bookArrowText: { fontSize: 13, fontWeight: '600', color: Colors.alabaster },
  sectionLabel: {
    fontSize: 10, letterSpacing: 2, color: Colors.muted, fontWeight: '600',
    marginHorizontal: 16, marginTop: 20, marginBottom: 10,
  },
  freeGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, gap: 8 },
  freeCard: {
    width: '47%', backgroundColor: '#fff', borderRadius: 14, padding: 14,
    borderWidth: 0.5, borderColor: tint(Colors.pine, 0.1),
  },
  freeCardFeatured: { width: '100%', backgroundColor: Colors.pine, borderColor: Colors.pine, flexDirection: 'row', alignItems: 'center', gap: 14 },
  freeCardDiet: { backgroundColor: Colors.aloe, borderColor: Colors.aloe },
  // Merged quiz + kg-calculator card: full width, white, row layout
  freeCardQuiz: { width: '100%', flexDirection: 'row', alignItems: 'center', gap: 14 },
  freeIconWrapQuiz: { marginBottom: 0, flexShrink: 0 },
  freeNameQuiz: { fontSize: 15, fontWeight: '700' },
  freeQuizArrow: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: tint(Colors.aloe, 0.2),
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  freeIconWrap: { width: 40, height: 40, borderRadius: 10, backgroundColor: tint(Colors.aloe, 0.15), alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  freeIconWrapFeatured: { backgroundColor: Colors.goji, marginBottom: 0, flexShrink: 0 },
  freeIconWrapDiet: { backgroundColor: tint(Colors.pine, 0.2), marginBottom: 0, flexShrink: 0 },
  freeName: { fontSize: 13, fontWeight: '600', color: Colors.pine, lineHeight: 17, marginBottom: 2 },
  freeNameFeatured: { color: Colors.alabaster, fontSize: 15, fontWeight: '700' },
  freeSub: { fontSize: 11, color: Colors.muted },
  // October: the diet card's fill (aloe → roze.soft) is light, so its text switches to deep
  freeNameOnSoft: { color: Colors.pine },
  freeSubOnSoft: { color: Colors.pine, opacity: 0.8 },
  freeSubFeatured: { color: tint(Colors.alabaster, 0.65), fontSize: 12 },
  premiumRow: { flexDirection: 'row', paddingHorizontal: 12, gap: 8 },
  premiumSmall: {
    flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 12,
    alignItems: 'center', borderWidth: 0.5, borderColor: tint(Colors.pine, 0.1),
  },
  premiumSmallIcon: { marginBottom: 6 },
  premiumSmallName: { fontSize: 12, fontWeight: '600', color: Colors.pine },
  premiumSmallSub: { fontSize: 10, color: Colors.muted, marginTop: 2, textAlign: 'center' },
  activateCard: {
    backgroundColor: Colors.pine, marginHorizontal: 16,
    borderRadius: 14, padding: 16,
  },
  activateTitle: { fontSize: 16, fontWeight: '600', color: Colors.alabaster, marginBottom: 4 },
  activateSub: { fontSize: 13, color: tint(Colors.alabaster, 0.6) },
  // Locked premium styles
  lockedDiet: {
    backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 8,
    borderRadius: 14, padding: 16,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderWidth: 0.5, borderColor: tint(Colors.pine, 0.1),
    opacity: 0.75,
  },
  lockedDietTitle: { fontSize: 15, fontWeight: '600', color: Colors.pine, marginBottom: 2 },
  lockedDietSub: { fontSize: 11, color: Colors.muted },
  lockIcon: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.alabaster, alignItems: 'center', justifyContent: 'center',
  },
  lockedRow: { flexDirection: 'row', paddingHorizontal: 12, gap: 8, marginBottom: 12 },
  lockedSmall: {
    flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 12,
    alignItems: 'center', borderWidth: 0.5, borderColor: tint(Colors.pine, 0.1),
    opacity: 0.75,
  },
  lockedSmallIcon: { marginBottom: 4 },
  lockedSmallName: { fontSize: 12, fontWeight: '600', color: Colors.pine, marginBottom: 2 },
  // Big activate CTA card
  bigActivateCard: {
    backgroundColor: Colors.pine, marginHorizontal: 16, marginTop: 4,
    borderRadius: 16, padding: 20,
  },
  bigActivateTitle: { fontSize: 17, fontWeight: '700', color: Colors.alabaster, marginBottom: 6 },
  bigActivateSub: { fontSize: 12, color: tint(Colors.alabaster, 0.65), lineHeight: 17, marginBottom: 16 },
  bigActivateBtn: {
    backgroundColor: Colors.aloe, borderRadius: 10,
    paddingVertical: 10, paddingHorizontal: 20, alignSelf: 'flex-start',
  },
  bigActivateBtnText: { fontSize: 14, fontWeight: '600', color: Colors.pine },
})
