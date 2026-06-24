import { useCallback, useState } from 'react'
import { useRouter } from 'expo-router'
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import {
  BookOpen, CalendarCheck, Scale, Sparkles, Calculator,
  ScanLine, TrendingUp, Trophy, Package, Lock, ClipboardList, ArrowRight,
} from 'lucide-react-native'
import type { LucideIcon } from 'lucide-react-native'
import { API, Colors, LOGO, PRODUCT_IMAGES } from '../../../src/constants'
import { usePremium } from '../../../src/hooks/usePremium'
import { supabase } from '../../../src/lib/supabase'
import { useFocusEffect } from 'expo-router'
import * as WebBrowser from 'expo-web-browser'

const FREE_TOOLS = [
  { id: 'challenge', Icon: CalendarCheck, name: 'Challenge 30d', sub: 'Program falas', url: API.challenge },
  { id: 'calculator', Icon: Scale, name: 'Gjej Sa Kg Humb Me Paketat SoHealthy', sub: 'Kalkulator peshe', url: API.calculator },
  { id: 'quiz', Icon: Sparkles, name: 'Gjej Paketën Perfekte Për Ty Nga SoHealthy', sub: 'Quiz produktesh', url: API.quiz },
  { id: 'bodyCalc', Icon: Calculator, name: 'Llogaritje Trupi', sub: 'BMI, TDEE, makro', url: API.bodyCalc },
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

export default function HomeScreen() {
  const router = useRouter()
  const { isPremium, daysRemaining, loading } = usePremium()
  const [userName, setUserName] = useState('')
  const [activeProduct, setActiveProduct] = useState<{ slug: string; code: string } | null>(null)

  useFocusEffect(useCallback(() => {
    loadUserData()
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
            return (
              <TouchableOpacity
                key={tool.id}
                style={s.freeCard}
                onPress={() => router.push({ pathname: '/(app)/webview', params: { url: tool.url, title: tool.name } })}
              >
                <Icon size={24} color={Colors.pine} strokeWidth={1.75} style={s.freeIcon} />
                <Text style={s.freeName}>{tool.name}</Text>
                <Text style={s.freeSub}>{tool.sub}</Text>
              </TouchableOpacity>
            )
          })}
        </View>

        {/* Premium section */}
        {isPremium ? (
          <>
            <Text style={s.sectionLabel}>PREMIUM</Text>

            {/* Diet Plan */}
            <TouchableOpacity style={s.dietCard} onPress={() => router.push('/(app)/diet')}>
              <View>
                <Text style={s.dietLabel}>PREMIUM</Text>
                <Text style={s.dietTitle}>Plani i Dietes</Text>
                <Text style={s.dietSub}>Plan 14-ditor personal</Text>
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
            {/* Locked premium tools */}
            <TouchableOpacity style={s.lockedDiet} onPress={() => router.push('/(app)/activate')}>
              <View>
                <Text style={s.lockedDietTitle}>Plani i Dietes</Text>
                <Text style={s.lockedDietSub}>Plan 14-ditor personal</Text>
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
                    <Lock size={10} color="#6B7F72" strokeWidth={2} />
                  </TouchableOpacity>
                )
              })}
            </View>
            {/* Big activate CTA */}
            <TouchableOpacity style={s.bigActivateCard} onPress={() => router.push('/(app)/activate')}>
              <Text style={s.bigActivateTitle}>Aktivizo Paketën Tende</Text>
              <Text style={s.bigActivateSub}>Fut kodin e porosise per akses te plote ne te gjitha mjetet premium</Text>
              <View style={s.bigActivateBtn}>
                <Text style={s.bigActivateBtnText}>Aktivizo Tani →</Text>
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
  safe: { flex: 1, backgroundColor: '#ECEFE8' },
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
    backgroundColor: 'rgba(113,181,162,0.25)',
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
    backgroundColor: 'rgba(113,181,162,0.15)',
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
    color: Colors.aloe,
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

  dietCard: {
    backgroundColor: Colors.pine, marginHorizontal: 16, marginTop: 10,
    borderRadius: 16, padding: 16,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  dietLabel: { fontSize: 9, letterSpacing: 2, color: Colors.aloe, fontWeight: '600', marginBottom: 4 },
  dietTitle: { fontSize: 17, color: Colors.alabaster, fontWeight: '600' },
  dietSub: { fontSize: 12, color: 'rgba(236,239,232,0.6)', marginTop: 2 },
  dietArrow: { backgroundColor: Colors.aloe, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  dietArrowText: { fontSize: 13, fontWeight: '600', color: Colors.pine },
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
    fontSize: 10, letterSpacing: 2, color: '#6B7F72', fontWeight: '600',
    marginHorizontal: 16, marginTop: 20, marginBottom: 10,
  },
  freeGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, gap: 8 },
  freeCard: {
    width: '47%', backgroundColor: '#fff', borderRadius: 14, padding: 14,
    borderWidth: 0.5, borderColor: 'rgba(27,63,47,0.1)',
  },
  freeIcon: { marginBottom: 8 },
  freeName: { fontSize: 13, fontWeight: '600', color: Colors.pine, lineHeight: 17, marginBottom: 2 },
  freeSub: { fontSize: 11, color: '#6B7F72' },
  premiumRow: { flexDirection: 'row', paddingHorizontal: 12, gap: 8 },
  premiumSmall: {
    flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 12,
    alignItems: 'center', borderWidth: 0.5, borderColor: 'rgba(27,63,47,0.1)',
  },
  premiumSmallIcon: { marginBottom: 6 },
  premiumSmallName: { fontSize: 12, fontWeight: '600', color: Colors.pine },
  premiumSmallSub: { fontSize: 10, color: '#6B7F72', marginTop: 2, textAlign: 'center' },
  activateCard: {
    backgroundColor: Colors.pine, marginHorizontal: 16,
    borderRadius: 14, padding: 16,
  },
  activateTitle: { fontSize: 16, fontWeight: '600', color: Colors.alabaster, marginBottom: 4 },
  activateSub: { fontSize: 13, color: 'rgba(236,239,232,0.6)' },
  // Locked premium styles
  lockedDiet: {
    backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 8,
    borderRadius: 14, padding: 16,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderWidth: 0.5, borderColor: 'rgba(27,63,47,0.1)',
    opacity: 0.75,
  },
  lockedDietTitle: { fontSize: 15, fontWeight: '600', color: Colors.pine, marginBottom: 2 },
  lockedDietSub: { fontSize: 11, color: '#6B7F72' },
  lockIcon: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#ECEFE8', alignItems: 'center', justifyContent: 'center',
  },
  lockedRow: { flexDirection: 'row', paddingHorizontal: 12, gap: 8, marginBottom: 12 },
  lockedSmall: {
    flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 12,
    alignItems: 'center', borderWidth: 0.5, borderColor: 'rgba(27,63,47,0.1)',
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
  bigActivateSub: { fontSize: 12, color: 'rgba(236,239,232,0.65)', lineHeight: 17, marginBottom: 16 },
  bigActivateBtn: {
    backgroundColor: Colors.aloe, borderRadius: 10,
    paddingVertical: 10, paddingHorizontal: 20, alignSelf: 'flex-start',
  },
  bigActivateBtnText: { fontSize: 14, fontWeight: '600', color: Colors.pine },
})
