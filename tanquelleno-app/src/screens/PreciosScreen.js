import React from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../constants/colors';
import { PriceChip } from '../components/PriceChip';
import { useFuelData } from '../hooks/useFuelData';
import { formatWeek } from '../api/combustibles';

const GALLON_TO_LITER = 3.785411784;

const GRID_FUELS = [
  { key: 'gasolina_regular', accentColor: colors.indigo,  accentBg: colors.indigoBg },
  { key: 'gasoil_regular',   accentColor: colors.green,   accentBg: colors.greenBg  },
  { key: 'gasoil_optimo',    accentColor: colors.yellow,  accentBg: colors.yellowBg },
  { key: 'glp',              accentColor: colors.blue,    accentBg: colors.blueBg   },
];

function DropletIcon({ color, size = 18 }) {
  const { Svg, Path } = require('react-native-svg');
  return (
    <Svg width={size} height={size * 1.1} viewBox="0 0 20 22">
      <Path d="M10 1C6.5 7 3.5 10.5 3.5 14a6.5 6.5 0 0013 0C16.5 10.5 13.5 7 10 1z" fill={color} />
    </Svg>
  );
}

function BellIcon() {
  const { Svg, Path } = require('react-native-svg');
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24">
      <Path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6V11c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" fill={colors.textMuted} />
    </Svg>
  );
}

function HeroCard({ fuel, change }) {
  if (!fuel) return null;
  const parts = fuel.price_gal.toFixed(2).split('.');
  const liter = (fuel.price_gal / GALLON_TO_LITER).toFixed(2);
  const usd   = (fuel.price_gal / 60).toFixed(2); // approx exchange

  return (
    <LinearGradient
      colors={['#0F1830', '#0C1226']}
      style={styles.heroCard}
    >
      <View style={styles.heroGlow} />
      <View style={styles.heroTop}>
        <View style={styles.heroLeft}>
          <View style={[styles.iconBox, { backgroundColor: colors.amberGlow }]}>
            <DropletIcon color={colors.amber} size={20} />
          </View>
          <View>
            <Text style={styles.heroLabel}>GASOLINA PREMIUM</Text>
            <PriceChip change={change} />
          </View>
        </View>
        <View style={styles.chipOfficial}>
          <Text style={styles.chipOfficialText}>OFICIAL</Text>
        </View>
      </View>

      <View style={styles.heroPriceRow}>
        <Text style={styles.heroPriceInt}>{parts[0]}</Text>
        <Text style={styles.heroPriceDec}>.{parts[1]}</Text>
        <Text style={styles.heroPriceCurr}>RD$</Text>
      </View>

      <View style={styles.heroFooter}>
        <Text style={styles.heroSub}>
          ≈ <Text style={styles.heroSubVal}>RD${liter}</Text> /litro
        </Text>
        <View style={styles.heroDivider} />
        <Text style={styles.heroSub}>
          USD <Text style={styles.heroSubVal}>${usd}</Text> /galón
        </Text>
      </View>
    </LinearGradient>
  );
}

function FuelGridCard({ fuel, accentColor, accentBg, change }) {
  if (!fuel) return null;
  const parts = fuel.price_gal.toFixed(2).split('.');
  return (
    <View style={styles.gridCard}>
      <View style={styles.gridTop}>
        <View style={[styles.iconBoxSm, { backgroundColor: accentBg }]}>
          <DropletIcon color={accentColor} size={14} />
        </View>
        <Text style={styles.gridLabel}>{fuel.name.replace(' ', '\n')}</Text>
      </View>
      <Text style={styles.gridPrice}>
        {parts[0]}
        <Text style={[styles.gridPriceDec, { color: accentColor }]}>.{parts[1]}</Text>
      </Text>
      <View style={styles.gridFooter}>
        <Text style={styles.gridUnit}>RD$/gal</Text>
        <PriceChip change={change} style={styles.gridChip} />
      </View>
    </View>
  );
}

export function PreciosScreen() {
  const { prices, week, loading, refreshing, refresh, change } = useFuelData();

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            tintColor={colors.amber}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerLabel}>SEMANA DEL</Text>
            <Text style={styles.headerDate}>{formatWeek(week) || '— — —'}</Text>
          </View>
          <TouchableOpacity style={styles.bellBtn}>
            <BellIcon />
            <View style={styles.notifDot} />
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator color={colors.amber} size="large" style={{ marginTop: 60 }} />
        ) : (
          <>
            <HeroCard fuel={prices?.gasolina_premium} change={change('gasolina_premium')} />

            <View style={styles.grid}>
              {GRID_FUELS.map(({ key, accentColor, accentBg }) => (
                <FuelGridCard
                  key={key}
                  fuel={prices?.[key]}
                  accentColor={accentColor}
                  accentBg={accentBg}
                  change={change(key)}
                />
              ))}
            </View>
          </>
        )}

        <Text style={styles.footer}>Actualizado vier. · Fuente: MICM</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: colors.bg },
  scroll:  { flex: 1 },
  content: { padding: 20, paddingBottom: 100 },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerLabel: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1.2,
    color: colors.textMuted,
    marginBottom: 4,
  },
  headerDate: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: -0.3,
  },
  bellBtn: {
    width: 44,
    height: 44,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notifDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: colors.amber,
    borderWidth: 2,
    borderColor: colors.bg,
  },

  // Hero card
  heroCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 20,
    marginBottom: 12,
    overflow: 'hidden',
  },
  heroGlow: {
    position: 'absolute',
    top: -60,
    right: -60,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(245,158,11,0.07)',
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  heroLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroLabel: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1,
    color: colors.textMuted,
    marginBottom: 4,
  },
  chipOfficial: {
    backgroundColor: colors.amberGlow,
    borderRadius: 100,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  chipOfficialText: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: colors.amber,
  },
  heroPriceRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
    marginBottom: 10,
  },
  heroPriceInt: {
    fontSize: 56,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -2,
    lineHeight: 60,
  },
  heroPriceDec: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.amber,
    letterSpacing: -1,
    paddingBottom: 4,
  },
  heroPriceCurr: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.textMuted,
    paddingBottom: 8,
  },
  heroFooter:  { flexDirection: 'row', alignItems: 'center', gap: 14 },
  heroDivider: { width: 1, height: 14, backgroundColor: colors.border },
  heroSub:     { fontSize: 12, color: colors.textMuted },
  heroSubVal:  { color: colors.textSecondary, fontWeight: '600' },

  // Grid
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 12,
  },
  gridCard: {
    width: '48%',
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
  },
  gridTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  iconBoxSm: {
    width: 30,
    height: 30,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridLabel: {
    fontSize: 9.5,
    fontWeight: '600',
    letterSpacing: 0.8,
    color: colors.textMuted,
    textTransform: 'uppercase',
    lineHeight: 14,
  },
  gridPrice: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -0.8,
    marginBottom: 4,
  },
  gridPriceDec: { fontSize: 15, fontWeight: '700' },
  gridFooter:   { flexDirection: 'row', alignItems: 'center', gap: 6 },
  gridUnit:     { fontSize: 10, color: colors.textMuted },
  gridChip:     { transform: [{ scale: 0.9 }] },

  footer: {
    textAlign: 'center',
    fontSize: 11,
    color: colors.textDisabled,
    letterSpacing: 0.5,
    marginTop: 4,
  },
});
