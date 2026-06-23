import { Linking, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { Colors } from '../../src/constants'

const PRIVACY_URL = 'https://sohealthy.al/privacy-policy-3/'

const TERMS = `KUSHTET E SHERBIMIT - SOHEALTHY

Data e hyrjes ne fuqi: 1 Janar 2025

1. PRANIMI I KUSHTEVE
Duke perdorur aplikacionin SoHealthy, ju pranoni te gjitha kushtet e meposhtme. Nese nuk i pranoni, ju lutemi mos e perdorni App-in.

2. SHERBIMET
SoHealthy ofron:
- Plane personale dietetike te personalizuara nga nutritionisti
- Skanim ushqimor me analize kalorish dhe makrosh
- Tracker ditor i kalorive dhe peshe
- Produkte wellness dhe suplemente ushqimore

3. LLOGARITE DHE SIGURIA
- Ju jeni pergjegjes per sigurine e fjalekalimit tuaj
- Kodi i aktivizimit eshte personal dhe nuk mund te transferohet
- Cdo kod aktivizimi mund te perdoret vetem nje here
- SoHealthy rezervon te drejten te caktivizoje llogarite

4. SHERBIMET PREMIUM
- Plani i dietes gjenerohet automatikisht bazuar ne informacionin qe jepni
- Rezultatet mund te ndryshojne nga personi ne person
- SoHealthy nuk garanton humbje specifike peshe

5. KUFIZIMI I PERGJEGJESISE
- App-i nuk zevendëson këshillen mjekesore profesionale
- Konsultohuni me mjekun tuaj para cdo ndryshimi dietik
- SoHealthy nuk mban pergjegjesi per vendime te marra bazuar ne App

6. PROPRIESIA INTELEKTUALE
Te gjitha te drejtat i perkasin SoHealthy. Ndalohet riprodhimi pa leje.

7. NDRYSHIMET
SoHealthy mund te ndryshoje keto kushte me njoftim 30 dite paraprak.

8. KONTAKTI
Email: info@sohealthy.al
Website: sohealthy.al`

type Props = {
  visible: boolean
  type: 'terms' | 'privacy'
  onClose: () => void
}

export default function LegalModal({ visible, type, onClose }: Props) {
  const isPrivacy = type === 'privacy'

  // Privacy policy opens the live hosted page instead of showing old inline text
  if (isPrivacy) {
    return (
      <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
        <View style={s.container}>
          <View style={s.header}>
            <Text style={s.title}>Politika e Privatësisë</Text>
            <TouchableOpacity onPress={onClose} style={s.closeBtn}>
              <Text style={s.closeText}>X</Text>
            </TouchableOpacity>
          </View>
          <View style={s.center}>
            <Text style={s.privacyDesc}>
              Politika e plotë e privatësisë është e disponueshme në faqen tonë.
            </Text>
            <TouchableOpacity
              style={s.openBtn}
              onPress={() => { Linking.openURL(PRIVACY_URL); onClose() }}
            >
              <Text style={s.openBtnText}>Hap Politiken e Privatësisë →</Text>
            </TouchableOpacity>
          </View>
          <View style={s.footer}>
            <TouchableOpacity style={s.acceptBtn} onPress={onClose}>
              <Text style={s.acceptText}>Kuptova</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    )
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={s.container}>
        <View style={s.header}>
          <Text style={s.title}>Kushtet e Sherbimit</Text>
          <TouchableOpacity onPress={onClose} style={s.closeBtn}>
            <Text style={s.closeText}>X</Text>
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
          <Text style={s.content}>{TERMS}</Text>
          <View style={{ height: 40 }} />
        </ScrollView>
        <View style={s.footer}>
          <TouchableOpacity style={s.acceptBtn} onPress={onClose}>
            <Text style={s.acceptText}>Kuptova</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.alabaster },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 20, backgroundColor: Colors.pine,
  },
  title: { fontSize: 18, fontWeight: '700', color: Colors.alabaster, flex: 1 },
  closeBtn: { padding: 8 },
  closeText: { color: Colors.aloe, fontSize: 18, fontWeight: '700' },
  scroll: { padding: 20 },
  content: { fontSize: 14, color: '#333', lineHeight: 24 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  privacyDesc: { fontSize: 15, color: Colors.muted, textAlign: 'center', lineHeight: 23, marginBottom: 24 },
  openBtn: {
    backgroundColor: Colors.pine, borderRadius: 12,
    paddingHorizontal: 28, paddingVertical: 15,
  },
  openBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  footer: { padding: 16, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#eee' },
  acceptBtn: { backgroundColor: Colors.pine, borderRadius: 12, padding: 15, alignItems: 'center' },
  acceptText: { color: Colors.alabaster, fontWeight: '700', fontSize: 15 },
})
