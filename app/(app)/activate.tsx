import { useRouter } from 'expo-router'
import { useState } from 'react'
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Colors } from '../../src/constants'
import { supabase } from '../../src/lib/supabase'

const WHAT_YOU_GET = [
  { icon: '🥗', text: 'Plani i dietës — 14 ditë personal' },
  { icon: '📷', text: 'Skaner ushqimesh' },
  { icon: '⏰', text: 'Tracker + njoftime ditore' },
  { icon: '📖', text: 'Guidat e plota të produkteve' },
  { icon: '📈', text: 'Progresi dhe historia' },
]

export default function ActivateScreen() {
  const router = useRouter()
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleActivate = async () => {
    if (!code.trim()) { setError('Fut kodin e porosisë.'); return }
    setLoading(true); setError('')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setError('Jo i kyçur.'); setLoading(false); return }
    const { data: order, error: orderErr } = await supabase.from('orders').select('*').eq('order_code', code.toUpperCase().trim()).single()
    if (orderErr || !order) { setError('Kodi nuk u gjet. Kontrollo dhe provo sërish.'); setLoading(false); return }
    if (order.used && order.activated_by !== user.id) { setError('Ky kod është përdorur tashmë.'); setLoading(false); return }
    await supabase.from('orders').update({ used: true, verified_at: new Date().toISOString(), activated_by: user.id }).eq('order_code', code.toUpperCase().trim())
    await supabase.from('profiles').update({ is_premium: true, order_code: code.toUpperCase().trim(), plan_start: new Date().toISOString() }).eq('id', user.id)
    setSuccess(true)
    setTimeout(() => router.back(), 1500)
    setLoading(false)
  }

  if (success) return (
    <View style={{ flex: 1, backgroundColor: Colors.pine, justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ fontSize: 60, marginBottom: 20 }}>🎉</Text>
      <Text style={{ fontSize: 22, fontWeight: '700', color: Colors.white, marginBottom: 8 }}>Premium aktivizuar!</Text>
      <Text style={{ fontSize: 14, color: Colors.aloe }}>Mirë se vjen në SoHealthy Premium</Text>
    </View>
  )

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()}><Text style={s.back}>← Kthehu</Text></TouchableOpacity>
        <Text style={s.title}>Aktivizo premium</Text>
        <Text style={s.subtitle}>Ke blerë? Fut kodin dhe hap gjithçka</Text>
      </View>
      <ScrollView contentContainerStyle={s.body} keyboardShouldPersistTaps="handled">
        <View style={s.card}>
          <Text style={s.cardLabel}>ÇFARË FITON</Text>
          {WHAT_YOU_GET.map((item, i) => (
            <View key={i} style={s.getRow}>
              <View style={s.getIcon}><Text style={{ fontSize: 16 }}>{item.icon}</Text></View>
              <Text style={s.getText}>{item.text}</Text>
            </View>
          ))}
        </View>

        <Text style={s.label}>KODI I POROSISË</Text>
        <TextInput
          style={s.input}
          value={code}
          onChangeText={t => { setCode(t.toUpperCase()); setError('') }}
          placeholder="HY8396670"
          placeholderTextColor={Colors.mutedLight}
          autoCapitalize="characters"
          autoCorrect={false}
        />
        <Text style={s.postalNote}>📬 Kodin e gjen në letrën e shërbimit postar që erdhi me paketën tuaj.</Text>

        {error ? <Text style={s.error}>{error}</Text> : null}

        <TouchableOpacity style={[s.btn, loading && { opacity: 0.6 }]} onPress={handleActivate} disabled={loading}>
          {loading ? <ActivityIndicator color={Colors.white} /> : <Text style={s.btnText}>Aktivizo tani →</Text>}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.pine },
  header: { paddingHorizontal: 24, paddingTop: 12, paddingBottom: 24 },
  back: { color: Colors.aloe, fontSize: 14, marginBottom: 16 },
  title: { fontSize: 24, fontWeight: '700', color: Colors.white, marginBottom: 4 },
  subtitle: { fontSize: 13, color: Colors.aloe },
  body: { backgroundColor: Colors.alabaster, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, flexGrow: 1 },
  card: { backgroundColor: Colors.white, borderRadius: 12, padding: 16, marginBottom: 20 },
  cardLabel: { fontSize: 10, fontWeight: '600', color: Colors.muted, letterSpacing: 1.2, marginBottom: 12 },
  getRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8, borderBottomWidth: 0.5, borderBottomColor: Colors.border },
  getIcon: { width: 32, height: 32, borderRadius: 8, backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center' },
  getText: { fontSize: 13, fontWeight: '500', color: Colors.pine, flex: 1 },
  label: { fontSize: 10, fontWeight: '600', color: Colors.muted, letterSpacing: 1, marginBottom: 6 },
  input: { backgroundColor: Colors.white, borderWidth: 1.5, borderColor: Colors.border, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 15, fontSize: 18, fontWeight: '600', color: Colors.pine, letterSpacing: 2, marginBottom: 8 },
  postalNote: { fontSize: 12, color: Colors.muted, marginBottom: 16, lineHeight: 18 },
  error: { color: Colors.goji, fontSize: 13, marginBottom: 12 },
  btn: { backgroundColor: Colors.pine, borderRadius: 12, paddingVertical: 15, alignItems: 'center' },
  btnText: { fontSize: 15, fontWeight: '600', color: Colors.white },
})
