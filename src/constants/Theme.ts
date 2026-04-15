export const ACCENTS = {
  sage: {
    label: 'Batsir Sage',
    primary: '#4a655a',
    primaryContainer: '#cbe9db',
    onPrimaryContainer: '#3d574d',
  },
  blue: {
    label: 'Ocean Blue',
    primary: '#4e607b',
    primaryContainer: '#d3e3ff',
    onPrimaryContainer: '#40536d',
  },
  pink: {
    label: 'Rose Pink',
    primary: '#a8385a',
    primaryContainer: '#ffd9df',
    onPrimaryContainer: '#3e001a',
  },
  red: {
    label: 'Crimson Rust',
    primary: '#a84c36',
    primaryContainer: '#ffdad2',
    onPrimaryContainer: '#3e0a01',
  },
  purple: {
    label: 'Royal Amethyst',
    primary: '#7c4dff',
    primaryContainer: '#e0e0ff',
    onPrimaryContainer: '#2c0091',
  },
  orange: {
    label: 'Deep Amber',
    primary: '#f57c00',
    primaryContainer: '#fff3e0',
    onPrimaryContainer: '#e65100',
  },
  teal: {
    label: 'Deep Teal',
    primary: '#00796b',
    primaryContainer: '#e0f2f1',
    onPrimaryContainer: '#004d40',
  },
  emerald: {
    label: 'Vibrant Emerald',
    primary: '#2e7d32',
    primaryContainer: '#e8f5e9',
    onPrimaryContainer: '#1b5e20',
  },
};

export type AccentKey = keyof typeof ACCENTS;

export const COLORS = {
  light: {
    primary: '#4a655a', // Sage
    onPrimary: '#f8faf9',
    primaryContainer: '#cbe9db',
    onPrimaryContainer: '#3d574d',
    secondary: '#4e607b', // Soft Blue
    onSecondary: '#f8f8ff',
    secondaryContainer: '#d3e3ff',
    onSecondaryContainer: '#40536d',
    tertiary: '#655b6f', // Muted Lavender
    onTertiary: '#fef6ff',
    background: '#f8faf9', // Off-white
    onBackground: '#2d3433',
    surface: '#f8faf9',
    onSurface: '#2d3433',
    surfaceVariant: '#eaefee',
    onSurfaceVariant: '#596060',
    outline: '#757c7b',
    outlineVariant: '#acb3b2',
    error: '#a83836',
    onError: '#fff7f6',
  },
  dark: {
    primary: '#bedbce', // Tonal lighter Sage
    onPrimary: '#2a443b',
    primaryContainer: '#466156',
    onPrimaryContainer: '#d7f5e7',
    secondary: '#c2d6f5', // Tonal lighter Soft Blue
    onSecondary: '#2e405a',
    secondaryContainer: '#4a5d77',
    onSecondaryContainer: '#d3e3ff',
    tertiary: '#e5d8f0', // Tonal lighter Lavender
    onTertiary: '#4a4154',
    background: '#0b0f0f', // Very dark Charcoal
    onBackground: '#f1f4f3',
    surface: '#0b0f0f',
    onSurface: '#f1f4f3',
    surfaceVariant: '#2d3433',
    onSurfaceVariant: '#acb3b2',
    outline: '#acb3b2',
    outlineVariant: '#596060',
    error: '#fa746f',
    onError: '#6e0a12',
  }
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  giant: 64,
};

export const ROUNDNESS = {
  none: 0,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 24,
  full: 9999, 
};

export const FONTS = {
  headline: 'Manrope_700Bold',
  body: 'Manrope_400Regular',
  label: 'PlusJakartaSans_500Medium',
  labelSm: 'PlusJakartaSans_700Bold',
};

export const GRID_STYLE = {
  ghostBorder: (scheme: 'light' | 'dark') => scheme === 'light' ? 'rgba(74, 101, 90, 0.1)' : 'rgba(190, 219, 206, 0.1)',
};
