import { SPACING } from "@/src/constants/Theme";
import { useTheme } from "@/src/hooks/useTheme";
import { BookOpen, CheckCircle2, TrendingUp } from "lucide-react-native";
import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

interface LibraryStatsProps {
  stats: {
    reading: number;
    finished: number;
    pages: number;
  };
}

export default function LibraryStats({ stats }: LibraryStatsProps) {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

  return (
    <View style={styles.statsSection}>
      <View style={styles.statCard}>
        <TrendingUp size={18} color={colors.primary} />
        <Text style={styles.statValue}>{stats.pages}</Text>
        <Text style={styles.statLabel}>PAGES READ</Text>
      </View>
      <View style={styles.statCard}>
        <BookOpen size={18} color={colors.secondary} />
        <Text style={styles.statValue}>{stats.reading}</Text>
        <Text style={styles.statLabel}>ACTIVE</Text>
      </View>
      <View style={styles.statCard}>
        <CheckCircle2 size={18} color={colors.tertiary} />
        <Text style={styles.statValue}>{stats.finished}</Text>
        <Text style={styles.statLabel}>FINISHED</Text>
      </View>
    </View>
  );
}

const createStyles = (colors: any, isDark: boolean) =>
  StyleSheet.create({
    statsSection: {
      flexDirection: "row",
      gap: SPACING.md,
      marginVertical: SPACING.lg,
      paddingHorizontal: SPACING.lg,
    },
    statCard: {
      flex: 1,
      backgroundColor: colors.surfaceVariant,
      borderRadius: 12,
      padding: SPACING.md,
      alignItems: "center",
      gap: SPACING.sm,
    },
    statValue: {
      fontSize: 18,
      fontWeight: "700",
      color: colors.onSurface,
    },
    statLabel: {
      fontSize: 9,
      fontWeight: "600",
      color: colors.outline,
      letterSpacing: 0.5,
    },
  });
