import { Alert, useEffect, useState } from 'react'
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Colors } from '../../../src/constants'
import { supabase } from '../../../src/lib/supabase'

export default function ProfileScreen() {
  const [profile, setProfile] = useState<any>(null)

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
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
              await supabase.from('scan_history').delete().eq('user_id', user.id)
              await supabase.from('tracker_entries').delete().eq('user_id', user.id)
              await supabase.from('product_selections').delete().eq('user_id', user.id)
              await supabase.from('diet_plans').delete().eq('user_id', user.id)
              await supabase.from('purchase_history').delete().eq('user_id', user.id)
              await supabase.from('profiles').delete().eq('id', user.id)
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

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <Text style={s.title}>Profili im</Text>
      </View>
      <ScrollView style={s.body}>
        <View style={s.avatarRow}>
          <View style={s.avatar}>
            <Text style={s.avatarText}>{profile?.name?.charAt(0)?.toUpperCase() || '?'}</Text>
          </View>
          <View>
            <Text style={s.name}>{profile?.name || '—'}</Text>
            <Text style={s.username}>@{profile?.username || '—'}</Text>
            {profile?.is_premium && (
              <View style={s.premiumBadge}>
                <Text style={s.premiumText}>⭐ Premium</Text>
              </View>
            )}
          </View>
        </View>

        <View style={s.infoCard}>
          <View style={s.infoRow}>
            <Text style={s.infoLabel}>Email</Text>
            <Text style={s.infoValue}>{profile?.email || '—'}</Text>
          </View>
          <View style={s.infoRow}>
            <Text style={s.infoLabel}>Statusi</Text>
            <Text style={[s.infoValue, { color: profile?.is_premium ? Colors.pine : Colors.muted }]}>
              {profile?.is_premium ? '⭐ Premium' : 'Falas'}
            </Text>
          </View>
          {profile?.plan_start && (
            <View style={s.infoRow}>
              <Text style={s.infoLabel}>Filloi</Text>
              <Text style={s.infoValue}>{new Date(profile.plan_start).toLocaleDateString('sq-AL')}</Text>
            </View>
          )}
        </View>

        <TouchableOpacity style={s.logoutBtn} onPress={handleLogout}>
          <Text style={s.logoutText}>Dil nga llogaria</Text>
        </TouchableOpacity>

        <TouchableOpacity style={s.deleteBtn} onPress={handleDeleteAccount}>
          <Text style={s.deleteText}>Fshi Llogarinë</Text>
        </TouchableOpacity>

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
  premiumBadge: { backgroundColor: Colors.pine, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, marginTop: 6, alignSelf: 'flex-start' },
  premiumText: { fontSize: 11, fontWeight: '600', color: Colors.white },
  infoCard: { backgroundColor: Colors.white, borderRadius: 14, padding: 16, marginBottom: 12 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: Colors.border },
  infoLabel: { fontSize: 13, color: Colors.muted },
  infoValue: { fontSize: 13, fontWeight: '500', color: Colors.pine },
  logoutBtn: { backgroundColor: Colors.goji, borderRadius: 12, paddingVertical: 15, alignItems: 'center', marginTop: 8 },
  logoutText: { fontSize: 15, fontWeight: '600', color: Colors.white },
  deleteBtn: { marginHorizontal: 24, marginTop: 10, borderRadius: 12, paddingVertical: 15, alignItems: 'center', borderWidth: 1, borderColor: '#cc000040' },
  deleteText: { fontSize: 14, fontWeight: '600', color: '#cc0000' },
})
