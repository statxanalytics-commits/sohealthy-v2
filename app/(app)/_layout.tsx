import { Stack } from 'expo-router'

export default function AppLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="activate" options={{ presentation: 'modal' }} />
      <Stack.Screen name="webview" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="diet" options={{ animation: 'slide_from_right' }} />
    </Stack>
  )
}
