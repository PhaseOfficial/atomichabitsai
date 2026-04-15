export const COLORS = {
  light: {
    primary: '#7d000a', // Archival Red
    onPrimary: '#ffffff',
    primaryContainer: '#ffdad4',
    onPrimaryContainer: '#410001',
    secondary: '#000000', // Stark Black
    onSecondary: '#ffffff',
    secondaryContainer: '#e0e0e0',
    onSecondaryContainer: '#000000',
    tertiary: '#3c5d9c', // Deep Archival Blue
    onTertiary: '#ffffff',
    background: '#f9f9f9', // Paper White
    onBackground: '#1a1c1c',
    surface: '#ffffff',
    onSurface: '#1a1c1c',
    surfaceVariant: '#eeeeee',
    onSurfaceVariant: '#474747',
    outline: '#777777',
    outlineVariant: '#c6c6c6',
    error: '#ba1a1a',
    onError: '#ffffff',
  },
  dark: {
    primary: '#ffb4ab', // Lighter red for visibility in dark mode
    onPrimary: '#690002',
    primaryContainer: '#930005',
    onPrimaryContainer: '#ffdad4',
    secondary: '#ffffff', // Stark White for dark mode
    onSecondary: '#000000',
    secondaryContainer: '#333333',
    onSecondaryContainer: '#e0e0e0',
    tertiary: '#adc6ff', // Lighter blue for dark mode
    onTertiary: '#002e68',
    background: '#121212', // Deep Void
    onBackground: '#e2e2e2',
    surface: '#1e1e1e',
    onSurface: '#e2e2e2',
    surfaceVariant: '#474747',
    onSurfaceVariant: '#c6c6c6',
    outline: '#919191',
    outlineVariant: '#474747',
    error: '#ffb4ab',
    onError: '#690002',
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
  sm: 0,
  md: 0,
  lg: 0,
  xl: 0,
  full: 0, 
};

export const FONTS = {
  headline: 'Newsreader_700Bold',
  body: 'Inter_400Regular',
  label: 'SpaceGrotesk_500Medium',
  labelSm: 'SpaceGrotesk_700Bold',
};

export const GRID_STYLE = {
  ghostBorder: (scheme: 'light' | 'dark') => scheme === 'light' ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.1)',
};
