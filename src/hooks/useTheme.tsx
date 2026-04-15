import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { COLORS, ACCENTS, AccentKey } from '../constants/Theme';
import { getDb } from '../db/database';

const ACCENT_STORAGE_KEY = 'accent_key';
const THEME_MODE_STORAGE_KEY = 'theme_mode';

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextType {
  colors: any;
  colorScheme: 'light' | 'dark';
  isDark: boolean;
  accentKey: AccentKey;
  updateAccent: (key: AccentKey) => Promise<void>;
  availableAccents: typeof ACCENTS;
  themeMode: ThemeMode;
  updateThemeMode: (mode: ThemeMode) => Promise<void>;
  isLoaded: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Helper to interact with settings table
async function getSetting(key: string, defaultValue: string): Promise<string> {
  try {
    const db = await getDb();
    const result = await db.getFirstAsync<{value: string}>('SELECT value FROM settings WHERE key = ?', [key]);
    return result ? result.value : defaultValue;
  } catch (e) {
    console.error(`Failed to get setting ${key}`, e);
    return defaultValue;
  }
}

async function saveSetting(key: string, value: string): Promise<void> {
  try {
    const db = await getDb();
    await db.runAsync('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [key, value]);
  } catch (e) {
    console.error(`Failed to save setting ${key}`, e);
  }
}

export const BatsirThemeProvider = ({ children }: { children: ReactNode }) => {
  const systemColorScheme = useColorScheme() ?? 'light';
  const [accentKey, setAccentKey] = useState<AccentKey>('sage');
  const [themeMode, setThemeMode] = useState<ThemeMode>('system');
  const [isLoaded, setIsLoaded] = useState(false);

  // Load persisted theme and accent on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const storedAccent = await getSetting(ACCENT_STORAGE_KEY, 'sage');
        const storedMode = await getSetting(THEME_MODE_STORAGE_KEY, 'system');

        if (storedAccent && ACCENTS[storedAccent as AccentKey]) {
          setAccentKey(storedAccent as AccentKey);
        }

        if (storedMode) {
          setThemeMode(storedMode as ThemeMode);
        }
      } catch (e) {
        console.error('Failed to load theme settings', e);
      } finally {
        setIsLoaded(true);
      }
    };
    loadSettings();
  }, []);

  const updateAccent = useCallback(async (key: AccentKey) => {
    try {
      setAccentKey(key);
      await saveSetting(ACCENT_STORAGE_KEY, key);
    } catch (e) {
      console.error('Failed to save theme accent', e);
    }
  }, []);

  const updateThemeMode = useCallback(async (mode: ThemeMode) => {
    try {
      setThemeMode(mode);
      await saveSetting(THEME_MODE_STORAGE_KEY, mode);
    } catch (e) {
      console.error('Failed to save theme mode', e);
    }
  }, []);

  const colorScheme = themeMode === 'system' ? systemColorScheme : themeMode;
  const isDark = colorScheme === 'dark';
  const baseColors = COLORS[colorScheme as keyof typeof COLORS];
  const accent = ACCENTS[accentKey];

  // Override primary colors based on selected accent
  const colors = {
    ...baseColors,
    primary: accent.primary,
    onPrimary: '#FFFFFF', 
    primaryContainer: isDark ? baseColors.primaryContainer : accent.primaryContainer,
    onPrimaryContainer: isDark ? baseColors.onPrimaryContainer : accent.onPrimaryContainer,
  };

  const value = {
    colors,
    colorScheme: colorScheme as 'light' | 'dark',
    isDark,
    accentKey,
    updateAccent,
    availableAccents: ACCENTS,
    themeMode,
    updateThemeMode,
    isLoaded,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
