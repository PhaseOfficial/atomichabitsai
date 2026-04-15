import React, { useMemo } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Image, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Settings, Search, BookOpen, Bookmark, Clock, ArrowRight, Star } from 'lucide-react-native';
import { COLORS, SPACING, FONTS, ROUNDNESS } from '@/src/constants/Theme';
import { useTheme } from '@/src/hooks/useTheme';
import { useRouter } from 'expo-router';

export default function LibraryScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();

  const handleResourcePress = (title: string) => {
    Alert.alert('Resource Index', `Accessing the full synthesis for: ${title}`);
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView 
          contentContainerStyle={styles.scrollContent} 
          showsVerticalScrollIndicator={false}
          bounces={true}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.profileSection}>
              <View style={styles.avatarPlaceholder}>
                <Image 
                  source={require('@/assets/images/icon.png')} 
                  style={styles.avatarLogo} 
                  resizeMode="contain"
                />
              </View>
              <Image 
                source={require('@/assets/images/Artboard 1 logo.png')} 
                style={[styles.logoImage, { tintColor: colors.primary }]} 
                resizeMode="contain" 
              />
            </View>
            <TouchableOpacity style={styles.ghostBtn} onPress={() => router.push('/modal')}>
              <Settings size={20} color={colors.primary} strokeWidth={1.5} />
            </TouchableOpacity>
          </View>

          {/* Library Intro */}
          <View style={styles.introSection}>
            <Text style={styles.labelCaps}>KNOWLEDGE INDEX</Text>
            <Text style={styles.headline}>The Library</Text>
            <Text style={styles.subheadline}>Synthesized insights from primary sources and technical documentation.</Text>
            
            <TouchableOpacity style={styles.searchBar} onPress={() => Alert.alert('Search', 'Search functionality coming soon.')}>
              <Search size={18} color={colors.onSurfaceVariant} />
              <Text style={styles.searchText}>Search resources...</Text>
            </TouchableOpacity>
          </View>

          {/* Featured Brief */}
          <View style={styles.section}>
            <TouchableOpacity 
              style={[styles.featuredCard, { backgroundColor: colors.primary }]}
              onPress={() => handleResourcePress('Atomic Habits')}
            >
              <View style={styles.featuredBadge}>
                <Star size={12} color={colors.onPrimary} fill={colors.onPrimary} />
                <Text style={styles.featuredBadgeText}>FEATURED INSIGHT</Text>
              </View>
              <Text style={styles.featuredTitle}>Atomic Habits: Systemic Reinforcement</Text>
              <Text style={styles.featuredMeta}>James Clear / Applied Psychology</Text>
              <View style={styles.featuredFooter}>
                <View style={styles.progressRow}>
                  <Text style={styles.progressLabel}>READING PROGRESS</Text>
                  <Text style={styles.progressValue}>65%</Text>
                </View>
                <View style={[styles.technicalBarBg, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                  <View style={[styles.technicalBarFill, { width: '65%', backgroundColor: colors.onPrimary }]} />
                </View>
              </View>
            </TouchableOpacity>
          </View>

          {/* Briefs Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recent Syntheses</Text>
            <View style={styles.briefsGrid}>
              <BriefCard 
                title="Deep Work" 
                author="Cal Newport" 
                tag="FOCUS" 
                colors={colors} 
                onPress={() => handleResourcePress('Deep Work')}
              />
              <BriefCard 
                title="The Antidote" 
                author="Oliver Burkeman" 
                tag="STOICISM" 
                colors={colors} 
                onPress={() => handleResourcePress('The Antidote')}
              />
            </View>
          </View>

          {/* Resource Categories */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Categories</Text>
            <View style={styles.categoryList}>
              <CategoryItem 
                icon={<Clock size={18} color={colors.primary} />} 
                label="Time Management" 
                count={12} 
                colors={colors} 
                onPress={() => Alert.alert('Category', 'Opening Time Management resources')}
              />
              <CategoryItem 
                icon={<BookOpen size={18} color={colors.primary} />} 
                label="Technical Literature" 
                count={8} 
                colors={colors} 
                onPress={() => Alert.alert('Category', 'Opening Technical Literature resources')}
              />
              <CategoryItem 
                icon={<Bookmark size={18} color={colors.primary} />} 
                label="Personal Notes" 
                count={45} 
                colors={colors} 
                onPress={() => Alert.alert('Category', 'Opening Personal Notes')}
              />
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function BriefCard({ title, author, tag, colors, onPress }: { title: string; author: string; tag: string; colors: any, onPress: () => void }) {
  return (
    <TouchableOpacity 
      style={[stylesBrief.briefCard, { backgroundColor: colors.surface }]} 
      onPress={onPress}
    >
      <View style={[stylesBrief.tag, { backgroundColor: colors.secondaryContainer }]}>
        <Text style={[stylesBrief.tagText, { color: colors.onSecondaryContainer }]}>{tag}</Text>
      </View>
      <Text style={[stylesBrief.briefTitle, { color: colors.onSurface }]}>{title}</Text>
      <Text style={stylesBrief.briefMeta}>{author}</Text>
      <View style={stylesBrief.footer}>
        <ArrowRight size={16} color={colors.primary} />
      </View>
    </TouchableOpacity>
  );
}

const stylesBrief = StyleSheet.create({
  briefCard: {
    flex: 1,
    padding: 16,
    borderRadius: ROUNDNESS.lg,
    borderWidth: 1,
    borderColor: COLORS.light.outline + '1A',
    justifyContent: 'space-between',
    minHeight: 140,
  },
  tag: {
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginBottom: 8,
  },
  tagText: {
    fontFamily: FONTS.labelSm,
    fontSize: 9,
    letterSpacing: 0.5,
  },
  briefTitle: {
    fontFamily: FONTS.headline,
    fontSize: 18,
    lineHeight: 22,
  },
  briefMeta: {
    fontFamily: FONTS.body,
    fontSize: 12,
    color: COLORS.light.outline,
    marginTop: 4,
  },
  footer: {
    alignItems: 'flex-end',
    marginTop: 12,
  },
});

function CategoryItem({ icon, label, count, colors, onPress }: { icon: React.ReactNode; label: string; count: number; colors: any, onPress: () => void }) {
  return (
    <TouchableOpacity 
      style={[stylesCat.categoryItem, { borderBottomColor: colors.outlineVariant + '4D' }]}
      onPress={onPress}
    >
      <View style={stylesCat.categoryMain}>
        <View style={[stylesCat.iconBg, { backgroundColor: colors.primaryContainer }]}>
          {icon}
        </View>
        <Text style={[stylesCat.categoryLabel, { color: colors.onSurface }]}>{label}</Text>
      </View>
      <View style={stylesCat.categoryRight}>
        <Text style={stylesCat.categoryCount}>{count}</Text>
        <ArrowRight size={14} color={colors.outline} />
      </View>
    </TouchableOpacity>
  );
}

const stylesCat = StyleSheet.create({
  categoryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  categoryMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  iconBg: {
    width: 36,
    height: 36,
    borderRadius: ROUNDNESS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryLabel: {
    fontFamily: FONTS.labelSm,
    fontSize: 14,
  },
  categoryRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryCount: {
    fontFamily: FONTS.label,
    fontSize: 13,
    color: COLORS.light.outline,
  },
});

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.lg,
    backgroundColor: colors.background,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  avatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: ROUNDNESS.full,
    backgroundColor: colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarLogo: {
    width: 24,
    height: 24,
  },
  logoImage: {
    height: 32,
    width: 120,
  },
  ghostBtn: {
    padding: 4,
  },
  introSection: {
    padding: SPACING.lg,
    backgroundColor: colors.surface,
  },
  labelCaps: {
    fontFamily: FONTS.labelSm,
    fontSize: 11,
    letterSpacing: 1.5,
    color: colors.primary,
  },
  headline: {
    fontFamily: FONTS.headline,
    fontSize: 32,
    color: colors.onSurface,
    marginTop: SPACING.xs,
  },
  subheadline: {
    fontFamily: FONTS.body,
    fontSize: 15,
    color: colors.onSurfaceVariant,
    lineHeight: 22,
    marginTop: 8,
    marginBottom: SPACING.lg,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceVariant + '4D',
    borderRadius: ROUNDNESS.md,
    padding: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: colors.outlineVariant + '4D',
  },
  searchText: {
    fontFamily: FONTS.body,
    fontSize: 14,
    color: colors.onSurfaceVariant,
  },
  section: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xl,
  },
  featuredCard: {
    padding: SPACING.xl,
    borderRadius: ROUNDNESS.xl,
    elevation: 4,
    shadowColor: COLORS.light.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  featuredBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: ROUNDNESS.sm,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  featuredBadgeText: {
    fontFamily: FONTS.labelSm,
    fontSize: 10,
    letterSpacing: 1,
    color: '#fff',
  },
  featuredTitle: {
    fontFamily: FONTS.headline,
    fontSize: 24,
    lineHeight: 30,
    color: '#fff',
  },
  featuredMeta: {
    fontFamily: FONTS.label,
    fontSize: 12,
    marginTop: 6,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  featuredFooter: {
    marginTop: 24,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progressLabel: {
    fontFamily: FONTS.labelSm,
    fontSize: 9,
    letterSpacing: 1,
    color: '#fff',
  },
  progressValue: {
    fontFamily: FONTS.labelSm,
    fontSize: 12,
    color: '#fff',
  },
  technicalBarBg: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  technicalBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  sectionTitle: {
    fontFamily: FONTS.headline,
    fontSize: 24,
    color: colors.onSurface,
    marginBottom: SPACING.lg,
  },
  briefsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  categoryList: {
    paddingBottom: 20,
  },
});
