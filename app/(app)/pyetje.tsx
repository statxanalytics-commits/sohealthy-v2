import { useCallback, useState } from 'react'
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useFocusEffect, useRouter } from 'expo-router'
import { MessageCircle, Send, Clock, CheckCircle2, Lock } from 'lucide-react-native'
import { API, Colors } from '../../src/constants'
import { usePremium } from '../../src/hooks/usePremium'
import { supabase } from '../../src/lib/supabase'

type Question = {
  timestamp: string
  pyetja: string
  pergjigja: string
  statusi: string
  dataPergjigjes: string
}

export default function PyetjeScreen() {
  const router = useRouter()
  const { isPremium, loading: premiumLoading } = usePremium()
  const [loading, setLoading] = useState(true)
  const [questions, setQuestions] = useState<Question[]>([])
  const [userId, setUserId] = useState<string | null>(null)
  const [emri, setEmri] = useState('')
  const [email, setEmail] = useState('')
  const [pyetja, setPyetja] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  useFocusEffect(useCallback(() => { load() }, []))

  async function load() {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)
      const { data: prof } = await supabase.from('profiles').select('name, email').eq('id', user.id).single()
      setEmri(prof?.name || '')
      setEmail(prof?.email || user.email || '')
      await loadQuestions(user.id)
    } catch (e) {
      console.log('Pyetje load error:', e)
    } finally {
      setLoading(false)
    }
  }

  async function loadQuestions(uid: string) {
    try {
      const res = await fetch(`${API.pyetjeNutricionisti}?userId=${encodeURIComponent(uid)}`)
      const json = await res.json()
      if (json.ok) setQuestions(json.questions || [])
    } catch (e) {
      console.log('Pyetje fetch error:', e)
    }
  }

  async function submit() {
    const text = pyetja.trim()
    if (!text || !userId) return
    setSubmitting(true)
    setError('')
    try {
      // Body sent as text/plain on purpose — avoids the CORS preflight (OPTIONS)
      // request, which Apps Script Web Apps don't handle.
      await fetch(API.pyetjeNutricionisti, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({ userId, emri, email, pyetja: text }),
      })
      setPyetja('')
      setSent(true)
      await loadQuestions(userId)
      setTimeout(() => setSent(false), 5000)
    } catch (e) {
      setError('Pyetja nuk u dërgua. Provo përsëri.')
    } finally {
      setSubmitting(false)
    }
  }

  const stillLoading = loading || premiumLoading

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}><Text style={s.backText}>‹ Kthehu</Text></TouchableOpacity>
        <View style={s.titleRow}><MessageCircle size={18} color={Colors.alabaster} strokeWidth={1.75} /><Text style={s.title}>Pyet Nutricionistin</Text></View>
      </View>

      {stillLoading ? (
        <View style={s.center}><ActivityIndicator size="large" color={Colors.pine} /></View>
      ) : !isPremium ? (
        <View style={s.center}>
          <View style={s.lockedIconWrap}><Lock size={36} color={Colors.pine} strokeWidth={1.5} /></View>
          <Text style={s.lockedTitle}>Veçori Premium</Text>
          <Text style={s.lockedText}>Aktivizo llogarinë tënde premium për të bërë pyetje direkt Pavlit.</Text>
          <TouchableOpacity style={s.activateBtn} onPress={() => router.push('/(app)/activate')}>
            <Text style={s.activateBtnText}>Aktivizo Tani →</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
            <View style={s.composeCard}>
              <Text style={s.composeLabel}>Pyetja jote</Text>
              <TextInput
                style={s.textarea}
                value={pyetja}
                onChangeText={setPyetja}
                placeholder="Shkruaj pyetjen tënde për Pavlin..."
                placeholderTextColor="#aaa"
                multiline
                numberOfLines={4}
              />
              <TouchableOpacity
                style={[s.submitBtn, (!pyetja.trim() || submitting) && s.submitBtnDisabled]}
                onPress={submit}
                disabled={!pyetja.trim() || submitting}
              >
                {submitting ? <ActivityIndicator color="#fff" /> : (
                  <>
                    <Send size={15} color="#fff" strokeWidth={2} />
                    <Text style={s.submitBtnText}>Dërgo Pyetjen</Text>
                  </>
                )}
              </TouchableOpacity>
              {sent && <Text style={s.sentText}>Pyetja u dërgua. Do të marrësh një njoftim kur Pavli të përgjigjet.</Text>}
              {!!error && <Text style={s.errorText}>{error}</Text>}
            </View>

            <Text style={s.sectionLabel}>PYETJET E MIA</Text>
            {questions.length === 0 ? (
              <View style={s.emptyCard}><Text style={s.emptyText}>Ende nuk ke bërë asnjë pyetje</Text></View>
            ) : (
              questions.map((q, i) => {
                const answered = q.statusi === 'Përgjigjur'
                return (
                  <View key={i} style={s.qCard}>
                    <View style={[s.badge, answered ? s.badgeDone : s.badgePending]}>
                      {answered
                        ? <CheckCircle2 size={12} color={Colors.pine} strokeWidth={2} />
                        : <Clock size={12} color={Colors.muted} strokeWidth={2} />}
                      <Text style={[s.badgeText, answered && s.badgeTextDone]}>{answered ? 'Përgjigjur' : 'Në pritje'}</Text>
                    </View>
                    <Text style={s.qText}>{q.pyetja}</Text>
                    {answered && !!q.pergjigja && (
                      <View style={s.aBox}>
                        <Text style={s.aLabel}>PËRGJIGJA E PAVLIT</Text>
                        <Text style={s.aText}>{q.pergjigja}</Text>
                      </View>
                    )}
                  </View>
                )
              })
            )}
            <View style={{ height: 40 }} />
          </ScrollView>
        </KeyboardAvoidingView>
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
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  lockedIconWrap: { width: 76, height: 76, borderRadius: 38, backgroundColor: Colors.pine + '12', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  lockedTitle: { fontSize: 20, fontWeight: '700', color: Colors.pine, marginBottom: 8 },
  lockedText: { fontSize: 14, color: '#666', textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  activateBtn: { backgroundColor: Colors.pine, borderRadius: 14, paddingHorizontal: 32, paddingVertical: 16 },
  activateBtnText: { color: Colors.alabaster, fontWeight: '700', fontSize: 16 },
  scroll: { padding: 16 },
  composeCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 20, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  composeLabel: { fontSize: 13, fontWeight: '700', color: Colors.pine, marginBottom: 8 },
  textarea: { borderWidth: 1.5, borderColor: Colors.border, borderRadius: 12, padding: 12, fontSize: 14, color: Colors.pine, minHeight: 90, textAlignVertical: 'top', marginBottom: 12 },
  submitBtn: { backgroundColor: Colors.pine, borderRadius: 12, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  submitBtnDisabled: { opacity: 0.5 },
  submitBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  sentText: { fontSize: 12, color: Colors.aloe, marginTop: 10, textAlign: 'center', fontWeight: '600' },
  errorText: { fontSize: 12, color: Colors.goji, marginTop: 10, textAlign: 'center', fontWeight: '600' },
  sectionLabel: { fontSize: 10, letterSpacing: 2, color: Colors.muted, fontWeight: '600', marginBottom: 10 },
  emptyCard: { backgroundColor: '#fff', borderRadius: 12, padding: 20, alignItems: 'center' },
  emptyText: { fontSize: 13, color: '#aaa', textAlign: 'center' },
  qCard: { backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 10, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 4, elevation: 1 },
  badge: { flexDirection: 'row', alignSelf: 'flex-start', alignItems: 'center', gap: 4, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, marginBottom: 8 },
  badgePending: { backgroundColor: Colors.surface },
  badgeDone: { backgroundColor: 'rgba(113,181,162,0.15)' },
  badgeText: { fontSize: 11, fontWeight: '600', color: Colors.muted },
  badgeTextDone: { color: Colors.pine },
  qText: { fontSize: 14, color: Colors.pine, lineHeight: 20 },
  aBox: { marginTop: 10, backgroundColor: Colors.surface, borderRadius: 10, padding: 12, borderLeftWidth: 3, borderLeftColor: Colors.aloe },
  aLabel: { fontSize: 9, letterSpacing: 1.5, color: Colors.muted, fontWeight: '700', marginBottom: 4 },
  aText: { fontSize: 13, color: Colors.pine, lineHeight: 19 },
})
