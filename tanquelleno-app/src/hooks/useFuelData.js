import { useState, useEffect, useCallback } from 'react';
import { fetchCurrentPrices, fetchHistory, priceChange } from '../api/combustibles';

export function useFuelData() {
  const [data, setData]       = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const [current, hist] = await Promise.all([fetchCurrentPrices(), fetchHistory()]);
      setData(current);
      setHistory(Array.isArray(hist) ? hist : []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const change = (fuelKey) => priceChange(history, fuelKey);

  return {
    prices: data?.prices ?? null,
    week:   data?.week ?? null,
    source: data?.source ?? '',
    history,
    loading,
    refreshing,
    error,
    refresh: () => load(true),
    change,
  };
}
