import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../constants/colors';

export function PriceChip({ change, style }) {
  if (change === null || change === undefined) return null;

  const up  = change > 0;
  const eq  = change === 0;
  const abs = Math.abs(change).toFixed(2);

  const bg    = eq ? colors.neutralBg : up ? colors.upBg   : colors.downBg;
  const color = eq ? colors.neutral   : up ? colors.up     : colors.down;
  const arrow = eq ? '━'             : up ? '▲'             : '▼';
  const label = eq ? 'Sin cambio'    : `${arrow} ${abs}`;

  return (
    <View style={[styles.chip, { backgroundColor: bg }, style]}>
      <Text style={[styles.text, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    alignSelf: 'flex-start',
    borderRadius: 100,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  text: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
