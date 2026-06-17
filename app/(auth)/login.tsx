import { useRouter } from 'expo-router'
import { useState } from 'react'
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Colors } from '../../src/constants'
import { supabase } from '../../src/lib/supabase'

export default function LoginScreen() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      Alert.alert('Email i nevojshëm', 'Shkruaj email-in tënd më sipër dhe kliko "Harrova fjalëkalimin".')
      return
    }
    setLoading(true)
    const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: 'sohealthy://reset-password',
    })
    setLoading(false)
    if (err) {
      Alert.alert('Gabim', err.message)
    } else {
      Alert.alert(
        'Email u dërgua ✅',
        'Kontrollo email-in tënd për linkun e rivendosjes së fjalëkalimit.',
        [{ text: 'OK' }]
      )
    }
  }

  const handleLogin = async () => {
    if (!email || !password) { setError('Plotëso të gjitha fushat.'); return }
    setLoading(true); setError('')
    const { error: err } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password })
    if (err) setError(err.message)
    setLoading(false)
  }

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()}><Text style={s.back}>← Kthehu</Text></TouchableOpacity>
        <Text style={s.title}>Hyr në llogari</Text>
        <Text style={s.subtitle}>Mirë se u ktheve</Text>
      </View>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={s.form} keyboardShouldPersistTaps="handled">
          <Text style={s.label}>EMAIL</Text>
          <TextInput style={s.input} value={email} onChangeText={setEmail} placeholder="adresa@email.com" placeholderTextColor={Colors.mutedLight} autoCapitalize="none" keyboardType="email-address" />
          <Text style={s.label}>FJALËKALIMI</Text>
          <TextInput style={s.input} value={password} onChangeText={setPassword} placeholder="••••••••" placeholderTextColor={Colors.mutedLight} secureTextEntry />
          <TouchableOpacity
            style={{ alignSelf: 'flex-end', marginBottom: 16, padding: 8 }}
            onPress={handleForgotPassword}
            hitSlop={{ top: 12, bottom: 12, left: 20, right: 20 }}
          >
            <Text style={{ color: Colors.aloe, fontSize: 13, fontWeight: '600' }}>Harrova fjalëkalimin?</Text>
          </TouchableOpacity>
          {error ? <Text style={s.error}>{error}</Text> : null}
          <TouchableOpacity style={[s.btn, loading && { opacity: 0.6 }]} onPress={handleLogin} disabled={loading}>
            {loading ? <ActivityIndicator color={Colors.white} /> : <Text style={s.btnText}>Hyr →</Text>}
          </TouchableOpacity>
          <TouchableOpacity style={s.switchRow} onPress={() => router.push('/(auth)/signup')}>
            <Text style={s.switchText}>Nuk ke llogari? <Text style={{ fontWeight: '700', color: Colors.pine }}>Regjistrohu falas</Text></Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
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
  switchRow: { marginTop: 20, alignItems: 'center' },
  switchText: { fontSize: 13, color: Colors.muted },
})
