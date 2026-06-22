// Genera horarios de apagones realistas por sector
// EDESUR/EDENORTE no tienen API pública; estos datos son simulados
// pero con la estructura real para cuando se conecte la fuente oficial.

const SECTORES = {
  'Piantini':          { empresa: 'EDESUR', circuito: 'SD-14', horas: 8  },
  'Naco':              { empresa: 'EDESUR', circuito: 'SD-11', horas: 10 },
  'Los Prados':        { empresa: 'EDESUR', circuito: 'SD-09', horas: 12 },
  'Evaristo Morales':  { empresa: 'EDESUR', circuito: 'SD-16', horas: 8  },
  'Bella Vista':       { empresa: 'EDESUR', circuito: 'SD-07', horas: 10 },
  'Gazcue':            { empresa: 'EDESUR', circuito: 'SD-03', horas: 12 },
  'Villa Consuelo':    { empresa: 'EDESUR', circuito: 'SD-22', horas: 14 },
  'Cristo Rey':        { empresa: 'EDESUR', circuito: 'SD-18', horas: 14 },
  'Herrera':           { empresa: 'EDESUR', circuito: 'OE-05', horas: 16 },
  'Los Alcarrizos':    { empresa: 'EDESUR', circuito: 'OE-08', horas: 16 },
  'Santiago Centro':   { empresa: 'EDENORTE', circuito: 'STI-01', horas: 10 },
  'Los Jardines':      { empresa: 'EDENORTE', circuito: 'STI-04', horas: 12 },
  'Ensanche Ozama':    { empresa: 'EDESUR', circuito: 'SD-31', horas: 14 },
  'La Romana Centro':  { empresa: 'EDEESTE', circuito: 'LR-02', horas: 10 },
};

export const SECTORES_DISPONIBLES = Object.keys(SECTORES);

function generarHorario(horasApagon) {
  // Rota tandas de 4 horas: on/off alternado
  const slots = [];
  for (let h = 0; h < 24; h += 4) {
    const ini  = `${String(h).padStart(2, '0')}:00`;
    const finH = (h + 4) % 24;
    const fin  = `${String(finH).padStart(2, '0')}:00`;
    // Los sectores con más horas de apagón tienen más tandas "off"
    const estado = (Math.floor(h / 4) % 2 === 0)
      ? (horasApagon >= 12 ? 'off' : 'on')
      : (horasApagon >= 12 ? 'on'  : 'off');
    slots.push({ inicio: ini, fin, estado });
  }
  return slots;
}

function estadoActual(horario) {
  const now  = new Date();
  const hora = now.getHours() + now.getMinutes() / 60;
  for (const slot of horario) {
    const ini = parseInt(slot.inicio);
    const fin = parseInt(slot.fin);
    if (fin > ini) { if (hora >= ini && hora < fin) return slot.estado; }
    else           { if (hora >= ini || hora < fin) return slot.estado; }
  }
  return 'unknown';
}

export async function getApagones(sector) {
  const info    = SECTORES[sector] ?? { empresa: 'EDESUR', circuito: 'SD-XX', horas: 12 };
  const horario = generarHorario(info.horas);

  return {
    sector,
    empresa:         info.empresa,
    circuito:        info.circuito,
    horasApagonDia:  info.horas,
    estadoActual:    estadoActual(horario),
    horario,
    sectoresDisponibles: SECTORES_DISPONIBLES,
    nota: 'Horario simulado. Conectar fuente oficial EDESUR/EDENORTE para datos reales.',
  };
}
