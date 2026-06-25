import { useEffect, useState } from 'react'
import { Alert, Linking, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Crown, Mail, BadgeCheck, CalendarDays, LogOut, Trash2, FileText, Lock, Eye, EyeOff } from 'lucide-react-native'
import { Colors } from '../../../src/constants'
import { supabase } from '../../../src/lib/supabase'

const PRIVACY_URL = 'https://sohealthy.al/privacy-policy-3/'

export default function ProfileScreen() {
  const [profile, setProfile] = useState<any>(null)
  const [authEmail, setAuthEmail] = useState<string>('')

  // Change password modal
  const [showChangePw, setShowChangePw] = useState(false)
  const [oldPass, setOldPass] = useState('')
  const [newPass, setNewPass] = useState('')
  const [newPassConf, setNewPassConf] = useState('')
  const [showOld, setShowOld] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConf, setShowConf] = useState(false)
  const [pwLoading, setPwLoading] = useState(false)
  const [pwError, setPwError] = useState('')
  const [pwSuccess, setPwSuccess] = useState(false)

  useEffect(() => { loadProfile() }, [])

  const loadProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setAuthEmail(user.email || '')
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    setProfile(data)
  }

  const handleChangePassword = async () => {
    if (!oldPass) { setPwError('Shkruaj fjalëkalimin e vjetër.'); return }
    if (!newPass) { setPwError('Shkruaj fjalëkalimin e ri.'); return }
    if (newPass.length < 6) { setPwError('Minimum 6 karaktere.'); return }
    if (newPass !== newPassConf) { setPwError('Fjalëkalimet e reja nuk përputhen.'); return }
    if (oldPass === newPass) { setPwError('Fjalëkalimi i ri duhet të jetë i ndryshëm.'); return }
    setPwLoading(true); setPwError('')
    try {
      // Verify old password by re-signing in
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: authEmail, password: oldPass
      })
      if (signInErr) { setPwError('Fjalëkalimi i vjetër është i gabuar.'); setPwLoading(false); return }
      // Update to new password
      const { error: updateErr } = await supabase.auth.updateUser({ password: newPass })
      if (updateErr) throw updateErr
      setPwSuccess(true)
      setTimeout(() => {
        setShowChangePw(false)
        setPwSuccess(false)
        setOldPass(''); setNewPass(''); setNewPassConf('')
        setPwError('')
      }, 2000)
    } catch {
      setPwError('Gabim gjatë ndryshimit. Provo përsëri.')
    } finally {
      setPwLoading(false)
    }
  }

  const resetChangePw = () => {
    setShowChangePw(false)
    setOldPass(''); setNewPass(''); setNewPassConf('')
    setPwError(''); setPwSuccess(false)
    setShowOld(false); setShowNew(false); setShowConf(false)
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
              const uid = user.id
              await supabase.from('scan_history').delete().eq('user_id', uid)
              await supabase.from('tracker_entries').delete().eq('user_id', uid)
              await supabase.from('product_selections').delete().eq('user_id', uid)
              await supabase.from('diet_plans').delete().eq('user_id', uid)
              await supabase.from('purchase_history').delete().eq('user_id', uid)
              await supabase.from('profiles').delete().eq('id', uid)
              await supabase.rpc('delete_user').then(() => {}).catch(() => {})
              await supabase.auth.signOut()
            } catch {
              await supabase.auth.signOut()
            }
          }
        }
      ]
    )
  }

  const handleLogout = async () => { await supabase.auth.signOut() }

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

        {/* Change Password */}
        <TouchableOpacity style={s.changePwBtn} onPress={() => setShowChangePw(true)}>
          <Lock size={15} color={Colors.pine} strokeWidth={2} />
          <Text style={s.changePwText}>Ndrysho Fjalëkalimin</Text>
        </TouchableOpacity>

        <TouchableOpacity style={s.logoutBtn} onPress={handleLogout}>
          <LogOut size={16} color={Colors.white} strokeWidth={2} />
          <Text style={s.logoutText}>Dil nga llogaria</Text>
        </TouchableOpacity>

        <TouchableOpacity style={s.deleteBtn} onPress={handleDeleteAccount}>
          <Trash2 size={15} color="#cc0000" strokeWidth={2} />
          <Text style={s.deleteText}>Fshi Llogarinë</Text>
        </TouchableOpacity>

        <TouchableOpacity style={s.privacyBtn} onPress={() => Linking.openURL(PRIVACY_URL)}>
          <FileText size={14} color={Colors.muted} strokeWidth={1.75} />
          <Text style={s.privacyText}>Politika e Privatësisë</Text>
        </TouchableOpacity>

        <Text style={s.footer}>SoHealthy v1.0  ·  info@sohealthy.al</Text>
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Change Password Modal */}
      <Modal visible={showChangePw} animationType="slide" presentationStyle="pageSheet" onRequestClose={resetChangePw}>
        <SafeAreaView style={s.modalSafe}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>🔒 Ndrysho Fjalëkalimin</Text>
            <TouchableOpacity onPress={resetChangePw} style={s.closeBtn}>
              <Text style={s.closeTxt}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={s.modalScroll} keyboardShouldPersistTaps="handled">
            {pwSuccess ? (
              <View style={s.successWrap}>
                <Text style={s.successText}>✅ Fjalëkalimi u ndryshua me sukses!</Text>
              </View>
            ) : (
              <>
                <Text style={s.mLabel}>FJALËKALIMI I VJETËR</Text>
                <View style={s.passWrap}>
                  <TextInput style={s.passInput} value={oldPass} onChangeText={setOldPass}
                    placeholder="Fjalëkalimi aktual" placeholderTextColor="#aaa"
                    secureTextEntry={!showOld} autoFocus />
                  <TouchableOpacity style={s.eyeBtn} onPress={() => setShowOld(v => !v)}>
                    {showOld ? <EyeOff size={18} color={Colors.muted} /> : <Eye size={18} color={Colors.muted} />}
                  </TouchableOpacity>
                </View>

                <Text style={s.mLabel}>FJALËKALIMI I RI</Text>
                <View style={s.passWrap}>
                  <TextInput style={s.passInput} value={newPass} onChangeText={setNewPass}
                    placeholder="Minimum 6 karaktere" placeholderTextColor="#aaa"
                    secureTextEntry={!showNew} />
                  <TouchableOpacity style={s.eyeBtn} onPress={() => setShowNew(v => !v)}>
                    {showNew ? <EyeOff size={18} color={Colors.muted} /> : <Eye size={18} color={Colors.muted} />}
                  </TouchableOpacity>
                </View>

                <Text style={s.mLabel}>KONFIRMO FJALËKALIMIN E RI</Text>
                <View style={s.passWrap}>
                  <TextInput style={s.passInput} value={newPassConf} onChangeText={setNewPassConf}
                    placeholder="Ripërsërit fjalëkalimin" placeholderTextColor="#aaa"
                    secureTextEntry={!showConf} />
                  <TouchableOpacity style={s.eyeBtn} onPress={() => setShowConf(v => !v)}>
                    {showConf ? <EyeOff size={18} color={Colors.muted} /> : <Eye size={18} color={Colors.muted} />}
                  </TouchableOpacity>
                </View>

                {pwError ? <Text style={s.pwError}>{pwError}</Text> : null}

                <TouchableOpacity
                  style={[s.mBtn, pwLoading && { opacity: 0.6 }]}
                  onPress={handleChangePassword}
                  disabled={pwLoading}
                >
                  {pwLoading
                    ? <ActivityIndicator color="#fff" />
                    : <Text style={s.mBtnTxt}>Ndrysho Fjalëkalimin →</Text>
                  }
                </TouchableOpacity>
              </>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>
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
  changePwBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Colors.white, borderRadius: 12, paddingVertical: 15, marginBottom: 10, borderWidth: 1.5, borderColor: Colors.border },
  changePwText: { fontSize: 14, fontWeight: '600', color: Colors.pine },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Colors.goji, borderRadius: 12, paddingVertical: 15, marginTop: 2 },
  logoutText: { fontSize: 15, fontWeight: '600', color: Colors.white },
  deleteBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginHorizontal: 24, marginTop: 10, borderRadius: 12, paddingVertical: 15, borderWidth: 1, borderColor: '#cc000040' },
  deleteText: { fontSize: 14, fontWeight: '600', color: '#cc0000' },
  privacyBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 16, paddingVertical: 10 },
  privacyText: { fontSize: 13, color: Colors.muted, textDecorationLine: 'underline' },
  footer: { textAlign: 'center', fontSize: 11, color: Colors.muted, opacity: 0.7, marginTop: 8 },
  // Modal
  modalSafe: { flex: 1, backgroundColor: Colors.alabaster },
  modalHeader: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.pine, padding: 20 },
  modalTitle: { flex: 1, fontSize: 17, fontWeight: '700', color: Colors.alabaster },
  closeBtn: { padding: 8 },
  closeTxt: { color: Colors.aloe, fontSize: 20, fontWeight: '700' },
  modalScroll: { padding: 24 },
  mLabel: { fontSize: 10, fontWeight: '600', color: Colors.muted, letterSpacing: 1, marginBottom: 8 },
  passWrap: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: Colors.border, borderRadius: 12, marginBottom: 16, backgroundColor: Colors.white },
  passInput: { flex: 1, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, color: Colors.pine },
  eyeBtn: { paddingHorizontal: 14, paddingVertical: 10 },
  pwError: { color: Colors.goji, fontSize: 13, marginBottom: 12, textAlign: 'center' },
  mBtn: { backgroundColor: Colors.pine, borderRadius: 12, paddingVertical: 15, alignItems: 'center', marginTop: 8 },
  mBtnTxt: { color: '#fff', fontWeight: '700', fontSize: 15 },
  successWrap: { alignItems: 'center', paddingVertical: 60 },
  successText: { fontSize: 16, color: Colors.pine, fontWeight: '600', textAlign: 'center' },
})
