import { Tabs } from 'expo-router'
import { StyleSheet, Text, View } from 'react-native'
import { Colors } from '../../../src/constants'

function TabIcon({ icon, label, focused }: { icon: string; label: string; focused: boolean }) {
  return (
    <View style={s.tabItem}>
      <Text style={[s.tabIcon, focused && s.tabIconFocused]}>{icon}</Text>
      <Text style={[s.tabLabel, focused && s.tabLabelFocused]}>{label}</Text>
    </View>
  )
}

export default function TabLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false, tabBarStyle: s.tabBar, tabBarShowLabel: false }}>
      <Tabs.Screen name="index" options={{ tabBarIcon: ({ focused }) => <TabIcon icon="🏠" label="Home" focused={focused} /> }} />
      <Tabs.Screen name="products" options={{ tabBarIcon: ({ focused }) => <TabIcon icon="📦" label="Produktet" focused={focused} /> }} />
      <Tabs.Screen name="profile" options={{ tabBarIcon: ({ focused }) => <TabIcon icon="👤" label="Profili" focused={focused} /> }} />
    </Tabs>
  )
}

const s = StyleSheet.create({
  tabBar: { backgroundColor: Colors.white, borderTopWidth: 0.5, borderTopColor: Colors.border, height: 72, paddingBottom: 8, paddingTop: 4 },
  tabItem: { alignItems: 'center', justifyContent: 'center', gap: 2 },
  tabIcon: { fontSize: 20, opacity: 0.4 },
  tabIconFocused: { opacity: 1 },
  tabLabel: { fontSize: 9, color: Colors.muted, opacity: 0.6 },
  tabLabelFocused: { fontWeight: '600', color: Colors.pine, opacity: 1 },
})
