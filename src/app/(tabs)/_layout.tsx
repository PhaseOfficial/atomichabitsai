import FloatingAIDock from "@/src/components/FloatingAIDock";
import GlassBottomTabBar from "@/src/components/GlassBottomTabBar";
import { FONTS } from "@/src/constants/Theme";
import { TabBarVisibilityProvider } from "@/src/hooks/useAutoHideTabBar";
import { useTheme } from "@/src/hooks/useTheme";
import { Tabs } from "expo-router";
import { Calendar, LayoutDashboard, Library } from "lucide-react-native";
import React from "react";

export default function TabLayout() {
  const { colors } = useTheme();

  const screenOptions = {
    tabBarActiveTintColor: colors.primary,
    tabBarInactiveTintColor: colors.outline,
    headerShown: false,
    tabBarStyle: {
      position: "absolute",
      borderTopWidth: 0,
      elevation: 0,
    },
    tabBarLabelStyle: {
      fontFamily: FONTS.label,
      fontSize: 10,
      letterSpacing: 0.5,
    },
  } as any;

  return (
    <TabBarVisibilityProvider>
      <Tabs
        tabBar={(props: any) => <GlassBottomTabBar {...props} />}
        screenOptions={screenOptions}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Day",
            tabBarIcon: ({ color }) => (
              <LayoutDashboard size={24} color={color} strokeWidth={1.5} />
            ),
          }}
        />
        <Tabs.Screen
          name="calendar"
          options={{
            title: "Schedule",
            tabBarIcon: ({ color }) => (
              <Calendar size={24} color={color} strokeWidth={1.5} />
            ),
          }}
        />
        <Tabs.Screen
          name="library"
          options={{
            title: "Library",
            tabBarIcon: ({ color }) => (
              <Library size={24} color={color} strokeWidth={1.5} />
            ),
          }}
        />
      </Tabs>
      
      <FloatingAIDock />

      {/* Extra screens still exist in the app, but are intentionally excluded from the bottom glass tab bar.
        Keep these routes reachable via menu, buttons, or a future drawer/More screen.
      */}
    </TabBarVisibilityProvider>
  );
}
