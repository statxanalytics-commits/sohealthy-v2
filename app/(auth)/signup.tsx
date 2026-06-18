import { useRouter } from 'expo-router'
import LegalModal from '../../src/components/LegalModal'
import { useState } from 'react'
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Colors } from '../../src/constants'
import { supabase } from '../../src/lib/supabase'

export default function SignupScreen() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [accepted, setAccepted] = useState(false)
  const [showTerms, setShowTerms] = useState(false)
  const [showPrivacy, setShowPrivacy] = useState(false)
  const [legalType, setLegalType] = useState<'terms' | 'privacy'>('terms')

  const handleSignup = async () => {
    if (!name || !username || !email || !password) { setError('Plotëso të gjitha fushat.'); return }
    if (!accepted) { setError('Duhet të pranoni Kushtet e Shërbimit për të vazhduar.'); return }
    if (password.length < 6) { setError('Fjalëkalimi duhet të ketë 6+ karaktere.'); return }
    setLoading(true); setError('')
    const cleanEmail = email.trim().toLowerCase()
    const { data, error: err } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: { data: { name, username } }
    })
    if (err) { setError(err.message); setLoading(false); return }
    if (data.user) {
      await supabase.from('profiles').upsert({
        id: data.user.id, name, username,
        email: cleanEmail, is_premium: false
      })
    }
    setLoading(false)
    // Navigate to OTP verification screen
    router.push({ pathname: '/(auth)/verify-otp', params: { email: cleanEmail } })
  }

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()}><Text style={s.back}>← Kthehu</Text></TouchableOpacity>
        <Text style={s.title}>Krijo llogarinë</Text>
        <Text style={s.subtitle}>Falas — pa kartë krediti</Text>
      </View>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={s.form} keyboardShouldPersistTaps="handled">
          <Text style={s.label}>EMRI</Text>
          <TextInput style={s.input} value={name} onChangeText={setName} placeholder="Emri yt" placeholderTextColor={Colors.mutedLight} />
          <Text style={s.label}>USERNAME</Text>
          <TextInput style={s.input} value={username} onChangeText={setUsername} placeholder="username" placeholderTextColor={Colors.mutedLight} autoCapitalize="none" />
          <Text style={s.label}>EMAIL</Text>
          <TextInput style={s.input} value={email} onChangeText={setEmail} placeholder="adresa@email.com" placeholderTextColor={Colors.mutedLight} autoCapitalize="none" keyboardType="email-address" />
          <Text style={s.label}>FJALËKALIMI</Text>
          <TextInput style={s.input} value={password} onChangeText={setPassword} placeholder="Minimum 6 karaktere" placeholderTextColor={Colors.mutedLight} secureTextEntry />
          {/* T&C Checkbox */}
          <TouchableOpacity style={s.tcRow} onPress={() => setAccepted(!accepted)} activeOpacity={0.7}>
            <View style={[s.checkbox, accepted && s.checkboxChecked]}>
              {accepted && <Text style={s.checkboxTick}>✓</Text>}
            </View>
            <Text style={s.tcText}>
              Pranoj{' '}
              <Text style={s.tcLink} onPress={() => { setLegalType('terms'); setShowTerms(true) }}>
                Kushtet e Sherbimit
              </Text>
              {' '}dhe{' '}
              <Text style={s.tcLink} onPress={() => { setLegalType('privacy'); setShowTerms(true) }}>
                Politiken e Privatesise
              </Text>
            </Text>
          </TouchableOpacity>

          {error ? <Text style={s.error}>{error}</Text> : null}
          <TouchableOpacity style={[s.btn, (loading || !accepted) && { opacity: 0.6 }]} onPress={handleSignup} disabled={loading || !accepted}>
            {loading ? <ActivityIndicator color={Colors.white} /> : <Text style={s.btnText}>Krijo llogarinë →</Text>}
          </TouchableOpacity>
          <Text style={s.terms}>Duke u regjistruar pranon Kushtet e Përdorimit të SoHealthy</Text>
          <TouchableOpacity style={s.switchRow} onPress={() => router.push('/(auth)/login')}>
            <Text style={s.switchText}>Ke llogari? <Text style={{ fontWeight: '700', color: Colors.pine }}>Hyr këtu</Text></Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
      <LegalModal
        visible={showTerms}
        type={legalType}
        onClose={() => setShowTerms(false)}
      />
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.pine },
  header: { paddingHorizontal: 24, paddingTop: 12, paddingBottom: 24 },
  back: { color: Colors.aloe, fontSize: 14, marginBottom: 16 },
  title: { fontSize: 26, fontWeight: '700', color: Colors.white, marginBottom: 4 },
  subtitle: { fontSize: 13, color: Colors.aloe },
  form: { backgroundColor: Colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, flexGrow: 1 },
  label: { fontSize: 10, fontWeight: '600', color: Colors.muted, letterSpacing: 1, marginBottom: 6 },
  input: { backgroundColor: Colors.white, borderWidth: 1.5, borderColor: Colors.border, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 13, fontSize: 15, color: Colors.pine, marginBottom: 16 },
  error: { color: Colors.goji, fontSize: 13, marginBottom: 12 },
  btn: { backgroundColor: Colors.pine, borderRadius: 12, paddingVertical: 15, alignItems: 'center' },
  btnText: { fontSize: 15, fontWeight: '600', color: Colors.white },
  terms: { fontSize: 11, color: Colors.muted, textAlign: 'center', marginTop: 16, lineHeight: 16 },
  switchRow: { marginTop: 16, alignItems: 'center' },
  switchText: { fontSize: 13, color: Colors.muted },
  tcRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16, gap: 10 },
  checkbox: {
    width: 22, height: 22, borderRadius: 6, borderWidth: 2,
    borderColor: Colors.pine, alignItems: 'center', justifyContent: 'center',
    marginTop: 1, flexShrink: 0,
  },
  checkboxChecked: { backgroundColor: Colors.pine, borderColor: Colors.pine },
  checkboxTick: { color: '#fff', fontSize: 13, fontWeight: '700' },
  tcText: { flex: 1, fontSize: 12, color: Colors.muted, lineHeight: 18 },
  tcLink: { color: Colors.pine, fontWeight: '600', textDecorationLine: 'underline' },
})
