import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
} from 'react-native';
import Svg, { Path, Text as SvgText } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../constants/colors';
import { useFuelData } from '../hooks/useFuelData';
import { useFillups } from '../context/FillupsContext';
import { RegisterCargoModal } from '../components/RegisterCargoModal';
import { EditVehicleModal } from '../components/EditVehicleModal';

const MONTHS     = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
const DAYS       = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
const GALLON_TO_LITER = 3.785411784;

const FUEL_LABELS = {
  gasolina_premium: 'G. Premium',
  gasolina_regular: 'G. Regular',
  gasoil_regular:   'Gasoil Reg.',
  gasoil_optimo:    'Gasoil Ópt.',
  glp:              'GLP',
};

function TankGauge({ level, accentColor }) {
  const R  = 70;
  const cx = 90;
  const cy = 90;
  const startAngle = 210;
  const endAngle   = 330;

  function polarToXY(angleDeg, r) {
    const rad = ((angleDeg - 90) * Math.PI) / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  }

  function arcPath(fromAngle, toAngle) {
    const start = polarToXY(fromAngle, R);
    const end   = polarToXY(toAngle,   R);
    const large = (((toAngle - fromAngle + 360) % 360) > 180) ? 1 : 0;
    return `M ${start.x} ${start.y} A ${R} ${R} 0 ${large} 1 ${end.x} ${end.y}`;
  }

  const fullArcDeg = ((endAngle - startAngle + 360) % 360);
  const fillAngle  = startAngle + fullArcDeg * Math.max(0.01, level);
  const trackPath  = arcPath(startAngle, endAngle < startAngle ? endAngle + 360 : endAngle);
  const fillPath   = level > 0.01 ? arcPath(startAngle, fillAngle) : null;
  const pct        = Math.round(level * 100);

  return (
    <Svg width={180} height={150} viewBox="0 0 180 150">
      <Path d={trackPath} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={10} strokeLinecap="round" />
      {fillPath && (
        <Path d={fillPath} fill="none" stroke={accentColor} strokeWidth={10} strokeLinecap="round" />
      )}
      <SvgText x={cx} y={cy - 8}  textAnchor="middle" fill={colors.textPrimary} fontSize={28} fontWeight="800">
        {pct}%
      </SvgText>
      <SvgText x={cx} y={cy + 14} textAnchor="middle" fill={colors.textMuted} fontSize={10}>
        del tanque
      </SvgText>
      <SvgText
        x={polarToXY(startAngle, R + 16).x}
        y={polarToXY(startAngle, R + 16).y + 4}
        textAnchor="middle" fill={colors.textDisabled} fontSize={9}>E
      </SvgText>
      <SvgText
        x={polarToXY(endAngle, R + 16).x}
        y={polarToXY(endAngle, R + 16).y + 4}
        textAnchor="middle" fill={colors.textDisabled} fontSize={9}>F
      </SvgText>
    </Svg>
  );
}

export function MiAutoScreen() {
  const { prices }                  = useFuelData();
  const { fillups, vehicle }          = useFillups();
  const [showModal, setShowModal]     = useState(false);
  const [showEditVehicle, setShowEditVehicle] = useState(false);

  const price      = prices?.[vehicle.fuelType]?.price_gal ?? 0;
  const litLeft    = Math.round(vehicle.tankSize * vehicle.level);
  const litToFill  = vehicle.tankSize - litLeft;
  const costFull   = price > 0
    ? Math.round((vehicle.tankSize / GALLON_TO_LITER) * price).toLocaleString()
    : '—';
  const costToFill = price > 0
    ? Math.round((litToFill / GALLON_TO_LITER) * price).toLocaleString()
    : '—';

  const levelColor = vehicle.level < 0.20
    ? colors.up
    : vehicle.level < 0.40
    ? colors.amber
    : colors.down;

  const sortedFillups = [...fillups].sort((a, b) => new Date(b.date) - new Date(a.date));

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>

        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerLabel}>GARAGE</Text>
            <Text style={styles.headerTitle}>Mi Vehículo</Text>
          </View>
          <TouchableOpacity style={styles.addBtn} onPress={() => setShowModal(true)}>
            <Text style={{ color: colors.amber, fontSize: 22, lineHeight: 24 }}>+</Text>
          </TouchableOpacity>
        </View>

        {/* Vehicle card */}
        <View style={styles.vehicleCard}>
          <View style={styles.vehicleTop}>
            <View style={{ flex: 1 }}>
              <Text style={styles.vehicleName}>{vehicle.name}</Text>
              <Text style={styles.vehicleInfo}>{vehicle.year} {vehicle.make} {vehicle.model}</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={[styles.levelBadge, { backgroundColor: `${levelColor}22` }]}>
                <Text style={[styles.levelBadgeText, { color: levelColor }]}>
                  {vehicle.level < 0.20 ? 'BAJO' : vehicle.level < 0.50 ? 'MEDIO' : 'OK'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowEditVehicle(true)} style={styles.editBtn}>
                <Text style={styles.editBtnText}>Editar</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.gaugeContainer}>
            <TankGauge level={vehicle.level} accentColor={levelColor} />
          </View>

          <View style={styles.tankStats}>
            {[
              { label: 'Litros restantes', value: `${litLeft} L` },
              { label: 'Capacidad',         value: `${vehicle.tankSize} L` },
            ].map(({ label, value }) => (
              <View key={label} style={styles.tankStat}>
                <Text style={styles.tankStatLabel}>{label}</Text>
                <Text style={styles.tankStatValue}>{value}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Cost estimate */}
        {price > 0 && (
          <View style={styles.costRow}>
            <View style={styles.costCard}>
              <Text style={styles.costLabel}>Llenar tanque</Text>
              <Text style={[styles.costValue, { color: colors.amber }]}>RD$ {costFull}</Text>
              <Text style={styles.costSub}>{vehicle.tankSize} L</Text>
            </View>
            <View style={styles.costCard}>
              <Text style={styles.costLabel}>Hasta el lleno</Text>
              <Text style={[styles.costValue, { color: colors.down }]}>RD$ {costToFill}</Text>
              <Text style={styles.costSub}>{litToFill} L</Text>
            </View>
          </View>
        )}

        {/* Fill-up history */}
        <Text style={styles.sectionLabel}>HISTORIAL DE CARGAS</Text>
        {sortedFillups.length === 0 ? (
          <View style={[styles.card, styles.emptyCard]}>
            <Text style={styles.emptyIcon}>⛽</Text>
            <Text style={styles.emptyTitle}>Sin cargas aún</Text>
            <Text style={styles.emptySub}>Registra tu primera carga para ver el historial</Text>
          </View>
        ) : (
          <View style={[styles.card, { overflow: 'hidden', marginBottom: 12 }]}>
            {sortedFillups.map((f, i) => {
              const [y, m, d]  = f.date.split('-');
              const dateObj    = new Date(f.date + 'T12:00:00');
              const label      = `${parseInt(d, 10)} ${MONTHS[parseInt(m, 10) - 1]} ${y}`;
              const perLit     = f.liters > 0 ? (f.amount / f.liters).toFixed(1) : '—';
              const fuelLabel  = FUEL_LABELS[f.fuel] ?? f.fuel;
              return (
                <React.Fragment key={f.id ?? i}>
                  {i > 0 && <View style={styles.divider} />}
                  <View style={styles.fillupRow}>
                    <View style={styles.fillupIcon}>
                      <Text style={{ fontSize: 14 }}>⛽</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.fillupDate}>{DAYS[dateObj.getDay()]} {label}</Text>
                      <Text style={styles.fillupSub}>{f.liters} L · RD${perLit}/L · {fuelLabel}</Text>
                    </View>
                    <Text style={styles.fillupAmount}>RD${f.amount.toLocaleString()}</Text>
                  </View>
                </React.Fragment>
              );
            })}
          </View>
        )}

        {/* Log fill-up button */}
        <TouchableOpacity style={styles.logBtn} onPress={() => setShowModal(true)}>
          <Text style={styles.logBtnText}>+ Registrar carga</Text>
        </TouchableOpacity>
      </ScrollView>

      <RegisterCargoModal visible={showModal} onClose={() => setShowModal(false)} />
      <EditVehicleModal visible={showEditVehicle} onClose={() => setShowEditVehicle(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: colors.bg },
  scroll:  { flex: 1 },
  content: { padding: 20, paddingBottom: 100 },

  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16,
  },
  headerLabel: { fontSize: 10, fontWeight: '600', letterSpacing: 1.2, color: colors.textMuted, marginBottom: 4 },
  headerTitle: { fontSize: 22, fontWeight: '700', color: colors.textPrimary, letterSpacing: -0.3 },
  addBtn: {
    width: 36, height: 36, backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center',
  },

  vehicleCard: {
    backgroundColor: colors.surface, borderRadius: 20,
    borderWidth: 1, borderColor: colors.border, padding: 18, marginBottom: 12,
  },
  vehicleTop: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12,
  },
  vehicleName:   { fontSize: 17, fontWeight: '700', color: colors.textPrimary, marginBottom: 3 },
  vehicleInfo:   { fontSize: 12, color: colors.textSecondary },
  levelBadge:    { borderRadius: 100, paddingHorizontal: 10, paddingVertical: 4 },
  levelBadgeText:{ fontSize: 9, fontWeight: '800', letterSpacing: 0.8 },
  editBtn: {
    borderRadius: 8, borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.surface, paddingHorizontal: 10, paddingVertical: 5,
  },
  editBtnText: { fontSize: 11, color: colors.textSecondary, fontWeight: '600' },

  gaugeContainer: { alignItems: 'center', marginBottom: 4 },

  tankStats: { flexDirection: 'row', justifyContent: 'space-around', paddingTop: 4 },
  tankStat:  { alignItems: 'center' },
  tankStatLabel: { fontSize: 10, color: colors.textMuted, fontWeight: '500', marginBottom: 3 },
  tankStatValue: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },

  costRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  costCard: {
    flex: 1, backgroundColor: colors.surface, borderRadius: 16,
    borderWidth: 1, borderColor: colors.border, padding: 14, alignItems: 'center',
  },
  costLabel: { fontSize: 10, fontWeight: '600', color: colors.textMuted, letterSpacing: 0.5, marginBottom: 6 },
  costValue: { fontSize: 20, fontWeight: '800', letterSpacing: -0.5, marginBottom: 2 },
  costSub:   { fontSize: 10, color: colors.textDisabled },

  sectionLabel: { fontSize: 10, fontWeight: '600', letterSpacing: 1.2, color: colors.textMuted, marginBottom: 8 },

  card: {
    backgroundColor: colors.surface, borderRadius: 20,
    borderWidth: 1, borderColor: colors.border,
  },
  emptyCard:  { padding: 30, alignItems: 'center', marginBottom: 12 },
  emptyIcon:  { fontSize: 32, marginBottom: 10 },
  emptyTitle: { fontSize: 14, fontWeight: '700', color: colors.textPrimary, marginBottom: 6 },
  emptySub:   { fontSize: 12, color: colors.textMuted, textAlign: 'center' },

  divider:   { height: 1, backgroundColor: 'rgba(255,255,255,0.05)' },
  fillupRow: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  fillupIcon:{
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: `${colors.amber}18`, justifyContent: 'center', alignItems: 'center',
  },
  fillupDate:   { fontSize: 13, fontWeight: '600', color: colors.textPrimary, marginBottom: 2 },
  fillupSub:    { fontSize: 11, color: colors.textSecondary },
  fillupAmount: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },

  logBtn: {
    borderRadius: 14, borderWidth: 1,
    borderColor: `${colors.amber}44`, backgroundColor: `${colors.amber}14`,
    paddingVertical: 14, alignItems: 'center',
  },
  logBtnText: { fontSize: 14, fontWeight: '700', color: colors.amber },
});
