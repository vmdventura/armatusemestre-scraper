import React, { useEffect, useState, useCallback } from 'react';
import {
  ScrollView, View, Text, StyleSheet, TouchableOpacity,
  RefreshControl, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, shadow } from '../theme';
import { fetchApagones, fetchSectores } from '../api';

export default function ApagonesScreen() {
  const insets = useSafeAreaInsets();
  const [sectores, setSectores] = useState([]);
  const [sectorActivo, setSectorActivo] = useState('Piantini');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadSectores = useCallback(async () => {
    const s = await fetchSectores();
    setSectores(s);
    if (s.length > 0) setSectorActivo(s[0]);
  }, []);

  const loadApagones = useCallback(async (sector) => {
    const d = await fetchApagones(sector);
    setData(d);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadSectores();
    loadApagones(sectorActivo);
  }, []);

  const cambiarSector = useCallback((s) => {
    setSectorActivo(s);
    setLoading(true);
    loadApagones(s);
  }, [loadApagones]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadApagones(sectorActivo);
    setRefreshing(false);
  }, [sectorActivo, loadApagones]);

  const estadoColor = data?.estadoActual === 'on' ? colors.green : colors.red;
  const estadoLabel = data?.estadoActual === 'on' ? '✓ Con luz ahora' : '✗ Apagón ahora';

  return (
    <ScrollView
      style={s.bg}
      contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.blue} />}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <LinearGradient colors={['#1a1a2e', '#16213e']} style={[s.header, { paddingTop: insets.top + 12 }]}>
        <View style={s.headerRow}>
          <View style={s.headerIcon}>
            <Ionicons name="flash" size={22} color={colors.amber} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.headerTitle}>Apagones</Text>
            <Text style={s.headerSub}>{data?.empresa ?? 'EDESUR'} · Horario de hoy</Text>
          </View>
          {data && (
            <View style={[s.estadoBadge, { backgroundColor: data.estadoActual === 'on' ? 'rgba(29,185,84,0.2)' : 'rgba(200,16,46,0.2)' }]}>
              <Text style={[s.estadoText, { color: estadoColor }]}>{estadoLabel}</Text>
            </View>
          )}
        </View>
      </LinearGradient>

      {/* Selector de sectores */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={s.selectorScroll}
        contentContainerStyle={s.selectorContent}
      >
        {(sectores.length > 0 ? sectores : (data?.sectoresDisponibles ?? [])).map((s2) => (
          <TouchableOpacity
            key={s2}
            style={[s.chip, sectorActivo === s2 && s.chipActive]}
            onPress={() => cambiarSector(s2)}
          >
            <Text style={[s.chipText, sectorActivo === s2 && s.chipTextActive]}>{s2}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={s.content}>
        {loading ? (
          <View style={s.center}>
            <ActivityIndicator color={colors.blue} size="large" />
          </View>
        ) : (
          <>
            <Text style={s.sectionTitle}>Sector: {data?.sector}</Text>
            <Text style={s.circuito}>Circuito {data?.circuito} · {data?.horasApagonDia ?? '—'} h de apagón estimadas hoy</Text>

            {data?.horario.map((slot, i) => {
              const isOff = slot.estado === 'off';
              return (
                <View key={i} style={[s.slot, { backgroundColor: isOff ? 'rgba(200,16,46,0.05)' : '#F8F9FC' }]}>
                  <View style={[s.slotDot, { backgroundColor: isOff ? colors.red : colors.green }]} />
                  <Text style={s.slotTime}>{slot.inicio} – {slot.fin}</Text>
                  <View style={[s.slotBadge, {
                    backgroundColor: isOff ? 'rgba(200,16,46,0.1)' : 'rgba(29,185,84,0.1)',
                  }]}>
                    <Text style={[s.slotBadgeText, { color: isOff ? colors.red : colors.green }]}>
                      {isOff ? '⚡ Apagón' : '💡 Con luz'}
                    </Text>
                  </View>
                </View>
              );
            })}

            {data?.nota && (
              <View style={s.nota}>
                <Ionicons name="warning-outline" size={14} color={colors.amber} />
                <Text style={s.notaText}>{data.nota}</Text>
              </View>
            )}
          </>
        )}
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  bg: { flex: 1, backgroundColor: colors.bg },
  center: { height: 200, alignItems: 'center', justifyContent: 'center' },

  header: { paddingHorizontal: 20, paddingBottom: 20 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(245,166,35,0.2)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#fff' },
  headerSub:   { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  estadoBadge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  estadoText:  { fontSize: 11, fontWeight: '700' },

  selectorScroll: { maxHeight: 56 },
  selectorContent: { paddingHorizontal: 16, paddingVertical: 10, gap: 8, flexDirection: 'row' },
  chip:       { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.card },
  chipActive: { backgroundColor: colors.blue, borderColor: colors.blue },
  chipText:       { fontSize: 13, fontWeight: '600', color: colors.muted },
  chipTextActive: { color: '#fff' },

  content: { padding: 16, gap: 10 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  circuito: { fontSize: 12, color: colors.muted, marginTop: -4 },

  slot: { flexDirection: 'row', alignItems: 'center', borderRadius: radius.sm, padding: 14, gap: 12 },
  slotDot:  { width: 10, height: 10, borderRadius: 5 },
  slotTime: { flex: 1, fontSize: 14, fontWeight: '600', color: colors.text },
  slotBadge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  slotBadgeText: { fontSize: 12, fontWeight: '700' },

  nota: { flexDirection: 'row', gap: 8, backgroundColor: '#FFFBEA', borderRadius: radius.sm, padding: 12, marginTop: 4 },
  notaText: { flex: 1, fontSize: 11, color: '#7A5C00', lineHeight: 16 },
});
