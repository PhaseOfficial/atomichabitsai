import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Dimensions } from 'react-native';
import { Settings, BookOpen, Bookmark, FileText, Newspaper, PlusCircle, Search, Hash } from 'lucide-react-native';
import { COLORS, SPACING, ROUNDNESS, FONTS } from '../../src/constants/Theme';

const { width } = Dimensions.get('window');

const BOOKS = [
  {
    id: '001',
    title: 'MINDFUL BREATHING',
    author: 'DR. ARIS THORNE',
    progress: '82%',
    type: 'PDF_DOC',
  },
  {
    id: '002',
    title: 'QUIETUDE',
    author: 'ELENA VANCE',
    progress: '24%',
    type: 'EPU_BOOK',
  },
  {
    id: '003',
    title: "NATURE'S RHYTHM",
    author: 'MARCUS SOL',
    progress: '45%',
    type: 'RESEARCH',
  },
];

export default function LibraryScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
      {/* Top Navigation Bar */}
      <View style={styles.header}>
        <View style={styles.profileSection}>
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarInitials}>RB</Text>
          </View>
          <Text style={styles.logoText}>RCS BATSIRAI</Text>
        </View>
        <TouchableOpacity style={styles.iconButton}>
          <Settings size={20} color={COLORS.primary} strokeWidth={1.5} />
        </TouchableOpacity>
      </View>

      {/* Index Header */}
      <View style={styles.indexHeader}>
        <View style={styles.headerTop}>
          <Text style={styles.indexTitle}>KNOWLEDGE_INDEX</Text>
          <Text style={styles.indexSubtitle}>VOL_2024 / ARCHIVAL_STORAGE</Text>
        </View>
        <View style={styles.searchBar}>
          <Search size={16} color={COLORS.outline} />
          <Text style={styles.searchText}>QUERY_DATABASE...</Text>
        </View>
      </View>

      {/* Featured Entry */}
      <View style={styles.featuredSection}>
        <Text style={styles.sectionLabel}>FEATURED_ENTRY</Text>
        <View style={styles.featuredCard}>
          <View style={styles.featuredMeta}>
            <Hash size={12} color="#fff" />
            <Text style={styles.featuredMetaText}>REF_772_STILLNESS</Text>
          </View>
          <Text style={styles.featuredTitle}>The Architecture of Stillness</Text>
          <Text style={styles.featuredDesc}>Structural analysis of physical environments on mental bandwidth.</Text>
          <TouchableOpacity style={styles.starkBtn}>
            <Text style={styles.starkBtnText}>RESUME_DECODING (65%)</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Catalog List */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>ACTIVE_COLLECTION</Text>
        <View style={styles.catalogTable}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderText, { flex: 1 }]}>ID</Text>
            <Text style={[styles.tableHeaderText, { flex: 4 }]}>TITLE_AUTHOR</Text>
            <Text style={[styles.tableHeaderText, { flex: 2, textAlign: 'right' }]}>PROGRESS</Text>
          </View>
          
          {BOOKS.map((book) => (
            <TouchableOpacity key={book.id} style={styles.tableRow}>
              <Text style={[styles.tableCell, { flex: 1 }]}>{book.id}</Text>
              <View style={{ flex: 4 }}>
                <Text style={styles.bookTitle}>{book.title}</Text>
                <Text style={styles.bookAuthor}>{book.author}</Text>
              </View>
              <View style={{ flex: 2, alignItems: 'flex-end' }}>
                <Text style={styles.progressText}>{book.progress}</Text>
                <View style={styles.miniBar}>
                  <View style={[styles.miniBarFill, { width: book.progress }]} />
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>
        
        <TouchableOpacity style={styles.uploadRow}>
          <PlusCircle size={16} color={COLORS.outline} />
          <Text style={styles.uploadText}>UPLOAD_NEW_RESOURCES</Text>
        </TouchableOpacity>
      </View>

      {/* Technical Briefs */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>TECHNICAL_BRIEFS</Text>
        <View style={styles.briefsGrid}>
          <TouchableOpacity style={styles.briefCard}>
            <FileText size={20} color={COLORS.primary} strokeWidth={1.5} />
            <Text style={styles.briefTitle}>Cognitive Rest Protocols</Text>
            <Text style={styles.briefMeta}>STATUS: COMPLETED</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.briefCard}>
            <Newspaper size={20} color={COLORS.primary} strokeWidth={1.5} />
            <Text style={styles.briefTitle}>Soft Focus Mechanics</Text>
            <Text style={styles.briefMeta}>STATUS: 12_MIN_REMAINING</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  contentContainer: {
    paddingBottom: 120,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(119, 119, 119, 0.15)',
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  avatarPlaceholder: {
    width: 32,
    height: 32,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    color: '#fff',
    fontFamily: FONTS.label,
    fontSize: 12,
  },
  logoText: {
    fontSize: 14,
    fontFamily: FONTS.labelSm,
    color: COLORS.primary,
    letterSpacing: 1,
  },
  iconButton: {
    padding: 4,
  },
  indexHeader: {
    padding: SPACING.lg,
    backgroundColor: '#fff',
  },
  headerTop: {
    marginBottom: SPACING.md,
  },
  indexTitle: {
    fontFamily: FONTS.headline,
    fontSize: 42,
    color: COLORS.primary,
  },
  indexSubtitle: {
    fontFamily: FONTS.label,
    fontSize: 10,
    color: COLORS.outline,
    letterSpacing: 2,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(119, 119, 119, 0.15)',
    padding: 12,
  },
  searchText: {
    fontFamily: FONTS.label,
    fontSize: 12,
    color: COLORS.outline,
  },
  section: {
    padding: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: 'rgba(119, 119, 119, 0.15)',
  },
  sectionLabel: {
    fontFamily: FONTS.label,
    fontSize: 9,
    color: COLORS.outline,
    letterSpacing: 2,
    marginBottom: SPACING.md,
  },
  featuredSection: {
    padding: SPACING.lg,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: 'rgba(119, 119, 119, 0.15)',
  },
  featuredCard: {
    backgroundColor: COLORS.primary,
    padding: SPACING.xl,
  },
  featuredMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: SPACING.sm,
  },
  featuredMetaText: {
    color: 'rgba(255,255,255,0.6)',
    fontFamily: FONTS.label,
    fontSize: 9,
    letterSpacing: 1,
  },
  featuredTitle: {
    fontFamily: FONTS.headline,
    fontSize: 32,
    color: '#fff',
    marginBottom: SPACING.sm,
  },
  featuredDesc: {
    fontFamily: FONTS.body,
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    lineHeight: 20,
    marginBottom: SPACING.xl,
  },
  starkBtn: {
    backgroundColor: '#fff',
    padding: 12,
    alignItems: 'center',
  },
  starkBtnText: {
    fontFamily: FONTS.labelSm,
    fontSize: 11,
    color: COLORS.primary,
    letterSpacing: 1,
  },
  catalogTable: {
    borderWidth: 1,
    borderColor: 'rgba(119, 119, 119, 0.15)',
  },
  tableHeader: {
    flexDirection: 'row',
    padding: 10,
    backgroundColor: 'rgba(0,0,0,0.02)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(119, 119, 119, 0.15)',
  },
  tableHeaderText: {
    fontFamily: FONTS.labelSm,
    fontSize: 9,
    color: COLORS.outline,
  },
  tableRow: {
    flexDirection: 'row',
    padding: 12,
    alignItems: 'center',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  tableCell: {
    fontFamily: FONTS.label,
    fontSize: 10,
    color: COLORS.outline,
  },
  bookTitle: {
    fontFamily: FONTS.labelSm,
    fontSize: 13,
    color: COLORS.primary,
  },
  bookAuthor: {
    fontFamily: FONTS.label,
    fontSize: 9,
    color: COLORS.outline,
  },
  progressText: {
    fontFamily: FONTS.labelSm,
    fontSize: 11,
    color: COLORS.primary,
    marginBottom: 4,
  },
  miniBar: {
    width: 40,
    height: 3,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  miniBarFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
  },
  uploadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 16,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(119, 119, 119, 0.15)',
    marginTop: -1,
    backgroundColor: '#fff',
  },
  uploadText: {
    fontFamily: FONTS.label,
    fontSize: 10,
    color: COLORS.outline,
    letterSpacing: 1,
  },
  briefsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  briefCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: 'rgba(119, 119, 119, 0.15)',
    padding: 16,
    gap: 12,
  },
  briefTitle: {
    fontFamily: FONTS.headline,
    fontSize: 16,
    color: COLORS.primary,
  },
  briefMeta: {
    fontFamily: FONTS.label,
    fontSize: 8,
    color: COLORS.outline,
    letterSpacing: 0.5,
  },
});