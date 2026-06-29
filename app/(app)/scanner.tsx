import { useEffect, useState } from 'react'
import {
  ActivityIndicator, Modal, ScrollView, StyleSheet, Text,
  TouchableOpacity, View, Image, Alert
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import * as ImagePicker from 'expo-image-picker'
import { ScanLine, Utensils, Camera, Image as ImageIcon, AlertTriangle, CheckCircle, Zap, Sparkles, Footprints, Clock } from 'lucide-react-native'
import type { LucideIcon } from 'lucide-react-native'
import { API, Colors } from '../../src/constants'
import { supabase } from '../../src/lib/supabase'

type FoodItem = {
  name: string
  portion: string
  calories: number
  protein: number
  carbs: number
  fat: number
  fiber: number
  sugar: number
}

type ScanResult = {
  total: { calories: number; protein: number; carbs: number; fat: number; fiber: number; sugar: number }
  items: FoodItem[]
}

type PlateRating = {
  score: number
  label: string
  Icon: LucideIcon
  color: string
  description: string
}

const DEFAULT_WEIGHT = 70 // kg — fallback if user has no saved weight

// Steps needed to burn given calories for a person of `weightKg`.
// Walking burns ~0.0005 kcal per step per kg of body weight.
// e.g. 70kg person burns ~0.035 kcal/step → 500 kcal ≈ 14,300 steps.
function stepsToBurn(calories: number, weightKg: number): number {
  const kcalPerStep = 0.0005 * weightKg
  if (kcalPerStep <= 0) return 0
  return Math.round(calories / kcalPerStep)
}

// Approx walking minutes: average cadence ~100 steps/min at a moderate pace.
function walkMinutes(steps: number): number {
  return Math.round(steps / 100)
}

function formatSteps(n: number): string {
  return n.toLocaleString('de-DE') // dot thousands separator: 14.300
}

function formatDuration(mins: number): string {
  if (mins < 60) return `${mins} min`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m === 0 ? `${h} orë` : `${h} orë ${m} min`
}

function ratePlate(t: ScanResult['total']): PlateRating {
  let score = 100
  const issues: string[] = []
  const positives: string[] = []
  if (t.sugar > 25) { score -= 25; issues.push(`sheqer i lartë (${t.sugar}g)`) }
  else if (t.sugar > 15) { score -= 12 }
  if (t.fat > 35) { score -= 20; issues.push(`yndyrna të larta (${t.fat}g)`) }
  else if (t.fat > 25) { score -= 10 }
  if (t.fiber < 2) { score -= 20; issues.push(`fibra shumë e ulët (${t.fiber}g)`) }
  else if (t.fiber < 4) { score -= 10 }
  if (t.protein < 10) { score -= 20; issues.push(`proteina shumë të ulëta (${t.protein}g)`) }
  else if (t.protein < 18) { score -= 10 }
  if (t.calories > 800) { score -= 15 }
  if (t.protein >= 25) { score += 5; positives.push(`proteina të mira (${t.protein}g)`) }
  if (t.fiber >= 6) { score += 5; positives.push(`fibra e mirë (${t.fiber}g)`) }
  if (t.calories >= 300 && t.calories <= 550) { score += 5 }
  score = Math.max(0, Math.min(100, score))
  if (score >= 75) return { score, label: 'E Shëndetshme', Icon: CheckCircle, color: Colors.aloe, description: positives.length > 0 ? `Vakt i ekuilibruar. ${positives.join(', ')}.` : 'Vakt me makro të mira.' }
  if (score >= 45) return { score, label: 'Mesatare', Icon: Zap, color: '#D58D3C', description: issues.length > 0 ? `Ka hapësirë: ${issues.slice(0, 2).join(', ')}.` : 'Vakt me disa çekuilibra.' }
  return { score, label: 'Duhet Përmirësuar', Icon: AlertTriangle, color: Colors.goji, description: issues.length > 0 ? `Probleme: ${issues.slice(0, 3).join(', ')}.` : 'Ky vakt ka çekuilibra.' }
}

async function saveScan(result: ScanResult, rating: PlateRating) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const foodNames = result.items.map(i => i.name).join(', ')
    await supabase.from('scan_history').insert({
      user_id: user.id,
      food_name: foodNames,
      calories: result.total.calories,
      protein_g: result.total.protein,
      carbs_g: result.total.carbs,
      fat_g: result.total.fat,
      items: result.items,
      rating: rating.label,
      scanned_at: new Date().toISOString(),
    })
  } catch (e) {
    console.log('Save scan error:', e)
  }
}

export default function ScannerScreen() {
  const router = useRouter()
  const [state, setState] = useState<'home' | 'loading' | 'result' | 'error'>('home')
  const [showAIDisclosure, setShowAIDisclosure] = useState(false)
  const [imageUri, setImageUri] = useState<string | null>(null)
  const [result, setResult] = useState<ScanResult | null>(null)
  const [plate, setPlate] = useState<PlateRating | null>(null)
  const [errMsg, setErrMsg] = useState<string | null>(null)
  const [userWeight, setUserWeight] = useState<number>(DEFAULT_WEIGHT)
  const [hasRealWeight, setHasRealWeight] = useState(false)

  useEffect(() => { loadUserWeight() }, [])

  // Pull the user's latest weight: first from tracker_entries (weight:X),
  // falling back to the default if none is saved.
  async function loadUserWeight() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: weightData } = await supabase
        .from('tracker_entries')
        .select('date, product_slug')
        .eq('user_id', user.id)
        .ilike('product_slug', 'weight:%')
        .order('date', { ascending: false })
        .limit(1)
      const raw = weightData?.[0]?.product_slug
      if (raw) {
        const w = parseFloat(raw.replace('weight:', ''))
        if (!isNaN(w) && w > 0) { setUserWeight(w); setHasRealWeight(true) }
      }
    } catch (e) {
      console.log('Weight load error:', e)
    }
  }

  async function pickImage(useCamera: boolean) {
    try {
      let picked
      if (useCamera) {
        const { status } = await ImagePicker.requestCameraPermissionsAsync()
        if (status !== 'granted') { Alert.alert('Leje e nevojshme', 'Na duhet leje për kamerën tuaj.'); return }
        picked = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.7, base64: true })
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
        if (status !== 'granted') { Alert.alert('Leje e nevojshme', 'Na duhet leje për galerinë tuaj.'); return }
        picked = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7, base64: true })
      }
      if (!picked.canceled && picked.assets[0]) {
        const asset = picked.assets[0]
        setImageUri(asset.uri)
        await analyzeImage(asset.base64!, asset.mimeType || 'image/jpeg')
      }
    } catch (e) {
      setErrMsg('Gabim gjatë zgjedhjes së fotografisë.')
      setState('error')
    }
  }

  async function analyzeImage(base64: string, mimeType: string) {
    setState('loading')
    setErrMsg(null)
    try {
      const response = await fetch(API.scanner, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64, mimeType })
      })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const parsed: ScanResult = await response.json()
      if ((parsed as any).error) throw new Error((parsed as any).error)
      const rating = ratePlate(parsed.total)
      await saveScan(parsed, rating)
      setResult(parsed)
      setPlate(rating)
      setState('result')
    } catch (e: any) {
      setErrMsg('Gabim gjatë analizës. Provo përsëri.')
      setState('error')
    }
  }

  function goHome() {
    setState('home'); setImageUri(null); setResult(null); setPlate(null); setErrMsg(null)
  }

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Text style={s.backText}>‹ Kthehu</Text>
        </TouchableOpacity>
        <View style={s.titleRow}><ScanLine size={18} color={Colors.alabaster} strokeWidth={1.75} /><Text style={s.title}>Skaner Ushqimor</Text></View>
      </View>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {state === 'home' && (
          <View style={s.card}>
            <View style={s.iconCircle}><Utensils size={40} color={Colors.pine} strokeWidth={1.5} /></View>
            <Text style={s.cardTitle}>Analizo Pjatën Tënde</Text>
            <Text style={s.cardDesc}>Fotografo pjatën dhe merr analizën e plotë të kalorive dhe makrove në sekonda.</Text>
            <TouchableOpacity style={s.primaryBtn} onPress={() => pickImage(true)}>
              <Camera size={17} color={Colors.alabaster} strokeWidth={2} /><Text style={s.primaryBtnText}>Bëj Foto</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.secondaryBtn} onPress={() => pickImage(false)}>
              <ImageIcon size={17} color={Colors.pine} strokeWidth={2} /><Text style={s.secondaryBtnText}>Ngarko nga Galeria</Text>
            </TouchableOpacity>
          </View>
        )}

        {state === 'loading' && (
          <View style={[s.card, s.centerCard]}>
            {imageUri && <Image source={{ uri: imageUri }} style={s.previewImg} />}
            <ActivityIndicator size="large" color={Colors.pine} style={{ marginTop: 24 }} />
            <Text style={s.loadingTitle}>Duke analizuar...</Text>
            <Text style={s.loadingDesc}>Po identifikon ushqimet dhe llogarit makrot</Text>
          </View>
        )}

        {state === 'error' && (
          <View style={[s.card, s.centerCard]}>
            <View style={[s.iconCircle, { backgroundColor: Colors.goji + '15' }]}><AlertTriangle size={40} color={Colors.goji} strokeWidth={1.5} /></View>
            <Text style={s.cardTitle}>Ndodhi një gabim</Text>
            <Text style={[s.cardDesc, { color: Colors.goji }]}>{errMsg}</Text>
            <TouchableOpacity style={s.primaryBtn} onPress={goHome}>
              <Text style={s.primaryBtnText}>← Provo Përsëri</Text>
            </TouchableOpacity>
          </View>
        )}

        {state === 'result' && result && plate && (
          <>
            {imageUri && <Image source={{ uri: imageUri }} style={s.resultImg} />}
            <View style={s.calorieCard}>
              <Text style={s.calorieLabel}>KY VAKT</Text>
              <Text style={s.calorieNum}>{result.total.calories} <Text style={s.calorieUnit}>kcal</Text></Text>
              <View style={s.macroGrid}>
                {[['Proteina', result.total.protein], ['Karbohidrate', result.total.carbs], ['Yndyrna', result.total.fat], ['Fibra', result.total.fiber], ['Sheqeri', result.total.sugar]].map(([l, v]) => (
                  <View key={l as string} style={s.macroBadge}>
                    <Text style={s.macroLabel}>{l}</Text>
                    <Text style={s.macroVal}>{v}<Text style={s.macroUnit}>g</Text></Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Walk-to-burn card */}
            {(() => {
              const steps = stepsToBurn(result.total.calories, userWeight)
              const mins = walkMinutes(steps)
              return (
                <View style={s.walkCard}>
                  <View style={s.walkIconWrap}>
                    <Footprints size={24} color={Colors.alabaster} strokeWidth={1.75} />
                  </View>
                  <View style={s.walkBody}>
                    <Text style={s.walkLabel}>SA DUHET TË ECËSH</Text>
                    <Text style={s.walkSteps}>{formatSteps(steps)} <Text style={s.walkStepsUnit}>hapa</Text></Text>
                    <View style={s.walkTimeRow}>
                      <Clock size={13} color={Colors.aloe} strokeWidth={2} />
                      <Text style={s.walkTime}>~{formatDuration(mins)} ecje</Text>
                    </View>
                    <Text style={s.walkNote}>
                      për të djegur këtë vakt
                      {hasRealWeight ? ` (bazuar në ${userWeight}kg)` : ` (mesatare ${DEFAULT_WEIGHT}kg)`}
                    </Text>
                  </View>
                </View>
              )
            })()}

            <View style={[s.ratingCard, { borderColor: plate.color + '40' }]}>
              <Text style={s.sectionLabel}>VLERËSIMI I PJATËS</Text>
              <View style={s.ratingRow}>
                <View style={[s.ratingCircle, { borderColor: plate.color, backgroundColor: plate.color + '20' }]}>
                  <plate.Icon size={26} color={plate.color} strokeWidth={2} />
                </View>
                <View style={s.ratingInfo}>
                  <Text style={[s.ratingLabel, { color: plate.color }]}>{plate.label}</Text>
                  <View style={s.progressBar}>
                    <View style={[s.progressFill, { width: `${plate.score}%` as any, backgroundColor: plate.color }]} />
                  </View>
                  <Text style={s.ratingDesc}>{plate.description}</Text>
                </View>
              </View>
            </View>
            <Text style={s.sectionLabel}>USHQIMET E DETEKTUARA</Text>
            {result.items.map((item, i) => (
              <View key={i} style={s.foodCard}>
                <View style={s.foodHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.foodName}>{item.name}</Text>
                    <Text style={s.foodPortion}>{item.portion}</Text>
                  </View>
                  <View style={s.kcalBadge}>
                    <Text style={s.kcalText}>{item.calories} kcal</Text>
                  </View>
                </View>
                <View style={s.macroRow}>
                  {[['P', item.protein], ['K', item.carbs], ['Y', item.fat], ['F', item.fiber]].map(([l, v]) => (
                    <View key={l as string} style={s.microBadge}>
                      <Text style={s.microText}>{l}: {v}g</Text>
                    </View>
                  ))}
                </View>
              </View>
            ))}
            <View style={s.savedBadge}>
              <CheckCircle size={15} color={Colors.aloe} strokeWidth={2} /><Text style={s.savedText}>U ruajt në historikun tuaj</Text>
            </View>
            <TouchableOpacity style={s.primaryBtn} onPress={goHome}>
              <Text style={s.primaryBtnText}>+ Skano Pjatë Tjetër</Text>
            </TouchableOpacity>
            <View style={{ height: 20 }} />
          </>
        )}
      </ScrollView>

      {/* AI Disclosure Modal — required by Apple 2025 */}
      <Modal visible={showAIDisclosure} transparent animationType="fade">
        <View style={s.disclosureOverlay}>
          <View style={s.disclosureCard}>
            <View style={s.disclosureTitleRow}><Sparkles size={20} color={Colors.pine} strokeWidth={1.75} /><Text style={s.disclosureTitle}>Analiza me AI</Text></View>
            <Text style={s.disclosureText}>
              {'Fotografite e ushqimeve dergohen te sherbimiAnthropic Claude AI per analize. Imazhet nuk ruhen.\n\nTe dhenat tuaja trajtohen sipas Politikes tone te Privatesise.'}
            </Text>
            <TouchableOpacity
              style={s.disclosureBtn}
              onPress={() => setShowAIDisclosure(false)}
            >
              <Text style={s.disclosureBtnText}>Kuptova, Vazhdo →</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.alabaster },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: Colors.pine, gap: 12 },
  backBtn: { padding: 4 },
  backText: { color: Colors.alabaster, fontSize: 17, fontWeight: '600' },
  titleRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { color: Colors.alabaster, fontSize: 18, fontWeight: '700' },
  scroll: { padding: 16, paddingBottom: 40 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 28, alignItems: 'center', marginBottom: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  centerCard: { paddingVertical: 40 },
  iconCircle: { width: 84, height: 84, borderRadius: 42, backgroundColor: Colors.pine + '12', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  cardTitle: { fontSize: 18, fontWeight: '700', color: Colors.pine, marginBottom: 8, textAlign: 'center' },
  cardDesc: { fontSize: 14, color: '#666', lineHeight: 22, textAlign: 'center', marginBottom: 24 },
  primaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Colors.pine, borderRadius: 12, padding: 15, width: '100%', marginBottom: 10 },
  primaryBtnText: { color: Colors.alabaster, fontWeight: '700', fontSize: 15 },
  secondaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: 'transparent', borderRadius: 12, borderWidth: 1.5, borderColor: Colors.pine, padding: 15, width: '100%' },
  secondaryBtnText: { color: Colors.pine, fontWeight: '700', fontSize: 15 },
  previewImg: { width: '100%', height: 200, borderRadius: 12 },
  loadingTitle: { fontSize: 16, fontWeight: '700', color: Colors.pine, marginTop: 16 },
  loadingDesc: { fontSize: 13, color: '#888', textAlign: 'center', marginTop: 6, lineHeight: 20 },
  resultImg: { width: '100%', height: 220, borderRadius: 16, marginBottom: 16 },
  calorieCard: { backgroundColor: Colors.pine, borderRadius: 16, padding: 20, marginBottom: 12 },
  calorieLabel: { fontSize: 10, letterSpacing: 2, color: Colors.aloe, fontWeight: '700', marginBottom: 10 },
  calorieNum: { fontSize: 44, fontWeight: '700', color: '#fff', marginBottom: 16 },
  calorieUnit: { fontSize: 18, fontWeight: '400' },
  macroGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  macroBadge: { backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, minWidth: '30%' },
  macroLabel: { fontSize: 10, color: Colors.aloe, marginBottom: 2 },
  macroVal: { fontSize: 18, fontWeight: '600', color: '#fff' },
  macroUnit: { fontSize: 11, fontWeight: '400' },

  // Walk-to-burn card
  walkCard: {
    backgroundColor: Colors.aloe, borderRadius: 16, padding: 16, marginBottom: 12,
    flexDirection: 'row', alignItems: 'center', gap: 14,
  },
  walkIconWrap: {
    width: 52, height: 52, borderRadius: 14,
    backgroundColor: 'rgba(27,63,47,0.25)',
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  walkBody: { flex: 1 },
  walkLabel: { fontSize: 9, letterSpacing: 2, color: Colors.pine, fontWeight: '700', opacity: 0.7, marginBottom: 3 },
  walkSteps: { fontSize: 26, fontWeight: '700', color: Colors.pine, lineHeight: 30 },
  walkStepsUnit: { fontSize: 14, fontWeight: '600' },
  walkTimeRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 },
  walkTime: { fontSize: 13, fontWeight: '700', color: Colors.pine },
  walkNote: { fontSize: 11, color: Colors.pine, opacity: 0.7, marginTop: 3 },

  ratingCard: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 12, borderWidth: 1.5 },
  sectionLabel: { fontSize: 10, letterSpacing: 2, color: '#888', fontWeight: '700', marginBottom: 10 },
  ratingRow: { flexDirection: 'row', gap: 14, alignItems: 'center' },
  ratingCircle: { width: 56, height: 56, borderRadius: 28, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  ratingInfo: { flex: 1 },
  ratingLabel: { fontSize: 16, fontWeight: '700', marginBottom: 6 },
  progressBar: { height: 6, backgroundColor: '#f0f0f0', borderRadius: 3, overflow: 'hidden', marginBottom: 6 },
  progressFill: { height: '100%', borderRadius: 3 },
  ratingDesc: { fontSize: 12, color: '#666', lineHeight: 18 },
  foodCard: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 },
  foodHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  foodName: { fontSize: 14, fontWeight: '700', color: Colors.pine },
  foodPortion: { fontSize: 11, color: '#888', marginTop: 2 },
  kcalBadge: { backgroundColor: Colors.pine + '20', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  kcalText: { fontSize: 13, fontWeight: '700', color: Colors.pine },
  macroRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  microBadge: { backgroundColor: Colors.alabaster, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  microText: { fontSize: 11, color: Colors.pine },
  disclosureOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  disclosureCard: { backgroundColor: '#fff', borderRadius: 20, padding: 24, width: '100%' },
  disclosureTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  disclosureTitle: { fontSize: 20, fontWeight: '700', color: Colors.pine },
  disclosureText: { fontSize: 14, color: '#444', lineHeight: 22, marginBottom: 20 },
  disclosureBtn: { backgroundColor: Colors.pine, borderRadius: 12, padding: 14, alignItems: 'center' },
  disclosureBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  savedBadge: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: Colors.aloe + '20', borderRadius: 10, padding: 12, marginBottom: 12 },
  savedText: { color: Colors.aloe, fontWeight: '700', fontSize: 13 },
})
