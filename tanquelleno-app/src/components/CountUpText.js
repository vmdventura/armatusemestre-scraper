import React, { useRef, useEffect, useState } from 'react';
import { Animated, Text } from 'react-native';

export function CountUpText({
  value, duration = 700, style,
  formatter = (v) => Math.round(v).toLocaleString('es-DO'),
}) {
  const anim = useRef(new Animated.Value(0)).current;
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const id = anim.addListener(({ value: v }) => setDisplay(v));
    Animated.timing(anim, { toValue: value, duration, useNativeDriver: false }).start();
    return () => anim.removeListener(id);
  }, [value]);

  return <Text style={style}>{formatter(display)}</Text>;
}
