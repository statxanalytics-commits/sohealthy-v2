import { useCallback, useMemo, useState } from 'react'
import {
  ActivityIndicator, Linking, ScrollView, StyleSheet,
  Text, TextInput, TouchableOpacity, View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useFocusEffect, useRouter } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { ChevronRight } from 'lucide-react-native'
import { Colors } from '../src/constants'
import { supabase } from '../src/lib/supabase'

// FAQ content lives in the Supabase `faq` table and is editable there without
// a new app release. This screen is a TOP-LEVEL route (outside the (auth) and
// (app) guards) so it opens whether the user is logged in or not — the root
// _layout whitelists the `faq` segment so it is never redirected.

const CACHE_KEY = 'faq_cache_v1'

type FaqRow = {
  id: string
  category: string
  question: string
  answer: string
  sort_order: number
}

export default function FaqScreen() {
  const router = useRouter()
  const [rows, setRows] = useState<FaqRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [query, setQuery] = useState('')
  const [openId, setOpenId] = useState<string | null>(null)

  useFocusEffect(useCallback(() => { load() }, []))

  async function load() {
    setError(false)
    // 1) Show cached content instantly (works offline).
    try {
      const cached = await AsyncStorage.getItem(CACHE_KEY)
      if (cached) { setRows(JSON.parse(cached)); setLoading(false) }
    } catch {}
    // 2) Refresh from the server.
    try {
      const { data, error: err } = await supabase
        .from('faq')
        .select('id, category, question, answer, sort_order')
        .eq('is_published', true)
        .order('sort_order', { ascending: true })
      if (err) throw err
      if (data) {
        setRows(data as FaqRow[])
        try { await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(data)) } catch {}
      }
    } catch {
      setRows(prev => { if (prev.length === 0) setError(true); return prev })
    } finally {
      setLoading(false)
    }
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return rows
    return rows.filter(
      r => r.question.toLowerCase().includes(q) || r.answer.toLowerCase().includes(q),
    )
  }, [rows, query])

  // Group by category, preserving the sort_order sequence.
  const groups = useMemo(() => {
    const out: { category: string; items: FaqRow[] }[] = []
    for (const r of filtered) {
      const last = out[out.length - 1]
      if (last && last.category === r.category) last.items.push(r)
      else out.push({ category: r.category, items: [r] })
    }
    return out
  }, [filtered])

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Text style={s.back}>‹ Kthehu</Text>
        </TouchableOpacity>
        <Text style={s.title}>Pyetjet e Shpeshta</Text>
        <View style={{ width: 60 }} />
      </View>

      <View style={s.searchWrap}>
        <TextInput
          style={s.search}
          value={query}
          onChangeText={setQuery}
          placeholder="Kërko një pyetje..."
          placeholderTextColor={Colors.mutedLight}
          autoCapitalize="none"
          returnKeyType="search"
        />
      </View>

      {loading ? (
        <View style={s.center}><ActivityIndicator size="large" color={Colors.pine} /></View>
      ) : error ? (
        <View style={s.center}>
          <Text style={s.errTitle}>Nuk u ngarkuan pyetjet</Text>
          <Text style={s.errText}>Kontrollo lidhjen e internetit dhe provo përsëri.</Text>
          <TouchableOpacity style={s.retryBtn} onPress={() => { setLoading(true); load() }}>
            <Text style={s.retryText}>Provo përsëri</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={s.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {groups.length === 0 ? (
            <View style={s.center}>
              <Text style={s.emptyText}>Asnjë rezultat për "{query.trim()}"</Text>
            </View>
          ) : groups.map(g => (
            <View key={g.category} style={s.section}>
              <Text style={s.sectionLabel}>{g.category.toUpperCase()}</Text>
              {g.items.map(item => {
                const open = openId === item.id
                return (
                  <View key={item.id} style={s.card}>
                    <TouchableOpacity
                      style={s.qRow}
                      onPress={() => setOpenId(open ? null : item.id)}
                      activeOpacity={0.7}
                    >
                      <Text style={s.qText}>{item.question}</Text>
                      <ChevronRight
                        size={18}
                        color={Colors.muted}
                        strokeWidth={2}
                        style={open ? s.chevOpen : undefined}
                      />
                    </TouchableOpacity>
                    {open && <Text style={s.aText}>{item.answer}</Text>}
                  </View>
                )
              })}
            </View>
          ))}

          <View style={s.contactCard}>
            <Text style={s.contactTitle}>Ke ende nevojë për ndihmë?</Text>
            <Text style={s.contactText}>Na shkruaj dhe do të të përgjigjemi sa më shpejt.</Text>
            <TouchableOpacity onPress={() => Linking.openURL('mailto:info@sohealthy.al')}>
              <Text style={s.contactLink}>info@sohealthy.al</Text>
            </TouchableOpacity>
          </View>
          <View style={{ height: 32 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.alabaster },
  header: {
    backgroundColor: Colors.pine, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12,
  },
  backBtn: { width: 60 },
  back: { color: Colors.aloe, fontSize: 15, fontWeight: '600' },
  title: { flex: 1, textAlign: 'center', color: Colors.white, fontSize: 17, fontWeight: '700' },
  searchWrap: { backgroundColor: Colors.pine, paddingHorizontal: 16, paddingBottom: 14 },
  search: {
    backgroundColor: Colors.white, borderRadius: 12, paddingHorizontal: 16,
    paddingVertical: 12, fontSize: 15, color: Colors.pine,
  },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40, gap: 6 },
  errTitle: { fontSize: 16, fontWeight: '700', color: Colors.pine },
  errText: { fontSize: 13, color: Colors.muted, textAlign: 'center', lineHeight: 20 },
  retryBtn: {
    marginTop: 14, backgroundColor: Colors.pine, borderRadius: 10,
    paddingHorizontal: 24, paddingVertical: 12,
  },
  retryText: { color: Colors.white, fontWeight: '700', fontSize: 14 },
  emptyText: { fontSize: 14, color: Colors.muted, textAlign: 'center' },
  scroll: { padding: 16, paddingBottom: 20 },
  section: { marginBottom: 18 },
  sectionLabel: {
    fontSize: 10, letterSpacing: 2, color: Colors.muted, fontWeight: '700',
    marginBottom: 8, marginLeft: 4,
  },
  card: {
    backgroundColor: Colors.white, borderRadius: 12, marginBottom: 8,
    paddingHorizontal: 14, paddingVertical: 4,
    borderWidth: 0.5, borderColor: 'rgba(27,63,47,0.1)',
  },
  qRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, gap: 12 },
  qText: { flex: 1, fontSize: 14, fontWeight: '600', color: Colors.pine, lineHeight: 20 },
  chevOpen: { transform: [{ rotate: '90deg' }] },
  aText: { fontSize: 13, color: '#555', lineHeight: 21, paddingBottom: 14, paddingTop: 2 },
  contactCard: {
    backgroundColor: Colors.pine + '0D', borderRadius: 14, padding: 18, marginTop: 4,
    borderWidth: 1, borderColor: Colors.pine + '1A', alignItems: 'center',
  },
  contactTitle: { fontSize: 15, fontWeight: '700', color: Colors.pine, marginBottom: 4 },
  contactText: { fontSize: 13, color: Colors.muted, textAlign: 'center', marginBottom: 8 },
  contactLink: { fontSize: 15, fontWeight: '700', color: Colors.pine, textDecorationLine: 'underline' },
})
