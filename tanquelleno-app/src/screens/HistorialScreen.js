import React, { useState, useMemo } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import Svg, { Path, Circle, Line, Text as SvgText, Defs, LinearGradient, Stop } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../constants/colors';
import { PriceChip } from '../components/PriceChip';
import { useFuelData } from '../hooks/useFuelData';

const FUEL_TABS = [
  { key: 'gasolina_premium', label: '⛽ G. Premium', accentColor: colors.fPremium },
  { key: 'gasolina_regular', label: 'G. Regular',    accentColor: colors.fRegular },
  { key: 'gasoil_regular',   label: 'Gasoil Reg.',   accentColor: colors.fGasoil  },
  { key: 'gasoil_optimo',    label: 'Gasoil Ópt.',   accentColor: colors.fOptimo  },
  { key: 'glp',              label: 'GLP',            accentColor: colors.fGlp     },
];

const TIME_RANGES = [
  { label: '1M', weeks: 4  },
  { label: '3M', weeks: 12 },
  { label: '6M', weeks: 24 },
  { label: '1A', weeks: 52 },
  { label: 'Todo', weeks: 999 },
];

const MONTHS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

function LineChart({ data, accentColor, width = 310 }) {
  const H = 120;
  const PAD_L = 32;
  const PAD_B = 18;
  const W = width - PAD_L - 4;
  const chartH = H - PAD_B - 10;

  if (!data || data.length < 2) return null;

  const values = data.map(d => d.price);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const pts = data.map((d, i) => ({
    x: PAD_L + (i / (data.length - 1)) * W,
    y: 10 + chartH - ((d.price - min) / range) * chartH,
  }));

  const linePath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const areaPath = `${linePath} L${pts[pts.length-1].x.toFixed(1)},${(H-PAD_B).toFixed(1)} L${PAD_L.toFixed(1)},${(H-PAD_B).toFixed(1)} Z`;

  const gridPrices = [max, (max+min)/2, min].map(v => Math.round(v / 5) * 5);

  // Month labels (deduplicated)
  const monthLabels = [];
  data.forEach((d, i) => {
    const m = MONTHS[parseInt(d.month, 10) - 1];
    if (!monthLabels.find(l => l.label === m)) {
      monthLabels.push({ label: m, x: pts[i].x });
    }
  });

  return (
    <Svg width={width} height={H}>
      <Defs>
        <LinearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor={accentColor} stopOpacity={0.28} />
          <Stop offset="100%" stopColor={accentColor} stopOpacity={0} />
        </LinearGradient>
      </Defs>

      {/* Grid lines */}
      {[10, chartH/2 + 10, chartH + 10].map((y, i) => (
        <Line key={i} x1={PAD_L} y1={y} x2={width - 4} y2={y}
          stroke="rgba(255,255,255,0.04)" strokeWidth={1} />
      ))}

      {/* Grid labels */}
      {gridPrices.map((p, i) => (
        <SvgText key={i} x={0} y={[12, chartH/2 + 12, chartH + 12][i]}
          fill={colors.textDisabled} fontSize={9} fontFamily="System">
          {p}
        </SvgText>
      ))}

      {/* Area fill */}
      <Path d={areaPath} fill="url(#grad)" />
      {/* Line */}
      <Path d={linePath} fill="none" stroke={accentColor} strokeWidth={2.5}
        strokeLinecap="round" strokeLinejoin="round" />

      {/* Active dot (last point) */}
      <Circle cx={pts[pts.length-1].x} cy={pts[pts.length-1].y} r={9} fill={`${accentColor}22`} />
      <Circle cx={pts[pts.length-1].x} cy={pts[pts.length-1].y} r={5} fill={accentColor} />

      {/* Month labels */}
      {monthLabels.slice(0, 6).map((ml, i) => (
        <SvgText key={i} x={ml.x} y={H - 2} fill={colors.textDisabled}
          fontSize={9} fontFamily="System" textAnchor="middle">
          {ml.label}
        </SvgText>
      ))}
    </Svg>
  );
}

export function HistorialScreen() {
  const { history, loading, change } = useFuelData();
  const [activeFuel, setActiveFuel] = useState('gasolina_premium');
  const [activeRange, setActiveRange] = useState('6M');

  const activeFuelMeta = FUEL_TABS.find(f => f.key === activeFuel);
  const weeks = TIME_RANGES.find(r => r.label === activeRange)?.weeks ?? 24;

  const chartData = useMemo(() => {
    return history
      .slice(0, weeks)
      .reverse()
      .map(entry => {
        const dateStr = entry.week?.from ?? '';
        const [, m] = dateStr.split('-');
        return {
          price: entry.prices?.[activeFuel]?.price_gal ?? 0,
          month: m ?? '01',
        };
      })
      .filter(d => d.price > 0);
  }, [history, activeFuel, weeks]);

  const currentPrice = history[0]?.prices?.[activeFuel]?.price_gal ?? 0;
  const delta = change(activeFuel);

  const allPrices = chartData.map(d => d.price).filter(Boolean);
  const statMin = allPrices.length ? Math.min(...allPrices).toFixed(2) : '—';
  const statMax = allPrices.length ? Math.max(...allPrices).toFixed(2) : '—';
  const statAvg = allPrices.length
    ? (allPrices.reduce((a, b) => a + b, 0) / allPrices.length).toFixed(2)
    : '—';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerLabel}>ANÁLISIS DE PRECIO</Text>
            <Text style={styles.headerTitle}>Historial</Text>
          </View>
          <View style={styles.filterBtn}>
            <Text style={{ fontSize: 16 }}>≡</Text>
          </View>
        </View>

        {/* Fuel tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}
          style={styles.tabsScroll} contentContainerStyle={styles.tabsContainer}>
          {FUEL_TABS.map(tab => {
            const active = tab.key === activeFuel;
            return (
              <TouchableOpacity
                key={tab.key}
                onPress={() => setActiveFuel(tab.key)}
                style={[
                  styles.tab,
                  active && { backgroundColor: `${tab.accentColor}22`, borderColor: `${tab.accentColor}44` },
                ]}
              >
                <Text style={[styles.tabText, active && { color: tab.accentColor, fontWeight: '700' }]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Time range */}
        <View style={styles.rangeRow}>
          {TIME_RANGES.map(r => {
            const active = r.label === activeRange;
            return (
              <TouchableOpacity
                key={r.label}
                onPress={() => setActiveRange(r.label)}
                style={[styles.rangeBtn, active && styles.rangeBtnActive]}
              >
                <Text style={[styles.rangeBtnText, active && { color: colors.amber, fontWeight: '700' }]}>
                  {r.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {loading ? (
          <ActivityIndicator color={colors.amber} size="large" style={{ marginTop: 40 }} />
        ) : (
          <>
            {/* Chart card */}
            <View style={styles.card}>
              <View style={styles.chartHeader}>
                <View>
                  <Text style={styles.chartFuelLabel}>
                    {activeFuelMeta?.label?.replace('⛽ ', '') ?? ''}
                  </Text>
                  <View style={styles.chartPriceRow}>
                    <Text style={styles.chartPriceInt}>{currentPrice.toFixed(0)}</Text>
                    <Text style={[styles.chartPriceDec, { color: activeFuelMeta?.accentColor }]}>
                      .{currentPrice.toFixed(2).split('.')[1]}
                    </Text>
                    <Text style={styles.chartPriceCurr}>RD$</Text>
                  </View>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <PriceChip change={delta} />
                  <Text style={styles.vsText}>vs semana ant.</Text>
                </View>
              </View>
              <LineChart data={chartData} accentColor={activeFuelMeta?.accentColor ?? colors.amber} />
            </View>

            {/* Stats */}
            <View style={styles.statsRow}>
              {[
                { label: 'Mínimo', value: statMin, color: colors.down },
                { label: 'Promedio', value: statAvg, color: colors.textPrimary },
                { label: 'Máximo', value: statMax, color: colors.up },
              ].map(({ label, value, color }) => (
                <View key={label} style={styles.statCard}>
                  <Text style={styles.statLabel}>{label}</Text>
                  <Text style={[styles.statValue, { color }]}>{value}</Text>
                </View>
              ))}
            </View>

            {/* Recent changes */}
            <Text style={styles.sectionLabel}>ÚLTIMOS MOVIMIENTOS</Text>
            <View style={[styles.card, { overflow: 'hidden' }]}>
              {history.slice(0, 5).map((entry, i) => {
                const price = entry.prices?.[activeFuel]?.price_gal;
                const prevPrice = history[i + 1]?.prices?.[activeFuel]?.price_gal;
                const diff = price && prevPrice
                  ? Math.round((price - prevPrice) * 100) / 100
                  : null;
                const week = entry.week?.from ?? '';
                const [y, m, d] = week.split('-');
                const weekLabel = `${parseInt(d, 10)} ${MONTHS[parseInt(m, 10) - 1]} ${y}`;

                return (
                  <React.Fragment key={i}>
                    {i > 0 && <View style={styles.divider} />}
                    <View style={styles.changeRow}>
                      <Text style={styles.changeDate}>Sem. {weekLabel}</Text>
                      <PriceChip change={diff} />
                      <Text style={styles.changePrice}>
                        {price ? price.toFixed(2) : '—'}
                      </Text>
                    </View>
                  </React.Fragment>
                );
              })}
            </View>
          </>
        )}
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
  headerLabel: { fontSize: 10, fontWeight: '600', letterSpacing: 1.2, color: colors.textMuted, marginBottom: 4 },
  headerTitle: { fontSize: 22, fontWeight: '700', color: colors.textPrimary, letterSpacing: -0.3 },
  filterBtn: {
    width: 36, height: 36,
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border,
    borderRadius: 10,
    justifyContent: 'center', alignItems: 'center',
  },

  tabsScroll: { marginBottom: 14 },
  tabsContainer: { gap: 8, paddingRight: 20 },
  tab: {
    borderRadius: 100,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  tabText: { fontSize: 12, color: colors.textMuted, fontWeight: '500' },

  rangeRow: { flexDirection: 'row', gap: 6, marginBottom: 14 },
  rangeBtn: {
    flex: 1, borderRadius: 8,
    borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingVertical: 5, alignItems: 'center',
  },
  rangeBtnActive: {
    backgroundColor: 'rgba(245,158,11,0.10)',
    borderColor: 'rgba(245,158,11,0.24)',
  },
  rangeBtnText: { fontSize: 11, fontWeight: '500', color: colors.textMuted },

  card: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 12,
  },
  chartHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
  chartFuelLabel: { fontSize: 10, fontWeight: '600', letterSpacing: 1, color: colors.textMuted, textTransform: 'uppercase', marginBottom: 4 },
  chartPriceRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 3 },
  chartPriceInt: { fontSize: 30, fontWeight: '800', color: colors.textPrimary, letterSpacing: -1 },
  chartPriceDec: { fontSize: 18, fontWeight: '700', paddingBottom: 3, letterSpacing: -0.5 },
  chartPriceCurr: { fontSize: 12, color: colors.textMuted, paddingBottom: 5 },
  vsText: { fontSize: 10, color: colors.textMuted, marginTop: 3 },

  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    alignItems: 'center',
  },
  statLabel: { fontSize: 9.5, fontWeight: '600', letterSpacing: 0.8, color: colors.textMuted, textTransform: 'uppercase', marginBottom: 6 },
  statValue: { fontSize: 18, fontWeight: '800', letterSpacing: -0.5 },

  sectionLabel: { fontSize: 10, fontWeight: '600', letterSpacing: 1.2, color: colors.textMuted, marginBottom: 8 },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.05)', marginHorizontal: 0 },
  changeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12 },
  changeDate: { fontSize: 12, color: colors.textSecondary, flex: 1 },
  changePrice: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
});
