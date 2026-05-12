import { SPACING } from "@/src/constants/Theme";
import { useTheme } from "@/src/hooks/useTheme";
import { useRouter } from "expo-router";
import { Menu, Settings } from "lucide-react-native";
import React from "react";
import { Image, StyleSheet, TouchableOpacity, View } from "react-native";

interface LibraryHeaderProps {
  onSettingsPress?: () => void;
  onMenuPress?: () => void;
}

export default function LibraryHeader({
  onSettingsPress,
  onMenuPress,
}: LibraryHeaderProps) {
  const { colors } = useTheme();
  const router = useRouter();

  const styles = StyleSheet.create({
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: SPACING.lg,
      paddingVertical: SPACING.md,
      backgroundColor: colors.background,
      height: 60,
    },
    menuBtn: {
      padding: 8,
    },
    logoContainer: {
      position: "absolute",
      left: 0,
      right: 0,
      alignItems: "center",
      justifyContent: "center",
      zIndex: -1,
    },
    logoImage: {
      height: 40,
      width: 160,
    },
    ghostBtn: {
      padding: 8,
    },
  });

  return (
    <View style={styles.header}>
      <TouchableOpacity
        style={styles.menuBtn}
        onPress={onMenuPress || (() => router.push("/menu"))}
      >
        <Menu size={24} color={colors.primary} strokeWidth={1.5} />
      </TouchableOpacity>
      <View style={styles.logoContainer}>
        <Image
          source={require("@/assets/images/Artboard 1 logo.png")}
          style={styles.logoImage}
          tintColor={colors.primary}
          resizeMode="contain"
        />
      </View>
      <TouchableOpacity
        style={styles.ghostBtn}
        onPress={onSettingsPress || (() => router.push("/modal"))}
      >
        <Settings size={20} color={colors.primary} strokeWidth={1.5} />
      </TouchableOpacity>
    </View>
  );
}
