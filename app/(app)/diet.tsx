import { useEffect, useState } from 'react'
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Colors } from '../../src/constants'
import { supabase } from '../../src/lib/supabase'

type Meal = {
  ora: string
  emri: string
  pershkrimi: string
  kalori?: number
}

type DayPlan = {
  dita: string
  vaktet: Meal[]
}

type PlanContent = {
  titulli?: string
  pershkrimi?: string
  ditet: DayPlan[]
  shenime?: string
}

export default function DietScreen() {
  const router = useRouter()
  const [plan, setPlan] = useState<PlanContent | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeDay, setActiveDay] = useState(0)

  useEffect(() => {
    loadDietPlan()
  }, [])

  async function loadDietPlan() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setError('Nuk jeni i kyçur.'); setLoading(false); return }

      const { data, error: dbError } = await supabase
        .from('diet_plans')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('generated_at', { ascending: false })
        .limit(1)
        .single()

      if (dbError || !data) {
        setError('Nuk keni një plan diete aktiv ende.\nKontaktoni SoHealthy për ta aktivizuar.')
        setLoading(false)
        return
      }

      setPlan(data.plan_content as PlanContent)
    } catch (e) {
      setError('Gabim gjatë ngarkimit të planit.')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.center}>
          <ActivityIndicator size="large" color={Colors.pine} />
          <Text style={s.loadingText}>Duke ngarkuar planin tuaj...</Text>
        </View>
      </SafeAreaView>
    )
  }

  if (error || !plan) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <Text style={s.backText}>‹ Kthehu</Text>
          </TouchableOpacity>
          <Text style={s.title}>Plani i Dietës</Text>
        </View>
        <View style={s.center}>
          <Text style={s.errorEmoji}>🥗</Text>
          <Text style={s.errorTitle}>Plan nuk u gjet</Text>
          <Text style={s.errorText}>{error}</Text>
          <TouchableOpacity style={s.retryBtn} onPress={loadDietPlan}>
            <Text style={s.retryText}>Provo Përsëri</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  const today = plan.ditet[activeDay]

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Text style={s.backText}>‹ Kthehu</Text>
        </TouchableOpacity>
        <Text style={s.title}>🥗 Plani i Dietës</Text>
      </View>

      {plan.titulli && (
        <View style={s.planHeader}>
          <Text style={s.planTitle}>{plan.titulli}</Text>
          {plan.pershkrimi && <Text style={s.planDesc}>{plan.pershkrimi}</Text>}
        </View>
      )}

      {/* Day tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.tabsScroll} contentContainerStyle={s.tabs}>
        {plan.ditet.map((d, i) => (
          <TouchableOpacity
            key={i}
            style={[s.tab, activeDay === i && s.tabActive]}
            onPress={() => setActiveDay(i)}
          >
            <Text style={[s.tabText, activeDay === i && s.tabTextActive]}>{d.dita}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Meals */}
      <ScrollView contentContainerStyle={s.scroll}>
        {today.vaktet.map((v, i) => (
          <View key={i} style={s.mealCard}>
            <View style={s.mealTimeRow}>
              <View style={s.timeBadge}>
                <Text style={s.timeBadgeText}>{v.ora}</Text>
              </View>
              {v.kalori && (
                <View style={s.caloriBadge}>
                  <Text style={s.caloriBadgeText}>{v.kalori} kcal</Text>
                </View>
              )}
            </View>
            <Text style={s.mealName}>{v.emri}</Text>
            <Text style={s.mealDesc}>{v.pershkrimi}</Text>
          </View>
        ))}

        {plan.shenime && (
          <View style={s.notesCard}>
            <Text style={s.notesTitle}>📌 Shënime</Text>
            <Text style={s.notesText}>{plan.shenime}</Text>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.alabaster },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  loadingText: { marginTop: 16, color: Colors.pine, fontSize: 15 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.pine,
    gap: 12,
  },
  backBtn: { padding: 4 },
  backText: { color: Colors.alabaster, fontSize: 17, fontWeight: '600' },
  title: { color: Colors.alabaster, fontSize: 18, fontWeight: '700', flex: 1 },
  planHeader: {
    backgroundColor: Colors.pine,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  planTitle: { color: Colors.aloe, fontSize: 16, fontWeight: '700' },
  planDesc: { color: 'rgba(236,239,232,0.8)', fontSize: 13, marginTop: 4 },
  tabsScroll: { maxHeight: 52, backgroundColor: '#fff' },
  tabs: { paddingHorizontal: 12, paddingVertical: 10, gap: 8, flexDirection: 'row' },
  tab: {
    paddingHorizontal: 16, paddingVertical: 6,
    borderRadius: 20, backgroundColor: '#f0f0f0',
  },
  tabActive: { backgroundColor: Colors.aloe },
  tabText: { fontSize: 13, fontWeight: '600', color: '#666' },
  tabTextActive: { color: '#fff' },
  scroll: { padding: 16 },
  mealCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  mealTimeRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  timeBadge: {
    backgroundColor: Colors.pine + '20',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  timeBadgeText: { fontSize: 12, fontWeight: '700', color: Colors.pine },
  caloriBadge: {
    backgroundColor: Colors.goji + '20',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  caloriBadgeText: { fontSize: 12, fontWeight: '700', color: Colors.goji },
  mealName: { fontSize: 16, fontWeight: '700', color: Colors.pine, marginBottom: 4 },
  mealDesc: { fontSize: 14, color: '#555', lineHeight: 20 },
  notesCard: {
    backgroundColor: Colors.aloe + '20',
    borderRadius: 14,
    padding: 16,
    marginTop: 4,
  },
  notesTitle: { fontSize: 14, fontWeight: '700', color: Colors.pine, marginBottom: 6 },
  notesText: { fontSize: 14, color: '#444', lineHeight: 20 },
  errorEmoji: { fontSize: 56, marginBottom: 16 },
  errorTitle: { fontSize: 20, fontWeight: '700', color: Colors.pine, marginBottom: 8 },
  errorText: { fontSize: 14, color: '#666', textAlign: 'center', lineHeight: 22 },
  retryBtn: {
    marginTop: 24, backgroundColor: Colors.pine,
    borderRadius: 12, paddingHorizontal: 28, paddingVertical: 12,
  },
  retryText: { color: Colors.alabaster, fontWeight: '700', fontSize: 15 },
})
