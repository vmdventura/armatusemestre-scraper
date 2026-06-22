import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';

import HomeScreen        from './src/screens/HomeScreen';
import CombustiblesScreen from './src/screens/CombustiblesScreen';
import ApagonesScreen    from './src/screens/ApagonesScreen';
import MasScreen         from './src/screens/MasScreen';
import { colors } from './src/theme';

const Tab = createBottomTabNavigator();

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <NavigationContainer>
        <Tab.Navigator
          screenOptions={({ route }) => ({
            headerShown: false,
            tabBarActiveTintColor:   colors.blue,
            tabBarInactiveTintColor: '#9AA0B8',
            tabBarStyle: {
              backgroundColor: '#fff',
              borderTopColor: '#E8ECF4',
              borderTopWidth: 1,
              height: 84,
              paddingBottom: 20,
              paddingTop: 10,
            },
            tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
            tabBarIcon: ({ color, size }) => {
              const icons = {
                Inicio:       'home-outline',
                Combustibles: 'flame-outline',
                Apagones:     'flash-outline',
                Más:          'grid-outline',
              };
              return <Ionicons name={icons[route.name]} size={size} color={color} />;
            },
          })}
        >
          <Tab.Screen name="Inicio"        component={HomeScreen} />
          <Tab.Screen name="Combustibles"  component={CombustiblesScreen} />
          <Tab.Screen name="Apagones"      component={ApagonesScreen} />
          <Tab.Screen name="Más"           component={MasScreen} />
        </Tab.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
