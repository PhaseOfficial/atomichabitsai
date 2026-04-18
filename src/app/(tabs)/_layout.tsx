import React from 'react';
import { Tabs } from 'expo-router';
import { LayoutDashboard, Library, Calendar, History } from 'lucide-react-native';
import { COLORS, FONTS } from '@/src/constants/Theme';
import { useTheme } from '@/src/hooks/useTheme';

export default function TabLayout() {
  const { colors, isDark } = useTheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.outline,
        headerShown: false,
        tabBarStyle: {
          backgroundColor: isDark ? 'rgba(10, 10, 10, 0.85)' : 'rgba(255, 255, 255, 0.85)',
          borderTopColor: colors.outline + '1A',
          borderTopWidth: 0.5,
          height: 64,
          paddingBottom: 12,
          paddingTop: 8,
          elevation: 0,
          shadowOpacity: 0,
          position: 'absolute', // Needed for blur effect
          left: 0,
          right: 0,
          bottom: 0,
        },
        tabBarLabelStyle: {
          fontFamily: FONTS.label,
          fontSize: 10,
          letterSpacing: 0.5,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Day',
          tabBarIcon: ({ color }) => <LayoutDashboard size={20} color={color} strokeWidth={1.5} />,
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: 'Schedule',
          tabBarIcon: ({ color }) => <Calendar size={20} color={color} strokeWidth={1.5} />,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'History',
          href: null,
        }}
      />
      <Tabs.Screen
        name="sprint"
        options={{
          title: 'Sprint',
          href: null,
        }}
      />
      <Tabs.Screen
        name="aa_ai"
        options={{
          title: 'Assistant',
          href: null,
        }}
      />
      <Tabs.Screen
        name="hh_habits"
        options={{
          title: 'Habits',
          href: null,
        }}
      />
      <Tabs.Screen
        name="library"
        options={{
          title: 'Library',
          tabBarIcon: ({ color }) => <Library size={20} color={color} strokeWidth={1.5} />,
        }}
      />
    </Tabs>
  );
}
