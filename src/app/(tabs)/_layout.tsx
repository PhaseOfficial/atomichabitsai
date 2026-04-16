import React from 'react';
import { Tabs } from 'expo-router';
import { LayoutDashboard, Library, Calendar } from 'lucide-react-native';
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
        name="sprint"
        options={{
          title: 'Sprint',
          href: null, // Hide from bottom bar
        }}
      />
      <Tabs.Screen
        name="aa_ai"
        options={{
          title: 'Assistant',
          href: null, // Hide from bottom bar
        }}
      />
      <Tabs.Screen
        name="hh_habits"
        options={{
          title: 'Habits',
          href: null, // Hide from bottom bar
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
