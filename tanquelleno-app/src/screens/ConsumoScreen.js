import React, { useMemo } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../constants/colors';
import { PriceChip } from '../components/PriceChip';
import { useFuelData } from '../hooks/useFuelData';

const MONTHS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
const DAYS   = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];

const GALLON_TO_LITER = 3.785411784;

const FILL_HISTORY = [
  { date: '2026-06-20', liters: 42, amount: 4381, fuel: 'Gasolina Premium' },
  { date: '2026-06-06', liters: 38, amount: 3040, fuel: 'Gasolina Premium' },
  { date: '2026-05-19', liters: 41, amount: 3308, fuel: 'Gasolina Premium' },
  { date: '2026-05-05', liters: 43, amount: 3459, fuel: 'Gasolina Premium' },
];

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
  const max = Math.max(...data.map(d => d.amount));
  const BAR_H = 44;
  return (
    <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
      {[...data].reverse().map((d, i) => {
        const isLast = i === data.length - 1;
        const [, m, day] = d.date.split('-');
        const label = `${parseInt(day, 10)} ${MONTHS[parseInt(m, 10) - 1]}`;
        const h = Math.max(4, Math.round((d.amount / max) * BAR_H));
        return (
          <View key={i} style={{ flex: 1, alignItems: 'center' }}>
            <View style={{ height: BAR_H, justifyContent: 'flex-end', width: '100%' }}>
              <View style={{
                height: h,
                borderRadius: 4,
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

  const currentMonth = new Date().getMonth();

  const { monthSpend, prevSpend, avgLiters, fillsThisMonth } = useMemo(() => {
    const now = new Date();
    const curM = now.getFullYear() * 12 + now.getMonth();
    const curFills = FILL_HISTORY.filter(f => {
      const [y, m] = f.date.split('-').map(Number);
      return y * 12 + (m - 1) === curM;
    });
    const prevFills = FILL_HISTORY.filter(f => {
      const [y, m] = f.date.split('-').map(Number);
      return y * 12 + (m - 1) === curM - 1;
    });
    const monthSpend = curFills.reduce((s, f) => s + f.amount, 0);
    const prevSpend  = prevFills.reduce((s, f) => s + f.amount, 0);
    const allLiters  = FILL_HISTORY.map(f => f.liters);
    const avgLiters  = allLiters.length
      ? Math.round(allLiters.reduce((a, b) => a + b, 0) / allLiters.length)
      : 0;
    return { monthSpend, prevSpend, fillsThisMonth: curFills.length, avgLiters };
  }, [currentMonth]);

  const spendChange = prevSpend > 0
    ? ((monthSpend - prevSpend) / prevSpend) * 100
    : null;

  const premiumPrice = prices?.gasolina_premium?.price_gal ?? 0;
  const premiumLiter = premiumPrice > 0 ? (premiumPrice / GALLON_TO_LITER).toFixed(2) : '—';
  const premiumChange = change('gasolina_premium');

  const recentFills = FILL_HISTORY.slice(0, 2);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>

        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{getGreeting()} · {getTodayLabel()}</Text>
            <Text style={styles.name}>Víctor</Text>
          </View>
          <TouchableOpacity style={styles.notifBtn}>
            <Text style={{ fontSize: 18 }}>🔔</Text>
            <View style={styles.notifDot} />
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
                RD${prevSpend.toLocaleString('es-DO')} anterior
              </Text>
            </View>
          )}
          <MiniBarChart data={FILL_HISTORY} />
        </View>

        {/* Quick stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statVal}>{avgLiters} L</Text>
            <Text style={styles.statKey}>Avg./carga</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statVal}>{fillsThisMonth}×</Text>
            <Text style={styles.statKey}>Cargas/mes</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statVal, { color: colors.down }]}>~9 días</Text>
            <Text style={styles.statKey}>Próxima</Text>
          </View>
        </View>

        {/* Prediction card */}
        <View style={styles.predCard}>
          <Text style={{ fontSize: 22 }}>🗓</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.predTitle}>Próxima carga estimada</Text>
            <Text style={styles.predSub}>Dom 4 jul · Basado en tu patrón de 14 días</Text>
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
            <Text style={styles.fuelPrefTitle}>Gasolina Premium</Text>
            <Text style={styles.fuelPrefSub}>Tu combustible · 100% de cargas</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.fuelPrefPrice}>RD${premiumLiter}</Text>
            <Text style={styles.fuelPrefUnit}>/litro hoy</Text>
          </View>
        </TouchableOpacity>

        {/* Recent fill-ups */}
        <Text style={styles.sectionLabel}>ÚLTIMAS CARGAS</Text>
        <View style={[styles.card, { marginBottom: 16 }]}>
          {recentFills.map((f, i) => {
            const [y, m, d] = f.date.split('-');
            const label = `${DAYS[new Date(f.date).getDay()]} ${parseInt(d, 10)} ${MONTHS[parseInt(m, 10) - 1]} ${y}`;
            const perLit = (f.amount / f.liters).toFixed(2);
            return (
              <React.Fragment key={i}>
                {i > 0 && <View style={styles.divider} />}
                <View style={styles.fillupRow}>
                  <View style={styles.fillupIcon}>
                    <Text style={{ fontSize: 14 }}>⛽</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.fillupDate}>{label}</Text>
                    <Text style={styles.fillupSub}>{f.liters} L · RD${perLit}/L · {f.fuel}</Text>
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

        {/* FAB */}
        <TouchableOpacity style={styles.fab}>
          <Text style={styles.fabText}>+ Registrar carga</Text>
        </TouchableOpacity>

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
    alignItems: 'flex-start',
    marginBottom: 18,
  },
  greeting: { fontSize: 13, color: colors.textMuted, fontWeight: '500', marginBottom: 3 },
  name:     { fontSize: 26, fontWeight: '800', color: colors.textPrimary, letterSpacing: -0.6 },
  notifBtn: {
    width: 38, height: 38,
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border,
    borderRadius: 12,
    justifyContent: 'center', alignItems: 'center',
    position: 'relative',
  },
  notifDot: {
    position: 'absolute', top: 7, right: 7,
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: colors.amber,
    borderWidth: 2, borderColor: colors.bg,
  },

  spendCard: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.18)',
    padding: 22,
    marginBottom: 12,
    overflow: 'hidden',
    position: 'relative',
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
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
  },
  statVal: { fontSize: 18, fontWeight: '800', color: colors.textPrimary, letterSpacing: -0.4, marginBottom: 2 },
  statKey: { fontSize: 9.5, color: colors.textMuted, fontWeight: '500', letterSpacing: 0.2 },

  predCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: 'rgba(74,158,255,0.18)',
    borderRadius: 18, padding: 14, marginBottom: 12,
  },
  predTitle: { fontSize: 13, fontWeight: '700', color: colors.textPrimary, marginBottom: 2 },
  predSub:   { fontSize: 11, color: colors.textSecondary },

  fuelPref: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border,
    borderRadius: 18, padding: 14, marginBottom: 12,
  },
  fuelPrefIcon: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: colors.amberGlow,
    borderWidth: 1, borderColor: 'rgba(245,158,11,0.2)',
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
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.05)', marginHorizontal: 16 },

  fillupRow: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  fillupIcon: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: `${colors.amber}18`,
    justifyContent: 'center', alignItems: 'center',
  },
  fillupDate:   { fontSize: 13, fontWeight: '600', color: colors.textPrimary, marginBottom: 2 },
  fillupSub:    { fontSize: 11, color: colors.textSecondary },
  fillupAmount: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },

  seeAll: {
    borderTopWidth: 1, borderTopColor: colors.border,
    padding: 12, alignItems: 'center',
  },

  fab: {
    backgroundColor: colors.amber,
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.amber,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 16,
    elevation: 8,
  },
  fabText: { fontSize: 14, fontWeight: '800', color: '#000', letterSpacing: -0.1 },
});
