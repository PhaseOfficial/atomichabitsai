import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState, useRef } from 'react';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { Manrope_700Bold, Manrope_400Regular } from '@expo-google-fonts/manrope';
import { PlusJakartaSans_500Medium, PlusJakartaSans_700Bold } from '@expo-google-fonts/plus-jakarta-sans';
import { initDatabase } from '@/src/db/database';
import { useTheme, BatsirThemeProvider } from '@/src/hooks/useTheme';
import { useSync } from '@/src/hooks/useSync';
import { AnimatedSplashScreen } from '@/src/components/animated-splash-screen';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  // Ensure that reloading on `/modal` keeps a back button present.
  initialRouteName: '(tabs)',
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync().catch(() => {
  /* Reloading in development can sometimes cause this to fail, ignore it */
});

export default function RootLayout() {
  const [dbLoaded, setDbLoaded] = useState(false);
  const [fontsLoaded, fontError] = useFonts({
    Manrope_700Bold,
    Manrope_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_700Bold,
  });

  useSync();

  useEffect(() => {
    initDatabase()
      .then(() => setDbLoaded(true))
      .catch((err) => console.error('Database initialization failed:', err));
  }, []);

  useEffect(() => {
    if (fontError) throw fontError;
  }, [fontError]);

  if (!fontsLoaded || !dbLoaded) {
    return null;
  }

  return (
    <BatsirThemeProvider>
      <RootLayoutContent />
    </BatsirThemeProvider>
  );
}

function RootLayoutContent() {
  const { isLoaded, colors } = useTheme();
  const [animationFinished, setAnimationFinished] = useState(false);
  const splashHidden = useRef(false);

  useEffect(() => {
    if (isLoaded && !splashHidden.current) {
      splashHidden.current = true;
      // Small delay to ensure the native splash screen is ready to be hidden
      const timer = setTimeout(() => {
        SplashScreen.hideAsync().catch((err) => {
          console.warn('SplashScreen.hideAsync failed:', err.message);
        });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isLoaded]);

  if (!isLoaded) {
    return null;
  }

  return (
    <>
      <RootLayoutNav />
      {!animationFinished && (
        <AnimatedSplashScreen 
          onAnimationFinish={() => setAnimationFinished(true)} 
          backgroundColor={colors.background}
        />
      )}
    </>
  );
}

function RootLayoutNav() {
  const { colorScheme } = useTheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', headerShown: false }} />
        <Stack.Screen name="menu" options={{ presentation: 'modal', headerShown: false }} />
        <Stack.Screen name="add-habit" options={{ presentation: 'modal', headerShown: false }} />
        <Stack.Screen name="add-shortcut" options={{ presentation: 'modal', headerShown: false }} />
        <Stack.Screen name="add-task" options={{ presentation: 'modal', headerShown: false }} />
      </Stack>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
    </ThemeProvider>
  );
}
