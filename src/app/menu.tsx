import { FONTS, ROUNDNESS, SPACING } from "@/src/constants/Theme";
import { useTheme } from "@/src/hooks/useTheme";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import {
    Activity,
    ChevronRight,
    Clock,
    Save,
    Sparkles,
    Target,
    X,
    History
} from "lucide-react-native";
import React, { useMemo, useState } from "react";
import {
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function MenuModal() {
  const {
    colors,
    identityAnchor,
    updateIdentityAnchor,
    focusGoal,
    updateFocusGoal,
  } = useTheme();
  const router = useRouter();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [newAnchor, setNewAnchor] = useState(identityAnchor);
  const [newGoal, setNewGoal] = useState(focusGoal.toString());

  const handleSaveSettings = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await updateIdentityAnchor(newAnchor);
      const goalNum = parseInt(newGoal);
      if (!isNaN(goalNum)) {
        await updateFocusGoal(goalNum);
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      console.error(e);
    }
  };

  const menuItems = [
    {
      title: "Sprint",
      subtitle: "Start a focused work session",
      icon: <Clock size={22} color={colors.primary} />,
      route: "/sprint" as const,
    },
    {
      title: "History",
      subtitle: "Browse past activities & inventory",
      icon: <History size={22} color={colors.primary} />,
      route: "/history" as const,
    },
    {
      title: "Assistant",
      subtitle: "Chat with Batsirai AI",
      icon: <Sparkles size={22} color={colors.primary} />,
      route: "/aa_ai" as const,
    },
    {
      title: "Habits",
      subtitle: "Manage your daily evolution",
      icon: <Activity size={22} color={colors.primary} />,
      route: "/hh_habits" as const,
    },
  ];

  const navigateTo = (route: any) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.replace(route);
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Navigation</Text>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.closeBtn}
          >
            <X size={24} color={colors.onSurface} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>MAIN TOOLS</Text>
            {menuItems.map((item, index) => (
              <TouchableOpacity
                key={index}
                style={styles.menuItem}
                onPress={() => navigateTo(item.route)}
              >
                <View style={styles.menuItemLeft}>
                  <View style={styles.iconBg}>{item.icon}</View>
                  <View>
                    <Text style={styles.menuItemTitle}>{item.title}</Text>
                    <Text style={styles.menuItemSubtitle}>{item.subtitle}</Text>
                  </View>
                </View>
                <ChevronRight size={18} color={colors.outline} />
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>BATSIRAI / ECOSYSTEM</Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    safeArea: {
      flex: 1,
    },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      padding: SPACING.lg,
      borderBottomWidth: 1,
      borderBottomColor: colors.outlineVariant + "4D",
    },
    headerTitle: {
      fontFamily: FONTS.headline,
      fontSize: 20,
      color: colors.onSurface,
    },
    closeBtn: {
      padding: 4,
    },
    content: {
      padding: SPACING.lg,
    },
    section: {
      gap: 8,
    },
    sectionLabel: {
      fontFamily: FONTS.labelSm,
      fontSize: 11,
      color: colors.primary,
      letterSpacing: 1.5,
      marginBottom: 8,
    },
    settingsCard: {
      backgroundColor: colors.surface,
      padding: 16,
      borderRadius: ROUNDNESS.lg,
      borderWidth: 1,
      borderColor: colors.outlineVariant + "33",
      gap: 16,
    },
    inputGroup: {
      gap: 8,
    },
    rowAlign: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    inputLabel: {
      fontFamily: FONTS.labelSm,
      fontSize: 10,
      color: colors.outline,
    },
    input: {
      backgroundColor: colors.surfaceVariant + "40",
      borderRadius: ROUNDNESS.md,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontFamily: FONTS.body,
      fontSize: 16,
      color: colors.onSurface,
      borderWidth: 1,
      borderColor: colors.outlineVariant + "26",
    },
    saveBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 10,
      backgroundColor: colors.primary,
      paddingVertical: 12,
      borderRadius: ROUNDNESS.md,
      marginTop: 8,
    },
    saveBtnText: {
      color: colors.onPrimary,
      fontFamily: FONTS.labelSm,
      fontSize: 14,
    },
    menuItem: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      padding: 16,
      backgroundColor: colors.surface,
      borderRadius: ROUNDNESS.lg,
      borderWidth: 1,
      borderColor: colors.outlineVariant + "33",
      marginBottom: 8,
    },
    menuItemLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: 16,
    },
    iconBg: {
      width: 44,
      height: 44,
      borderRadius: ROUNDNESS.md,
      backgroundColor: colors.primaryContainer + "40",
      alignItems: "center",
      justifyContent: "center",
    },
    menuItemTitle: {
      fontFamily: FONTS.headline,
      fontSize: 16,
      color: colors.onSurface,
    },
    menuItemSubtitle: {
      fontFamily: FONTS.body,
      fontSize: 12,
      color: colors.onSurfaceVariant,
      marginTop: 2,
    },
    footer: {
      marginTop: 40,
      alignItems: "center",
      paddingBottom: 40,
    },
    footerText: {
      fontFamily: FONTS.label,
      fontSize: 10,
      color: colors.outline,
      letterSpacing: 2,
    },
  });
