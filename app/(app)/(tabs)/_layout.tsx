import { Tabs } from 'expo-router'
import { StyleSheet, Text, View } from 'react-native'
import { Home, Package, User } from 'lucide-react-native'
import type { LucideIcon } from 'lucide-react-native'
import { Colors } from '../../../src/constants'

function TabIcon({ Icon, label, focused }: { Icon: LucideIcon; label: string; focused: boolean }) {
  return (
    <View style={s.tabItem}>
      <Icon size={22} color={focused ? Colors.pine : Colors.muted} strokeWidth={focused ? 2.25 : 1.75} />
      <Text style={[s.tabLabel, focused && s.tabLabelFocused]}>{label}</Text>
    </View>
  )
}

export default function TabLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false, tabBarStyle: s.tabBar, tabBarShowLabel: false }}>
      <Tabs.Screen name="index" options={{ tabBarIcon: ({ focused }) => <TabIcon Icon={Home} label="Home" focused={focused} /> }} />
      <Tabs.Screen name="products" options={{ tabBarIcon: ({ focused }) => <TabIcon Icon={Package} label="Produktet" focused={focused} /> }} />
      <Tabs.Screen name="profile" options={{ tabBarIcon: ({ focused }) => <TabIcon Icon={User} label="Profili" focused={focused} /> }} />
    </Tabs>
  )
}

const s = StyleSheet.create({
  tabBar: { backgroundColor: Colors.white, borderTopWidth: 0.5, borderTopColor: Colors.border, height: 72, paddingBottom: 8, paddingTop: 6 },
  tabItem: { alignItems: 'center', justifyContent: 'center', gap: 3, width: 70 },
  tabLabel: { fontSize: 10, color: Colors.muted, opacity: 0.7 },
  tabLabelFocused: { fontWeight: '700', color: Colors.pine, opacity: 1 },
})
