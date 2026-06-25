import React, { useState, useMemo } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../constants/colors';
import { useFuelData } from '../hooks/useFuelData';

const FUELS = [
  { key: 'gasolina_premium', label: 'Premium', accentColor: colors.fPremium },
  { key: 'gasolina_regular', label: 'Regular', accentColor: colors.fRegular },
  { key: 'gasoil_regular',   label: 'Gasoil',  accentColor: colors.fGasoil  },
  { key: 'glp',              label: 'GLP',      accentColor: colors.fGlp     },
];

const GALLON_TO_LITER = 3.785411784;

function StepButton({ label, onPress, accent }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.stepBtn, { borderColor: `${accent}44` }]}
      activeOpacity={0.7}
    >
      <Text style={[styles.stepBtnText, { color: accent }]}>{label}</Text>
    </TouchableOpacity>
  );
}

function SliderRow({ label, value, min, max, step, unit, onDecrement, onIncrement, accent }) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <View style={styles.sliderRow}>
      <View style={styles.sliderTop}>
        <Text style={styles.sliderLabel}>{label}</Text>
        <View style={styles.sliderValueBox}>
          <Text style={[styles.sliderValue, { color: accent }]}>{value}</Text>
          <Text style={styles.sliderUnit}> {unit}</Text>
        </View>
      </View>
      <View style={styles.trackContainer}>
        <View style={styles.track}>
          <View style={[styles.trackFill, { width: `${pct}%`, backgroundColor: accent }]} />
        </View>
      </View>
      <View style={styles.sliderBtns}>
        <StepButton label="−" onPress={onDecrement} accent={accent} />
        <Text style={styles.sliderMinMax}>{min} – {max} {unit}</Text>
        <StepButton label="+" onPress={onIncrement} accent={accent} />
      </View>
    </View>
  );
}

export function CalculadoraScreen() {
  const { prices, loading } = useFuelData();
  const [selectedFuel, setSelectedFuel] = useState('gasolina_premium');
  const [liters,  setLiters]  = useState(40);
  const [budget,  setBudget]  = useState(1000);
  const [mode, setMode] = useState('liters'); // 'liters' | 'budget'

  const fuelMeta   = FUELS.find(f => f.key === selectedFuel);
  const accent      = fuelMeta?.accentColor ?? colors.amber;
  const pricePerGal = prices?.[selectedFuel]?.price_gal ?? 0;
  const pricePerLit = pricePerGal / GALLON_TO_LITER;

  const result = useMemo(() => {
    if (!pricePerGal) return null;
    if (mode === 'liters') {
      const gallons = liters / GALLON_TO_LITER;
      const total   = gallons * pricePerGal;
      return { label: 'Total a pagar', value: `RD$ ${total.toFixed(2)}`, sub: `${gallons.toFixed(2)} gal` };
    } else {
      const gallons = budget / pricePerGal;
      const lits    = gallons * GALLON_TO_LITER;
      return { label: 'Litros que recibes', value: `${lits.toFixed(1)} L`, sub: `${gallons.toFixed(2)} gal` };
    }
  }, [mode, liters, budget, pricePerGal]);

  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerLabel}>HERRAMIENTA</Text>
          <Text style={styles.headerTitle}>Calculadora</Text>
        </View>

        {/* Fuel selector */}
        <View style={styles.fuelGrid}>
          {FUELS.map(f => {
            const active = f.key === selectedFuel;
            return (
              <TouchableOpacity
                key={f.key}
                onPress={() => setSelectedFuel(f.key)}
                style={[
                  styles.fuelChip,
                  active && { backgroundColor: `${f.accentColor}22`, borderColor: `${f.accentColor}55` },
                ]}
              >
                <Text style={[styles.fuelChipText, active && { color: f.accentColor, fontWeight: '700' }]}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Price reference */}
        {!loading && pricePerGal > 0 && (
          <View style={styles.priceRef}>
            <View style={styles.priceRefItem}>
              <Text style={styles.priceRefLabel}>por galón</Text>
              <Text style={[styles.priceRefVal, { color: accent }]}>RD$ {pricePerGal.toFixed(2)}</Text>
            </View>
            <View style={styles.priceRefDivider} />
            <View style={styles.priceRefItem}>
              <Text style={styles.priceRefLabel}>por litro</Text>
              <Text style={[styles.priceRefVal, { color: accent }]}>RD$ {pricePerLit.toFixed(2)}</Text>
            </View>
          </View>
        )}

        {/* Mode toggle */}
        <View style={styles.modeRow}>
          {[
            { id: 'liters', label: '⛽ Por litros' },
            { id: 'budget', label: '💵 Por presupuesto' },
          ].map(m => (
            <TouchableOpacity
              key={m.id}
              onPress={() => setMode(m.id)}
              style={[styles.modeBtn, mode === m.id && { backgroundColor: `${accent}1A`, borderColor: `${accent}44` }]}
            >
              <Text style={[styles.modeBtnText, mode === m.id && { color: accent, fontWeight: '700' }]}>
                {m.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Input card */}
        <View style={styles.inputCard}>
          {mode === 'liters' ? (
            <SliderRow
              label="Cantidad de combustible"
              value={liters}
              min={5} max={120} step={5} unit="L"
              accent={accent}
              onDecrement={() => setLiters(v => clamp(v - 5, 5, 120))}
              onIncrement={() => setLiters(v => clamp(v + 5, 5, 120))}
            />
          ) : (
            <SliderRow
              label="Presupuesto disponible"
              value={budget}
              min={100} max={10000} step={100} unit="RD$"
              accent={accent}
              onDecrement={() => setBudget(v => clamp(v - 100, 100, 10000))}
              onIncrement={() => setBudget(v => clamp(v + 100, 100, 10000))}
            />
          )}
        </View>

        {/* Result card */}
        {result && (
          <View style={[styles.resultCard, { borderColor: `${accent}33` }]}>
            <View style={[styles.resultGlow, { backgroundColor: `${accent}0D` }]} />
            <Text style={styles.resultLabel}>{result.label}</Text>
            <Text style={[styles.resultValue, { color: accent }]}>{result.value}</Text>
            <Text style={styles.resultSub}>{result.sub}</Text>
          </View>
        )}

        {/* Quick presets */}
        <Text style={styles.sectionLabel}>PRESELECCIONES RÁPIDAS</Text>
        <View style={styles.presetsGrid}>
          {[
            { label: 'Medio tanque', liters: 25, budget: null },
            { label: 'Tanque lleno', liters: 50, budget: null },
            { label: 'RD$ 500',      liters: null, budget: 500  },
            { label: 'RD$ 2,000',    liters: null, budget: 2000 },
          ].map(p => (
            <TouchableOpacity
              key={p.label}
              style={styles.presetChip}
              onPress={() => {
                if (p.liters !== null) { setMode('liters'); setLiters(p.liters); }
                else { setMode('budget'); setBudget(p.budget); }
              }}
            >
              <Text style={styles.presetChipText}>{p.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: colors.bg },
  scroll:  { flex: 1 },
  content: { padding: 20, paddingBottom: 100 },

  header: { marginBottom: 18 },
  headerLabel: { fontSize: 10, fontWeight: '600', letterSpacing: 1.2, color: colors.textMuted, marginBottom: 4 },
  headerTitle: { fontSize: 22, fontWeight: '700', color: colors.textPrimary, letterSpacing: -0.3 },

  fuelGrid: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  fuelChip: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingVertical: 8,
    alignItems: 'center',
  },
  fuelChipText: { fontSize: 11, color: colors.textMuted, fontWeight: '500' },

  priceRef: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 14,
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  priceRefItem:    { alignItems: 'center' },
  priceRefLabel:   { fontSize: 10, color: colors.textMuted, fontWeight: '500', marginBottom: 4 },
  priceRefVal:     { fontSize: 17, fontWeight: '800', letterSpacing: -0.5 },
  priceRefDivider: { width: 1, height: 30, backgroundColor: colors.border },

  modeRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  modeBtn: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingVertical: 9,
    alignItems: 'center',
  },
  modeBtnText: { fontSize: 12, color: colors.textMuted, fontWeight: '500' },

  inputCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
    marginBottom: 14,
  },
  sliderRow: {},
  sliderTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sliderLabel: { fontSize: 12, color: colors.textSecondary, fontWeight: '500' },
  sliderValueBox: { flexDirection: 'row', alignItems: 'baseline' },
  sliderValue: { fontSize: 22, fontWeight: '800', letterSpacing: -0.5 },
  sliderUnit:  { fontSize: 12, color: colors.textMuted, fontWeight: '500' },
  trackContainer: { marginBottom: 12 },
  track: {
    height: 5,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  trackFill: { height: '100%', borderRadius: 3 },
  sliderBtns: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  stepBtn: {
    width: 40, height: 40,
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.04)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepBtnText: { fontSize: 20, fontWeight: '600', lineHeight: 24 },
  sliderMinMax: { fontSize: 10, color: colors.textDisabled },

  resultCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 22,
    marginBottom: 20,
    alignItems: 'center',
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  resultGlow: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
  },
  resultLabel: { fontSize: 10, fontWeight: '600', letterSpacing: 1, color: colors.textMuted, marginBottom: 10 },
  resultValue: { fontSize: 40, fontWeight: '800', letterSpacing: -1.5, marginBottom: 4 },
  resultSub:   { fontSize: 13, color: colors.textSecondary },

  sectionLabel: { fontSize: 10, fontWeight: '600', letterSpacing: 1.2, color: colors.textMuted, marginBottom: 10 },
  presetsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  presetChip: {
    borderRadius: 100,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  presetChipText: { fontSize: 12, color: colors.textSecondary, fontWeight: '500' },
});
