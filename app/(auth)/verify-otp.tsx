import { useLocalSearchParams, useRouter } from 'expo-router'
import { useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator, KeyboardAvoidingView, Platform,
  StyleSheet, Text, TextInput, TouchableOpacity, View
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Colors } from '../../src/constants'
import { supabase } from '../../src/lib/supabase'
import HelpButton from '../../src/components/HelpButton'

export default function VerifyOtpScreen() {
  const router = useRouter()
  // name/username are passed from signup so we can create the profile row once the user is logged in
  const { email, name, username } = useLocalSearchParams<{ email: string; name?: string; username?: string }>()
  const [code, setCode] = useState(['', '', '', '', '', ''])
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [countdown, setCountdown] = useState(60)
  const inputRefs = useRef<(TextInput | null)[]>([])
  // Guards against a double verifyOtp (auto-submit on 6th digit + manual button tap) —
  // a second call reuses the already-consumed token and looks like a "wrong code".
  const submittingRef = useRef(false)

  // Countdown timer for resend
  useEffect(() => {
    if (countdown <= 0) return
    const timer = setTimeout(() => setCountdown(c => c - 1), 1000)
    return () => clearTimeout(timer)
  }, [countdown])

  // Handles single typed digits AND multi-digit paste / iOS "From Mail" autofill.
  // Boxes use maxLength={6} + a controlled single-char value, so the field shows one
  // digit while still letting onChangeText receive the full 6-digit string to distribute.
  function handleChange(val: string, idx: number) {
    const digits = val.replace(/[^0-9]/g, '')

    // Deletion (box cleared)
    if (digits.length === 0) {
      const newCode = [...code]
      newCode[idx] = ''
      setCode(newCode)
      return
    }

    // Multi-digit: paste or one-time-code autofill → spread across the boxes.
    if (digits.length > 1) {
      const startIdx = digits.length >= 6 ? 0 : idx // a full code lands from the start, wherever it was dropped
      const newCode = [...code]
      let writeIdx = startIdx
      for (const d of digits) {
        if (writeIdx > 5) break
        newCode[writeIdx] = d
        writeIdx++
      }
      setCode(newCode)
      setError('')
      const nextEmpty = newCode.findIndex(c => !c)
      const focusIdx = nextEmpty === -1 ? 5 : nextEmpty
      inputRefs.current[focusIdx]?.focus()
      if (newCode.every(c => c)) {
        inputRefs.current[focusIdx]?.blur()
        verifyCode(newCode.join(''))
      }
      return
    }

    // Single digit
    const digit = digits
    const newCode = [...code]
    newCode[idx] = digit
    setCode(newCode)
    setError('')

    if (idx < 5) {
      inputRefs.current[idx + 1]?.focus()
    } else {
      const full = newCode.join('')
      if (full.length === 6 && newCode.every(c => c)) {
        inputRefs.current[idx]?.blur()
        verifyCode(full)
      }
    }
  }

  function handleKeyPress(e: any, idx: number) {
    if (e.nativeEvent.key === 'Backspace' && !code[idx] && idx > 0) {
      inputRefs.current[idx - 1]?.focus()
    }
  }

  async function verifyCode(otp?: string) {
    const token = otp || code.join('')
    if (token.length < 6) { setError('Fut të 6 shifrat e kodit.'); return }
    if (submittingRef.current) return // prevent double submit
    submittingRef.current = true
    setLoading(true); setError('')
    const { data, error: err } = await supabase.auth.verifyOtp({
      email: email,
      token,
      type: 'signup'
    })
    if (err) {
      const errCode = (err as any).code || ''
      const msg = (err.message || '').toLowerCase()
      if (errCode === 'otp_expired' || msg.includes('expired')) {
        setError('Kodi ka skaduar. Kërko një kod të ri më poshtë.')
      } else if (errCode === 'over_request_rate_limit' || err.status === 429) {
        setError('Shumë përpjekje. Prit pak minuta dhe provo përsëri.')
      } else if (msg.includes('network')) {
        setError('Nuk ka lidhje me internetin. Kontrollo dhe provo përsëri.')
      } else {
        setError('Kodi i gabuar. Kontrollo shifrat dhe provo përsëri.')
      }
      setLoading(false)
      submittingRef.current = false
      setCode(['', '', '', '', '', ''])
      inputRefs.current[0]?.focus()
      return
    }
    // Logged in now → make sure the profile row exists (DB trigger also creates it; this is a safety net).
    const user = data?.user ?? data?.session?.user
    if (user) {
      try {
        await supabase.from('profiles').upsert({
          id: user.id,
          name: name || (user.user_metadata as any)?.name || '',
          username: username || (user.user_metadata as any)?.username || '',
          email: email,
          is_premium: false,
        }, { onConflict: 'id' })
      } catch {}
    }
    setLoading(false)
    submittingRef.current = false
    // Success — navigate to app
    router.replace('/(app)/(tabs)/')
  }

  async function resendCode() {
    if (countdown > 0) return
    setResending(true); setError(''); setSuccess('')
    const { error: err } = await supabase.auth.resend({ type: 'signup', email })
    setResending(false)
    if (err) {
      const rl = (err as any).code === 'over_email_send_rate_limit' || err.status === 429
      setError(rl ? 'Shumë kërkesa. Prit disa minuta para se ta kërkosh përsëri.' : 'Nuk u dërgua kodi. Provo përsëri.')
      return
    }
    setSuccess('Kodi u dërgua përsëri!')
    setCountdown(60)
    setCode(['', '', '', '', '', ''])
    inputRefs.current[0]?.focus()
  }

  const maskedEmail = email
    ? email.replace(/(.{2})(.*)(@.*)/, (_, a, b, c) => a + '*'.repeat(Math.min(b.length, 4)) + c)
    : ''

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={s.back}>← Kthehu</Text>
        </TouchableOpacity>
        <Text style={s.title}>Konfirmo email-in</Text>
        <Text style={s.subtitle}>Kemi dërguar një kod 6-shifror te{'\n'}{maskedEmail}</Text>
        <HelpButton style={s.help} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={s.body}>
          <Text style={s.codeLabel}>KODI I KONFIRMIMIT</Text>

          {/* OTP input boxes */}
          <View style={s.otpRow}>
            {code.map((digit, idx) => (
              <TextInput
                key={idx}
                ref={el => { inputRefs.current[idx] = el }}
                style={[s.otpBox, digit ? s.otpBoxFilled : null, error ? s.otpBoxError : null]}
                value={digit}
                onChangeText={val => handleChange(val, idx)}
                onKeyPress={e => handleKeyPress(e, idx)}
                keyboardType="number-pad"
                maxLength={6}
                textContentType="oneTimeCode"
                autoComplete="sms-otp"
                importantForAutofill="yes"
                selectTextOnFocus
                textAlign="center"
                autoFocus={idx === 0}
              />
            ))}
          </View>

          {error ? <Text style={s.error}>{error}</Text> : null}
          {success ? <Text style={s.successMsg}>{success}</Text> : null}

          {/* Verify button */}
          <TouchableOpacity
            style={[s.btn, (loading || code.join('').length < 6) && { opacity: 0.5 }]}
            onPress={() => verifyCode()}
            disabled={loading || code.join('').length < 6}
          >
            {loading
              ? <ActivityIndicator color={Colors.white} />
              : <Text style={s.btnText}>Konfirmo llogarinë →</Text>
            }
          </TouchableOpacity>

          {/* Resend */}
          <View style={s.resendRow}>
            <Text style={s.resendText}>Nuk e more kodin? </Text>
            <TouchableOpacity onPress={resendCode} disabled={countdown > 0 || resending}>
              {resending
                ? <ActivityIndicator size="small" color={Colors.pine} />
                : <Text style={[s.resendLink, countdown > 0 && s.resendDisabled]}>
                    {countdown > 0 ? `Ridërgo (${countdown}s)` : 'Ridërgo kodin'}
                  </Text>
              }
            </TouchableOpacity>
          </View>

          <Text style={s.hint}>
            Kontrollo edhe dosjen Spam nëse nuk e gjen email-in. Përdor kodin më të fundit — kodet e vjetra nuk vlejnë.
          </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.pine },
  header: { paddingHorizontal: 24, paddingTop: 12, paddingBottom: 28 },
  back: { color: Colors.aloe, fontSize: 14, marginBottom: 16 },
  help: { position: 'absolute', right: 24, top: 12 },
  title: { fontSize: 26, fontWeight: '700', color: '#fff', marginBottom: 8 },
  subtitle: { fontSize: 13, color: Colors.aloe, lineHeight: 20 },
  body: {
    flex: 1, backgroundColor: '#fff',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 28,
  },
  codeLabel: {
    fontSize: 10, fontWeight: '600', color: '#6B7F72',
    letterSpacing: 1.5, marginBottom: 16,
  },
  otpRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    marginBottom: 24, gap: 8,
  },
  otpBox: {
    flex: 1, height: 60, borderRadius: 12,
    borderWidth: 2, borderColor: '#E2E8E4',
    fontSize: 24, fontWeight: '700', color: Colors.pine,
    backgroundColor: '#F8FAF8',
  },
  otpBoxFilled: {
    borderColor: Colors.pine,
    backgroundColor: '#fff',
  },
  otpBoxError: {
    borderColor: Colors.goji,
  },
  error: { color: Colors.goji, fontSize: 13, marginBottom: 16, textAlign: 'center' },
  successMsg: { color: '#2E7D32', fontSize: 13, marginBottom: 16, textAlign: 'center' },
  btn: {
    backgroundColor: Colors.pine, borderRadius: 12,
    paddingVertical: 15, alignItems: 'center', marginBottom: 20,
  },
  btnText: { fontSize: 15, fontWeight: '600', color: '#fff' },
  resendRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  resendText: { fontSize: 13, color: '#6B7F72' },
  resendLink: { fontSize: 13, fontWeight: '600', color: Colors.pine },
  resendDisabled: { color: '#9EB5A5' },
  hint: { fontSize: 11, color: '#9EB5A5', textAlign: 'center', lineHeight: 16 },
})
