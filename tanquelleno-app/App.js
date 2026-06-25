import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import Svg, { Path, Circle, Rect } from 'react-native-svg';

import { colors } from './src/constants/colors';
import { FillupsProvider } from './src/context/FillupsContext';
import { ConsumoScreen }     from './src/screens/ConsumoScreen';
import { PreciosScreen }     from './src/screens/PreciosScreen';
import { HistorialScreen }   from './src/screens/HistorialScreen';
import { CalculadoraScreen } from './src/screens/CalculadoraScreen';
import { MiAutoScreen }      from './src/screens/MiAutoScreen';

const Tab = createBottomTabNavigator();

function DropletIcon({ color, size }) {
  return (
    <Svg width={size} height={size * 1.15} viewBox="0 0 20 23">
      <Path d="M10 1C6.5 7.5 3.5 11 3.5 14.5a6.5 6.5 0 0013 0C16.5 11 13.5 7.5 10 1z" fill={color} />
    </Svg>
  );
}

function ChartIcon({ color, size }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M3 3v18h18" stroke={color} strokeWidth={2} strokeLinecap="round" fill="none" />
      <Path d="M7 14l4-4 4 4 4-6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </Svg>
  );
}

function CalcIcon({ color, size }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M6 2h12a2 2 0 012 2v16a2 2 0 01-2 2H6a2 2 0 01-2-2V4a2 2 0 012-2z"
        stroke={color} strokeWidth={1.8} fill="none" />
      <Path d="M9 7h6M9 12h2m4 0h-2m-2 4h2m2 0h-2"
        stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

function CarIcon({ color, size }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M5 17H3v-5l2.5-6.5h11L19 12v5h-2"
        stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <Circle cx={7} cy={17} r={2} stroke={color} strokeWidth={1.8} fill="none" />
      <Circle cx={17} cy={17} r={2} stroke={color} strokeWidth={1.8} fill="none" />
    </Svg>
  );
}

function HomeIcon({ color, size }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"
        stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <Path d="M9 22V12h6v10"
        stroke={color} strokeWidth={1.8} strokeLinecap="round" fill="none" />
    </Svg>
  );
}

function TabIcon({ name, color, size }) {
  const icons = {
    consumo:     <HomeIcon   color={color} size={size} />,
    precios:     <DropletIcon color={color} size={size} />,
    historial:   <ChartIcon  color={color} size={size} />,
    calculadora: <CalcIcon   color={color} size={size} />,
    miauto:      <CarIcon    color={color} size={size} />,
  };
  return icons[name] ?? null;
}

function TabBar({ state, descriptors, navigation }) {
  return (
    <View style={tabStyles.container}>
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const label = options.tabBarLabel ?? route.name;
        const isFocused = state.index === index;
        const iconName = route.name.toLowerCase().replace(/\s/g, '');

        const onPress = () => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!isFocused && !event.defaultPrevented) navigation.navigate(route.name);
        };

        const accent = isFocused ? colors.amber : colors.tabInactive;

        return (
          <View key={route.key} style={tabStyles.tab}>
            <Text
              onPress={onPress}
              style={tabStyles.touchTarget}
              accessibilityRole="button"
            >
              <View style={tabStyles.iconWrap}>
                <TabIcon name={iconName} color={accent} size={22} />
                {isFocused && <View style={tabStyles.dot} />}
              </View>
              <Text style={[tabStyles.label, isFocused && tabStyles.labelActive]}>
                {label}
              </Text>
            </Text>
          </View>
        );
      })}
    </View>
  );
}

export default function App() {
  return (
    <FillupsProvider>
    <SafeAreaProvider>
      <StatusBar style="light" />
      <NavigationContainer>
        <Tab.Navigator
          tabBar={props => <TabBar {...props} />}
          screenOptions={{ headerShown: false }}
        >
          <Tab.Screen name="consumo"     component={ConsumoScreen}     options={{ tabBarLabel: 'Consumo'      }} />
          <Tab.Screen name="precios"     component={PreciosScreen}     options={{ tabBarLabel: 'Precios'      }} />
          <Tab.Screen name="historial"   component={HistorialScreen}   options={{ tabBarLabel: 'Historial'    }} />
          <Tab.Screen name="calculadora" component={CalculadoraScreen} options={{ tabBarLabel: 'Calculadora'  }} />
          <Tab.Screen name="miauto"      component={MiAutoScreen}      options={{ tabBarLabel: 'Mi Auto'      }} />
        </Tab.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
    </FillupsProvider>
  );
}

const tabStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingBottom: 8,
    paddingTop: 8,
  },
  tab: { flex: 1, alignItems: 'center' },
  touchTarget: { alignItems: 'center' },
  iconWrap: { alignItems: 'center', marginBottom: 3 },
  dot: {
    width: 4, height: 4,
    borderRadius: 2,
    backgroundColor: colors.amber,
    marginTop: 2,
  },
  label: {
    fontSize: 10,
    fontWeight: '500',
    color: colors.tabInactive,
    letterSpacing: 0.2,
  },
  labelActive: { color: colors.amber, fontWeight: '700' },
});
