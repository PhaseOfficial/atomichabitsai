import React, { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  Image, 
  Alert, 
  ActivityIndicator, 
  Modal, 
  TextInput, 
  Dimensions, 
  Platform, 
  KeyboardAvoidingView 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  Settings, 
  Search, 
  BookOpen, 
  Bookmark, 
  Clock, 
  ArrowRight, 
  Star, 
  Menu, 
  Plus, 
  Upload, 
  Book as BookIcon, 
  TrendingUp, 
  ChevronRight,
  X,
  Check,
  Smartphone,
  CheckCircle2,
  Play,
  Trash2,
  Sparkles
} from "lucide-react-native";
import { COLORS, SPACING, FONTS, ROUNDNESS } from '@/src/constants/Theme';
import { useTheme } from '@/src/hooks/useTheme';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '@/src/hooks/useAuth';
import { useData } from '@/src/hooks/useData';
import { performMutation } from '@/src/lib/sync';
import * as Haptics from 'expo-haptics';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { WebView } from 'react-native-webview';

interface Book {
  id: string;
  title: string;
  author: string;
  total_pages: number;
  current_page: number;
  file_uri: string;
  cover_uri: string;
  status: 'reading' | 'finished' | 'want_to_read';
  updated_at: string;
}

interface ReadingLog {
  id: string;
  book_id: string;
  pages_read: number;
  duration_minutes: number;
  logged_at: string;
}

export default function LibraryScreen() {
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
  const router = useRouter();
  
  const userId = user?.id || 'guest';

  // State
  const [showAddModal, setShowAddModal] = useState(false);
  const [showReader, setShowReader] = useState(false);
  const [activeBook, setActiveBook] = useState<Book | null>(null);
  const [readerStartTime, setReaderStartTime] = useState<number | null>(null);
  
  // Form State
  const [bookTitle, setBookTitle] = useState("");
  const [bookAuthor, setBookAuthor] = useState("");
  const [totalPages, setTotalPages] = useState("");
  const [selectedFile, setSelectedFile] = useState<any>(null);

  // Reader Session State
  const [currentPageInput, setCurrentPageInput] = useState("");

  // Data
  const { data: books, loading: booksLoading, refresh: refreshBooks } = useData<Book>(
    "SELECT * FROM books WHERE (user_id = ? OR user_id IS NULL) ORDER BY updated_at DESC",
    [userId]
  );

  const stats = useMemo(() => {
    const reading = books.filter(b => b.status === 'reading');
    const finished = books.filter(b => b.status === 'finished');
    const totalPagesRead = books.reduce((acc, b) => acc + b.current_page, 0);
    return { reading: reading.length, finished: finished.length, pages: totalPagesRead };
  }, [books]);

  useFocusEffect(
    useCallback(() => {
      refreshBooks();
    }, [refreshBooks])
  );

  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true
      });

      if (!result.canceled) {
        const file = result.assets[0];
        setSelectedFile(file);
        // Pre-fill title from filename
        const cleanName = file.name.replace('.pdf', '').replace(/_/g, ' ');
        setBookTitle(cleanName);
        setShowAddModal(true);
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to pick document');
    }
  };

  const handleAddBook = async () => {
    if (!bookTitle.trim()) return;
    
    setLoading(true);
    try {
      let finalUri = "";
      if (selectedFile) {
        const fileExt = selectedFile.name.split('.').pop();
        const fileName = `${userId}/${Date.now()}.${fileExt}`;
        const filePath = `${fileName}`;

        // 1. Read file as base64 for upload
        const base64 = await FileSystem.readAsStringAsync(selectedFile.uri, {
          encoding: FileSystem.EncodingType.Base64,
        });

        // 2. Upload to Supabase Storage
        const { data: storageData, error: uploadError } = await supabase.storage
          .from('books')
          .upload(filePath, decode(base64), {
            contentType: 'application/pdf',
            upsert: true
          });

        if (uploadError) throw uploadError;

        // 3. Get Public URL or signed URL (using public path for now if bucket is public, 
        // but our policy is private, so we store the path and use signed URLs or direct path)
        finalUri = filePath; 
      }

      const id = Math.random().toString(36).substring(7);
      await performMutation("books", "INSERT", {
        id,
        user_id: userId,
        title: bookTitle.trim(),
        author: bookAuthor.trim() || "Unknown",
        total_pages: parseInt(totalPages) || 0,
        current_page: 0,
        file_uri: finalUri, // Now stores Supabase storage path
        status: 'reading',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

      setShowAddModal(false);
      setBookTitle("");
      setBookAuthor("");
      setTotalPages("");
      setSelectedFile(null);
      refreshBooks();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      console.error(e);
      Alert.alert('Upload Error', 'Failed to sync document to the cloud vault.');
    } finally {
      setLoading(false);
    }
  };

  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedBookForDetails, setSelectedBookForDetails] = useState<Book | null>(null);

  const openDetails = (book: Book) => {
    setSelectedBookForDetails(book);
    setShowDetailsModal(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const openReader = (book: Book) => {
    setShowDetailsModal(false);
    setActiveBook(book);
    setReaderStartTime(performance.now()); // High-res start
    setCurrentPageInput(book.current_page.toString());
    setShowReader(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const closeReader = async () => {
    if (!activeBook || !readerStartTime) return;

    const endTime = performance.now();
    const durationMs = endTime - readerStartTime;
    const totalSeconds = durationMs / 1000;
    const durationMins = totalSeconds / 60;

    const newPage = parseInt(currentPageInput) || activeBook.current_page;
    const pagesRead = Math.max(0, newPage - activeBook.current_page);

    try {
      // 1. Update progress
      await performMutation("books", "UPDATE", {
        id: activeBook.id,
        current_page: newPage,
        status: (activeBook.total_pages > 0 && newPage >= activeBook.total_pages) ? 'finished' : 'reading',
        updated_at: new Date().toISOString()
      });

      // 2. Log high-precision session
      if (pagesRead > 0 || totalSeconds > 0) {
        await performMutation("reading_logs", "INSERT", {
          id: Math.random().toString(36).substring(7),
          user_id: userId,
          book_id: activeBook.id,
          pages_read: pagesRead,
          duration_minutes: durationMins,
          duration_seconds: totalSeconds,
          logged_at: new Date().toISOString()
        });
      }

      setShowReader(false);
      setActiveBook(null);
      setReaderStartTime(null);
      refreshBooks();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      console.error(e);
      setShowReader(false);
    }
  };

  const handleDeleteBook = async (id: string, fileUri?: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      "Remove Source",
      "Are you sure you want to delete this document from your library?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive", 
          onPress: async () => {
            try {
              // 1. Delete from DB
              await performMutation("books", "DELETE", { id });
              
              // 2. Delete local file if it exists
              if (fileUri) {
                const fileInfo = await FileSystem.getInfoAsync(fileUri);
                if (fileInfo.exists) {
                  await FileSystem.deleteAsync(fileUri);
                }
              }

              refreshBooks();
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch (e) { console.error(e); }
          }
        }
      ]
    );
  };

  const [isGeneratingAI, setIsGeneratingAI] = useState(false);

  const generateAIInsights = async (book: Book) => {
    setIsGeneratingAI(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    try {
      const { data, error } = await supabase.functions.invoke('process-book-ai', {
        body: { title: book.title }
      });

      if (error) throw error;

      await performMutation("books", "UPDATE", {
        id: book.id,
        synthesis: data.synthesis,
        updated_at: new Date().toISOString()
      });

      refreshBooks();
      Alert.alert("AI Synthesis Complete", "Deep insights have been added to your knowledge library.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      console.error(e);
      Alert.alert("AI Error", "Failed to connect to the Gemini model architect.");
    } finally {
      setIsGeneratingAI(false);
    }
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.menuBtn} onPress={() => router.push('/menu')}>
            <Menu size={24} color={colors.primary} strokeWidth={1.5} />
          </TouchableOpacity>
          <View style={styles.logoContainer}>
            <Image source={require('@/assets/images/Artboard 1 logo.png')} style={styles.logoImage} tintColor={colors.primary} resizeMode="contain" />
          </View>
          <TouchableOpacity style={styles.ghostBtn} onPress={() => router.push('/modal')}>
            <Settings size={20} color={colors.primary} strokeWidth={1.5} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Library Stats */}
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

          {/* Reading Queue */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Library</Text>
              <TouchableOpacity style={styles.addBtn} onPress={handlePickDocument}>
                <Plus size={18} color={colors.primary} />
                <Text style={styles.addBtnText}>UPLOAD SOURCE</Text>
              </TouchableOpacity>
            </View>

            {booksLoading ? <ActivityIndicator color={colors.primary} /> : (
              <View style={styles.bookGrid}>
                {books.map(book => {
                  const progress = book.total_pages > 0 ? Math.round((book.current_page / book.total_pages) * 100) : 0;
                  return (
                    <TouchableOpacity 
                      key={book.id} 
                      style={styles.bookCard}
                      onPress={() => openDetails(book)}
                    >
                      <View style={[styles.bookCover, { backgroundColor: colors.surfaceVariant }]}>
                        <BookIcon size={40} color={colors.outlineVariant} strokeWidth={1} />
                        {book.status === 'reading' && (
                          <View style={styles.resumeIndicator}>
                            <Play size={12} color="#fff" fill="#fff" />
                          </View>
                        )}
                        <View style={styles.progressOverlay}>
                          <Text style={styles.progressText}>{progress}%</Text>
                        </View>
                      </View>
                      <Text style={styles.bookTitle} numberOfLines={1}>{book.title}</Text>
                      <Text style={styles.bookAuthor} numberOfLines={1}>{book.author}</Text>
                      
                      <View style={styles.progressBarBg}>
                        <View 
                          style={[
                            styles.progressBarFill, 
                            { 
                              width: `${Math.min(progress, 100)}%`,
                              backgroundColor: book.status === 'finished' ? colors.tertiary : colors.primary 
                            }
                          ]} 
                        />
                      </View>
                    </TouchableOpacity>
                  );
                })}
                {books.length === 0 && (
                  <TouchableOpacity style={styles.emptyBookCard} onPress={handlePickDocument}>
                    <Upload size={32} color={colors.outline} strokeWidth={1.5} />
                    <Text style={styles.emptyBookText}>No documents in library.</Text>
                    <Text style={styles.emptyBookSub}>Upload PDFs to start tracking.</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        </ScrollView>

        {/* Add Book Modal */}
        <Modal visible={showAddModal} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <KeyboardAvoidingView 
              behavior={Platform.OS === "ios" ? "padding" : "height"}
              style={styles.modalContainer}
            >
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Source Configuration</Text>
                <TouchableOpacity onPress={() => setShowAddModal(false)}>
                  <X size={24} color={colors.onSurface} />
                </TouchableOpacity>
              </View>
              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <View style={styles.modalField}>
                  <Text style={styles.modalLabel}>TITLE</Text>
                  <TextInput style={styles.modalInput} value={bookTitle} onChangeText={setBookTitle} placeholder="e.g. Atomic Habits Chapter 1" placeholderTextColor={colors.outline} />
                </View>
                <View style={styles.modalField}>
                  <Text style={styles.modalLabel}>AUTHOR</Text>
                  <TextInput style={styles.modalInput} value={bookAuthor} onChangeText={setBookAuthor} placeholder="Author name" placeholderTextColor={colors.outline} />
                </View>
                <View style={styles.modalField}>
                  <Text style={styles.modalLabel}>TOTAL PAGES / UNITS</Text>
                  <TextInput style={styles.modalInput} value={totalPages} onChangeText={setTotalPages} keyboardType="numeric" placeholder="How many pages total?" placeholderTextColor={colors.outline} />
                </View>
                <TouchableOpacity style={styles.primaryBtn} onPress={handleAddBook}>
                  <Upload size={20} color={colors.onPrimary} />
                  <Text style={styles.primaryBtnText}>Sync to Library</Text>
                </TouchableOpacity>
              </ScrollView>
            </KeyboardAvoidingView>
          </View>
        </Modal>

        {/* PDF Reader Overlay */}
        <Modal visible={showReader} animationType="fade" presentationStyle="fullScreen">
          <View style={styles.readerContainer}>
            <SafeAreaView style={styles.readerHeader}>
              <View style={styles.readerInfo}>
                <Text style={styles.readerTitle} numberOfLines={1}>{activeBook?.title}</Text>
                <View style={styles.pageIndicatorRow}>
                   <Clock size={12} color={colors.primary} />
                   <Text style={styles.readerTimer}>
                      Session Active: {readerStartTime ? Math.round((Date.now() - readerStartTime)/60000) : 0}m
                   </Text>
                </View>
              </View>
              <TouchableOpacity style={styles.readerCloseBtn} onPress={closeReader}>
                <X size={24} color={colors.onSurface} />
              </TouchableOpacity>
            </SafeAreaView>

            <View style={styles.readerBody}>
              {activeBook?.file_uri ? (
                <WebView 
                  source={{ uri: activeBook.file_uri }}
                  style={{ flex: 1 }}
                  originWhitelist={['*']}
                  allowFileAccess={true}
                  scalesPageToFit={true}
                />
              ) : (
                <View style={styles.readerPlaceholder}>
                   <BookOpen size={48} color={colors.outlineVariant} />
                   <Text style={styles.placeholderText}>Visual document preview not available for this record type.</Text>
                </View>
              )}
            </View>

            <SafeAreaView style={styles.readerFooter}>
               <View style={styles.pageInputGroup}>
                 <Text style={styles.footerLabel}>Current Page:</Text>
                 <TextInput 
                   style={styles.pageInput}
                   value={currentPageInput}
                   onChangeText={setCurrentPageInput}
                   keyboardType="numeric"
                 />
                 <Text style={styles.footerLabel}>/ {activeBook?.total_pages || '?'}</Text>
               </View>
               <TouchableOpacity style={styles.finishBtn} onPress={closeReader}>
                 <CheckCircle2 size={20} color="#fff" />
                 <Text style={styles.finishBtnText}>CLOSE & LOG</Text>
               </TouchableOpacity>
            </SafeAreaView>
          </View>
        </Modal>

        {/* Book Details & Management Modal */}
        <Modal visible={showDetailsModal} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Book Details</Text>
                <TouchableOpacity onPress={() => setShowDetailsModal(false)}>
                  <X size={24} color={colors.onSurface} />
                </TouchableOpacity>
              </View>

              {selectedBookForDetails && (
                <ScrollView showsVerticalScrollIndicator={false}>
                  <View style={styles.detailsHeader}>
                    <View style={[styles.bookCover, { width: 120, height: 160 }]}>
                       <BookIcon size={48} color={colors.outlineVariant} />
                    </View>
                    <View style={styles.detailsMeta}>
                       <Text style={styles.detailsTitle}>{selectedBookForDetails.title}</Text>
                       <Text style={styles.detailsAuthor}>{selectedBookForDetails.author}</Text>
                       <View style={styles.detailsStats}>
                          <View style={styles.detailStatItem}>
                             <TrendingUp size={14} color={colors.primary} />
                             <Text style={styles.detailStatText}>{selectedBookForDetails.current_page} / {selectedBookForDetails.total_pages} Units</Text>
                          </View>
                          <View style={styles.detailStatItem}>
                             <Clock size={14} color={colors.secondary} />
                             <Text style={styles.detailStatText}>Last read: {new Date(selectedBookForDetails.updated_at).toLocaleDateString()}</Text>
                          </View>
                       </View>
                    </View>
                  </View>

                  <TouchableOpacity 
                    style={[styles.primaryBtn, { marginBottom: 12 }]} 
                    onPress={() => openReader(selectedBookForDetails)}
                  >
                    <Play size={20} color={colors.onPrimary} fill="#fff" />
                    <Text style={styles.primaryBtnText}>Continue Reading</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={[styles.primaryBtn, { backgroundColor: colors.surfaceVariant, borderWidth: 1, borderColor: colors.outlineVariant + '33' }]} 
                    onPress={() => generateAIInsights(selectedBookForDetails)}
                    disabled={isGeneratingAI}
                  >
                    {isGeneratingAI ? <ActivityIndicator size="small" color={colors.primary} /> : <Sparkles size={20} color={colors.primary} />}
                    <Text style={[styles.primaryBtnText, { color: colors.onSurface }]}>Generate AI Synthesis</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={styles.deleteActionBtn} 
                    onPress={() => {
                      setShowDetailsModal(false);
                      handleDeleteBook(selectedBookForDetails.id, selectedBookForDetails.file_uri);
                    }}
                  >
                    <Trash2 size={18} color={colors.error} />
                    <Text style={styles.deleteActionText}>Remove from Library</Text>
                  </TouchableOpacity>
                </ScrollView>
              )}
            </View>
          </View>
        </Modal>

      </SafeAreaView>
    </View>
  );
}

const createStyles = (colors: any, isDark: boolean) => StyleSheet.create({
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
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: colors.background,
    height: 60,
  },
  logoContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: -1,
  },
  logoImage: { height: 40, width: 160 },
  menuBtn: { padding: 8 },
  ghostBtn: { padding: 8 },
  scrollContent: {
    paddingBottom: 40,
  },
  statsSection: {
    flexDirection: 'row',
    padding: SPACING.lg,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: ROUNDNESS.lg,
    borderWidth: 1,
    borderColor: colors.outlineVariant + '33',
    alignItems: 'center',
  },
  statValue: {
    fontFamily: FONTS.headline,
    fontSize: 20,
    color: colors.onSurface,
    marginTop: 8,
  },
  statLabel: {
    fontFamily: FONTS.label,
    fontSize: 9,
    color: colors.outline,
    marginTop: 2,
    letterSpacing: 0.5,
  },
  section: {
    padding: SPACING.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontFamily: FONTS.headline,
    fontSize: 22,
    color: colors.onSurface,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  addBtnText: {
    fontFamily: FONTS.labelSm,
    fontSize: 11,
    color: colors.primary,
    letterSpacing: 0.5,
  },
  bookGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  bookCard: {
    width: (Dimensions.get('window').width - SPACING.lg * 2 - 16) / 2,
    marginBottom: 16,
  },
  bookCover: {
    aspectRatio: 3/4.5,
    borderRadius: ROUNDNESS.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.outlineVariant + '33',
  },
  resumeIndicator: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingVertical: 6,
    alignItems: 'center',
  },
  progressText: {
    color: '#fff',
    fontFamily: FONTS.labelSm,
    fontSize: 11,
  },
  bookTitle: {
    fontFamily: FONTS.labelSm,
    fontSize: 14,
    color: colors.onSurface,
  },
  bookAuthor: {
    fontFamily: FONTS.body,
    fontSize: 11,
    color: colors.outline,
    marginTop: 2,
  },
  progressBarBg: {
    height: 3,
    backgroundColor: colors.surfaceVariant,
    borderRadius: 1.5,
    marginTop: 8,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 1.5,
  },
  emptyBookCard: {
    width: '100%',
    paddingVertical: 40,
    borderRadius: ROUNDNESS.xl,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.outlineVariant,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: colors.surface + '80',
  },
  emptyBookText: {
    fontFamily: FONTS.headline,
    fontSize: 16,
    color: colors.onSurface,
  },
  emptyBookSub: {
    fontFamily: FONTS.body,
    fontSize: 13,
    color: colors.outline,
  },
  knowledgeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: ROUNDNESS.lg,
    borderWidth: 1,
    borderColor: colors.outlineVariant + '33',
  },
  knowledgeTitle: {
    fontFamily: FONTS.labelSm,
    fontSize: 15,
    color: colors.onSurface,
  },
  knowledgeDesc: {
    fontFamily: FONTS.body,
    fontSize: 12,
    color: colors.outline,
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: ROUNDNESS.xl,
    borderTopRightRadius: ROUNDNESS.xl,
    padding: SPACING.lg,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  modalTitle: {
    fontFamily: FONTS.headline,
    fontSize: 20,
    color: colors.onSurface,
  },
  modalSubtitle: {
    fontFamily: FONTS.labelSm,
    fontSize: 14,
    color: colors.primary,
    marginBottom: SPACING.lg,
  },
  modalField: {
    marginBottom: 20,
  },
  modalLabel: {
    fontFamily: FONTS.labelSm,
    fontSize: 11,
    color: colors.outline,
    marginBottom: 8,
    letterSpacing: 1,
  },
  modalInput: {
    backgroundColor: colors.surfaceVariant + '4D',
    borderRadius: ROUNDNESS.md,
    padding: 14,
    fontFamily: FONTS.body,
    fontSize: 16,
    color: colors.onSurface,
    borderWidth: 1,
    borderColor: colors.outlineVariant + '33',
  },
  primaryBtn: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    borderRadius: ROUNDNESS.full,
    marginTop: 10,
    marginBottom: 20,
  },
  primaryBtnText: {
    color: colors.onPrimary,
    fontFamily: FONTS.labelSm,
    fontSize: 16,
  },
  // Details Modal Styles
  detailsHeader: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: SPACING.xl,
  },
  detailsMeta: {
    flex: 1,
    justifyContent: 'center',
  },
  detailsTitle: {
    fontFamily: FONTS.headline,
    fontSize: 20,
    color: colors.onSurface,
  },
  detailsAuthor: {
    fontFamily: FONTS.body,
    fontSize: 14,
    color: colors.outline,
    marginTop: 4,
  },
  detailsStats: {
    marginTop: 12,
    gap: 6,
  },
  detailStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailStatText: {
    fontFamily: FONTS.label,
    fontSize: 12,
    color: colors.onSurfaceVariant,
  },
  deleteActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 20,
    paddingVertical: 12,
  },
  deleteActionText: {
    fontFamily: FONTS.labelSm,
    fontSize: 13,
    color: colors.error,
  },
  // Reader Styles
  readerContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  readerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.outlineVariant + '33',
  },
  readerInfo: {
    flex: 1,
    marginRight: 20,
  },
  readerTitle: {
    fontFamily: FONTS.headline,
    fontSize: 18,
    color: colors.onSurface,
  },
  pageIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  readerTimer: {
    fontFamily: FONTS.label,
    fontSize: 11,
    color: colors.primary,
  },
  readerCloseBtn: {
    padding: 8,
  },
  readerBody: {
    flex: 1,
    backgroundColor: '#fff', // Typically PDFs look better on pure white
  },
  readerPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    gap: 20,
  },
  placeholderText: {
    textAlign: 'center',
    fontFamily: FONTS.body,
    fontSize: 14,
    color: colors.outline,
    lineHeight: 20,
  },
  readerFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.outlineVariant + '33',
  },
  pageInputGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  footerLabel: {
    fontFamily: FONTS.labelSm,
    fontSize: 13,
    color: colors.onSurfaceVariant,
  },
  pageInput: {
    width: 50,
    height: 36,
    backgroundColor: colors.surfaceVariant + '80',
    borderRadius: 6,
    textAlign: 'center',
    fontFamily: FONTS.labelSm,
    fontSize: 15,
    color: colors.primary,
  },
  finishBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.onSurface,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: ROUNDNESS.full,
    gap: 8,
  },
  finishBtnText: {
    color: colors.background,
    fontFamily: FONTS.labelSm,
    fontSize: 12,
    letterSpacing: 0.5,
  },
});
