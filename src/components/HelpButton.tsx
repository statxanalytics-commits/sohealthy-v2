import { useRouter } from 'expo-router'
import { StyleSheet, Text, TouchableOpacity, ViewStyle } from 'react-native'
import { Colors } from '../constants'

// Small round "?" button that opens the FAQ (Pyetjet e Shpeshta).
// Drop it into any screen header. Defaults to the aloe color, which reads well
// on the pine headers; pass `color` for light backgrounds.
type Props = { color?: string; style?: ViewStyle }

export default function HelpButton({ color = Colors.aloe, style }: Props) {
  const router = useRouter()
  return (
    <TouchableOpacity
      onPress={() => router.push('/faq')}
      style={[s.btn, { borderColor: color }, style]}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      accessibilityRole="button"
      accessibilityLabel="Ndihmë"
    >
      <Text style={[s.q, { color }]}>?</Text>
    </TouchableOpacity>
  )
}

const s = StyleSheet.create({
  btn: {
    width: 30, height: 30, borderRadius: 15, borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
  },
  q: { fontSize: 16, fontWeight: '700', lineHeight: 20 },
})
