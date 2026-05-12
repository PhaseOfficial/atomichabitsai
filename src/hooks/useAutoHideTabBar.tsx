import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { NativeScrollEvent, NativeSyntheticEvent, Platform, Keyboard } from 'react-native';
import { usePathname } from 'expo-router';

type AutoHideScrollContextType = {
  tabBarVisible: boolean;
  showTabBar: () => void;
  hideTabBar: () => void;
  onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
};

const AutoHideScrollContext = createContext<AutoHideScrollContextType | undefined>(undefined);

const HIDE_THRESHOLD = 20; // Requirement: 15-20px
const SHOW_THRESHOLD = 15;

export function TabBarVisibilityProvider({ children }: { children: React.ReactNode }) {
  const [tabBarVisible, setTabBarVisible] = useState(true);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const lastScrollYRef = useRef(0);
  const pathname = usePathname();

  // Keyboard awareness - Requirement: Don't hide if keyboard is open
  useEffect(() => {
    const showSubscription = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => {
        setIsKeyboardVisible(true);
        setTabBarVisible(true); // Always show when keyboard comes up
      }
    );
    const hideSubscription = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setIsKeyboardVisible(false);
      }
    );

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  // Reset visibility on navigation
  useEffect(() => {
    setTabBarVisible(true);
    lastScrollYRef.current = 0;
  }, [pathname]);

  const showTabBar = useCallback(() => {
    setTabBarVisible(true);
  }, []);

  const hideTabBar = useCallback(() => {
    setTabBarVisible(false);
  }, []);

  const onScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    // Requirement: Don't hide if keyboard is open
    if (isKeyboardVisible) return;

    const offsetY = event.nativeEvent.contentOffset.y;
    const contentHeight = event.nativeEvent.contentSize.height;
    const layoutHeight = event.nativeEvent.layoutMeasurement.height;

    // Requirement: Reset when scroll stops at top (offset = 0)
    if (offsetY <= 0) {
      setTabBarVisible(true);
      lastScrollYRef.current = 0;
      return;
    }

    // Don't hide if content is smaller than screen
    if (contentHeight <= layoutHeight) {
      setTabBarVisible(true);
      return;
    }

    // Ignore bounce effects at bottom
    if (offsetY > contentHeight - layoutHeight) {
      return;
    }

    const delta = offsetY - lastScrollYRef.current;

    if (delta > HIDE_THRESHOLD) {
      // Scrolling down (content goes up) -> hide full bar
      setTabBarVisible(false);
      lastScrollYRef.current = offsetY;
    } else if (delta < -SHOW_THRESHOLD) {
      // Scrolling up (content comes down) -> show full bar
      setTabBarVisible(true);
      lastScrollYRef.current = offsetY;
    }
  }, [isKeyboardVisible]);

  const value = useMemo(
    () => ({ tabBarVisible, showTabBar, hideTabBar, onScroll }),
    [tabBarVisible, showTabBar, hideTabBar, onScroll]
  );

  return <AutoHideScrollContext.Provider value={value}>{children}</AutoHideScrollContext.Provider>;
}

export function useTabBarVisibility() {
  const context = useContext(AutoHideScrollContext);
  if (!context) {
    throw new Error('useTabBarVisibility must be used within TabBarVisibilityProvider');
  }
  return context;
}

export function useAutoHideOnScroll() {
  const context = useTabBarVisibility();
  return {
    onScroll: context.onScroll,
    scrollEventThrottle: 16,
  };
}
