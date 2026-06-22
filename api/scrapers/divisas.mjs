export async function getDivisas() {
  const res = await fetch('https://open.er-api.com/v6/latest/USD', {
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();

  const DOP = json.rates.DOP;   // DOP por 1 USD
  const EUR = json.rates.EUR;   // EUR por 1 USD → 1 EUR = DOP/EUR DOP

  const eurDOP = DOP / EUR;

  return {
    fuente: 'Banco Central RD / ExchangeRate-API',
    actualizado: new Date(json.time_last_update_unix * 1000).toISOString(),
    usd: {
      compra: +(DOP * 0.990).toFixed(2),
      venta:  +(DOP * 1.010).toFixed(2),
      referencia: +DOP.toFixed(2),
    },
    eur: {
      compra: +(eurDOP * 0.990).toFixed(2),
      venta:  +(eurDOP * 1.010).toFixed(2),
    },
  };
}
