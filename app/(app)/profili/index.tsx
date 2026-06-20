import { useState } from 'react'
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Colors } from '../../../src/constants'
import { QUESTIONS, computeAxes, computeProfileKey, type Axis } from '../../../constants/quiz-data'

const TOTAL = QUESTIONS.length

export default function QuizScreen() {
  const router = useRouter()
  const [step, setStep] = useState<'intro' | 'quiz'>('intro')
  const [current, setCurrent] = useState(0)       // 0-based question index
  const [answers, setAnswers] = useState<Partial<Record<Axis, number>>[]>([])  // one per question
  const [selected, setSelected] = useState<number | null>(null)

  // ── INTRO ──────────────────────────────────────────────────────────────────
  if (step === 'intro') {
    return (
      <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
        <View style={s.introWrap}>
          <View style={s.introBadge}>
            <Text style={s.introBadgeText}>FALAS</Text>
          </View>
          <Text style={s.introTitle}>Zbulo Profilin Tënd Nutricional</Text>
          <Text style={s.introSub}>
            12 pyetje. 2 minuta. Një plan i personalizuar ushqimi, zakonesh dhe agjërimi — bazuar në biologjinë tënde.
          </Text>
          <TouchableOpacity style={s.introBtn} onPress={() => setStep('quiz')}>
            <Text style={s.introBtnText}>Fillo Testin →</Text>
          </TouchableOpacity>
          <Text style={s.disclaimer}>
            Ky test jep orientim të përgjithshëm dhe nuk zëvendëson këshillën mjekësore.
          </Text>
        </View>
      </SafeAreaView>
    )
  }

  // ── QUIZ ───────────────────────────────────────────────────────────────────
  const q = QUESTIONS[current]
  const progress = (current + 1) / TOTAL

  function choose(optionIndex: number) {
    setSelected(optionIndex)
  }

  function next() {
    if (selected === null) return
    const chosenScores = q.options[selected].scores
    const newAnswers = [...answers, chosenScores]

    if (current + 1 < TOTAL) {
      setAnswers(newAnswers)
      setCurrent(current + 1)
      setSelected(null)
    } else {
      // Last question — compute result and navigate
      const axes = computeAxes(newAnswers as Record<Axis, number>[])
      const profileKey = computeProfileKey(axes)
      router.push({
        pathname: '/(app)/profili/rezultati',
        params: { profileKey },
      })
    }
  }

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      {/* Progress bar */}
      <View style={s.progressWrap}>
        <View style={s.progressBg}>
          <View style={[s.progressFill, { width: `${progress * 100}%` }]} />
        </View>
        <Text style={s.progressLabel}>{current + 1} / {TOTAL}</Text>
      </View>

      {/* Question */}
      <View style={s.qWrap}>
        <Text style={s.qNum}>Pyetja {current + 1}</Text>
        <Text style={s.qText}>{q.text}</Text>
      </View>

      {/* Options */}
      <View style={s.optionsWrap}>
        {q.options.map((opt, i) => (
          <TouchableOpacity
            key={i}
            style={[
              s.option,
              selected === i && s.optionSelected,
            ]}
            onPress={() => choose(i)}
            activeOpacity={0.75}
          >
            <View style={[s.optionDot, selected === i && s.optionDotSelected]} />
            <Text style={[s.optionText, selected === i && s.optionTextSelected]}>
              {opt.text}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Next / Finish */}
      <View style={s.footer}>
        <TouchableOpacity
          style={[s.nextBtn, selected === null && s.nextBtnDisabled]}
          onPress={next}
          disabled={selected === null}
        >
          <Text style={s.nextBtnText}>
            {current + 1 === TOTAL ? 'Shiko Profilin' : 'Vazhdo →'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.alabaster },

  // Intro
  introWrap: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: 48,
    paddingBottom: 32,
    justifyContent: 'center',
  },
  introBadge: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.aloe,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 5,
    marginBottom: 24,
  },
  introBadgeText: { fontSize: 11, fontWeight: '700', letterSpacing: 2, color: Colors.pine },
  introTitle: {
    fontSize: 30,
    fontWeight: '700',
    color: Colors.pine,
    lineHeight: 38,
    marginBottom: 16,
  },
  introSub: {
    fontSize: 15,
    color: Colors.muted,
    lineHeight: 23,
    marginBottom: 40,
  },
  introBtn: {
    backgroundColor: Colors.pine,
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    marginBottom: 20,
  },
  introBtnText: { fontSize: 16, fontWeight: '700', color: Colors.alabaster },
  disclaimer: {
    fontSize: 11,
    color: Colors.muted,
    textAlign: 'center',
    lineHeight: 16,
    opacity: 0.7,
  },

  // Progress
  progressWrap: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  progressBg: {
    flex: 1,
    height: 5,
    backgroundColor: 'rgba(27,63,47,0.12)',
    borderRadius: 3,
  },
  progressFill: {
    height: 5,
    backgroundColor: Colors.aloe,
    borderRadius: 3,
  },
  progressLabel: { fontSize: 12, color: Colors.muted, fontWeight: '600', minWidth: 36, textAlign: 'right' },

  // Question
  qWrap: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 8 },
  qNum: {
    fontSize: 11,
    letterSpacing: 2,
    color: Colors.aloe,
    fontWeight: '700',
    marginBottom: 10,
  },
  qText: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.pine,
    lineHeight: 28,
  },

  // Options
  optionsWrap: { paddingHorizontal: 20, paddingTop: 20, gap: 12 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 18,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  optionSelected: {
    borderColor: Colors.aloe,
    backgroundColor: 'rgba(113,181,162,0.08)',
  },
  optionDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: 'rgba(27,63,47,0.25)',
  },
  optionDotSelected: {
    borderColor: Colors.aloe,
    backgroundColor: Colors.aloe,
  },
  optionText: { fontSize: 15, color: Colors.pine, flex: 1, lineHeight: 21 },
  optionTextSelected: { fontWeight: '600' },

  // Footer
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    paddingBottom: 36,
    backgroundColor: Colors.alabaster,
  },
  nextBtn: {
    backgroundColor: Colors.pine,
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
  },
  nextBtnDisabled: { opacity: 0.35 },
  nextBtnText: { fontSize: 16, fontWeight: '700', color: Colors.alabaster },
})
