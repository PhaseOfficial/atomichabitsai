import { useTheme } from "@/src/hooks/useTheme";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import { LayoutDashboard } from "lucide-react-native";
import React, { useCallback, useMemo, useRef } from "react";
import { Animated, Platform, Pressable, StyleSheet, View } from "react-native";

type Props = {
  onPress: () => void;
  accentColor: string;
  label?: string;
  position?: "center" | "right";
};

export default function AutoHideFloatingActionButton({
  onPress,
  accentColor,
  label = "Day",
  position = "center",
}: Props) {
  const { isDark, colors } = useTheme();
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const onPressIn = useCallback(() => {
    // Requirement: Animated scale on press (0.95 -> 1.0)
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      useNativeDriver: true,
      friction: 8,
      tension: 100,
    }).start();
  }, [scaleAnim]);

  const onPressOut = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      friction: 8,
      tension: 100,
    }).start();
  }, [scaleAnim]);

  const animatedStyle = useMemo(
    () => ({ transform: [{ scale: scaleAnim }] }),
    [scaleAnim],
  );

  return (
    <Animated.View
      style={[
        styles.wrapper,
        animatedStyle,
        position === "right" ? styles.positionRight : styles.positionCenter,
      ]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Go to ${label}`}
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        style={({ pressed }) => [
          styles.pressable,
          { opacity: pressed ? 0.95 : 1 },
        ]}
      >
        <BlurView
          // Requirement: Blur amount 15-20
          intensity={Platform.OS === "ios" ? 30 : 0}
          tint={isDark ? "dark" : "light"}
          style={[
            styles.fab,
            {
              backgroundColor: isDark ? "rgba(22,22,24,0.72)" : "rgba(248,250,249,0.85)",
              borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)",
            },
            Platform.OS === "android" && {
              backgroundColor: isDark ? "rgba(28,28,30,0.96)" : colors.surface,
            },
          ]}
        >
          <View style={[styles.iconContainer]}>
            <LayoutDashboard size={24} color={accentColor} strokeWidth={2.2} />
          </View>
        </BlurView>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    // Requirement: Large border radius (24-28px) -> 28 for 56x56
    borderRadius: 30,
    // Requirement: Slight elevation/shadow
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  pressable: {
    borderRadius: 30,
    overflow: "hidden",
  },
  positionCenter: {
    alignSelf: "center",
  },
  positionRight: {
    alignSelf: "flex-end",
    marginRight: 20,
  },
  fab: {
    // Requirement: Circular (56x56 points)
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  iconContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
});
