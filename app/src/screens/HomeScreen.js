import React, { useEffect, useState, useCallback } from 'react';
import {
  ScrollView, View, Text, StyleSheet, RefreshControl,
  TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, shadow } from '../theme';
import {
  fetchDivisas, fetchClima, fetchCombustibles, fetchLoteria,
} from '../api';

// ── Helpers ───────────────────────────────────────────────────────────────────
function CambioTag({ cambio }) {
  if (cambio === 0) return <Text style={s.mismo}>= Sin cambio</Text>;
  const up = cambio > 0;
  return (
    <Text style={[s.cambio, { color: up ? colors.red : colors.green }]}>
      {up ? '▲' : '▼'} {up ? '+' : ''}{cambio.toFixed(2)}
    </Text>
  );
}

function SectionTitle({ title, onMore }) {
  return (
    <View style={s.sectionRow}>
      <Text style={s.sectionTitle}>{title}</Text>
      {onMore && (
        <TouchableOpacity onPress={onMore}>
          <Text style={s.sectionMore}>Ver más →</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ── Card: Divisas ─────────────────────────────────────────────────────────────
function DivisasCard({ data }) {
  if (!data) return <SkeletonCard />;
  return (
    <LinearGradient colors={['#1B4332', '#2D6A4F']} style={[s.card, { padding: 0, overflow: 'hidden' }]}>
      <View style={{ padding: 16 }}>
        <View style={s.cardHeader}>
          <View style={s.iconBox}>
            <Ionicons name="cash-outline" size={18} color="#fff" />
          </View>
          <View>
            <Text style={s.cardTitleW}>Divisas hoy</Text>
            <Text style={s.cardSubW}>{data.fuente}</Text>
          </View>
        </View>
        <View style={s.rateRow}>
          {[
            { label: 'Compra USD', val: data.usd.compra },
            { label: 'Venta USD',  val: data.usd.venta  },
            { label: 'Venta EUR',  val: data.eur.venta  },
          ].map(({ label, val }) => (
            <View key={label} style={s.rateBox}>
              <Text style={s.rateLabel}>{label}</Text>
              <Text style={s.rateVal}>{val}</Text>
            </View>
          ))}
        </View>
      </View>
    </LinearGradient>
  );
}

// ── Card: Combustibles ────────────────────────────────────────────────────────
function CombustiblesCard({ data, onMore }) {
  if (!data) return <SkeletonCard />;
  const top5 = data.precios.slice(0, 5);
  return (
    <View style={[s.card, shadow.sm]}>
      <LinearGradient colors={[colors.blue, '#003d8a']} style={s.cardHeaderGrad}>
        <View style={s.cardHeader}>
          <View style={[s.iconBox, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
            <Ionicons name="flame-outline" size={18} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.cardTitleW}>Combustibles</Text>
            <Text style={s.cardSubW}>{data.semana}</Text>
          </View>
          <View style={s.oficialBadge}><Text style={s.oficialText}>MICM</Text></View>
        </View>
      </LinearGradient>
      {top5.map((p, i) => (
        <View key={p.tipo ?? i} style={[s.fuelRow, i < top5.length - 1 && s.fuelRowBorder]}>
          <View style={[s.fuelDot, { backgroundColor: p.color }]} />
          <Text style={s.fuelName}>{p.nombre}</Text>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={[s.fuelPrice, { color: p.color }]}>RD${p.precio.toFixed(2)}</Text>
            <CambioTag cambio={p.cambio} />
          </View>
        </View>
      ))}
      <TouchableOpacity style={s.moreBtn} onPress={onMore}>
        <Text style={s.moreBtnText}>Ver todos los combustibles →</Text>
      </TouchableOpacity>
    </View>
  );
}

// ── Card: Clima ───────────────────────────────────────────────────────────────
function ClimaCard({ data }) {
  if (!data) return <SkeletonCard />;
  const a = data.actual;
  return (
    <LinearGradient colors={['#0F4C81', '#1976D2']} style={[s.card, { padding: 0, overflow: 'hidden' }]}>
      <View style={{ padding: 16 }}>
        <View style={s.climaTop}>
          <View>
            <Text style={s.climaCiudad}>{data.ciudad}</Text>
            <Text style={s.climaDesc}>{a.desc}</Text>
          </View>
          <Text style={s.climaEmoji}>{a.emoji}</Text>
        </View>
        <Text style={s.climaTemp}>{a.temp}<Text style={s.climaTempUnit}>°C</Text></Text>
        <View style={s.climaStats}>
          {[
            { label: 'Humedad', val: `${a.humedad}%` },
            { label: 'Viento',  val: `${a.viento} km/h` },
            { label: 'Sensación', val: `${a.sensacion}°C` },
            { label: 'UV',      val: `${a.uv}` },
          ].map(({ label, val }) => (
            <View key={label} style={s.climaStat}>
              <Text style={s.climaStatLabel}>{label}</Text>
              <Text style={s.climaStatVal}>{val}</Text>
            </View>
          ))}
        </View>
        <View style={s.pronostico}>
          {data.pronostico.map((d) => (
            <View key={d.dia} style={s.pronosticoDia}>
              <Text style={s.pronosticoDiaLabel}>{d.dia}</Text>
              <Text style={s.pronosticoEmoji}>{d.emoji}</Text>
              <Text style={s.pronosticoTemp}>{d.maxTemp}°</Text>
            </View>
          ))}
        </View>
      </View>
    </LinearGradient>
  );
}

// ── Card: Lotería ─────────────────────────────────────────────────────────────
function LoteriaCard({ data }) {
  if (!data) return <SkeletonCard />;
  return (
    <View style={[s.card, shadow.sm]}>
      <LinearGradient colors={['#8B0000', colors.red]} style={s.cardHeaderGrad}>
        <View style={s.cardHeader}>
          <View style={[s.iconBox, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
            <Text style={{ fontSize: 16 }}>🎱</Text>
          </View>
          <View>
            <Text style={s.cardTitleW}>Lotería Nacional</Text>
            <Text style={s.cardSubW}>{data.fecha}</Text>
          </View>
        </View>
      </LinearGradient>
      {data.juegos.map((j, i) => (
        <View key={j.nombre} style={[s.juegoRow, i < data.juegos.length - 1 && s.fuelRowBorder]}>
          <View style={[s.juegoBadge, { backgroundColor: j.bg }]}>
            <Text style={{ fontSize: 14 }}>{j.emoji}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.juegoNombre}>{j.nombre}</Text>
            <Text style={s.juegoSorteo}>{j.sorteo}</Text>
          </View>
          <View style={s.numerosRow}>
            {j.numeros.map((n, ni) => (
              <View key={ni} style={[s.numeroCircle, { backgroundColor: j.color }]}>
                <Text style={s.numeroText}>{n}</Text>
              </View>
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}

function SkeletonCard() {
  return <View style={[s.card, s.skeleton, shadow.sm]}><ActivityIndicator color={colors.blue} /></View>;
}

// ── Pantalla principal ────────────────────────────────────────────────────────
export default function HomeScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [divisas, setDivisas] = useState(null);
  const [clima, setClima]     = useState(null);
  const [combustibles, setCombustibles] = useState(null);
  const [loteria, setLoteria] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const [d, c, f, l] = await Promise.allSettled([
      fetchDivisas(), fetchClima(), fetchCombustibles(), fetchLoteria(),
    ]);
    if (d.status === 'fulfilled') setDivisas(d.value);
    if (c.status === 'fulfilled') setClima(c.value);
    if (f.status === 'fulfilled') setCombustibles(f.value);
    if (l.status === 'fulfilled') setLoteria(l.value);
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const hoy = new Date().toLocaleDateString('es-DO', {
    weekday: 'long', day: 'numeric', month: 'long',
  });

  return (
    <ScrollView
      style={s.bg}
      contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.blue} />}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <LinearGradient colors={[colors.blue, '#003d8a']} style={[s.header, { paddingTop: insets.top + 12 }]}>
        <View style={s.headerRow}>
          <View>
            <Text style={s.headerGreet}>Santo Domingo 🇩🇴</Text>
            <Text style={s.headerDate}>{hoy}</Text>
          </View>
          <TouchableOpacity style={s.notifBtn}>
            <Ionicons name="notifications-outline" size={22} color="#fff" />
          </TouchableOpacity>
        </View>
        <Text style={s.headerTitle}>CiudadanoRD</Text>
      </LinearGradient>

      <View style={s.content}>
        <DivisasCard data={divisas} />

        <SectionTitle title="⛽ Combustibles" onMore={() => navigation.navigate('Combustibles')} />
        <CombustiblesCard data={combustibles} onMore={() => navigation.navigate('Combustibles')} />

        <SectionTitle title="🌤 Clima ONAMET" />
        <ClimaCard data={clima} />

        <SectionTitle title="🎰 Lotería" />
        <LoteriaCard data={loteria} />
      </View>
    </ScrollView>
  );
}

// ── Estilos ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  bg:      { flex: 1, backgroundColor: colors.bg },
  header:  { paddingHorizontal: 20, paddingBottom: 24 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  headerGreet: { fontSize: 13, color: 'rgba(255,255,255,0.7)', fontWeight: '500' },
  headerDate:  { fontSize: 14, color: 'rgba(255,255,255,0.85)', fontWeight: '600' },
  headerTitle: { fontSize: 26, fontWeight: '800', color: '#fff', letterSpacing: -0.5 },
  notifBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },

  content: { padding: 16, gap: 12 },
  card:    { backgroundColor: colors.card, borderRadius: radius.lg },

  sectionRow:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4, marginBottom: 2 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
  sectionMore:  { fontSize: 12, color: colors.blue, fontWeight: '600' },

  skeleton: { height: 100, alignItems: 'center', justifyContent: 'center' },

  // Divisas
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cardHeaderGrad: { borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: 14 },
  cardTitleW: { fontSize: 14, fontWeight: '700', color: '#fff' },
  cardSubW:   { fontSize: 11, color: 'rgba(255,255,255,0.65)', marginTop: 1 },
  iconBox: { width: 34, height: 34, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  rateRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  rateBox: { flex: 1, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 12, padding: 10, alignItems: 'center' },
  rateLabel: { fontSize: 10, color: 'rgba(255,255,255,0.65)', fontWeight: '600', textTransform: 'uppercase' },
  rateVal:   { fontSize: 20, fontWeight: '800', color: '#fff', marginTop: 4 },

  // Combustibles
  fuelRow:    { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 11, gap: 10 },
  fuelRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  fuelDot:    { width: 8, height: 8, borderRadius: 4 },
  fuelName:   { flex: 1, fontSize: 13, fontWeight: '500', color: colors.text },
  fuelPrice:  { fontSize: 15, fontWeight: '700' },
  cambio:     { fontSize: 10, fontWeight: '600' },
  mismo:      { fontSize: 10, color: colors.muted },
  oficialBadge: { backgroundColor: colors.red, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
  oficialText:  { fontSize: 10, fontWeight: '700', color: '#fff' },
  moreBtn:    { alignItems: 'center', paddingVertical: 12, borderTopWidth: 1, borderTopColor: colors.border },
  moreBtnText: { fontSize: 13, color: colors.blue, fontWeight: '600' },

  // Clima
  climaTop:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 },
  climaCiudad: { fontSize: 16, fontWeight: '700', color: '#fff' },
  climaDesc:  { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  climaEmoji: { fontSize: 44 },
  climaTemp:  { fontSize: 48, fontWeight: '800', color: '#fff', lineHeight: 56 },
  climaTempUnit: { fontSize: 24, fontWeight: '400', opacity: 0.7 },
  climaStats: { flexDirection: 'row', marginTop: 12, gap: 8 },
  climaStat:  { flex: 1 },
  climaStatLabel: { fontSize: 10, color: 'rgba(255,255,255,0.6)', fontWeight: '600', textTransform: 'uppercase' },
  climaStatVal:   { fontSize: 13, fontWeight: '700', color: '#fff', marginTop: 2 },
  pronostico: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16, paddingTop: 14, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.15)' },
  pronosticoDia: { alignItems: 'center' },
  pronosticoDiaLabel: { fontSize: 10, fontWeight: '600', color: 'rgba(255,255,255,0.65)', textTransform: 'uppercase' },
  pronosticoEmoji: { fontSize: 20, marginVertical: 4 },
  pronosticoTemp:  { fontSize: 13, fontWeight: '700', color: '#fff' },

  // Lotería
  juegoRow:   { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 10 },
  juegoBadge: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  juegoNombre: { fontSize: 13, fontWeight: '600', color: colors.text },
  juegoSorteo: { fontSize: 10, color: colors.muted, marginTop: 2 },
  numerosRow:  { flexDirection: 'row', gap: 4 },
  numeroCircle: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  numeroText:   { fontSize: 11, fontWeight: '700', color: '#fff' },
});
