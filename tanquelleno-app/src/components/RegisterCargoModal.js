import React, { useState, useEffect } from 'react';
import {
  Modal, View, Text, StyleSheet, TouchableOpacity,
  TextInput, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../constants/colors';
import { useFillups } from '../context/FillupsContext';
import { useFuelData } from '../hooks/useFuelData';

const GALLON_TO_LITER = 3.785411784;

const FUEL_OPTIONS = [
  { key: 'gasolina_premium', label: 'Premium', color: colors.fPremium },
  { key: 'gasolina_regular', label: 'Regular', color: colors.fRegular },
  { key: 'gasoil_regular',   label: 'Gasoil',  color: colors.fGasoil  },
  { key: 'glp',              label: 'GLP',      color: colors.fGlp     },
];

const MONTHS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
const DAYS   = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function shiftDay(dateStr, n) {
  const d = new Date(dateStr + 'T12:00:00');
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  return `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export function RegisterCargoModal({ visible, onClose }) {
  const { addFillup, vehicle } = useFillups();
  const { prices }             = useFuelData();

  const [fuel,      setFuel]      = useState('gasolina_premium');
  const [liters,    setLiters]    = useState(40);
  const [amountStr, setAmountStr] = useState('');
  const [date,      setDate]      = useState(todayStr());
  const [station,   setStation]   = useState('');

  useEffect(() => {
    if (!visible) return;
    setFuel(vehicle?.fuelType ?? 'gasolina_premium');
    setLiters(Math.round((vehicle?.tankSize ?? 50) * 0.80));
    setAmountStr('');
    setDate(todayStr());
    setStation('');
  }, [visible, vehicle?.fuelType, vehicle?.tankSize]);

  const fuelMeta   = FUEL_OPTIONS.find(f => f.key === fuel);
  const accent     = fuelMeta?.color ?? colors.amber;
  const pricePerGal = prices?.[fuel]?.price_gal ?? 0;
  const pricePerLit = pricePerGal > 0 ? pricePerGal / GALLON_TO_LITER : 0;
  const estimatedAmt = pricePerLit > 0 ? Math.round(liters * pricePerLit) : 0;

  const amount     = parseFloat(amountStr) || 0;
  const actualPerLit = amount > 0 && liters > 0 ? (amount / liters).toFixed(2) : null;
  const newLevel   = Math.min(1, (vehicle?.level ?? 0) + liters / (vehicle?.tankSize ?? 50));
  const canSave    = liters > 0 && amount > 0;

  const clampL = v => Math.max(1, Math.min(200, v));

  function handleSave() {
    if (!canSave) return;
    addFillup({ date, liters, amount, fuel, station: station.trim(), newLevel });
    onClose();
  }

  const today = todayStr();

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: colors.bg }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <SafeAreaView style={{ flex: 1 }} edges={['top']}>

          {/* Header */}
          <View style={st.header}>
            <Text style={st.headerTitle}>Registrar carga</Text>
            <TouchableOpacity onPress={onClose} style={st.closeBtn}>
              <Text style={st.closeTxt}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={{ flex: 1 }} contentContainerStyle={st.body} keyboardShouldPersistTaps="handled">

            {/* Date */}
            <Text style={st.label}>FECHA</Text>
            <View style={st.dateRow}>
              <TouchableOpacity style={st.arrow} onPress={() => setDate(d => shiftDay(d, -1))}>
                <Text style={[st.arrowTxt, { color: accent }]}>‹</Text>
              </TouchableOpacity>
              <Text style={st.dateTxt}>{formatDate(date)}</Text>
              <TouchableOpacity
                style={st.arrow}
                onPress={() => setDate(d => d < today ? shiftDay(d, 1) : d)}
              >
                <Text style={[st.arrowTxt, { color: date < today ? accent : colors.textDisabled }]}>›</Text>
              </TouchableOpacity>
            </View>

            {/* Fuel */}
            <Text style={st.label}>COMBUSTIBLE</Text>
            <View style={st.fuelRow}>
              {FUEL_OPTIONS.map(f => {
                const active = f.key === fuel;
                return (
                  <TouchableOpacity
                    key={f.key}
                    onPress={() => setFuel(f.key)}
                    style={[st.fuelChip, active && { backgroundColor: `${f.color}22`, borderColor: `${f.color}55` }]}
                  >
                    <Text style={[st.fuelChipTxt, active && { color: f.color, fontWeight: '700' }]}>
                      {f.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Liters */}
            <Text style={st.label}>LITROS</Text>
            <View style={st.stepRow}>
              <TouchableOpacity style={[st.stepBtn, { borderColor: `${accent}44` }]}
                onPress={() => setLiters(v => clampL(v - 5))}>
                <Text style={[st.stepBtnTxt, { color: accent }]}>−5</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[st.stepBtn, { borderColor: `${accent}44` }]}
                onPress={() => setLiters(v => clampL(v - 1))}>
                <Text style={[st.stepBtnTxt, { color: accent }]}>−1</Text>
              </TouchableOpacity>
              <View style={st.stepVal}>
                <Text style={[st.stepNum, { color: accent }]}>{liters}</Text>
                <Text style={st.stepUnit}>L</Text>
              </View>
              <TouchableOpacity style={[st.stepBtn, { borderColor: `${accent}44` }]}
                onPress={() => setLiters(v => clampL(v + 1))}>
                <Text style={[st.stepBtnTxt, { color: accent }]}>+1</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[st.stepBtn, { borderColor: `${accent}44` }]}
                onPress={() => setLiters(v => clampL(v + 5))}>
                <Text style={[st.stepBtnTxt, { color: accent }]}>+5</Text>
              </TouchableOpacity>
            </View>

            {/* Amount */}
            <Text style={st.label}>TOTAL PAGADO</Text>
            <View style={[st.amountRow, { borderColor: amountStr ? `${accent}55` : colors.border }]}>
              <Text style={st.amountCurr}>RD$</Text>
              <TextInput
                style={[st.amountInput, { color: colors.textPrimary }]}
                value={amountStr}
                onChangeText={t => setAmountStr(t.replace(/[^0-9.]/g, ''))}
                keyboardType="numeric"
                placeholder={estimatedAmt > 0 ? `~${estimatedAmt.toLocaleString()}` : '0'}
                placeholderTextColor={colors.textMuted}
                returnKeyType="done"
              />
            </View>

            {actualPerLit && (
              <Text style={st.hint}>→ RD${actualPerLit}/litro pagado</Text>
            )}

            {estimatedAmt > 0 && !amountStr && (
              <TouchableOpacity onPress={() => setAmountStr(String(estimatedAmt))} style={st.useEstBtn}>
                <Text style={[st.useEstTxt, { color: accent }]}>
                  Usar precio oficial → RD${estimatedAmt.toLocaleString()}
                </Text>
              </TouchableOpacity>
            )}

            {/* Station (optional) */}
            <Text style={st.label}>GASOLINERA <Text style={st.optional}>(opcional)</Text></Text>
            <TextInput
              style={[st.stationInput, { borderColor: colors.border, color: colors.textPrimary }]}
              value={station}
              onChangeText={setStation}
              placeholder="ej. Isla, Shell, Puma..."
              placeholderTextColor={colors.textMuted}
              returnKeyType="done"
            />

            {/* Tank level preview */}
            <View style={st.levelCard}>
              <Text style={st.levelLabel}>Nivel tanque estimado tras carga</Text>
              <View style={st.levelBarBg}>
                <View style={[st.levelBarFill, { width: `${Math.round(newLevel * 100)}%`, backgroundColor: accent }]} />
              </View>
              <View style={st.levelRow}>
                <Text style={st.levelSub}>
                  {Math.round((vehicle?.level ?? 0) * 100)}% → {Math.round(newLevel * 100)}%
                </Text>
                <Text style={[st.levelPct, { color: accent }]}>{Math.round(newLevel * 100)}%</Text>
              </View>
            </View>

            {/* Save */}
            <TouchableOpacity
              style={[st.saveBtn, { backgroundColor: accent, opacity: canSave ? 1 : 0.35 }]}
              onPress={handleSave}
              disabled={!canSave}
            >
              <Text style={st.saveTxt}>Guardar carga</Text>
            </TouchableOpacity>

          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const st = StyleSheet.create({
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 20, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
  closeBtn: {
    width: 32, height: 32, borderRadius: 8,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    justifyContent: 'center', alignItems: 'center',
  },
  closeTxt: { color: colors.textMuted, fontSize: 13 },

  body: { padding: 20, paddingBottom: 60 },

  label: {
    fontSize: 10, fontWeight: '700', letterSpacing: 1.2,
    color: colors.textMuted, marginBottom: 8, marginTop: 18,
  },
  optional: { fontWeight: '400', letterSpacing: 0, textTransform: 'none' },

  dateRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.surface, borderRadius: 14, borderWidth: 1, borderColor: colors.border,
    padding: 12,
  },
  arrow:    { paddingHorizontal: 6 },
  arrowTxt: { fontSize: 28, fontWeight: '600', lineHeight: 32 },
  dateTxt:  { fontSize: 14, fontWeight: '600', color: colors.textPrimary },

  fuelRow:    { flexDirection: 'row', gap: 8 },
  fuelChip:   {
    flex: 1, borderRadius: 10, borderWidth: 1,
    borderColor: colors.border, backgroundColor: colors.surface,
    paddingVertical: 9, alignItems: 'center',
  },
  fuelChipTxt: { fontSize: 11, color: colors.textMuted, fontWeight: '500' },

  stepRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.border,
    padding: 10, gap: 6,
  },
  stepBtn: {
    flex: 1, height: 40, borderRadius: 10, borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.03)',
    justifyContent: 'center', alignItems: 'center',
  },
  stepBtnTxt: { fontSize: 13, fontWeight: '700' },
  stepVal:    { flex: 1.5, flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', gap: 2 },
  stepNum:    { fontSize: 28, fontWeight: '800', letterSpacing: -1 },
  stepUnit:   { fontSize: 13, color: colors.textMuted, fontWeight: '500' },

  amountRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surface, borderRadius: 14, borderWidth: 1,
    paddingHorizontal: 14, paddingVertical: 2,
    gap: 8,
  },
  amountCurr:  { fontSize: 14, color: colors.textMuted, fontWeight: '600' },
  amountInput: { flex: 1, fontSize: 22, fontWeight: '700', paddingVertical: 10 },

  hint:       { fontSize: 10, color: colors.textMuted, marginTop: 5 },
  useEstBtn:  { marginTop: 8 },
  useEstTxt:  { fontSize: 11, fontWeight: '600' },

  stationInput: {
    backgroundColor: colors.surface, borderRadius: 14, borderWidth: 1,
    padding: 13, fontSize: 14,
  },

  levelCard: {
    backgroundColor: colors.surface, borderRadius: 14, borderWidth: 1, borderColor: colors.border,
    padding: 14, marginTop: 18,
  },
  levelLabel:  { fontSize: 10, color: colors.textMuted, marginBottom: 10 },
  levelBarBg:  { height: 8, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 4, overflow: 'hidden', marginBottom: 8 },
  levelBarFill:{ height: '100%', borderRadius: 4 },
  levelRow:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  levelSub:    { fontSize: 11, color: colors.textSecondary },
  levelPct:    { fontSize: 14, fontWeight: '700' },

  saveBtn: {
    borderRadius: 14, paddingVertical: 15,
    alignItems: 'center', marginTop: 24,
  },
  saveTxt: { fontSize: 15, fontWeight: '800', color: '#000' },
});
