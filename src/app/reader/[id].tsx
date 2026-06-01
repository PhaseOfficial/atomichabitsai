import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, ActivityIndicator, StyleSheet, Alert } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { getDb } from '@/src/db/database';
import { performMutation } from '@/src/lib/sync';
import { resolveFileUri, downloadBook } from '@/src/lib/file-utils';
import PdfReader from '@/src/components/Library/PdfReader';
import { useTheme } from '@/src/hooks/useTheme';
import { ThemedText } from '@/components/themed-text';
import * as Haptics from 'expo-haptics';

interface Book {
  id: string;
  title: string;
  file_uri: string;
  current_page: number;
  total_pages: number;
  status: string;
}

export default function ReaderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors } = useTheme();
  
  const [book, setBook] = useState<Book | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [localUri, setLocalUri] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [startPage, setStartPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [sessionSeconds, setSessionSeconds] = useState(0);
  
  const sessionStartTime = useRef<number>(Date.now());

  useEffect(() => {
    loadBook();
  }, [id]);

  const loadBook = async () => {
    try {
      const db = await getDb();
      const bookData = await db.getFirstAsync<Book>(
        'SELECT * FROM books WHERE id = ?',
        [id]
      );
      
      if (bookData) {
        setBook(bookData);
        setCurrentPage(bookData.current_page || 0);
        setStartPage(bookData.current_page || 0);
        setTotalPages(bookData.total_pages || 0);

        // Ensure file is local
        try {
            setDownloading(true);
            const uri = await downloadBook(bookData.file_uri);
            setLocalUri(uri);
        } catch (e) {
            console.error('Failed to ensure local file:', e);
            // Fallback to resolved URI (might be a remote URL if docDir was null)
            setLocalUri(resolveFileUri(bookData.file_uri));
        } finally {
            setDownloading(false);
        }
      } else {
        Alert.alert('Error', 'Book not found');
        router.back();
      }
    } catch (error) {
      console.error('Failed to load book:', error);
      Alert.alert('Error', 'Failed to load book');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleClose = async () => {
    if (!book) return;

    const durationSeconds = Math.floor((Date.now() - sessionStartTime.current) / 1000);
    const pagesRead = Math.max(0, currentPage - startPage);

    try {
      // Update book progress
      await performMutation('books', 'UPDATE', {
        id: book.id,
        current_page: currentPage,
        total_pages: totalPages,
        status: totalPages > 0 && currentPage >= totalPages - 1 ? 'finished' : 'reading',
        updated_at: new Date().toISOString(),
      });

      // Log reading session
      if (pagesRead > 0 || durationSeconds > 30) {
        await performMutation('reading_logs', 'INSERT', {
          id: Math.random().toString(36).substring(7),
          book_id: book.id,
          start_page: startPage,
          end_page: currentPage,
          pages_read: pagesRead,
          duration_seconds: durationSeconds,
          duration_minutes: durationSeconds / 60,
          logged_at: new Date().toISOString(),
        });
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (error) {
      console.error('Failed to save progress:', error);
      router.back();
    }
  };

  const handlePageChange = useCallback((page: number, total: number) => {
    setCurrentPage(page);
    if (total > 0 && total !== totalPages) {
      setTotalPages(total);
    }
  }, [totalPages]);

  if (loading || (downloading && !localUri)) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: '#000' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        {downloading && (
          <ThemedText style={{ color: '#fff', marginTop: 16 }}>
            Downloading your book...
          </ThemedText>
        )}
      </View>
    );
  }

  if (!book || !localUri) return null;

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false, animation: 'fade' }} />
      <PdfReader
        uri={localUri}
        title={book.title}
        initialPage={currentPage}
        onClose={handleClose}
        onPageChange={handlePageChange}
        onSessionUpdate={setSessionSeconds}
        onAddNote={(page) => {
          // Future: Open note editor
          console.log('Add note for page:', page);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
