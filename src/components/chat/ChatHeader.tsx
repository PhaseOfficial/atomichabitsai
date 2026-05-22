import { SPACING, ThemeColors } from "@/src/constants/Theme";
import { Menu, Settings } from "lucide-react-native";
import React, { useMemo } from "react";
import { Image, StyleSheet, TouchableOpacity, View } from "react-native";

interface ChatHeaderProps {
  colors: ThemeColors;
  onMenuPress: () => void;
  onSettingsPress: () => void;
}

const ChatHeader = ({
  colors,
  onMenuPress,
  onSettingsPress,
}: ChatHeaderProps) => {
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.header}>
      <TouchableOpacity
        style={styles.iconButton}
        onPress={onMenuPress}
        accessibilityRole="button"
        accessibilityLabel="Open menu"
      >
        <Menu size={24} color={colors.primary} strokeWidth={1.5} />
      </TouchableOpacity>

      <View style={styles.logoContainer}>
        <Image
          source={require("@/assets/images/Artboard 1 logo.png")}
          style={[styles.logoImage, { tintColor: colors.primary }]}
          resizeMode="contain"
        />
      </View>

      <TouchableOpacity
        style={styles.iconButton}
        onPress={onSettingsPress}
        accessibilityRole="button"
        accessibilityLabel="Open settings"
      >
        <Settings size={20} color={colors.primary} strokeWidth={1.5} />
      </TouchableOpacity>
    </View>
  );
};

const createStyles = (_colors: ThemeColors) =>
  StyleSheet.create({
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: SPACING.lg,
      paddingVertical: SPACING.md,
      height: 60,
    },
    iconButton: {
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
  });

export default React.memo(ChatHeader);
