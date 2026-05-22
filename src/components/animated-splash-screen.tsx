import React, { useEffect } from 'react';
import { StyleSheet, View, Image, Dimensions, Text } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  withSequence,
  withDelay,
  runOnJS,
  Easing
} from 'react-native-reanimated';

const { width, height } = Dimensions.get('window');

interface Props {
  onAnimationFinish: () => void;
  backgroundColor: string;
}

export function AnimatedSplashScreen({ onAnimationFinish, backgroundColor }: Props) {
  const scale = useSharedValue(0.3);
  const opacity = useSharedValue(0);
  const footerOpacity = useSharedValue(0);
  const containerOpacity = useSharedValue(1);

  const animatedLogoStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      transform: [{ scale: scale.value }],
      opacity: opacity.value,
    };
  });

  const animatedFooterStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      opacity: footerOpacity.value,
      transform: [{ translateY: withTiming(footerOpacity.value === 1 ? 0 : 20, { duration: 800 }) }],
    };
  });

  const animatedContainerStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      opacity: containerOpacity.value,
    };
  });

  useEffect(() => {
    // Sequence: Fade in and scale up -> Hold -> Zoom in/Fade out container
    scale.value = withTiming(1, { 
      duration: 1000, 
      easing: Easing.out(Easing.back(1.5)) 
    });
    opacity.value = withTiming(1, { duration: 800 });
    
    // Fade in footer slightly later
    footerOpacity.value = withDelay(400, withTiming(1, { duration: 800 }));

    containerOpacity.value = withDelay(
      2500,
      withTiming(0, { duration: 500 }, (finished) => {
        if (finished) {
          runOnJS(onAnimationFinish)();
        }
      })
    );
  }, []);

  return (
    <Animated.View style={[styles.container, { backgroundColor }, animatedContainerStyle]}>
      <View style={styles.content}>
        <Animated.Image
          source={require('@/assets/images/icon.png')}
          style={[styles.logo, animatedLogoStyle]}
          resizeMode="contain"
        />
      </View>

      <Animated.View style={[styles.footer, animatedFooterStyle]}>
        <Text style={styles.poweredBy}>powered by</Text>
        <Image
          source={require('@/assets/images/Artboard 1 logo.png')}
          style={styles.footerLogo}
          resizeMode="contain"
        />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: width * 0.45,
    height: width * 0.45,
  },
  footer: {
    position: 'absolute',
    bottom: 50,
    alignItems: 'center',
    gap: 8,
  },
  poweredBy: {
    fontSize: 12,
    color: '#94a3b8',
    textTransform: 'lowercase',
    letterSpacing: 1,
    fontFamily: 'Manrope_400Regular',
  },
  footerLogo: {
    width: width * 0.3,
    height: 40,
  },
});
