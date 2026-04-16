import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { COLORS, ACCENTS, AccentKey } from '../constants/Theme';
import { getDb } from '../db/database';
import { supabase } from '../lib/supabase';

const ACCENT_STORAGE_KEY = 'accent_key';
const THEME_MODE_STORAGE_KEY = 'theme_mode';
const FOCUS_GOAL_KEY = 'daily_focus_goal';
const SPRINT_DURATION_KEY = 'sprint_duration';

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
  focusGoal: number;
  updateFocusGoal: (goal: number) => Promise<void>;
  sprintDuration: number;
  updateSprintDuration: (mins: number) => Promise<void>;
  isLoaded: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

async function getSetting(key: string, defaultValue: string): Promise<string> {
  try {
    const db = await getDb();
    const result = await db.getFirstAsync<{value: string}>('SELECT value FROM settings WHERE key = ?', [key]);
    return result ? result.value : defaultValue;
  } catch (e) {
    return defaultValue;
  }
}

async function saveSetting(key: string, value: string): Promise<void> {
  try {
    const db = await getDb();
    await db.runAsync('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [key, value]);
    
    // Attempt to sync to Supabase profile preferences
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase.from('profiles').select('preferences').eq('id', user.id).single();
      const prefs = profile?.preferences || {};
      await supabase.from('profiles').update({
        preferences: { ...prefs, [key]: value }
      }).eq('id', user.id);
    }
  } catch (e) {
    console.error(`Failed to save setting ${key}`, e);
  }
}

export const BatsirThemeProvider = ({ children }: { children: ReactNode }) => {
  const systemColorScheme = useColorScheme() ?? 'light';
  const [accentKey, setAccentKey] = useState<AccentKey>('sage');
  const [themeMode, setThemeMode] = useState<ThemeMode>('system');
  const [focusGoal, setFocusGoal] = useState(8);
  const [sprintDuration, setSprintDuration] = useState(25);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const storedAccent = await getSetting(ACCENT_STORAGE_KEY, 'sage');
        const storedMode = await getSetting(THEME_MODE_STORAGE_KEY, 'system');
        const storedGoal = await getSetting(FOCUS_GOAL_KEY, '8');
        const storedDuration = await getSetting(SPRINT_DURATION_KEY, '25');

        setAccentKey(storedAccent as AccentKey);
        setThemeMode(storedMode as ThemeMode);
        setFocusGoal(parseInt(storedGoal));
        setSprintDuration(parseInt(storedDuration));
      } catch (e) {
        console.error('Failed to load theme settings', e);
      } finally {
        setIsLoaded(true);
      }
    };
    loadSettings();
  }, []);

  const updateAccent = useCallback(async (key: AccentKey) => {
    setAccentKey(key);
    await saveSetting(ACCENT_STORAGE_KEY, key);
  }, []);

  const updateThemeMode = useCallback(async (mode: ThemeMode) => {
    setThemeMode(mode);
    await saveSetting(THEME_MODE_STORAGE_KEY, mode);
  }, []);

  const updateFocusGoal = useCallback(async (goal: number) => {
    setFocusGoal(goal);
    await saveSetting(FOCUS_GOAL_KEY, goal.toString());
  }, []);

  const updateSprintDuration = useCallback(async (mins: number) => {
    setSprintDuration(mins);
    await saveSetting(SPRINT_DURATION_KEY, mins.toString());
  }, []);

  const colorScheme = themeMode === 'system' ? systemColorScheme : themeMode;
  const isDark = colorScheme === 'dark';
  const baseColors = COLORS[colorScheme as keyof typeof COLORS];
  const accent = ACCENTS[accentKey];

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
    focusGoal,
    updateFocusGoal,
    sprintDuration,
    updateSprintDuration,
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
