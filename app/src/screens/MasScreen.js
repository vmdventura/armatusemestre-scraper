import React from 'react';
import {
  ScrollView, View, Text, StyleSheet, TouchableOpacity, Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, shadow } from '../theme';

const LINKS = [
  { icono: 'school-outline',      label: 'UASD',           sub: 'Horarios y asignaturas',   color: '#5B2D8E', url: 'https://app.uasd.edu.do' },
  { icono: 'car-outline',         label: 'DGII',           sub: 'Consulta marbete y RNC',   color: '#C8102E', url: 'https://dgii.gov.do' },
  { icono: 'medkit-outline',      label: 'SeNaSa',         sub: 'Seguro nacional de salud',  color: '#0D7C3D', url: 'https://www.senasa.gov.do' },
  { icono: 'business-outline',    label: 'BCRD',           sub: 'Banco Central RD',         color: '#002D62', url: 'https://www.bancentral.gov.do' },
  { icono: 'cloudy-outline',      label: 'ONAMET',         sub: 'Meteorología nacional',    color: '#1565C0', url: 'https://onamet.gov.do' },
  { icono: 'flash-outline',       label: 'EDESUR',         sub: 'Reportar apagón / avería', color: '#E65100', url: 'https://edesur.com.do' },
  { icono: 'document-text-outline', label: 'Gaceta Oficial', sub: 'Leyes y decretos',       color: '#4A148C', url: 'https://gazetaoficial.gob.do' },
  { icono: 'people-outline',      label: 'JCE',            sub: 'Junta Central Electoral',  color: '#B71C1C', url: 'https://jce.gob.do' },
];

export default function MasScreen() {
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      style={s.bg}
      contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
      showsVerticalScrollIndicator={false}
    >
      <LinearGradient colors={['#2C3E50', '#34495E']} style={[s.header, { paddingTop: insets.top + 12 }]}>
        <Text style={s.headerTitle}>Servicios</Text>
        <Text style={s.headerSub}>Acceso rápido a portales del gobierno</Text>
      </LinearGradient>

      <View style={s.content}>
        <Text style={s.sectionLabel}>INSTITUCIONES</Text>
        <View style={s.grid}>
          {LINKS.map((item) => (
            <TouchableOpacity
              key={item.label}
              style={[s.gridItem, shadow.sm]}
              onPress={() => Linking.openURL(item.url)}
              activeOpacity={0.7}
            >
              <View style={[s.gridIcon, { backgroundColor: item.color + '18' }]}>
                <Ionicons name={item.icono} size={24} color={item.color} />
              </View>
              <Text style={s.gridLabel}>{item.label}</Text>
              <Text style={s.gridSub} numberOfLines={1}>{item.sub}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={s.sectionLabel}>PRÓXIMAMENTE</Text>
        {[
          { emoji: '🎓', label: 'UASD — Notas y récord académico',    soon: true },
          { emoji: '🚌', label: 'OMSA / Metro — Horarios y rutas',     soon: true },
          { emoji: '💊', label: 'Medicamentos — Precios PROMESE',       soon: true },
          { emoji: '🏦', label: 'Tasas bancarias en tiempo real',       soon: true },
        ].map((item) => (
          <View key={item.label} style={[s.comingSoon, shadow.sm]}>
            <Text style={s.csEmoji}>{item.emoji}</Text>
            <Text style={s.csLabel}>{item.label}</Text>
            <View style={s.csBadge}><Text style={s.csBadgeText}>Pronto</Text></View>
          </View>
        ))}

        <View style={s.version}>
          <Text style={s.versionText}>CiudadanoRD v1.0.0 · hecho en RD 🇩🇴</Text>
          <Text style={s.versionSub}>Datos: MICM · BCRD · ONAMET · UASD</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  bg: { flex: 1, backgroundColor: colors.bg },
  header: { paddingHorizontal: 20, paddingBottom: 24 },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#fff' },
  headerSub:   { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 4 },

  content: { padding: 16, gap: 12 },
  sectionLabel: { fontSize: 11, fontWeight: '700', color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 4, marginBottom: 2 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  gridItem: { width: '47%', backgroundColor: colors.card, borderRadius: radius.md, padding: 14, alignItems: 'flex-start' },
  gridIcon:  { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  gridLabel: { fontSize: 14, fontWeight: '700', color: colors.text },
  gridSub:   { fontSize: 11, color: colors.muted, marginTop: 2 },

  comingSoon: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: radius.md, padding: 14, gap: 12 },
  csEmoji: { fontSize: 22 },
  csLabel: { flex: 1, fontSize: 13, fontWeight: '600', color: colors.text },
  csBadge: { backgroundColor: '#EEF3FF', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  csBadgeText: { fontSize: 11, color: colors.blue, fontWeight: '700' },

  version: { alignItems: 'center', marginTop: 12, gap: 4 },
  versionText: { fontSize: 12, color: colors.muted, fontWeight: '600' },
  versionSub:  { fontSize: 11, color: colors.border },
});
