import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  TextInput,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  FadeIn,
  FadeOut,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { 
  X, 
  ChevronLeft, 
  Settings, 
  BookOpen, 
  MessageSquare, 
  Clock, 
  Play, 
  Pause,
  ArrowRight
} from 'lucide-react-native';
import { ROUNDNESS, SPACING } from '@/src/constants/Theme';
import { useTheme } from '@/src/hooks/useTheme';

import Constants, { ExecutionEnvironment } from 'expo-constants';

const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

import { WebView } from 'react-native-webview';

// Safe PDF Component Wrapper
const PdfRendererComponent = (props: any) => {
  const { source, style, onLoad, onPageChange, page } = props;
  
  const viewerUrl = useMemo(() => {
    if (Platform.OS === 'ios') {
      return source;
    }
    // Android: Use Google Docs Viewer for remote URLs
    // Note: Local files won't work with this wrapper on Android
    return `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(source)}`;
  }, [source]);

  return (
    <WebView
      originWhitelist={['*']}
      source={{ uri: viewerUrl }}
      style={style}
      onLoad={() => onLoad?.(0)} // WebView doesn't provide total pages easily
      javaScriptEnabled={true}
      domStorageEnabled={true}
      startInLoadingState={true}
      renderLoading={() => <ActivityIndicator style={StyleSheet.absoluteFill} size="large" />}
    />
  );
};

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface PdfReaderProps {
  uri: string;
  title: string;
  initialPage?: number;
  onClose: () => void;
  onPageChange?: (page: number, total: number) => void;
  onSessionUpdate?: (seconds: number) => void;
  onAddNote?: (page: number) => void;
}

export const PdfReader: React.FC<PdfReaderProps> = ({
  uri,
  title,
  initialPage = 0,
  onClose,
  onPageChange,
  onSessionUpdate,
  onAddNote,
}) => {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  
  // State
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [totalPages, setTotalPages] = useState(0);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [sessionSeconds, setSessionSeconds] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(true);
  const [jumpToPage, setJumpToPage] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Animations
  const controlsOpacity = useSharedValue(1);
  const topBarY = useSharedValue(0);
  const bottomBarY = useSharedValue(0);

  // Timer logic
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isTimerRunning) {
      interval = setInterval(() => {
        setSessionSeconds(s => s + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTimerRunning]);

  // Report session time to parent safely
  useEffect(() => {
    onSessionUpdate?.(sessionSeconds);
  }, [sessionSeconds]);

  // Auto-hide controls
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (controlsVisible) {
      timer = setTimeout(() => {
        toggleControls(false);
      }, 5000);
    }
    return () => clearTimeout(timer);
  }, [controlsVisible]);

  const toggleControls = useCallback((force?: boolean) => {
    const nextVisible = force !== undefined ? force : !controlsVisible;
    setControlsVisible(nextVisible);
    
    const targetOpacity = nextVisible ? 1 : 0;
    const targetY = nextVisible ? 0 : -100;
    const targetBottomY = nextVisible ? 0 : 100;

    controlsOpacity.value = withTiming(targetOpacity);
    topBarY.value = withTiming(targetY);
    bottomBarY.value = withTiming(targetBottomY);
  }, [controlsVisible]);

  const animatedTopBarStyle = useAnimatedStyle(() => ({
    opacity: controlsOpacity.value,
    transform: [{ translateY: topBarY.value }],
  }));

  const animatedBottomBarStyle = useAnimatedStyle(() => ({
    opacity: controlsOpacity.value,
    transform: [{ translateY: bottomBarY.value }],
  }));

  const formatTime = (totalSeconds: number) => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handlePageChange = (page: number, total: number) => {
    setCurrentPage(page);
    setTotalPages(total);
    // Use a small delay to avoid "update while rendering" if called synchronously by PdfRenderer
    setTimeout(() => {
      onPageChange?.(page, total);
    }, 0);
  };

  const handleGoToPage = () => {
    const page = parseInt(jumpToPage);
    if (!isNaN(page) && page >= 1 && page <= totalPages) {
      // In react-native-pdf-renderer, we might need a ref to the component to scroll
      // For now, we update the state and assume the component reacts to it or we'll add a ref later
      setCurrentPage(page - 1);
      setJumpToPage('');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: '#000' }]}>
      {/* PDF View */}
      <TouchableOpacity 
        activeOpacity={1} 
        onPress={() => toggleControls()} 
        style={styles.pdfContainer}
      >
        <PdfRendererComponent
          source={uri}
          style={styles.pdf}
          onLoad={(total: number) => {
            setTotalPages(total);
            setIsLoading(false);
          }}
          onPageChange={handlePageChange}
          page={currentPage}
        />
        
        {isLoading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        )}
      </TouchableOpacity>

      {/* Top Controls */}
      <Animated.View style={[styles.topBarContainer, animatedTopBarStyle, { top: insets.top + SPACING.sm }]}>
        <BlurView intensity={isDark ? 40 : 60} tint={isDark ? 'dark' : 'light'} style={styles.glassBar}>
          <View style={styles.topBarContent}>
            <TouchableOpacity onPress={onClose} style={styles.iconButton}>
              <X size={24} color={isDark ? '#fff' : '#000'} />
            </TouchableOpacity>
            
            <View style={styles.titleContainer}>
              <Text style={[styles.bookTitle, { color: isDark ? '#fff' : '#000' }]} numberOfLines={1}>
                {title}
              </Text>
              <Text style={styles.pageText}>
                {currentPage + 1} / {totalPages}
              </Text>
            </View>

            <View style={styles.timerChip}>
              <Clock size={14} color={colors.primary} />
              <Text style={[styles.timerText, { color: colors.primary }]}>
                {formatTime(sessionSeconds)}
              </Text>
            </View>

            <TouchableOpacity 
              onPress={() => onAddNote?.(currentPage)} 
              style={styles.iconButton}
            >
              <MessageSquare size={22} color={isDark ? '#fff' : '#000'} />
            </TouchableOpacity>
          </View>
        </BlurView>
      </Animated.View>

      {/* Bottom Controls */}
      <Animated.View style={[styles.bottomBarContainer, animatedBottomBarStyle, { bottom: insets.bottom + SPACING.md }]}>
        <BlurView intensity={isDark ? 40 : 60} tint={isDark ? 'dark' : 'light'} style={styles.glassBar}>
          <View style={styles.bottomBarContent}>
            <View style={styles.jumpContainer}>
              <TextInput
                style={[styles.pageInput, { color: isDark ? '#fff' : '#000', borderColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)' }]}
                placeholder="Page"
                placeholderTextColor={isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)'}
                keyboardType="numeric"
                value={jumpToPage}
                onChangeText={setJumpToPage}
                onSubmitEditing={handleGoToPage}
              />
              <TouchableOpacity onPress={handleGoToPage} style={[styles.goButton, { backgroundColor: colors.primary }]}>
                <ArrowRight size={18} color="#fff" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity 
              onPress={() => setIsTimerRunning(!isTimerRunning)}
              style={[styles.sessionButton, { backgroundColor: isTimerRunning ? colors.secondaryContainer : colors.primary }]}
            >
              {isTimerRunning ? (
                <>
                  <Pause size={18} color={colors.onSecondaryContainer} />
                  <Text style={[styles.sessionButtonText, { color: colors.onSecondaryContainer }]}>Pause Session</Text>
                </>
              ) : (
                <>
                  <Play size={18} color="#fff" />
                  <Text style={[styles.sessionButtonText, { color: '#fff' }]}>Resume Session</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </BlurView>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  pdfContainer: {
    flex: 1,
  },
  pdf: {
    flex: 1,
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  topBarContainer: {
    position: 'absolute',
    left: SPACING.md,
    right: SPACING.md,
    zIndex: 1000,
  },
  bottomBarContainer: {
    position: 'absolute',
    left: SPACING.md,
    right: SPACING.md,
    zIndex: 1000,
  },
  glassBar: {
    borderRadius: ROUNDNESS.full,
    overflow: 'hidden',
    padding: SPACING.sm,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  topBarContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.sm,
  },
  titleContainer: {
    flex: 1,
    marginHorizontal: SPACING.md,
    alignItems: 'center',
  },
  bookTitle: {
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  pageText: {
    fontSize: 12,
    color: 'rgba(128,128,128,0.8)',
    marginTop: 2,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: SPACING.sm,
  },
  timerText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  bottomBarContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.sm,
  },
  jumpContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: SPACING.md,
  },
  pageInput: {
    width: 60,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 14,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  goButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  sessionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 25,
  },
  sessionButtonText: {
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 8,
  },
});

export default PdfReader;
