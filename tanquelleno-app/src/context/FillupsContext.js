import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const FILLUPS_KEY = '@tanquelleno/fillups_v1';
const VEHICLE_KEY = '@tanquelleno/vehicle_v1';

const SEED_FILLUPS = [
  { id: 's1', date: '2026-06-20', liters: 42, amount: 4381, fuel: 'gasolina_premium', station: '' },
  { id: 's2', date: '2026-06-06', liters: 38, amount: 3040, fuel: 'gasolina_premium', station: '' },
  { id: 's3', date: '2026-05-19', liters: 41, amount: 3308, fuel: 'gasolina_premium', station: '' },
  { id: 's4', date: '2026-05-05', liters: 43, amount: 3459, fuel: 'gasolina_premium', station: '' },
];

const DEFAULT_VEHICLE = {
  name: 'Mi Auto',
  make: 'Toyota',
  model: 'Corolla',
  year: 2021,
  tankSize: 50,
  fuelType: 'gasolina_premium',
  level: 0.30,
};

const FillupsContext = createContext(null);

export function FillupsProvider({ children }) {
  const [fillups, setFillups] = useState([]);
  const [vehicle, setVehicle] = useState(DEFAULT_VEHICLE);
  const [ready, setReady]     = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [f, v] = await Promise.all([
          AsyncStorage.getItem(FILLUPS_KEY),
          AsyncStorage.getItem(VEHICLE_KEY),
        ]);
        if (f) {
          setFillups(JSON.parse(f));
        } else {
          setFillups(SEED_FILLUPS);
          await AsyncStorage.setItem(FILLUPS_KEY, JSON.stringify(SEED_FILLUPS));
        }
        if (v) setVehicle(JSON.parse(v));
      } catch {
        setFillups(SEED_FILLUPS);
      } finally {
        setReady(true);
      }
    })();
  }, []);

  const addFillup = useCallback(async (fillup) => {
    const { newLevel, ...data } = fillup;
    const entry = { ...data, id: String(Date.now()) };
    setFillups(prev => {
      const sorted = [entry, ...prev].sort((a, b) => new Date(b.date) - new Date(a.date));
      AsyncStorage.setItem(FILLUPS_KEY, JSON.stringify(sorted)).catch(() => {});
      return sorted;
    });
    if (newLevel !== undefined) {
      setVehicle(prev => {
        const next = { ...prev, level: Math.min(1, Math.max(0, newLevel)) };
        AsyncStorage.setItem(VEHICLE_KEY, JSON.stringify(next)).catch(() => {});
        return next;
      });
    }
  }, []);

  const updateVehicle = useCallback((updates) => {
    setVehicle(prev => {
      const next = { ...prev, ...updates };
      AsyncStorage.setItem(VEHICLE_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  return (
    <FillupsContext.Provider value={{ fillups, vehicle, ready, addFillup, updateVehicle }}>
      {children}
    </FillupsContext.Provider>
  );
}

export function useFillups() {
  const ctx = useContext(FillupsContext);
  if (!ctx) throw new Error('useFillups must be inside FillupsProvider');
  return ctx;
}
