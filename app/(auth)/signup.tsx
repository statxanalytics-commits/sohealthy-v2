import { useRouter } from 'expo-router'
import LegalModal from '../../src/components/LegalModal'
import { useState } from 'react'
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Colors } from '../../src/constants'
import { supabase } from '../../src/lib/supabase'
import HelpButton from '../../src/components/HelpButton'

const MIN_PASSWORD = 8
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

// Map a Supabase auth error (or a thrown fetch error) to a specific Albanian message.
// Prefer the stable `code` field (newer supabase-js), fall back to message text.
function mapSignupError(err: any): string {
  const code: string = err?.code || ''
  const msg: string = (err?.message || '').toLowerCase()
  const status: number = err?.status || 0

  // No network / fetch failed (RN reports "Network request failed")
  if (err?.name === 'AuthRetryableFetchError' || msg.includes('network request failed') || msg.includes('failed to fetch')) {
    return 'Nuk ka lidhje me internetin. Kontrollo lidhjen dhe provo përsëri.'
  }
  if (code === 'user_already_exists' || code === 'email_exists' || msg.includes('already registered') || msg.includes('already been registered')) {
    return 'Ky email është regjistruar tashmë. Provo të hysh ose përdor "Harrove fjalëkalimin".'
  }
  if (code === 'weak_password' || (msg.includes('password') && (msg.includes('least') || msg.includes('weak') || msg.includes('short')))) {
    return `Fjalëkalimi duhet të jetë minimumi ${MIN_PASSWORD} karaktere.`
  }
  if (code === 'email_address_invalid' || code === 'validation_failed' || msg.includes('valid email') || msg.includes('invalid email') || msg.includes('is invalid')) {
    return 'Email-i nuk është i vlefshëm. Kontrollo dhe provo përsëri.'
  }
  if (code === 'over_email_send_rate_limit' || code === 'over_request_rate_limit' || status === 429 || msg.includes('rate limit')) {
    return 'Shumë përpjekje. Prit disa minuta dhe provo përsëri.'
  }
  if (code === 'signup_disabled' || msg.includes('signups not allowed')) {
    return 'Regjistrimi është i mbyllur përkohësisht. Provo më vonë.'
  }
  if (msg.includes('database error') || msg.includes('duplicate key') || msg.includes('profiles_username_key')) {
    return 'Ky username është zënë. Zgjidh një tjetër.'
  }
  if (status === 500 || code === 'unexpected_failure' || msg.includes('smtp') || msg.includes('error sending')) {
    return 'Problem me dërgimin e email-it. Provo përsëri ose kontakto info@sohealthy.al'
  }
  return 'Diçka shkoi keq. Provo përsëri për pak minuta.'
}

export default function SignupScreen() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [accepted, setAccepted] = useState(false)
  const [showTerms, setShowTerms] = useState(false)
  const [legalType, setLegalType] = useState<'terms' | 'privacy'>('terms')
  // When an email is already registered but (maybe) unconfirmed, offer a path to
  // get a fresh code and finish confirmation instead of dead-ending on the error.
  const [showConfirm, setShowConfirm] = useState(false)
  const [confirming, setConfirming] = useState(false)

  const cleanName = name.trim()
  const cleanUsername = username.trim()
  const cleanEmail = email.trim().toLowerCase()
  const passTooShort = password.length > 0 && password.length < MIN_PASSWORD

  // Resend the signup confirmation code and move to the verify screen.
  // If the account is already confirmed, Supabase errors here → tell them to log in.
  const goConfirmExisting = async () => {
    if (!EMAIL_RE.test(cleanEmail)) { setError('Email-i nuk është i vlefshëm.'); return }
    setConfirming(true); setError('')
    const { error: err } = await supabase.auth.resend({ type: 'signup', email: cleanEmail })
    setConfirming(false)
    if (err) {
      const c = (err as any).code || ''
      const m = (err.message || '').toLowerCase()
      if (m.includes('already') && m.includes('confirm')) {
        setError('Ky email është konfirmuar tashmë. Hyr me fjalëkalimin ose përdor "Harrove fjalëkalimin".')
        setShowConfirm(false)
      } else if (c === 'over_email_send_rate_limit' || err.status === 429) {
        setError('Shumë kërkesa. Prit disa minuta dhe provo përsëri.')
      } else {
        setError('Nuk u dërgua kodi. Provo përsëri.')
      }
      return
    }
    router.push({ pathname: '/(auth)/verify-otp', params: { email: cleanEmail, name: cleanName, username: cleanUsername } })
  }

  const handleSignup = async () => {
    setShowConfirm(false)
    // ---- Client-side validation: tell the user EXACTLY what is wrong ----
    if (!cleanName) { setError('Të lutem shkruaj emrin tënd.'); return }
    if (cleanUsername.length < 3) { setError('Username-i duhet të ketë të paktën 3 karaktere.'); return }
    if (!EMAIL_RE.test(cleanEmail)) { setError('Email-i nuk është i vlefshëm. Kontrollo dhe provo përsëri.'); return }
    if (password.length < MIN_PASSWORD) { setError(`Fjalëkalimi duhet të jetë minimumi ${MIN_PASSWORD} karaktere.`); return }
    if (!accepted) { setError('Duhet të pranosh Kushtet e Shërbimit dhe Politikën e Privatësisë.'); return }
    setLoading(true); setError('')
    try {
      // ---- Username must be unique (profiles.username is UNIQUE) — check before creating the auth user ----
      const { data: available, error: availErr } = await supabase.rpc('username_available', { p_username: cleanUsername })
      if (!availErr && available === false) {
        setError('Ky username është zënë. Zgjidh një tjetër.')
        setLoading(false); return
      }

      const { data, error: err } = await supabase.auth.signUp({
        email: cleanEmail, password,
        options: { data: { name: cleanName, username: cleanUsername } }
      })
      if (err) { setError(mapSignupError(err)); setLoading(false); return }

      // With email confirmation ON, Supabase hides "already registered" and returns a user with no identities.
      // Offer a recovery path: send a fresh code and let them confirm (or, if already confirmed, log in).
      if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
        setError('Ky email është regjistruar tashmë. Nëse s’e ke konfirmuar, merr një kod të ri më poshtë.')
        setShowConfirm(true)
        setLoading(false); return
      }

      setLoading(false)
      if (data.session && data.user) {
        // Email confirmation OFF → logged in immediately. Profile is also created by the DB trigger; this upsert is a safety net.
        await supabase.from('profiles').upsert({ id: data.user.id, name: cleanName, username: cleanUsername, email: cleanEmail, is_premium: false })
        router.replace('/(app)/(tabs)/')
      } else {
        // Email confirmation ON → 6-digit code sent; verify-otp finishes signup (and upserts the profile once logged in).
        router.push({ pathname: '/(auth)/verify-otp', params: { email: cleanEmail, name: cleanName, username: cleanUsername } })
      }
    } catch (e: any) {
      setError(mapSignupError(e))
      setLoading(false)
    }
  }

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()}><Text style={s.back}>← Kthehu</Text></TouchableOpacity>
        <Text style={s.title}>Krijo llogarinë</Text>
        <Text style={s.subtitle}>Falas — pa kartë krediti</Text>
        <HelpButton style={s.help} />
      </View>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={s.form} keyboardShouldPersistTaps="handled">
          <Text style={s.label}>EMRI</Text>
          <TextInput style={s.input} value={name} onChangeText={setName} placeholder="Emri yt" placeholderTextColor={Colors.mutedLight} />
          <Text style={s.label}>USERNAME</Text>
          <TextInput style={s.input} value={username} onChangeText={setUsername} placeholder="username" placeholderTextColor={Colors.mutedLight} autoCapitalize="none" />
          <Text style={s.label}>EMAIL</Text>
          <TextInput style={s.input} value={email} onChangeText={t => { setEmail(t); if (showConfirm) setShowConfirm(false); if (error) setError('') }} placeholder="adresa@email.com" placeholderTextColor={Colors.mutedLight} autoCapitalize="none" keyboardType="email-address" />

          <Text style={s.label}>FJALËKALIMI</Text>
          <View style={[s.passWrap, passTooShort && s.passWrapError]}>
            <TextInput style={s.passInput} value={password} onChangeText={t => { setPassword(t); if (error) setError('') }}
              placeholder="Shkruaj fjalëkalimin" placeholderTextColor={Colors.mutedLight}
              secureTextEntry={!showPass} autoCapitalize="none" autoCorrect={false} />
            <TouchableOpacity style={s.eyeBtn} onPress={() => setShowPass(v => !v)}>
              <Text style={s.eyeIcon}>{showPass ? '🙈' : '👁️'}</Text>
            </TouchableOpacity>
          </View>
          {/* Always-visible rule under the field (placeholder disappears when typing) */}
          <Text style={[s.helper, passTooShort && s.helperError]}>
            {passTooShort
              ? `Minimumi ${MIN_PASSWORD} karaktere — edhe ${MIN_PASSWORD - password.length}.`
              : `Minimumi ${MIN_PASSWORD} karaktere.`}
          </Text>

          <TouchableOpacity style={s.tcRow} onPress={() => setAccepted(!accepted)} activeOpacity={0.7}>
            <View style={[s.checkbox, accepted && s.checkboxChecked]}>
              {accepted && <Text style={s.checkboxTick}>✓</Text>}
            </View>
            <Text style={s.tcText}>
              Pranoj{' '}
              <Text style={s.tcLink} onPress={() => { setLegalType('terms'); setShowTerms(true) }}>Kushtet e Shërbimit</Text>
              {' '}dhe{' '}
              <Text style={s.tcLink} onPress={() => { setLegalType('privacy'); setShowTerms(true) }}>Politikën e Privatësisë</Text>
            </Text>
          </TouchableOpacity>

          {error ? <Text style={s.error}>{error}</Text> : null}

          {/* Recovery path for an already-registered / unconfirmed email */}
          {showConfirm && (
            <TouchableOpacity style={s.confirmLink} onPress={goConfirmExisting} disabled={confirming}>
              {confirming
                ? <ActivityIndicator size="small" color={Colors.pine} />
                : <Text style={s.confirmLinkText}>Ke një kod? Konfirmo email-in →</Text>}
            </TouchableOpacity>
          )}

          <TouchableOpacity style={[s.btn, (loading || !accepted) && { opacity: 0.6 }]} onPress={handleSignup} disabled={loading || !accepted}>
            {loading ? <ActivityIndicator color={Colors.white} /> : <Text style={s.btnText}>Krijo llogarinë →</Text>}
          </TouchableOpacity>
          <Text style={s.terms}>Duke u regjistruar pranon Kushtet e Përdorimit të SoHealthy</Text>
          <TouchableOpacity style={s.switchRow} onPress={() => router.push('/(auth)/login')}>
            <Text style={s.switchText}>Ke llogari? <Text style={{ fontWeight: '700', color: Colors.pine }}>Hyr këtu</Text></Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
      <LegalModal visible={showTerms} type={legalType} onClose={() => setShowTerms(false)} />
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.pine },
  header: { paddingHorizontal: 24, paddingTop: 12, paddingBottom: 24 },
  back: { color: Colors.aloe, fontSize: 14, marginBottom: 16 },
  help: { position: 'absolute', right: 24, top: 12 },
  title: { fontSize: 26, fontWeight: '700', color: Colors.white, marginBottom: 4 },
  subtitle: { fontSize: 13, color: Colors.aloe },
  form: { backgroundColor: Colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, flexGrow: 1 },
  label: { fontSize: 10, fontWeight: '600', color: Colors.muted, letterSpacing: 1, marginBottom: 6 },
  input: { backgroundColor: Colors.white, borderWidth: 1.5, borderColor: Colors.border, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 13, fontSize: 15, color: Colors.pine, marginBottom: 16 },
  passWrap: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: Colors.border, borderRadius: 12, marginBottom: 6, backgroundColor: Colors.white },
  passWrapError: { borderColor: Colors.goji },
  helper: { fontSize: 12, color: Colors.muted, marginBottom: 16, marginLeft: 2 },
  helperError: { color: Colors.goji, fontWeight: '600' },
  passInput: { flex: 1, paddingHorizontal: 16, paddingVertical: 13, fontSize: 15, color: Colors.pine },
  eyeBtn: { paddingHorizontal: 14, paddingVertical: 10 },
  eyeIcon: { fontSize: 18 },
  error: { color: Colors.goji, fontSize: 13, marginBottom: 12, lineHeight: 18 },
  confirmLink: { alignItems: 'center', paddingVertical: 10, marginBottom: 8 },
  confirmLinkText: { fontSize: 14, fontWeight: '700', color: Colors.pine, textDecorationLine: 'underline' },
  btn: { backgroundColor: Colors.pine, borderRadius: 12, paddingVertical: 15, alignItems: 'center' },
  btnText: { fontSize: 15, fontWeight: '600', color: Colors.white },
  terms: { fontSize: 11, color: Colors.muted, textAlign: 'center', marginTop: 16, lineHeight: 16 },
  switchRow: { marginTop: 16, alignItems: 'center' },
  switchText: { fontSize: 13, color: Colors.muted },
  tcRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16, gap: 10 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: Colors.pine, alignItems: 'center', justifyContent: 'center', marginTop: 1, flexShrink: 0 },
  checkboxChecked: { backgroundColor: Colors.pine, borderColor: Colors.pine },
  checkboxTick: { color: '#fff', fontSize: 13, fontWeight: '700' },
  tcText: { flex: 1, fontSize: 12, color: Colors.muted, lineHeight: 18 },
  tcLink: { color: Colors.pine, fontWeight: '600', textDecorationLine: 'underline' },
})
