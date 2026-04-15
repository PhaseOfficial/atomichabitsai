import React, { useMemo } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Image, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Settings, Search, BookOpen, Bookmark, Clock, ArrowRight, Library as LibraryIcon } from 'lucide-react-native';
import { COLORS, SPACING, ROUNDNESS, FONTS } from '@/src/constants/Theme';
import { useTheme } from '@/src/hooks/useTheme';

const { width } = Dimensions.get('window');

export default function LibraryScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
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
          <TouchableOpacity style={styles.ghostBtn}>
            <Settings size={20} color={colors.primary} strokeWidth={1.5} />
          </TouchableOpacity>
        </View>

        {/* Library Intro */}
        <View style={styles.introSection}>
          <Text style={styles.labelCaps}>KNOWLEDGE_BASE / INDEX</Text>
          <Text style={styles.headline}>The Archival Library</Text>
          <Text style={styles.subheadline}>Synthesized insights from primary sources and technical documentation.</Text>
          
          <View style={[styles.searchBar, { borderColor: colors.outline + '26' }]}>
            <Search size={18} color={colors.outline} />
            <Text style={styles.searchText}>SEARCH_RESOURCES...</Text>
          </View>
        </View>

        {/* Featured Brief */}
        <View style={[styles.featuredCard, { backgroundColor: colors.primary }]}>
          <View style={styles.featuredBadge}>
            <Text style={[styles.featuredBadgeText, { color: colors.onPrimary }]}>CURRENT_READ</Text>
          </View>
          <Text style={[styles.featuredTitle, { color: colors.onPrimary }]}>Atomic Habits: Systemic Reinforcement</Text>
          <Text style={[styles.featuredMeta, { color: colors.onPrimary + 'B3' }]}>James Clear / Applied Psychology</Text>
          <View style={styles.featuredFooter}>
            <View style={styles.progressRow}>
              <Text style={[styles.progressLabel, { color: colors.onPrimary }]}>PROGRESS</Text>
              <Text style={[styles.progressValue, { color: colors.onPrimary }]}>65%</Text>
            </View>
            <View style={[styles.technicalBarBg, { backgroundColor: colors.onPrimary + '33' }]}>
              <View style={[styles.technicalBarFill, { width: '65%', backgroundColor: colors.onPrimary }]} />
            </View>
          </View>
        </View>

        {/* Briefs Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>SYNTHESIZED_BRIEFS</Text>
          <TouchableOpacity>
            <Text style={[styles.viewAll, { color: colors.primary }]}>VIEW_ALL</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.briefsGrid}>
          <BriefCard 
            title="Deep Work" 
            author="Cal Newport" 
            tag="FOCUS" 
            colors={colors}
          />
          <BriefCard 
            title="The Antidote" 
            author="Oliver Burkeman" 
            tag="STOICISM" 
            colors={colors}
          />
        </View>

        {/* Resource Categories */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>CATEGORIES</Text>
        </View>
        <View style={styles.categoryList}>
          <CategoryItem icon={<Clock size={18} color={colors.primary} />} label="TIME_MANAGEMENT" count={12} colors={colors} />
          <CategoryItem icon={<BookOpen size={18} color={colors.primary} />} label="TECHNICAL_LIT" count={8} colors={colors} />
          <CategoryItem icon={<Bookmark size={18} color={colors.primary} />} label="ARCHIVED_NOTES" count={45} colors={colors} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function BriefCard({ title, author, tag, colors }: { title: string; author: string; tag: string; colors: any }) {
  return (
    <TouchableOpacity style={[stylesBrief.briefCard, { borderColor: colors.outline + '26', backgroundColor: colors.surface }]}>
      <View style={[stylesBrief.tag, { backgroundColor: colors.primary + '1A' }]}>
        <Text style={[stylesBrief.tagText, { color: colors.primary }]}>{tag}</Text>
      </View>
      <Text style={[stylesBrief.briefTitle, { color: colors.primary }]}>{title}</Text>
      <Text style={stylesBrief.briefMeta}>{author}</Text>
      <ArrowRight size={16} color={colors.primary} style={{ marginTop: 8 }} />
    </TouchableOpacity>
  );
}

const stylesBrief = StyleSheet.create({
  briefCard: {
    flex: 1,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  tag: {
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  tagText: {
    fontFamily: FONTS.label,
    fontSize: 8,
    letterSpacing: 0.5,
  },
  briefTitle: {
    fontFamily: FONTS.headline,
    fontSize: 16,
  },
  briefMeta: {
    fontFamily: FONTS.label,
    fontSize: 8,
    color: COLORS.light.outline,
    letterSpacing: 0.5,
  },
});

function CategoryItem({ icon, label, count, colors }: { icon: React.ReactNode; label: string; count: number; colors: any }) {
  return (
    <TouchableOpacity style={[stylesCat.categoryItem, { borderBottomColor: colors.outline + '1A' }]}>
      <View style={stylesCat.categoryMain}>
        {icon}
        <Text style={[stylesCat.categoryLabel, { color: colors.primary }]}>{label}</Text>
      </View>
      <Text style={stylesCat.categoryCount}>{count.toString().padStart(2, '0')}</Text>
    </TouchableOpacity>
  );
}

const stylesCat = StyleSheet.create({
  categoryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  categoryMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  categoryLabel: {
    fontFamily: FONTS.labelSm,
    fontSize: 12,
    letterSpacing: 1,
  },
  categoryCount: {
    fontFamily: FONTS.label,
    fontSize: 10,
    color: COLORS.light.outline,
  },
});

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.outline + '26',
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  avatarPlaceholder: {
    width: 32,
    height: 32,
    backgroundColor: colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
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
    fontFamily: FONTS.label,
    fontSize: 10,
    letterSpacing: 2,
    color: colors.outline,
  },
  headline: {
    fontFamily: FONTS.headline,
    fontSize: 32,
    color: colors.primary,
    marginTop: SPACING.xs,
  },
  subheadline: {
    fontFamily: FONTS.body,
    fontSize: 14,
    color: colors.outline,
    lineHeight: 20,
    marginTop: SPACING.xs,
    marginBottom: SPACING.lg,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    padding: 12,
    gap: 12,
  },
  searchText: {
    fontFamily: FONTS.label,
    fontSize: 12,
    color: colors.outline,
  },
  featuredCard: {
    margin: SPACING.lg,
    padding: SPACING.xl,
  },
  featuredBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginBottom: 12,
  },
  featuredBadgeText: {
    fontFamily: FONTS.label,
    fontSize: 8,
    letterSpacing: 1,
  },
  featuredTitle: {
    fontFamily: FONTS.headline,
    fontSize: 22,
    lineHeight: 28,
  },
  featuredMeta: {
    fontFamily: FONTS.label,
    fontSize: 9,
    marginTop: 4,
    letterSpacing: 0.5,
  },
  featuredFooter: {
    marginTop: 24,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  progressLabel: {
    fontFamily: FONTS.label,
    fontSize: 8,
    letterSpacing: 1,
  },
  progressValue: {
    fontFamily: FONTS.labelSm,
    fontSize: 10,
  },
  technicalBarBg: {
    height: 2,
  },
  technicalBarFill: {
    height: '100%',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.md,
  },
  sectionTitle: {
    fontFamily: FONTS.labelSm,
    fontSize: 11,
    color: colors.outline,
    letterSpacing: 2,
  },
  viewAll: {
    fontFamily: FONTS.labelSm,
    fontSize: 9,
    letterSpacing: 1,
  },
  briefsGrid: {
    paddingHorizontal: SPACING.lg,
    flexDirection: 'row',
    gap: 12,
  },
  categoryList: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: 40,
  },
});
