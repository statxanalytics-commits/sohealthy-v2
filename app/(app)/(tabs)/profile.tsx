import { useEffect, useState } from 'react'
import { Alert, Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Crown, Mail, BadgeCheck, CalendarDays, LogOut, Trash2, FileText } from 'lucide-react-native'
import { Colors } from '../../../src/constants'
import { supabase } from '../../../src/lib/supabase'

const PRIVACY_URL = 'https://sohealthy.al/privacy-policy-3/'

export default function ProfileScreen() {
  const [profile, setProfile] = useState<any>(null)
  const [authEmail, setAuthEmail] = useState<string>('')

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    // Email-i gjithmonë ekziston te auth user -> fallback i sigurt
    setAuthEmail(user.email || '')
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    setProfile(data)
  }

  const handleDeleteAccount = () => {
    Alert.alert(
      'Fshi Llogarinë',
      'Jeni të sigurt? Ky veprim është i pakthyeshëm dhe të gjitha të dhënat tuaja do të fshihen.',
      [
        { text: 'Anulo', style: 'cancel' },
        {
          text: 'Fshi Llogarinë',
          style: 'destructive',
          onPress: async () => {
            try {
              const { data: { user } } = await supabase.auth.getUser()
              if (!user) return
              // delete_user() RPC (SECURITY DEFINER) fshin të gjitha të dhënat + vetë llogarinë auth.users
              const { error } = await supabase.rpc('delete_user')
              if (error) throw error
              await supabase.auth.signOut()
            } catch (e) {
              Alert.alert('Gabim', 'Nuk u fshi llogaria. Kontaktoni info@sohealthy.al')
            }
          }
        }
      ]
    )
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  // Vlerat e shfaqura me fallback nga auth nese profiles eshte bosh
  const displayEmail = profile?.email || authEmail || '—'
  const displayName = profile?.name || (authEmail ? authEmail.split('@')[0] : '—')
  const displayUsername = profile?.username || (authEmail ? authEmail.split('@')[0] : '—')
  const avatarLetter = (profile?.name || authEmail || '?').charAt(0).toUpperCase()

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <Text style={s.title}>Profili im</Text>
      </View>
      <ScrollView style={s.body}>
        <View style={s.avatarRow}>
          <View style={s.avatar}>
            <Text style={s.avatarText}>{avatarLetter}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.name}>{displayName}</Text>
            <Text style={s.username}>@{displayUsername}</Text>
            {profile?.is_premium && (
              <View style={s.premiumBadge}>
                <Crown size={11} color={Colors.white} strokeWidth={2} />
                <Text style={s.premiumText}>Premium</Text>
              </View>
            )}
          </View>
        </View>

        <View style={s.infoCard}>
          <View style={s.infoRow}>
            <View style={s.infoLabelRow}><Mail size={15} color={Colors.muted} strokeWidth={1.75} /><Text style={s.infoLabel}>Email</Text></View>
            <Text style={s.infoValue}>{displayEmail}</Text>
          </View>
          <View style={s.infoRow}>
            <View style={s.infoLabelRow}><BadgeCheck size={15} color={Colors.muted} strokeWidth={1.75} /><Text style={s.infoLabel}>Statusi</Text></View>
            {profile?.is_premium ? (
              <View style={s.statusVal}>
                <Crown size={13} color={Colors.pine} strokeWidth={2} />
                <Text style={[s.infoValue, { color: Colors.pine }]}>Premium</Text>
              </View>
            ) : (
              <Text style={[s.infoValue, { color: Colors.muted }]}>Falas</Text>
            )}
          </View>
          {profile?.plan_start && (
            <View style={[s.infoRow, { borderBottomWidth: 0 }]}>
              <View style={s.infoLabelRow}><CalendarDays size={15} color={Colors.muted} strokeWidth={1.75} /><Text style={s.infoLabel}>Filloi</Text></View>
              <Text style={s.infoValue}>{new Date(profile.plan_start).toLocaleDateString('sq-AL')}</Text>
            </View>
          )}
        </View>

        <TouchableOpacity style={s.logoutBtn} onPress={handleLogout}>
          <LogOut size={16} color={Colors.white} strokeWidth={2} />
          <Text style={s.logoutText}>Dil nga llogaria</Text>
        </TouchableOpacity>

        <TouchableOpacity style={s.deleteBtn} onPress={handleDeleteAccount}>
          <Trash2 size={15} color="#cc0000" strokeWidth={2} />
          <Text style={s.deleteText}>Fshi Llogarinë</Text>
        </TouchableOpacity>

        {/* Privacy Policy link — required for App Store */}
        <TouchableOpacity style={s.privacyBtn} onPress={() => Linking.openURL(PRIVACY_URL)}>
          <FileText size={14} color={Colors.muted} strokeWidth={1.75} />
          <Text style={s.privacyText}>Politika e Privatësisë</Text>
        </TouchableOpacity>

        <Text style={s.footer}>SoHealthy v1.0  ·  info@sohealthy.al</Text>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.alabaster },
  header: { backgroundColor: Colors.pine, paddingHorizontal: 20, paddingTop: 8, paddingBottom: 20 },
  title: { fontSize: 18, fontWeight: '700', color: Colors.white },
  body: { flex: 1, padding: 16 },
  avatarRow: { flexDirection: 'row', alignItems: 'center', gap: 16, backgroundColor: Colors.white, borderRadius: 14, padding: 16, marginBottom: 12 },
  avatar: { width: 60, height: 60, borderRadius: 30, backgroundColor: Colors.aloe, justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 26, fontWeight: '700', color: Colors.pine },
  name: { fontSize: 18, fontWeight: '700', color: Colors.pine },
  username: { fontSize: 13, color: Colors.muted, marginTop: 2 },
  premiumBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.pine, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, marginTop: 6, alignSelf: 'flex-start' },
  premiumText: { fontSize: 11, fontWeight: '600', color: Colors.white },
  infoCard: { backgroundColor: Colors.white, borderRadius: 14, padding: 16, marginBottom: 12 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: Colors.border },
  infoLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  infoLabel: { fontSize: 13, color: Colors.muted },
  infoValue: { fontSize: 13, fontWeight: '500', color: Colors.pine },
  statusVal: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Colors.goji, borderRadius: 12, paddingVertical: 15, marginTop: 8 },
  logoutText: { fontSize: 15, fontWeight: '600', color: Colors.white },
  deleteBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginHorizontal: 24, marginTop: 10, borderRadius: 12, paddingVertical: 15, borderWidth: 1, borderColor: '#cc000040' },
  deleteText: { fontSize: 14, fontWeight: '600', color: '#cc0000' },
  privacyBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 16, paddingVertical: 10 },
  privacyText: { fontSize: 13, color: Colors.muted, textDecorationLine: 'underline' },
  footer: { textAlign: 'center', fontSize: 11, color: Colors.muted, opacity: 0.7, marginTop: 8 },
})
