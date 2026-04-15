import React from 'react';
import { Tabs } from 'expo-router';
import { LayoutDashboard, Calendar, Sparkles, Activity, Library, Timer } from 'lucide-react-native';
import { COLORS, FONTS } from '@/src/constants/Theme';
import { useTheme } from '@/src/hooks/useTheme';

export default function TabLayout() {
  const { colors } = useTheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.outline,
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopColor: colors.outline + '26',
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
        name="sprint"
        options={{
          title: 'SPRINT',
          tabBarIcon: ({ color }) => <Timer size={20} color={color} strokeWidth={1.5} />,
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
