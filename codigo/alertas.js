const MS_DIA = 86_400_000;

function diasEntre(desde, hasta) {
  return Math.round((Date.parse(hasta) - Date.parse(desde)) / MS_DIA);
}

export function detectarAlertas(miembros, marcadores, hoy, opciones = {}) {
  const { diasVencimiento = 3, diasSeguimiento = 14 } = opciones;
  const enviadas = new Set(marcadores.map((m) => m.alert_key));
  const alertas = [];

  for (const miembro of miembros) {
    const telefono = String(miembro.telefono ?? '').replace(/[^\d+]/g, '');
    if (!telefono) continue;
    if (miembro.fecha_vencimiento) {
      const dias = diasEntre(hoy, miembro.fecha_vencimiento);
      if (dias >= 0 && dias <= diasVencimiento) {
        alertas.push({
          alert_key: `VENCE|${miembro.id}|${miembro.fecha_vencimiento}`,
          miembro_id: miembro.id,
          tipo: 'VENCE',
          telefono,
          texto: `${miembro.nombre}: tu acceso vence el ${miembro.fecha_vencimiento}.`,
        });
      }
    }
    if (miembro.ultimo_seguimiento && diasEntre(miembro.ultimo_seguimiento, hoy) >= diasSeguimiento) {
      alertas.push({
        alert_key: `SEGUIMIENTO|${miembro.id}|${miembro.ultimo_seguimiento}`,
        miembro_id: miembro.id,
        tipo: 'SEGUIMIENTO',
        telefono,
        texto: `${miembro.nombre} no tiene seguimiento desde el ${miembro.ultimo_seguimiento}.`,
      });
    }
  }
  return alertas.filter((alerta) => !enviadas.has(alerta.alert_key));
}
