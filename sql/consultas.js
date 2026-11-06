export const MIEMBROS_ACTIVOS = `SELECT id, nombre, telefono,
  to_char(fecha_vencimiento, 'YYYY-MM-DD') AS fecha_vencimiento,
  to_char(ultimo_seguimiento, 'YYYY-MM-DD') AS ultimo_seguimiento
FROM comunidad.miembros
WHERE estado = 'activo'`;

export const MARCADORES_ALERTA = 'SELECT alert_key FROM comunidad.marcadores_alerta';

export const INSERTAR_MARCADOR_ALERTA = `INSERT INTO comunidad.marcadores_alerta (alert_key, miembro_id, tipo)
SELECT d.alert_key, d.miembro_id, d.tipo
FROM jsonb_to_record($1::jsonb) AS d(alert_key TEXT, miembro_id TEXT, tipo TEXT)
ON CONFLICT (alert_key) DO NOTHING`;

export const REPORTE_PENDIENTE = `SELECT CURRENT_DATE::text AS fecha,
  NOT EXISTS (
    SELECT 1 FROM comunidad.marcadores_reporte
    WHERE fecha = CURRENT_DATE AND tipo = 'resumen_diario'
  ) AS pendiente`;

export const RESUMEN_DIARIO = `SELECT
  count(*) FILTER (WHERE estado = 'activo')::int AS activos,
  count(*) FILTER (WHERE estado = 'vencido')::int AS vencidos,
  count(*) FILTER (
    WHERE estado = 'activo' AND fecha_vencimiento <= CURRENT_DATE + 7
  )::int AS vencen_pronto,
  (SELECT count(*)::int FROM comunidad.marcadores_alerta
    WHERE enviado_en >= CURRENT_DATE) AS alertas_hoy
FROM comunidad.miembros`;

export const INSERTAR_MARCADOR_REPORTE = `INSERT INTO comunidad.marcadores_reporte (fecha, tipo)
VALUES (CURRENT_DATE, 'resumen_diario')
ON CONFLICT (fecha, tipo) DO NOTHING`;

export const APLICAR_EDICIONES = `UPDATE comunidad.miembros AS m
SET responsable = COALESCE(d.responsable, m.responsable),
    notas = COALESCE(d.notas, m.notas),
    ultimo_seguimiento = COALESCE(d.ultimo_seguimiento::date, m.ultimo_seguimiento)
FROM jsonb_to_recordset($1::jsonb)
  AS d(id TEXT, responsable TEXT, notas TEXT, ultimo_seguimiento TEXT)
WHERE m.id = d.id`;
