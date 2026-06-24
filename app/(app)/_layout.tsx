import { Stack } from 'expo-router'

export default function AppLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="activate" options={{ presentation: 'modal' }} />
      <Stack.Screen name="webview" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="pdf-viewer" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="diet" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="scanner" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="tracker" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="progress" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="select-product" options={{ animation: 'slide_from_bottom' }} />
      <Stack.Screen name="product-detail" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="my-packages" options={{ animation: 'slide_from_right' }} />
    </Stack>
  )
}
