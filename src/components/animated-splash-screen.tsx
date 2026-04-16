import React, { useEffect } from 'react';
import { StyleSheet, View, Image, Dimensions } from 'react-native';
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
  const containerOpacity = useSharedValue(1);

  const animatedLogoStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const animatedContainerStyle = useAnimatedStyle(() => ({
    opacity: containerOpacity.value,
  }));

  useEffect(() => {
    // Sequence: Fade in and scale up -> Hold -> Zoom in/Fade out container
    scale.value = withTiming(1, { 
      duration: 1000, 
      easing: Easing.out(Easing.back(1.5)) 
    });
    opacity.value = withTiming(1, { duration: 800 });

    containerOpacity.value = withDelay(
      1500,
      withTiming(0, { duration: 500 }, (finished) => {
        if (finished) {
          runOnJS(onAnimationFinish)();
        }
      })
    );
  }, []);

  return (
    <Animated.View style={[styles.container, { backgroundColor }, animatedContainerStyle]}>
      <Animated.Image
        source={require('@/assets/images/favicon.png')}
        style={[styles.logo, animatedLogoStyle]}
        resizeMode="contain"
      />
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
  logo: {
    width: width * 0.5,
    height: width * 0.5,
  },
});
