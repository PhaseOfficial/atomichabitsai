import React, { useMemo } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/src/hooks/useTheme';
import { X, Sparkles, Activity, Timer, ChevronRight } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { SPACING, FONTS, ROUNDNESS } from '@/src/constants/Theme';

export default function MenuModal() {
  const { colors } = useTheme();
  const router = useRouter();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const menuItems = [
    {
      title: 'Sprint',
      subtitle: 'Start a focused work session',
      icon: <Timer size={22} color={colors.primary} />,
      route: '/sprint' as const,
    },
    {
      title: 'Assistant',
      subtitle: 'Chat with Batsirai AI',
      icon: <Sparkles size={22} color={colors.primary} />,
      route: '/aa_ai' as const,
    },
    {
      title: 'Habits',
      subtitle: 'Manage your daily evolution',
      icon: <Activity size={22} color={colors.primary} />,
      route: '/hh_habits' as const,
    },
  ];

  const navigateTo = (route: any) => {
    router.replace(route);
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Navigation</Text>
          <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
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
                  <View style={styles.iconBg}>
                    {item.icon}
                  </View>
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

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.outlineVariant + '4D',
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
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: colors.surface,
    borderRadius: ROUNDNESS.lg,
    borderWidth: 1,
    borderColor: colors.outlineVariant + '33',
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  iconBg: {
    width: 44,
    height: 44,
    borderRadius: ROUNDNESS.md,
    backgroundColor: colors.primaryContainer + '40',
    alignItems: 'center',
    justifyContent: 'center',
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
    alignItems: 'center',
  },
  footerText: {
    fontFamily: FONTS.label,
    fontSize: 10,
    color: colors.outline,
    letterSpacing: 2,
  },
});
