import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import { Calendar } from "lucide-react-native";
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
          intensity={Platform.OS === "ios" ? 20 : 0}
          tint="light"
          style={[
            styles.fab,
            Platform.OS === "android" && styles.androidFallback,
          ]}
        >
          <View style={[styles.iconContainer]}>
            <Calendar size={24} color={accentColor} strokeWidth={2} />
          </View>
        </BlurView>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    // Requirement: Large border radius (24-28px) -> 28 for 56x56
    borderRadius: 28,
    // Requirement: Slight elevation/shadow
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  pressable: {
    borderRadius: 28,
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
    borderRadius: 28,
    // Requirement: Subtle white border (0.5px, 30% opacity)
    borderWidth: 0.5,
    borderColor: "rgba(255,255,255,0.3)",
    // Requirement: Tint: translucent (rgba(255,255,255,0.2-0.3))
    backgroundColor: "rgba(255,255,255,0.25)",
    justifyContent: "center",
    alignItems: "center",
  },
  androidFallback: {
    backgroundColor: "rgba(255,255,255,0.95)",
  },
  iconContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
});
