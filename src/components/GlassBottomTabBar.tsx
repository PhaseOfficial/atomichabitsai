import AutoHideFloatingActionButton from "@/src/components/AutoHideFloatingActionButton";
import { FONTS } from "@/src/constants/Theme";
import { useTabBarVisibility } from "@/src/hooks/useAutoHideTabBar";
import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import React, { useEffect, useMemo, useRef } from "react";
import {
    Animated,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const MAIN_TABS = ["index", "calendar", "library"];

export default function GlassBottomTabBar(props: BottomTabBarProps) {
  const { state, descriptors, navigation } = props;

  const { tabBarVisible, showTabBar } = useTabBarVisibility();

  const insets = useSafeAreaInsets();

  const currentRouteName = state.routes[state.index].name;

  const animated = useRef(new Animated.Value(tabBarVisible ? 0 : 1)).current;

  useEffect(() => {
    Animated.spring(animated, {
      toValue: tabBarVisible ? 0 : 1,
      damping: 18,
      stiffness: 180,
      mass: 0.9,
      useNativeDriver: true,
    }).start();
  }, [tabBarVisible, animated]);

  const containerStyle = useMemo(
    () => [
      styles.container,
      {
        bottom: insets.bottom + 12,
        transform: [
          {
            translateY: animated.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 140],
            }),
          },
        ],
        opacity: animated.interpolate({
          inputRange: [0, 1],
          outputRange: [1, 0],
        }),
      },
    ],
    [animated, insets.bottom],
  );

  const fabStyle = useMemo(
    () => ({
      transform: [
        {
          translateY: animated.interpolate({
            inputRange: [0, 1],
            outputRange: [160, 0],
          }),
        },
        {
          scale: animated.interpolate({
            inputRange: [0, 1],
            outputRange: [1, 0.7],
          }),
        },
      ],
      opacity: animated.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 1],
      }),
    }),
    [animated],
  );

  const indexRoute = state.routes.find((route) => route.name === "index");

  const onMostImportantPress = () => {
    if (currentRouteName === "index" && indexRoute) {
      const event = navigation.emit({
        type: "tabPress",
        target: indexRoute.key,
        canPreventDefault: true,
      });

      if (!event.defaultPrevented) {
        navigation.navigate("index");
      }
    } else {
      navigation.navigate("index");
    }

    showTabBar();
  };

  if (currentRouteName === "aa_ai") {
    return null;
  }

  const visibleRoutes = state.routes.filter((r) => MAIN_TABS.includes(r.name));

  const indexRouteKey = visibleRoutes.find((r) => r.name === "index")?.key;
  const indexActiveColor =
    (descriptors[indexRouteKey || ""].options
      .tabBarActiveTintColor as string) || "#5EA1FF";

  return (
    <>
      <Animated.View
        style={containerStyle}
        pointerEvents={tabBarVisible ? "auto" : "none"}
      >
        <BlurView
          intensity={Platform.OS === "ios" ? 70 : 0}
          tint="dark"
          style={[
            styles.blurContainer,
            Platform.OS === "android" && styles.androidFallback,
          ]}
        >
          <View style={styles.inner}>
            {visibleRoutes.map((route) => {
              const descriptor = descriptors[route.key];

              const focused = currentRouteName === route.name;

              const activeColor =
                (descriptor.options.tabBarActiveTintColor as string) ||
                "#5EA1FF";

              const inactiveColor =
                (descriptor.options.tabBarInactiveTintColor as string) ||
                "rgba(255,255,255,0.72)";

              const color = focused ? activeColor : inactiveColor;

              const label = descriptor.options.title || route.name;

              const icon = descriptor.options.tabBarIcon?.({
                focused,
                color,
                size: 26,
              });

              const onPress = () => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

                const event = navigation.emit({
                  type: "tabPress",
                  target: route.key,
                  canPreventDefault: true,
                });

                if (!event.defaultPrevented) {
                  navigation.navigate(route.name);
                }
              };

              return (
                <Pressable
                  key={route.key}
                  onPress={onPress}
                  style={styles.tabWrapper}
                >
                  <View
                    style={[
                      styles.tabButton,
                      focused && styles.activeTabButton,
                    ]}
                  >
                    <View style={styles.iconWrapper}>{icon}</View>

                    <Text
                      numberOfLines={1}
                      style={[
                        styles.label,
                        {
                          color,
                          fontWeight: focused ? "600" : "500",
                        },
                      ]}
                    >
                      {label}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </BlurView>
      </Animated.View>

      <Animated.View
        style={[
          styles.fabHost,
          fabStyle,
          {
            bottom: insets.bottom + 28,
          },
        ]}
        pointerEvents={tabBarVisible ? "none" : "auto"}
      >
        <AutoHideFloatingActionButton
          onPress={onMostImportantPress}
          accentColor={indexActiveColor}
          label="Day"
        />
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    alignSelf: "center",
    zIndex: 100,
  },

  blurContainer: {
    borderRadius: 999,
    overflow: "hidden",

    backgroundColor: "rgba(22,22,24,0.72)",

    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",

    paddingHorizontal: 12,
    paddingVertical: 10,

    shadowColor: "#000",
    shadowOpacity: 0.35,
    shadowRadius: 30,
    shadowOffset: {
      width: 0,
      height: 10,
    },

    elevation: 20,
  },

  androidFallback: {
    backgroundColor: "rgba(28,28,30,0.96)",
  },

  inner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  tabWrapper: {
    borderRadius: 999,
  },

  tabButton: {
    minWidth: 80,
    height: 45,

    borderRadius: 999,

    alignItems: "center",
    justifyContent: "center",

    paddingHorizontal: 18,
    paddingVertical: 10,
  },

  activeTabButton: {
    backgroundColor: "rgba(255,255,255,0.12)",

    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",

    shadowColor: "#FFF",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: {
      width: 0,
      height: 2,
    },
  },

  iconWrapper: {
    marginBottom: 4,
    alignItems: "center",
    justifyContent: "center",
  },

  label: {
    fontFamily: FONTS.label,
    fontSize: 11,
    letterSpacing: -0.2,
    textAlign: "center",
    lineHeight: 14,
  },

  fabHost: {
    position: "absolute",
    alignSelf: "center",
    zIndex: 101,
  },
});
