import { useRouter } from 'expo-router'
import { useState } from 'react'
import {
  ActivityIndicator, KeyboardAvoidingView, Modal,
  Platform, ScrollView, StyleSheet, Text, TextInput,
  TouchableOpacity, View
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Colors } from '../../src/constants'
import { supabase } from '../../src/lib/supabase'

export default function LoginScreen() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [showForgot, setShowForgot] = useState(false)
  const [step, setStep] = useState<'email' | 'code' | 'newpass'>('email')
  const [fEmail, setFEmail] = useState('')
  const [fCode, setFCode] = useState('')
  const [newPass, setNewPass] = useState('')
  const [newPassConf, setNewPassConf] = useState('')
  const [fLoading, setFLoading] = useState(false)
  const [fError, setFError] = useState('')

  const handleLogin = async () => {
    if (!email || !password) { setError('Plotëso të gjitha fushat.'); return }
    setLoading(true); setError('')
    const { error: err } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(), password
    })
    if (err) setError(err.message)
    setLoading(false)
  }

  // Step 1: Send Supabase OTP recovery email
  const sendCode = async () => {
    if (!fEmail.trim()) { setFError('Shkruaj email-in.'); return }
    setFLoading(true); setFError('')
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(fEmail.trim().toLowerCase())
      if (error) throw error
      setStep('code')
    } catch {
      setFError('Email nuk u gjet ose gabim serveri.')
    } finally {
      setFLoading(false)
    }
  }

  // Step 2: Verify Supabase OTP — sets session with PASSWORD_RECOVERY event
  const verifyCode = async () => {
    if (fCode.length !== 6) { setFError('Kodi duhet të jetë 6 shifra.'); return }
    setFLoading(true); setFError('')
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email: fEmail.trim().toLowerCase(),
        token: fCode.trim(),
        type: 'recovery'
      })
      if (error || !data.session) {
        setFError('Kodi i gabuar ose ka skaduar.')
        setFLoading(false)
        return
      }
      // PASSWORD_RECOVERY event blocks redirect in _layout — go to newpass step
      setStep('newpass')
    } catch {
      setFError('Gabim gjatë verifikimit.')
    } finally {
      setFLoading(false)
    }
  }

  // Step 3: Update password then sign out (force fresh login)
  const updatePassword = async () => {
    if (!newPass) { setFError('Shkruaj fjalëkalimin e ri.'); return }
    if (newPass.length < 6) { setFError('Minimum 6 karaktere.'); return }
    if (newPass !== newPassConf) { setFError('Fjalëkalimet nuk përputhen.'); return }
    setFLoading(true); setFError('')
    try {
      const { error } = await supabase.auth.updateUser({ password: newPass })
      if (error) throw error
      // Sign out so _layout clears recovery state and user logs in fresh
      await supabase.auth.signOut()
      resetForgot()
    } catch {
      setFError('Gabim gjatë ndryshimit. Provo përsëri.')
    } finally {
      setFLoading(false)
    }
  }

  const resetForgot = () => {
    setShowForgot(false)
    setStep('email')
    setFEmail('')
    setFCode('')
    setNewPass('')
    setNewPassConf('')
    setFError('')
  }

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={s.back}>← Kthehu</Text>
        </TouchableOpacity>
        <Text style={s.title}>Hyr në llogari</Text>
        <Text style={s.subtitle}>Mirë se u ktheve</Text>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={s.form} keyboardShouldPersistTaps="handled">
          <Text style={s.label}>EMAIL</Text>
          <TextInput style={s.input} value={email} onChangeText={setEmail}
            placeholder="adresa@email.com" placeholderTextColor={Colors.mutedLight}
            autoCapitalize="none" keyboardType="email-address" />
          <Text style={s.label}>FJALËKALIMI</Text>
          <TextInput style={s.input} value={password} onChangeText={setPassword}
            placeholder="••••••••" placeholderTextColor={Colors.mutedLight} secureTextEntry />
          {error ? <Text style={s.error}>{error}</Text> : null}
          <TouchableOpacity style={[s.btn, loading && { opacity: 0.6 }]} onPress={handleLogin} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>Hyr →</Text>}
          </TouchableOpacity>
          <TouchableOpacity style={s.forgotBtn} onPress={() => { setFEmail(email); setShowForgot(true) }}>
            <Text style={s.forgotText}>Harrova fjalëkalimin?</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.switchRow} onPress={() => router.push('/(auth)/signup')}>
            <Text style={s.switchText}>Nuk ke llogari? <Text style={{ fontWeight: '700', color: Colors.pine }}>Regjistrohu falas</Text></Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Forgot Password Modal */}
      <Modal visible={showForgot} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={s.modalSafe}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>
              {step === 'email' ? '🔑 Rivendos Fjalëkalimin' : step === 'code' ? '📱 Kodi i Verifikimit' : '🔒 Fjalëkalim i Ri'}
            </Text>
            <TouchableOpacity onPress={resetForgot} style={s.closeBtn}>
              <Text style={s.closeTxt}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={s.modalScroll} keyboardShouldPersistTaps="handled">
            {/* Step dots */}
            <View style={s.stepRow}>
              {[0, 1, 2].map(i => (
                <View key={i} style={s.stepWrap}>
                  <View style={[s.dot,
                    step === 'email' && i === 0 ? s.dotActive :
                    step === 'code' && i === 1 ? s.dotActive :
                    step === 'newpass' && i === 2 ? s.dotActive :
                    (step === 'code' && i === 0) || (step === 'newpass' && i < 2) ? s.dotDone : {}
                  ]}>
                    <Text style={s.dotTxt}>{i + 1}</Text>
                  </View>
                  {i < 2 && <View style={s.dotLine} />}
                </View>
              ))}
            </View>

            {step === 'email' && (
              <>
                <Text style={s.mDesc}>Shkruaj email-in tënd dhe do të dërgojmë një kod 6-shifror për verifikim.</Text>
                <Text style={s.mLabel}>EMAIL</Text>
                <TextInput style={s.mInput} value={fEmail} onChangeText={setFEmail}
                  placeholder="adresa@email.com" placeholderTextColor="#aaa"
                  autoCapitalize="none" keyboardType="email-address" autoFocus />
              </>
            )}

            {step === 'code' && (
              <>
                <Text style={s.mDesc}>Kodi u dërgua te <Text style={{ fontWeight: '700', color: Colors.pine }}>{fEmail}</Text>. Kontrollo email-in tënd (dhe spam).</Text>
                <Text style={s.mLabel}>KOD 6-SHIFROR</Text>
                <TextInput style={[s.mInput, s.codeInput]} value={fCode} onChangeText={setFCode}
                  placeholder="• • • • • •" placeholderTextColor="#ccc"
                  keyboardType="number-pad" maxLength={6} autoFocus />
                <TouchableOpacity onPress={() => { setStep('email'); setFError('') }} style={s.backLink}>
                  <Text style={s.backLinkTxt}>← Ndrysho email-in</Text>
                </TouchableOpacity>
              </>
            )}

            {step === 'newpass' && (
              <>
                <Text style={s.mDesc}>Kodi u verifikua ✅ Cakto fjalëkalimin tënd të ri.</Text>
                <Text style={s.mLabel}>FJALËKALIMI I RI</Text>
                <TextInput style={s.mInput} value={newPass} onChangeText={setNewPass}
                  placeholder="Minimum 6 karaktere" placeholderTextColor="#aaa" secureTextEntry autoFocus />
                <Text style={s.mLabel}>KONFIRMO FJALËKALIMIN</Text>
                <TextInput style={s.mInput} value={newPassConf} onChangeText={setNewPassConf}
                  placeholder="Ripërsërit fjalëkalimin" placeholderTextColor="#aaa" secureTextEntry />
              </>
            )}

            {fError ? <Text style={s.fError}>{fError}</Text> : null}

            <TouchableOpacity
              style={[s.mBtn, fLoading && { opacity: 0.6 }]}
              onPress={step === 'email' ? sendCode : step === 'code' ? verifyCode : updatePassword}
              disabled={fLoading}
            >
              {fLoading ? <ActivityIndicator color="#fff" /> :
                <Text style={s.mBtnTxt}>
                  {step === 'email' ? 'Dërgo Kodin →' : step === 'code' ? 'Verifiko →' : 'Ndrysho Fjalëkalimin →'}
                </Text>
              }
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>
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
  btn: { backgroundColor: Colors.pine, borderRadius: 12, paddingVertical: 15, alignItems: 'center', marginBottom: 4 },
  btnText: { fontSize: 15, fontWeight: '600', color: Colors.white },
  forgotBtn: { alignItems: 'center', paddingVertical: 14 },
  forgotText: { color: Colors.aloe, fontSize: 14, fontWeight: '600' },
  switchRow: { marginTop: 4, alignItems: 'center', paddingVertical: 8 },
  switchText: { fontSize: 13, color: Colors.muted },
  modalSafe: { flex: 1, backgroundColor: Colors.alabaster },
  modalHeader: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.pine, padding: 20 },
  modalTitle: { flex: 1, fontSize: 17, fontWeight: '700', color: Colors.alabaster },
  closeBtn: { padding: 8 },
  closeTxt: { color: Colors.aloe, fontSize: 20, fontWeight: '700' },
  modalScroll: { padding: 24 },
  stepRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 28 },
  stepWrap: { flexDirection: 'row', alignItems: 'center' },
  dot: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#ddd', alignItems: 'center', justifyContent: 'center' },
  dotActive: { backgroundColor: Colors.pine },
  dotDone: { backgroundColor: Colors.aloe },
  dotTxt: { color: '#fff', fontWeight: '700' },
  dotLine: { width: 36, height: 2, backgroundColor: '#ddd', marginHorizontal: 4 },
  mDesc: { fontSize: 14, color: '#555', lineHeight: 22, marginBottom: 20 },
  mLabel: { fontSize: 10, fontWeight: '600', color: Colors.muted, letterSpacing: 1, marginBottom: 6 },
  mInput: { borderWidth: 1.5, borderColor: Colors.pine + '40', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, color: Colors.pine, marginBottom: 16, backgroundColor: '#fff' },
  codeInput: { fontSize: 32, textAlign: 'center', letterSpacing: 10, fontWeight: '700' },
  backLink: { alignItems: 'center', paddingVertical: 8 },
  backLinkTxt: { color: Colors.aloe, fontSize: 13 },
  fError: { color: Colors.goji, fontSize: 13, marginBottom: 12, textAlign: 'center' },
  mBtn: { backgroundColor: Colors.pine, borderRadius: 12, paddingVertical: 15, alignItems: 'center', marginTop: 8 },
  mBtnTxt: { color: '#fff', fontWeight: '700', fontSize: 15 },
})
