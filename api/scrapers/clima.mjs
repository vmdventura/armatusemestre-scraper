const WMO = {
  0:  { desc: 'Despejado',            emoji: '☀️'  },
  1:  { desc: 'Mayormente despejado', emoji: '🌤'  },
  2:  { desc: 'Parcialmente nublado', emoji: '⛅'  },
  3:  { desc: 'Nublado',              emoji: '☁️'  },
  45: { desc: 'Neblina',              emoji: '🌫'  },
  48: { desc: 'Neblina con escarcha', emoji: '🌫'  },
  51: { desc: 'Llovizna ligera',      emoji: '🌦'  },
  53: { desc: 'Llovizna moderada',    emoji: '🌦'  },
  55: { desc: 'Llovizna intensa',     emoji: '🌧'  },
  61: { desc: 'Lluvia ligera',        emoji: '🌦'  },
  63: { desc: 'Lluvia moderada',      emoji: '🌧'  },
  65: { desc: 'Lluvia fuerte',        emoji: '🌧'  },
  80: { desc: 'Chubascos ligeros',    emoji: '🌦'  },
  81: { desc: 'Chubascos moderados',  emoji: '🌧'  },
  82: { desc: 'Chubascos fuertes',    emoji: '⛈'  },
  95: { desc: 'Tormenta',             emoji: '⛈'  },
  96: { desc: 'Tormenta con granizo', emoji: '⛈'  },
  99: { desc: 'Tormenta severa',      emoji: '⛈'  },
};

function wmo(code) {
  return WMO[code] ?? { desc: 'Variable', emoji: '🌡' };
}

const DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

export async function getClima() {
  const params = new URLSearchParams({
    latitude:  '18.4861',
    longitude: '-69.9312',
    current:   'temperature_2m,relative_humidity_2m,wind_speed_10m,weathercode,apparent_temperature,uv_index',
    daily:     'weathercode,temperature_2m_max,temperature_2m_min',
    temperature_unit: 'celsius',
    wind_speed_unit:  'kmh',
    timezone:         'America/Santo_Domingo',
    forecast_days:    '6',
  });

  const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`, {
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();

  const c = json.current;
  const d = json.daily;

  return {
    ciudad:  'Santo Domingo',
    fuente:  'Open-Meteo / ONAMET',
    actual: {
      temp:      Math.round(c.temperature_2m),
      sensacion: Math.round(c.apparent_temperature),
      humedad:   c.relative_humidity_2m,
      viento:    Math.round(c.wind_speed_10m),
      uv:        Math.round(c.uv_index ?? 0),
      ...wmo(c.weathercode),
    },
    pronostico: d.time.slice(1, 6).map((fecha, i) => ({
      dia:     DIAS[new Date(fecha + 'T12:00:00').getDay()],
      maxTemp: Math.round(d.temperature_2m_max[i + 1]),
      minTemp: Math.round(d.temperature_2m_min[i + 1]),
      ...wmo(d.weathercode[i + 1]),
    })),
  };
}
