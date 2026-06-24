// RESET book is now opened via expo-web-browser directly from the home screen.
// react-native-pdf was removed (incompatible with New Architecture / Fabric).
// This screen is kept as a harmless redirect fallback in case any old link points here.
import { useEffect } from 'react'
import { View } from 'react-native'
import { useRouter } from 'expo-router'

export default function PdfViewerScreen() {
  const router = useRouter()
  useEffect(() => {
    router.back()
  }, [])
  return <View />
}
