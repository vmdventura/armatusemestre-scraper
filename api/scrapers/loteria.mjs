// Resultados del día simulados — no existe API pública oficial
// Estructura lista para conectar un scraper cuando esté disponible

function numero(min, max) {
  return String(Math.floor(Math.random() * (max - min + 1)) + min).padStart(2, '0');
}

function resultadosHoy() {
  // Seed por fecha para que sean consistentes durante el día
  const hoy = new Date();
  const seed = hoy.getFullYear() * 10000 + (hoy.getMonth() + 1) * 100 + hoy.getDate();
  // Simple LCG para reproducibilidad
  let s = seed;
  const rand = (max) => { s = (s * 1664525 + 1013904223) & 0xffffffff; return Math.abs(s) % max; };
  const n = (max) => String(rand(max) + 1).padStart(2, '0');

  return [
    {
      nombre: 'Lotería Nacional',
      sorteo: '6:00 PM',
      numeros: [n(99), n(99), n(99)],
      color: '#C8102E',
      bg: '#FFF3E0',
      emoji: '🏆',
    },
    {
      nombre: 'Loto Pool',
      sorteo: '9:00 PM',
      numeros: [n(35), n(35), n(35), n(35), n(35)],
      color: '#1565C0',
      bg: '#E3F2FD',
      emoji: '🔵',
    },
    {
      nombre: 'Loteka',
      sorteo: '8:55 PM',
      numeros: [n(38), n(38), n(38)],
      color: '#2E7D32',
      bg: '#E8F5E9',
      emoji: '🟢',
    },
    {
      nombre: 'Real',
      sorteo: '3:00 PM',
      numeros: [n(99), n(99), n(99)],
      color: '#4527A0',
      bg: '#EDE7F6',
      emoji: '👑',
    },
    {
      nombre: 'La Suerte',
      sorteo: '12:30 PM',
      numeros: [n(99), n(99)],
      color: '#E65100',
      bg: '#FBE9E7',
      emoji: '🍀',
    },
  ];
}

export async function getLoteria() {
  const hoy = new Date();
  return {
    fecha: hoy.toLocaleDateString('es-DO', { weekday: 'long', day: 'numeric', month: 'long' }),
    fuente: 'Simulado — integrar scraper oficial',
    juegos: resultadosHoy(),
  };
}
