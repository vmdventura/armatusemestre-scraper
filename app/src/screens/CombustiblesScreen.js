import React, { useEffect, useState, useCallback } from 'react';
import {
  ScrollView, View, Text, StyleSheet, RefreshControl, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, shadow } from '../theme';
import { fetchCombustibles } from '../api';

export default function CombustiblesScreen() {
  const insets = useSafeAreaInsets();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const d = await fetchCombustibles();
    setData(d);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator color={colors.blue} size="large" />
        <Text style={s.loadingText}>Consultando MICM…</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={s.bg}
      contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.blue} />}
      showsVerticalScrollIndicator={false}
    >
      <LinearGradient colors={[colors.blue, '#003d8a']} style={[s.header, { paddingTop: insets.top + 12 }]}>
        <View style={s.headerIcon}>
          <Ionicons name="flame" size={28} color="#fff" />
        </View>
        <Text style={s.headerTitle}>Combustibles</Text>
        <Text style={s.headerSub}>Semana {data?.semana}</Text>
        <Text style={s.headerFuente}>Fuente: {data?.fuente}</Text>
      </LinearGradient>

      <View style={s.content}>
        <Text style={s.sectionTitle}>Precios por galón (RD$)</Text>

        {data?.precios.map((p, i) => (
          <View key={p.tipo ?? i} style={[s.card, shadow.sm]}>
            <View style={[s.colorBar, { backgroundColor: p.color }]} />
            <View style={s.cardBody}>
              <View style={s.cardLeft}>
                <Text style={s.pNombre}>{p.nombre}</Text>
                {p.tipo && <Text style={s.pTipo}>{p.tipo.replace('_', ' ').toUpperCase()}</Text>}
              </View>
              <View style={s.cardRight}>
                <Text style={[s.pPrecio, { color: p.color }]}>RD${p.precio.toFixed(2)}</Text>
                {p.cambio !== 0 ? (
                  <Text style={[s.pCambio, { color: p.cambio > 0 ? colors.red : colors.green }]}>
                    {p.cambio > 0 ? '▲ +' : '▼ '}{p.cambio.toFixed(2)} vs sem. ant.
                  </Text>
                ) : (
                  <Text style={[s.pCambio, { color: colors.muted }]}>= Sin cambio</Text>
                )}
              </View>
            </View>
          </View>
        ))}

        <View style={[s.infoBox]}>
          <Ionicons name="information-circle-outline" size={16} color={colors.blue} />
          <Text style={s.infoText}>
            Los precios son establecidos por resolución del MICM cada viernes y vigentes por una semana.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  bg:     { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { fontSize: 14, color: colors.muted },

  header: { padding: 20, paddingBottom: 28, alignItems: 'flex-start' },
  headerIcon:  { width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#fff' },
  headerSub:   { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  headerFuente: { fontSize: 11, color: 'rgba(255,255,255,0.55)', marginTop: 4 },

  content: { padding: 16, gap: 10 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },

  card:    { backgroundColor: colors.card, borderRadius: radius.md, flexDirection: 'row', overflow: 'hidden' },
  colorBar: { width: 5 },
  cardBody: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 14 },
  cardLeft:  { flex: 1 },
  cardRight: { alignItems: 'flex-end' },

  pNombre: { fontSize: 14, fontWeight: '600', color: colors.text },
  pTipo:   { fontSize: 10, color: colors.muted, marginTop: 2, letterSpacing: 0.4 },
  pPrecio: { fontSize: 18, fontWeight: '800' },
  pCambio: { fontSize: 11, fontWeight: '600', marginTop: 2 },

  infoBox: { flexDirection: 'row', gap: 8, backgroundColor: '#EEF3FF', borderRadius: radius.sm, padding: 12, marginTop: 4 },
  infoText: { flex: 1, fontSize: 12, color: colors.blue, lineHeight: 17 },
});
