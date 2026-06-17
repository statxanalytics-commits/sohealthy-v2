import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { Colors } from '../../src/constants'

const TERMS = `KUSHTET E SHERBIMIT - SOHEALTHY

Data e hyrjes ne fuqi: 1 Janar 2025

1. PRANIMI I KUSHTEVE
Duke perdorur aplikacionin SoHealthy, ju pranoni te gjitha kushtet e meposhtme. Nese nuk i pranoni, ju lutemi mos e perdorni App-in.

2. SHERBIMET
SoHealthy ofron:
- Plane personale dietetike te gjeneruara me inteligjence artificiale
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
- App-i nuk zevendesonn keshillen mjekesore profesionale
- Konsultohuni me mjekun tuaj para cdo ndryshimi dietik
- SoHealthy nuk mban pergjegjesi per vendime te marra bazuar ne App

6. PROPRIESIA INTELEKTUALE
Te gjitha te drejtat i perkasin SoHealthy. Ndalohet riprodhimi pa leje.

7. NDRYSHIMET
SoHealthy mund te ndryshoje keto kushte me njoftim 30 dite paraprak.

8. KONTAKTI
Email: info@sohealthy.al
Website: sohealthy.al`

const PRIVACY = `POLITIKA E PRIVATESISE - SOHEALTHY

Data e hyrjes ne fuqi: 1 Janar 2025

1. TE DHENAT QE MBLEDHIM
- Emri, email-i dhe fjalekalimet tuaj
- Te dhena shendetesore: pesha, gjatesia, mosha, gjinia
- Historia e skanimit te ushqimeve
- Te dhenat e aktivitetit ne App

2. SI I PERDORIM TE DHENAT
- Per te personalizuar planin tuaj te dietes
- Per te analizuar ushqimet e skanuar
- Per te gjurmuar progresin tuaj
- Per te permiresuar sherbimet tona

3. NDARJA E TE DHENAVE
Ne NUK shesim te dhenat tuaja personale. Mund t'i ndajme me:
- Ofruesit e sherbimeve teknike (Supabase, Anthropic AI)
- Autoritetet kur kerkohet me ligj

4. SIGURIA
- Te dhenat tuaja jane te enkriptuara
- Fjalekalime ruhen te hashuara
- Komunikimet jane te sigurta (HTTPS/SSL)

5. TE DREJTAT TUAJA
Keni te drejte te:
- Aksesoni te dhenat tuaja
- Korrigjoni informacion te pasakte
- Kerkoni fshirjen e llogarise
- Kunderstoni perpunimin e te dhenave

6. MBAJTJA E TE DHENAVE
Ruajme te dhenat tuaja sa kohe qe llogaria eshte aktive + 90 dite pas fshirjes.

7. KONTAKTI
Email: privacy@sohealthy.al
Website: sohealthy.al/privacy`

type Props = {
  visible: boolean
  type: 'terms' | 'privacy'
  onClose: () => void
}

export default function LegalModal({ visible, type, onClose }: Props) {
  const isTerms = type === 'terms'
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={s.container}>
        <View style={s.header}>
          <Text style={s.title}>{isTerms ? 'Kushtet e Sherbimit' : 'Politika e Privatesise'}</Text>
          <TouchableOpacity onPress={onClose} style={s.closeBtn}>
            <Text style={s.closeText}>X</Text>
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
          <Text style={s.content}>{isTerms ? TERMS : PRIVACY}</Text>
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
  footer: { padding: 16, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#eee' },
  acceptBtn: { backgroundColor: Colors.pine, borderRadius: 12, padding: 15, alignItems: 'center' },
  acceptText: { color: Colors.alabaster, fontWeight: '700', fontSize: 15 },
})
