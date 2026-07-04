import React, { useRef } from 'react';
import { Animated, Pressable } from 'react-native';
import * as Haptics from 'expo-haptics';

const HAPTICS = {
  light:     () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
  medium:    () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),
  selection: () => Haptics.selectionAsync(),
  success:   () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
};

const AnimatedPressableBase = Animated.createAnimatedComponent(Pressable);

export function AnimatedPressable({
  children, style, onPress, haptic = 'light', scaleTo = 0.96, disabled, ...rest
}) {
  const scale = useRef(new Animated.Value(1)).current;

  function animateTo(toValue) {
    Animated.spring(scale, { toValue, useNativeDriver: true, speed: 40, bounciness: 6 }).start();
  }

  function handlePress(e) {
    if (haptic && HAPTICS[haptic]) HAPTICS[haptic]().catch(() => {});
    onPress?.(e);
  }

  return (
    <AnimatedPressableBase
      disabled={disabled}
      onPressIn={() => animateTo(scaleTo)}
      onPressOut={() => animateTo(1)}
      onPress={handlePress}
      style={[style, { transform: [{ scale }] }, disabled && { opacity: 0.5 }]}
      {...rest}
    >
      {children}
    </AnimatedPressableBase>
  );
}
