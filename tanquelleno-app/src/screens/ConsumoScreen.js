import React, { useState, useMemo } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../constants/colors';
import { PriceChip } from '../components/PriceChip';
import { RegisterCargoModal } from '../components/RegisterCargoModal';
import { useFuelData } from '../hooks/useFuelData';
import { useFillups } from '../context/FillupsContext';

const MONTHS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
const DAYS   = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];

const GALLON_TO_LITER = 3.785411784;

const FUEL_LABELS = {
  gasolina_premium: 'Gasolina Premium',
  gasolina_regular: 'Gasolina Regular',
  gasoil_regular:   'Gasoil Regular',
  gasoil_optimo:    'Gasoil Óptimo',
  glp:              'GLP',
};

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Buenos días';
  if (h < 18) return 'Buenas tardes';
  return 'Buenas noches';
}

function getTodayLabel() {
  const d = new Date();
  return `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

function MiniBarChart({ data }) {
  if (!data || data.length === 0) return null;
  const max   = Math.max(...data.map(d => d.amount));
  const BAR_H = 44;
  return (
    <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
      {[...data].reverse().map((d, i) => {
        const isLast = i === data.length - 1;
        const [, m, day] = d.date.split('-');
        const label = `${parseInt(day, 10)} ${MONTHS[parseInt(m, 10) - 1]}`;
        const h = Math.max(4, Math.round((d.amount / max) * BAR_H));
        return (
          <View key={d.id ?? i} style={{ flex: 1, alignItems: 'center' }}>
            <View style={{ height: BAR_H, justifyContent: 'flex-end', width: '100%' }}>
              <View style={{
                height: h, borderRadius: 4,
                backgroundColor: isLast ? colors.amber : 'rgba(245,158,11,0.18)',
              }} />
            </View>
            <Text style={{ fontSize: 8.5, color: colors.textDisabled, marginTop: 4 }}>{label}</Text>
          </View>
        );
      })}
    </View>
  );
}

export function ConsumoScreen() {
  const navigation = useNavigation();
  const { prices, change, loading } = useFuelData();
  const { fillups, vehicle }        = useFillups();
  const [showModal, setShowModal]   = useState(false);

  const sortedFillups = useMemo(
    () => [...fillups].sort((a, b) => new Date(b.date) - new Date(a.date)),
    [fillups]
  );

  const { monthSpend, prevSpend, avgLiters, fillsThisMonth, nextFillDate, avgDays } = useMemo(() => {
    const now  = new Date();
    const curM = now.getFullYear() * 12 + now.getMonth();

    const curFills  = sortedFillups.filter(f => {
      const d = new Date(f.date + 'T12:00:00');
      return d.getFullYear() * 12 + d.getMonth() === curM;
    });
    const prevFills = sortedFillups.filter(f => {
      const d = new Date(f.date + 'T12:00:00');
      return d.getFullYear() * 12 + d.getMonth() === curM - 1;
    });

    const monthSpend = curFills.reduce((s, f) => s + f.amount, 0);
    const prevSpend  = prevFills.reduce((s, f) => s + f.amount, 0);
    const avgLiters  = sortedFillups.length
      ? Math.round(sortedFillups.reduce((s, f) => s + f.liters, 0) / sortedFillups.length)
      : 0;

    let nextFillDate = null;
    let avgDays      = null;
    if (sortedFillups.length >= 2) {
      const gaps = [];
      for (let i = 0; i < sortedFillups.length - 1; i++) {
        const a = new Date(sortedFillups[i].date   + 'T12:00:00');
        const b = new Date(sortedFillups[i+1].date + 'T12:00:00');
        gaps.push((a - b) / 86400000);
      }
      avgDays      = Math.round(gaps.reduce((s, g) => s + g, 0) / gaps.length);
      const last   = new Date(sortedFillups[0].date + 'T12:00:00');
      nextFillDate = new Date(last);
      nextFillDate.setDate(nextFillDate.getDate() + avgDays);
    }

    return { monthSpend, prevSpend, fillsThisMonth: curFills.length, avgLiters, nextFillDate, avgDays };
  }, [sortedFillups]);

  const spendChange  = prevSpend > 0 ? ((monthSpend - prevSpend) / prevSpend) * 100 : null;

  const daysUntil = nextFillDate
    ? Math.max(0, Math.round((nextFillDate - new Date()) / 86400000))
    : null;

  const predDateLabel = nextFillDate
    ? `${DAYS[nextFillDate.getDay()]} ${nextFillDate.getDate()} ${MONTHS[nextFillDate.getMonth()]} · Patrón de ${avgDays} días`
    : sortedFillups.length > 0
    ? 'Necesitas al menos 2 cargas para predecir'
    : 'Registra tu primera carga para empezar';

  const preferredFuel  = vehicle?.fuelType ?? 'gasolina_premium';
  const preferredLabel = FUEL_LABELS[preferredFuel] ?? 'Gasolina Premium';
  const pctPreferred   = sortedFillups.length > 0
    ? Math.round((sortedFillups.filter(f => f.fuel === preferredFuel).length / sortedFillups.length) * 100)
    : 0;

  const priceGal  = prices?.[preferredFuel]?.price_gal ?? 0;
  const priceLit  = priceGal > 0 ? (priceGal / GALLON_TO_LITER).toFixed(2) : '—';
  const fuelChange = change(preferredFuel);

  const recentFills  = sortedFillups.slice(0, 2);
  const chartFillups = sortedFillups.slice(0, 4);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>

        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{getGreeting()} · {getTodayLabel()}</Text>
            <Text style={styles.name}>TanqueLleno</Text>
          </View>
          <TouchableOpacity style={styles.notifBtn} onPress={() => setShowModal(true)}>
            <Text style={{ fontSize: 18 }}>⛽</Text>
          </TouchableOpacity>
        </View>

        {/* Spend hero card */}
        <View style={styles.spendCard}>
          <View style={styles.spendGlow} />
          <Text style={styles.eyebrow}>Gasto este mes · {MONTHS[new Date().getMonth()]}</Text>
          <View style={styles.spendAmountRow}>
            <Text style={styles.spendCurrency}>RD$</Text>
            <Text style={styles.spendAmount}>
              {monthSpend > 0 ? monthSpend.toLocaleString('es-DO') : '—'}
            </Text>
          </View>
          {spendChange !== null && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <PriceChip change={spendChange} />
              <Text style={styles.spendPrev}>
                RD${prevSpend.toLocaleString('es-DO')} mes anterior
              </Text>
            </View>
          )}
          {chartFillups.length > 0 && <MiniBarChart data={chartFillups} />}
        </View>

        {/* Quick stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statVal}>{avgLiters > 0 ? `${avgLiters} L` : '—'}</Text>
            <Text style={styles.statKey}>Avg./carga</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statVal}>{fillsThisMonth > 0 ? `${fillsThisMonth}×` : '0×'}</Text>
            <Text style={styles.statKey}>Cargas/mes</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statVal, daysUntil !== null && { color: colors.down }]}>
              {daysUntil !== null ? `~${daysUntil}d` : '—'}
            </Text>
            <Text style={styles.statKey}>Próxima</Text>
          </View>
        </View>

        {/* Prediction card */}
        <View style={styles.predCard}>
          <Text style={{ fontSize: 22 }}>🗓</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.predTitle}>Próxima carga estimada</Text>
            <Text style={styles.predSub}>{predDateLabel}</Text>
          </View>
        </View>

        {/* Fuel preference */}
        <TouchableOpacity
          style={styles.fuelPref}
          onPress={() => navigation.navigate('precios')}
        >
          <View style={styles.fuelPrefIcon}>
            <Text style={{ fontSize: 18 }}>⛽</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.fuelPrefTitle}>{preferredLabel}</Text>
            <Text style={styles.fuelPrefSub}>
              Tu combustible{pctPreferred > 0 ? ` · ${pctPreferred}% de cargas` : ''}
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.fuelPrefPrice}>RD${priceLit}</Text>
            <Text style={styles.fuelPrefUnit}>/litro hoy</Text>
          </View>
        </TouchableOpacity>

        {/* Recent fill-ups */}
        <Text style={styles.sectionLabel}>ÚLTIMAS CARGAS</Text>
        {recentFills.length === 0 ? (
          <View style={[styles.card, styles.emptyCard]}>
            <Text style={styles.emptyIcon}>⛽</Text>
            <Text style={styles.emptyTitle}>Sin cargas registradas</Text>
            <Text style={styles.emptySub}>Registra tu primera carga para ver el historial</Text>
          </View>
        ) : (
          <View style={[styles.card, { marginBottom: 16 }]}>
            {recentFills.map((f, i) => {
              const [y, m, d] = f.date.split('-');
              const dateObj = new Date(f.date + 'T12:00:00');
              const label   = `${DAYS[dateObj.getDay()]} ${parseInt(d, 10)} ${MONTHS[parseInt(m, 10) - 1]} ${y}`;
              const perLit  = (f.amount / f.liters).toFixed(2);
              const fuelLabel = FUEL_LABELS[f.fuel] ?? f.fuel;
              return (
                <React.Fragment key={f.id ?? i}>
                  {i > 0 && <View style={styles.divider} />}
                  <View style={styles.fillupRow}>
                    <View style={styles.fillupIcon}>
                      <Text style={{ fontSize: 14 }}>⛽</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.fillupDate}>{label}</Text>
                      <Text style={styles.fillupSub}>{f.liters} L · RD${perLit}/L · {fuelLabel}</Text>
                    </View>
                    <Text style={styles.fillupAmount}>RD${f.amount.toLocaleString('es-DO')}</Text>
                  </View>
                </React.Fragment>
              );
            })}
            <TouchableOpacity
              style={styles.seeAll}
              onPress={() => navigation.navigate('historial')}
            >
              <Text style={{ fontSize: 12, fontWeight: '600', color: colors.amber }}>
                Ver historial completo →
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* FAB */}
        <TouchableOpacity style={styles.fab} onPress={() => setShowModal(true)}>
          <Text style={styles.fabText}>+ Registrar carga</Text>
        </TouchableOpacity>

      </ScrollView>

      <RegisterCargoModal visible={showModal} onClose={() => setShowModal(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: colors.bg },
  scroll:  { flex: 1 },
  content: { padding: 20, paddingBottom: 100 },

  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    marginBottom: 18,
  },
  greeting: { fontSize: 13, color: colors.textMuted, fontWeight: '500', marginBottom: 3 },
  name:     { fontSize: 26, fontWeight: '800', color: colors.textPrimary, letterSpacing: -0.6 },
  notifBtn: {
    width: 38, height: 38, backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center',
  },

  spendCard: {
    backgroundColor: colors.surface, borderRadius: 24, borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.18)', padding: 22, marginBottom: 12,
    overflow: 'hidden', position: 'relative',
  },
  spendGlow: {
    position: 'absolute', top: -60, right: -60,
    width: 200, height: 200, borderRadius: 100,
    backgroundColor: 'rgba(245,158,11,0.08)',
  },
  eyebrow: {
    fontSize: 10, fontWeight: '700', letterSpacing: 1.4,
    color: colors.textMuted, textTransform: 'uppercase', marginBottom: 8,
  },
  spendAmountRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4, marginBottom: 8 },
  spendCurrency:  { fontSize: 16, fontWeight: '600', color: colors.textMuted },
  spendAmount:    { fontSize: 44, fontWeight: '800', color: colors.amber, letterSpacing: -2, lineHeight: 48 },
  spendPrev:      { fontSize: 10, color: colors.textMuted },

  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  statCard: {
    flex: 1, backgroundColor: colors.surface, borderRadius: 16,
    borderWidth: 1, borderColor: colors.border, padding: 12,
  },
  statVal: { fontSize: 18, fontWeight: '800', color: colors.textPrimary, letterSpacing: -0.4, marginBottom: 2 },
  statKey: { fontSize: 9.5, color: colors.textMuted, fontWeight: '500', letterSpacing: 0.2 },

  predCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colors.surface, borderWidth: 1,
    borderColor: 'rgba(74,158,255,0.18)', borderRadius: 18, padding: 14, marginBottom: 12,
  },
  predTitle: { fontSize: 13, fontWeight: '700', color: colors.textPrimary, marginBottom: 2 },
  predSub:   { fontSize: 11, color: colors.textSecondary },

  fuelPref: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: 18, padding: 14, marginBottom: 12,
  },
  fuelPrefIcon: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: colors.amberGlow, borderWidth: 1, borderColor: 'rgba(245,158,11,0.2)',
    justifyContent: 'center', alignItems: 'center',
  },
  fuelPrefTitle: { fontSize: 13, fontWeight: '700', color: colors.textPrimary, marginBottom: 2 },
  fuelPrefSub:   { fontSize: 11, color: colors.textSecondary },
  fuelPrefPrice: { fontSize: 16, fontWeight: '800', color: colors.amber },
  fuelPrefUnit:  { fontSize: 10, color: colors.textMuted },

  sectionLabel: {
    fontSize: 10, fontWeight: '700', letterSpacing: 1.3,
    color: colors.textMuted, textTransform: 'uppercase', marginBottom: 8,
  },

  card: {
    backgroundColor: colors.surface, borderRadius: 20,
    borderWidth: 1, borderColor: colors.border,
  },
  emptyCard: { padding: 30, alignItems: 'center', marginBottom: 16 },
  emptyIcon:  { fontSize: 32, marginBottom: 10 },
  emptyTitle: { fontSize: 14, fontWeight: '700', color: colors.textPrimary, marginBottom: 6 },
  emptySub:   { fontSize: 12, color: colors.textMuted, textAlign: 'center' },

  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.05)', marginHorizontal: 16 },

  fillupRow:   { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  fillupIcon:  {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: `${colors.amber}18`, justifyContent: 'center', alignItems: 'center',
  },
  fillupDate:   { fontSize: 13, fontWeight: '600', color: colors.textPrimary, marginBottom: 2 },
  fillupSub:    { fontSize: 11, color: colors.textSecondary },
  fillupAmount: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },

  seeAll: {
    borderTopWidth: 1, borderTopColor: colors.border,
    padding: 12, alignItems: 'center',
  },

  fab: {
    backgroundColor: colors.amber, borderRadius: 16,
    paddingVertical: 15, alignItems: 'center', justifyContent: 'center',
    shadowColor: colors.amber, shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28, shadowRadius: 16, elevation: 8,
  },
  fabText: { fontSize: 14, fontWeight: '800', color: '#000', letterSpacing: -0.1 },
});
