import React, { useRef, useEffect } from 'react';
import { Animated } from 'react-native';

export function FadeInView({ children, delay = 0, style, duration = 420, translateY = 14 }) {
  const opacity   = useRef(new Animated.Value(0)).current;
  const translate = useRef(new Animated.Value(translateY)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity,   { toValue: 1, duration, delay, useNativeDriver: true }),
      Animated.timing(translate, { toValue: 0, duration, delay, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View style={[style, { opacity, transform: [{ translateY: translate }] }]}>
      {children}
    </Animated.View>
  );
}
