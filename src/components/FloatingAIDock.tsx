import { useTheme } from "@/src/hooks/useTheme";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import { usePathname, useRouter } from "expo-router";
import { Sparkles } from "lucide-react-native";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    Animated,
    Keyboard,
    Platform,
    Pressable,
    StyleSheet,
    View
} from "react-native";

export default function FloatingAIDock() {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const pathname = usePathname();

  const [isVisible, setIsVisible] = useState(true);
  const visibilityAnim = useRef(new Animated.Value(1)).current;

  // Keyboard awareness - hide when typing
  useEffect(() => {
    const showSubscription = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      () => setIsVisible(false)
    );
    const hideSubscription = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => setIsVisible(true)
    );

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  useEffect(() => {
    Animated.spring(visibilityAnim, {
      toValue: isVisible ? 1 : 0,
      useNativeDriver: true,
      friction: 8,
      tension: 40,
    }).start();
  }, [isVisible, visibilityAnim]);

  const navigateToAI = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push("/aa_ai");
  }, [router]);

  const isActive = pathname === "/aa_ai";

  const dockStyle = useMemo(() => [
    styles.dockContainer,
    {
      right: 16,
      top: "55%", // Slightly below center
      transform: [
        { scale: visibilityAnim },
        { translateX: visibilityAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [100, 0],
          }) 
        },
      ],
      opacity: visibilityAnim,
    }
  ], [visibilityAnim]);

  // Don't show the launcher if we're already on the AI screen
  if (isActive) return null;

  return (
    <Animated.View style={dockStyle}>
      <Pressable
        onPress={navigateToAI}
        style={({ pressed }) => [
          styles.pressable,
          { transform: [{ scale: pressed ? 0.92 : 1 }] }
        ]}
      >
        <BlurView
          intensity={Platform.OS === "ios" ? 60 : 0}
          tint={isDark ? "dark" : "light"}
          style={[
            styles.blurContainer,
            {
              backgroundColor: isDark ? "rgba(22,22,24,0.72)" : "rgba(248,250,249,0.85)",
              borderColor: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)",
            },
            Platform.OS === "android" && {
              backgroundColor: isDark ? "rgba(28,28,30,0.96)" : colors.surface,
            },
          ]}
        >
          <View style={styles.iconWrapper}>
            <Sparkles size={28} color={colors.primary} strokeWidth={2.2} />
          </View>
        </BlurView>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  dockContainer: {
    position: "absolute",
    zIndex: 1000,
    width: 64,
    height: 64,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 8 },
    elevation: 20,
  },
  pressable: {
    width: "100%",
    height: "100%",
  },
  blurContainer: {
    flex: 1,
    borderRadius: 32,
    overflow: "hidden",
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  iconWrapper: {
    alignItems: "center",
    justifyContent: "center",
    // Subtle glow effect
    shadowColor: "#FFF",
    shadowOpacity: 0.1,
    shadowRadius: 10,
  }
});
