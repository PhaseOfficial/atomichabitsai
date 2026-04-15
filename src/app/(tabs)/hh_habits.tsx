import { FONTS, ROUNDNESS, SPACING } from "@/src/constants/Theme";
import { useData } from "@/src/hooks/useData";
import { useTheme } from "@/src/hooks/useTheme";
import { useAuth } from "@/src/hooks/useAuth";
import { performMutation } from "@/src/lib/sync";
import { Heart, PlusCircle, Settings, Sparkles } from "lucide-react-native";
import React, { useMemo, useCallback } from "react";
import {
    ActivityIndicator,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";

interface Habit {
  id: string;
  title: string;
  frequency: string;
  is_active: number;
}

export default function HabitsScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const router = useRouter();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const userId = user?.id || 'guest';

  const {
    data: habits,
    loading,
    error,
    refresh,
  } = useData<Habit>("SELECT * FROM habits WHERE is_active = 1 AND (user_id = ? OR user_id IS NULL)", [userId]);

  // Refresh data when screen is focused
  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [])
  );

  const handleToggleHabit = async (habitId: string) => {
    try {
      await performMutation("logs", "INSERT", {
        id: Math.random().toString(36).substring(7),
        habit_id: habitId,
        status: "completed",
        logged_at: new Date().toISOString(),
      });
      refresh();
    } catch (err) {
      console.error("Failed to log habit:", err);
    }
  };

  const handleAddHabit = () => {
    router.push('/add-habit');
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
          bounces={true}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.profileSection}>
              <View style={styles.avatarPlaceholder}>
                <Image
                  source={require("@/assets/images/icon.png")}
                  style={styles.avatarLogo}
                  resizeMode="contain"
                />
              </View>
              <Image
                source={require("@/assets/images/Artboard 1 logo.png")}
                style={[styles.logoImage, { tintColor: colors.primary }]}
                resizeMode="contain"
              />
            </View>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => router.push("/modal")}
            >
              <Settings size={20} color={colors.primary} strokeWidth={1.5} />
            </TouchableOpacity>
          </View>

          {/* Identity Header */}
          <View style={styles.identityHeader}>
            <Text style={styles.label}>BATSIR / CORE PRINCIPLES</Text>
            <Text style={styles.headline}>Personal Evolution</Text>
            <Text style={styles.subheadline}>
              Cultivating lasting growth through identity-based habits and daily
              rituals.
            </Text>

            <View style={styles.focusCard}>
              <View style={styles.focusIconContainer}>
                <Sparkles size={20} color={colors.onPrimary} />
              </View>
              <View>
                <Text
                  style={[
                    styles.focusLabel,
                    { color: colors.onPrimary + "B3" },
                  ]}
                >
                  CURRENT IDENTITY ANCHOR
                </Text>
                <Text style={[styles.focusValue, { color: colors.onPrimary }]}>
                  The Disciplined Creator
                </Text>
              </View>
            </View>
          </View>

          {/* Identity Cards */}
          <View style={styles.gridContainer}>
            <View style={styles.primaryIdentityCard}>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>CORE VALUE</Text>
              </View>
              <Text style={styles.identityQuote}>
                {'"'}I prioritize focused work over superficial distractions.
                {'"'}
              </Text>
              <View style={styles.identityFooter}>
                <Text style={styles.identityFooterText}>
                  CONSISTENCY STREAK: 12 DAYS
                </Text>
              </View>
            </View>

            <View style={styles.secondaryIdentityCard}>
              <View>
                <Text style={styles.cardTitle}>PHYSICAL WELL-BEING</Text>
                <Text style={styles.cardQuote}>
                  {'"'}I nurture my body with care and precision.{'"'}
                </Text>
              </View>
              <View style={styles.cardFooter}>
                <View style={styles.rhythmGrid}>
                  {[1, 1, 1, 0, 0].map((active, i) => (
                    <View
                      key={i}
                      style={[
                        styles.rhythmDot,
                        active && styles.rhythmDotActive,
                      ]}
                    />
                  ))}
                </View>
                <Text style={styles.activeStatus}>STATUS: ACTIVE</Text>
              </View>
            </View>
          </View>

          {/* Consistency Matrix */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>CONSISTENCY MATRIX</Text>
            <View style={styles.matrixContainer}>
              <View style={styles.matrixHeader}>
                <Text style={styles.matrixTitle}>Last 28 Days</Text>
                <Text style={styles.matrixSubtitle}>86% Adherence</Text>
              </View>
              <View style={styles.matrixGrid}>
                {Array.from({ length: 28 }).map((_, i) => (
                  <View
                    key={i}
                    style={[
                      styles.matrixCell,
                      {
                        backgroundColor:
                          i % 4 === 0
                            ? colors.primaryContainer
                            : i % 7 === 1
                              ? colors.primary + "33"
                              : colors.surfaceVariant,
                      },
                    ]}
                  />
                ))}
              </View>
            </View>
          </View>

          {/* Wellbeing Check */}
          <View style={styles.wellbeingCard}>
            <View style={styles.wellbeingIcon}>
              <Heart size={20} color={colors.tertiary} />
            </View>
            <View style={styles.wellbeingContent}>
              <Text style={styles.wellbeingTitle}>Well-being Pulse</Text>
              <Text style={styles.wellbeingText}>
                Your energy levels are steady. Focus on restorative sleep
                tonight.
              </Text>
            </View>
          </View>

          {/* Habit Inventory */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Daily Rituals</Text>
              <TouchableOpacity
                style={styles.addButton}
                onPress={handleAddHabit}
              >
                <PlusCircle size={16} color={colors.primary} />
                <Text style={styles.addButtonText}>NEW RITUAL</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.habitList}>
              {habits.length > 0 ? (
                habits.map((habit) => (
                  <View key={habit.id} style={styles.habitItem}>
                    <TouchableOpacity
                      style={[
                        styles.habitCheck,
                        habit.is_active === 0 && {
                          backgroundColor: colors.primary,
                        },
                      ]}
                      onPress={() => handleToggleHabit(habit.id)}
                    >
                      <View style={styles.innerCheck} />
                    </TouchableOpacity>
                    <View style={styles.habitContent}>
                      <View style={styles.habitTitleRow}>
                        <Text style={styles.habitName}>{habit.title}</Text>
                        <View style={styles.tag}>
                          <Text style={styles.tagText}>
                            {habit.frequency.toUpperCase()}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.habitDescription}>
                        Building a resilient mind.
                      </Text>
                    </View>
                    <View style={styles.streakContainer}>
                      <Text style={styles.streakLabel}>STREAK</Text>
                      <Text style={styles.streakValue}>12</Text>
                    </View>
                  </View>
                ))
              ) : (
                <TouchableOpacity 
                  style={styles.emptyStateCard}
                  onPress={handleAddHabit}
                >
                  <PlusCircle size={24} color={colors.primary} />
                  <Text style={styles.emptyStateText}>No rituals found. Tap to add your first one.</Text>
                </TouchableOpacity>
              )}
            </View>
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
    scrollView: {
      flex: 1,
    },
    contentContainer: {
      paddingBottom: 40,
    },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      padding: SPACING.lg,
      backgroundColor: colors.background,
    },
    profileSection: {
      flexDirection: "row",
      alignItems: "center",
      gap: SPACING.sm,
    },
    avatarPlaceholder: {
      width: 32,
      height: 32,
      borderRadius: ROUNDNESS.full,
      backgroundColor: colors.primaryContainer,
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
    },
    avatarLogo: {
      width: 24,
      height: 24,
    },
    logoImage: {
      height: 32,
      width: 120,
    },
    iconButton: {
      padding: 4,
    },
    identityHeader: {
      padding: SPACING.lg,
      backgroundColor: colors.surface,
    },
    label: {
      fontFamily: FONTS.label,
      fontSize: 10,
      color: colors.primary,
      letterSpacing: 1.5,
      marginBottom: SPACING.xs,
    },
    headline: {
      fontFamily: FONTS.headline,
      fontSize: 32,
      color: colors.onSurface,
      marginBottom: SPACING.xs,
    },
    subheadline: {
      fontFamily: FONTS.body,
      fontSize: 15,
      color: colors.onSurfaceVariant,
      lineHeight: 22,
      marginBottom: SPACING.lg,
    },
    focusCard: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.primary,
      padding: SPACING.md,
      borderRadius: ROUNDNESS.md,
      gap: SPACING.md,
    },
    focusIconContainer: {
      width: 40,
      height: 40,
      borderRadius: ROUNDNESS.md,
      backgroundColor: "rgba(255,255,255,0.15)",
      alignItems: "center",
      justifyContent: "center",
    },
    focusLabel: {
      fontFamily: FONTS.label,
      fontSize: 9,
      letterSpacing: 1,
    },
    focusValue: {
      fontFamily: FONTS.headline,
      fontSize: 18,
    },
    gridContainer: {
      padding: SPACING.lg,
      gap: SPACING.md,
    },
    primaryIdentityCard: {
      backgroundColor: colors.secondary,
      padding: SPACING.lg,
      borderRadius: ROUNDNESS.lg,
    },
    badge: {
      backgroundColor: "rgba(255,255,255,0.15)",
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: ROUNDNESS.sm,
      alignSelf: "flex-start",
      marginBottom: SPACING.md,
    },
    badgeText: {
      color: "#fff",
      fontSize: 9,
      fontFamily: FONTS.labelSm,
      letterSpacing: 0.5,
    },
    identityQuote: {
      color: "#fff",
      fontSize: 24,
      fontFamily: FONTS.headline,
      lineHeight: 30,
    },
    identityFooter: {
      marginTop: SPACING.lg,
    },
    identityFooterText: {
      color: "rgba(255,255,255,0.6)",
      fontSize: 10,
      fontFamily: FONTS.label,
      letterSpacing: 0.5,
    },
    secondaryIdentityCard: {
      backgroundColor: colors.surfaceVariant,
      padding: SPACING.lg,
      borderRadius: ROUNDNESS.lg,
    },
    cardTitle: {
      fontFamily: FONTS.labelSm,
      fontSize: 11,
      letterSpacing: 1,
      color: colors.onSurfaceVariant,
      marginBottom: SPACING.xs,
    },
    cardQuote: {
      fontFamily: FONTS.headline,
      fontSize: 20,
      color: colors.onSurface,
    },
    cardFooter: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginTop: SPACING.md,
    },
    rhythmGrid: {
      flexDirection: "row",
      gap: 6,
    },
    rhythmDot: {
      width: 8,
      height: 8,
      borderRadius: ROUNDNESS.full,
      backgroundColor: colors.outlineVariant,
    },
    rhythmDotActive: {
      backgroundColor: colors.secondary,
    },
    activeStatus: {
      color: colors.secondary,
      fontFamily: FONTS.labelSm,
      fontSize: 10,
    },
    section: {
      padding: SPACING.lg,
    },
    sectionLabel: {
      fontFamily: FONTS.labelSm,
      fontSize: 11,
      color: colors.outline,
      letterSpacing: 1.5,
      marginBottom: SPACING.md,
    },
    matrixContainer: {
      backgroundColor: colors.surface,
      padding: SPACING.md,
      borderRadius: ROUNDNESS.lg,
      borderWidth: 1,
      borderColor: colors.outlineVariant + "4D",
    },
    matrixHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: SPACING.md,
    },
    matrixTitle: {
      fontFamily: FONTS.labelSm,
      fontSize: 13,
      color: colors.onSurface,
    },
    matrixSubtitle: {
      fontFamily: FONTS.label,
      fontSize: 12,
      color: colors.primary,
    },
    matrixGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 6,
    },
    matrixCell: {
      width: 14,
      height: 14,
      borderRadius: 3,
    },
    wellbeingCard: {
      marginHorizontal: SPACING.lg,
      padding: SPACING.md,
      backgroundColor: colors.tertiary + "0D",
      borderRadius: ROUNDNESS.md,
      flexDirection: "row",
      alignItems: "center",
      gap: SPACING.md,
      borderWidth: 1,
      borderColor: colors.tertiary + "26",
    },
    wellbeingIcon: {
      width: 40,
      height: 40,
      borderRadius: ROUNDNESS.md,
      backgroundColor: colors.tertiary + "1A",
      alignItems: "center",
      justifyContent: "center",
    },
    wellbeingContent: {
      flex: 1,
    },
    wellbeingTitle: {
      fontFamily: FONTS.labelSm,
      fontSize: 13,
      color: colors.tertiary,
    },
    wellbeingText: {
      fontFamily: FONTS.body,
      fontSize: 12,
      color: colors.onSurfaceVariant,
    },
    sectionHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: SPACING.md,
    },
    sectionTitle: {
      fontFamily: FONTS.headline,
      fontSize: 24,
      color: colors.onSurface,
    },
    addButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    addButtonText: {
      color: colors.primary,
      fontFamily: FONTS.labelSm,
      fontSize: 11,
      letterSpacing: 0.5,
    },
    habitList: {
      gap: SPACING.md,
    },
    habitItem: {
      backgroundColor: colors.surface,
      padding: SPACING.md,
      borderRadius: ROUNDNESS.lg,
      flexDirection: "row",
      alignItems: "center",
      gap: SPACING.md,
      borderWidth: 1,
      borderColor: colors.outlineVariant + "4D",
    },
    habitCheck: {
      width: 24,
      height: 24,
      borderRadius: 6,
      borderWidth: 2,
      borderColor: colors.primary,
      padding: 2,
    },
    innerCheck: {
      flex: 1,
      borderRadius: 2,
      backgroundColor: "transparent",
    },
    habitContent: {
      flex: 1,
    },
    habitTitleRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: SPACING.sm,
      marginBottom: 2,
    },
    habitName: {
      fontFamily: FONTS.labelSm,
      fontSize: 15,
      color: colors.onSurface,
    },
    tag: {
      backgroundColor: colors.surfaceVariant,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
    },
    tagText: {
      fontSize: 8,
      fontFamily: FONTS.labelSm,
      color: colors.onSurfaceVariant,
    },
    habitDescription: {
      fontFamily: FONTS.body,
      fontSize: 12,
      color: colors.onSurfaceVariant,
    },
    streakContainer: {
      alignItems: "flex-end",
    },
    streakLabel: {
      fontFamily: FONTS.label,
      fontSize: 8,
      color: colors.onSurfaceVariant,
      letterSpacing: 0.5,
    },
    streakValue: {
      fontFamily: FONTS.labelSm,
      fontSize: 16,
      color: colors.primary,
    },
    center: {
      justifyContent: "center",
      alignItems: "center",
    },
    emptyStateCard: {
      backgroundColor: colors.surface,
      padding: SPACING.xl,
      borderRadius: ROUNDNESS.lg,
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
    },
    emptyStateText: {
      fontFamily: FONTS.body,
      fontSize: 14,
      color: colors.onSurfaceVariant,
      textAlign: 'center',
    },
  });
