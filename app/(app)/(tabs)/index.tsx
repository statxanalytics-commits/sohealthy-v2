import { useCallback, useState } from 'react'
import { useRouter } from 'expo-router'
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { API, Colors, LOGO, PRODUCT_IMAGES } from '../../../src/constants'
import { usePremium } from '../../../src/hooks/usePremium'
import { supabase } from '../../../src/lib/supabase'
import { useFocusEffect } from 'expo-router'

const FREE_TOOLS = [
  { id: 'challenge', icon: '📅', name: 'Challenge 30d', sub: 'Program falas', url: API.challenge },
  { id: 'calculator', icon: '⚖️', name: 'Llogarit Humbjen', sub: 'Kalkulator peshe', url: API.calculator },
  { id: 'quiz', icon: '✨', name: 'Gjej Paketën', sub: 'Quiz produktesh', url: API.quiz },
  { id: 'bodyCalc', icon: '📊', name: 'Llogaritje Trupi', sub: 'BMI, TDEE, makro', url: API.bodyCalc },
]

type PremiumTool = {
  id: string; icon: string; name: string; sub: string
  route: string; params?: Record<string, string>
}

const PREMIUM_TOOLS: PremiumTool[] = [
  { id: 'scanner', icon: '📷', name: 'Skaner', sub: 'Skano ushqimet', route: '/(app)/scanner' },
  { id: 'tracker', icon: '📈', name: 'Tracker', sub: 'Gjurmo kalorite', route: '/(app)/tracker' },
  { id: 'progress', icon: '🏆', name: 'Progresi', sub: 'Shiko rezultatet', route: '/(app)/progress' },
]

export default function HomeScreen() {
  const router = useRouter()
  const { isPremium, loading } = usePremium()
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
    if (h < 12) return 'Miremengjes'
    if (h < 18) return 'Miredita'
    return 'Mirembrema'
  }

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
            </View>
            {PRODUCT_IMAGES[activeProduct.slug]
              ? <Image source={{ uri: PRODUCT_IMAGES[activeProduct.slug] }} style={s.packageBannerImg} resizeMode="contain" />
              : <Text style={{ fontSize: 40 }}>📦</Text>
            }
          </TouchableOpacity>
        )}

        {/* Diet Plan — featured */}
        {isPremium && (
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
        )}

        {/* Free tools */}
        <Text style={s.sectionLabel}>MJETET FALAS</Text>
        <View style={s.freeGrid}>
          {FREE_TOOLS.map(tool => (
            <TouchableOpacity
              key={tool.id}
              style={s.freeCard}
              onPress={() => router.push({ pathname: '/(app)/webview', params: { url: tool.url, title: tool.name } })}
            >
              <Text style={s.freeIcon}>{tool.icon}</Text>
              <Text style={s.freeName}>{tool.name}</Text>
              <Text style={s.freeSub}>{tool.sub}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Premium tools */}
        {isPremium ? (
          <>
            <Text style={s.sectionLabel}>PREMIUM</Text>
            <View style={s.premiumRow}>
              {PREMIUM_TOOLS.map(tool => (
                <TouchableOpacity
                  key={tool.id}
                  style={s.premiumSmall}
                  onPress={() => handlePremiumTool(tool)}
                >
                  <Text style={s.premiumSmallIcon}>{tool.icon}</Text>
                  <Text style={s.premiumSmallName}>{tool.name}</Text>
                  <Text style={s.premiumSmallSub}>{tool.sub}</Text>
                </TouchableOpacity>
              ))}
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
                <Text style={{ fontSize: 18 }}>🔒</Text>
              </View>
            </TouchableOpacity>
            <View style={s.lockedRow}>
              {[
                { icon: '📷', name: 'Skaner' },
                { icon: '📈', name: 'Tracker' },
                { icon: '🏆', name: 'Progresi' },
              ].map(t => (
                <TouchableOpacity key={t.name} style={s.lockedSmall} onPress={() => router.push('/(app)/activate')}>
                  <Text style={s.lockedSmallIcon}>{t.icon}</Text>
                  <Text style={s.lockedSmallName}>{t.name}</Text>
                  <Text style={{ fontSize: 10 }}>🔒</Text>
                </TouchableOpacity>
              ))}
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
  sectionLabel: {
    fontSize: 10, letterSpacing: 2, color: '#6B7F72', fontWeight: '600',
    marginHorizontal: 16, marginTop: 20, marginBottom: 10,
  },
  freeGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, gap: 8 },
  freeCard: {
    width: '47%', backgroundColor: '#fff', borderRadius: 14, padding: 14,
    borderWidth: 0.5, borderColor: 'rgba(27,63,47,0.1)',
  },
  freeIcon: { fontSize: 22, marginBottom: 8 },
  freeName: { fontSize: 13, fontWeight: '600', color: Colors.pine, lineHeight: 17, marginBottom: 2 },
  freeSub: { fontSize: 11, color: '#6B7F72' },
  premiumRow: { flexDirection: 'row', paddingHorizontal: 12, gap: 8 },
  premiumSmall: {
    flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 12,
    alignItems: 'center', borderWidth: 0.5, borderColor: 'rgba(27,63,47,0.1)',
  },
  premiumSmallIcon: { fontSize: 20, marginBottom: 6 },
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
  lockedSmallIcon: { fontSize: 20, marginBottom: 4 },
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
