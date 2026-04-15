import React from 'react';
import { Tabs } from 'expo-router';
import { LayoutDashboard, Calendar, Sparkles, Activity, Library } from 'lucide-react-native';
import { COLORS, FONTS } from '@/src/constants/Theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.outline,
        headerShown: false,
        tabBarStyle: {
          backgroundColor: COLORS.background,
          borderTopColor: 'rgba(119, 119, 119, 0.15)', // Ghost Border
          borderTopWidth: 1,
          height: 64,
          paddingBottom: 12,
          paddingTop: 8,
          borderRadius: 0,
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarLabelStyle: {
          fontFamily: FONTS.label,
          fontSize: 10,
          textTransform: 'uppercase',
          letterSpacing: 1,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'DASHBOARD',
          tabBarIcon: ({ color }) => <LayoutDashboard size={20} color={color} strokeWidth={1.5} />,
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: 'PLAN',
          tabBarIcon: ({ color }) => <Calendar size={20} color={color} strokeWidth={1.5} />,
        }}
      />
      <Tabs.Screen
        name="ai"
        options={{
          title: 'BATSIR AI',
          tabBarIcon: ({ color }) => <Sparkles size={20} color={color} strokeWidth={1.5} />,
        }}
      />
      <Tabs.Screen
        name="habits"
        options={{
          title: 'HABITS',
          tabBarIcon: ({ color }) => <Activity size={20} color={color} strokeWidth={1.5} />,
        }}
      />
      <Tabs.Screen
        name="library"
        options={{
          title: 'INDEX',
          tabBarIcon: ({ color }) => <Library size={20} color={color} strokeWidth={1.5} />,
        }}
      />
    </Tabs>
  );
}
