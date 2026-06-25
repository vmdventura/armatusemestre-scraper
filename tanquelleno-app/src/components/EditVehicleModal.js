import React, { useState, useEffect } from 'react';
import {
  Modal, View, Text, ScrollView, StyleSheet,
  TouchableOpacity, TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../constants/colors';
import { useFillups } from '../context/FillupsContext';

const FUELS = [
  { key: 'gasolina_premium', label: 'G. Premium', color: colors.fPremium },
  { key: 'gasolina_regular', label: 'G. Regular', color: colors.fRegular },
  { key: 'gasoil_regular',   label: 'Gasoil Reg.', color: colors.fGasoil },
  { key: 'gasoil_optimo',    label: 'Gasoil Ópt.', color: colors.fOptimo },
  { key: 'glp',              label: 'GLP',          color: colors.fGlp },
];

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

export function EditVehicleModal({ visible, onClose }) {
  const { vehicle, updateVehicle } = useFillups();

  const [name,     setName]     = useState('');
  const [make,     setMake]     = useState('');
  const [model,    setModel]    = useState('');
  const [year,     setYear]     = useState('');
  const [tankSize, setTankSize] = useState(50);
  const [fuelType, setFuelType] = useState('gasolina_premium');

  useEffect(() => {
    if (visible) {
      setName(vehicle.name);
      setMake(vehicle.make);
      setModel(vehicle.model);
      setYear(String(vehicle.year));
      setTankSize(vehicle.tankSize);
      setFuelType(vehicle.fuelType);
    }
  }, [visible, vehicle]);

  function handleSave() {
    updateVehicle({
      name:     name.trim() || 'Mi Auto',
      make:     make.trim(),
      model:    model.trim(),
      year:     parseInt(year, 10) || vehicle.year,
      tankSize,
      fuelType,
    });
    onClose();
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.cancelBtn}>
              <Text style={styles.cancelText}>Cancelar</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Mi Vehículo</Text>
            <TouchableOpacity onPress={handleSave} style={styles.saveBtn}>
              <Text style={styles.saveText}>Guardar</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

            {/* Identificación */}
            <Text style={styles.sectionLabel}>IDENTIFICACIÓN</Text>
            <View style={styles.card}>
              <Field label="Nombre" value={name} onChange={setName} placeholder="Ej. Mi Toyota" />
              <Divider />
              <Field label="Marca" value={make} onChange={setMake} placeholder="Ej. Toyota" />
              <Divider />
              <Field label="Modelo" value={model} onChange={setModel} placeholder="Ej. Corolla" />
              <Divider />
              <Field label="Año" value={year} onChange={setYear} placeholder="Ej. 2021" keyboardType="numeric" />
            </View>

            {/* Tanque */}
            <Text style={styles.sectionLabel}>TANQUE</Text>
            <View style={styles.card}>
              <View style={styles.stepRow}>
                <Text style={styles.fieldLabel}>Capacidad</Text>
                <View style={styles.stepControl}>
                  <TouchableOpacity style={styles.stepBtn} onPress={() => setTankSize(v => clamp(v - 5, 20, 150))}>
                    <Text style={styles.stepBtnText}>−</Text>
                  </TouchableOpacity>
                  <Text style={styles.stepValue}>{tankSize} <Text style={styles.stepUnit}>L</Text></Text>
                  <TouchableOpacity style={styles.stepBtn} onPress={() => setTankSize(v => clamp(v + 5, 20, 150))}>
                    <Text style={styles.stepBtnText}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Combustible preferido */}
            <Text style={styles.sectionLabel}>COMBUSTIBLE PREFERIDO</Text>
            <View style={styles.fuelGrid}>
              {FUELS.map(f => {
                const active = f.key === fuelType;
                return (
                  <TouchableOpacity
                    key={f.key}
                    onPress={() => setFuelType(f.key)}
                    style={[
                      styles.fuelChip,
                      active && { backgroundColor: `${f.color}22`, borderColor: `${f.color}55` },
                    ]}
                  >
                    <Text style={[styles.fuelChipText, active && { color: f.color, fontWeight: '700' }]}>
                      {f.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function Field({ label, value, onChange, placeholder, keyboardType }) {
  return (
    <View style={styles.fieldRow}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={styles.fieldInput}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.textDisabled}
        keyboardType={keyboardType || 'default'}
        returnKeyType="done"
      />
    </View>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

const styles = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: colors.bg },
  scroll:  { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  headerTitle: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  cancelBtn:   { paddingVertical: 4, paddingHorizontal: 2 },
  cancelText:  { fontSize: 15, color: colors.textSecondary },
  saveBtn:     { paddingVertical: 4, paddingHorizontal: 2 },
  saveText:    { fontSize: 15, fontWeight: '700', color: colors.amber },

  sectionLabel: {
    fontSize: 10, fontWeight: '600', letterSpacing: 1.2,
    color: colors.textMuted, marginBottom: 8, marginTop: 20,
  },

  card: {
    backgroundColor: colors.surface, borderRadius: 16,
    borderWidth: 1, borderColor: colors.border,
  },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.05)', marginHorizontal: 14 },

  fieldRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 13,
  },
  fieldLabel: { fontSize: 14, color: colors.textSecondary, fontWeight: '500', width: 80 },
  fieldInput: {
    flex: 1, fontSize: 14, color: colors.textPrimary,
    fontWeight: '600', textAlign: 'right',
  },

  stepRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 10,
  },
  stepControl: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1, borderColor: colors.border,
    justifyContent: 'center', alignItems: 'center',
  },
  stepBtnText: { fontSize: 20, color: colors.amber, fontWeight: '600', lineHeight: 24 },
  stepValue:   { fontSize: 18, fontWeight: '700', color: colors.textPrimary, minWidth: 60, textAlign: 'center' },
  stepUnit:    { fontSize: 12, color: colors.textMuted, fontWeight: '400' },

  fuelGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  fuelChip: {
    borderRadius: 10, borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.surface, paddingVertical: 9, paddingHorizontal: 14,
  },
  fuelChipText: { fontSize: 12, color: colors.textMuted, fontWeight: '500' },
});
