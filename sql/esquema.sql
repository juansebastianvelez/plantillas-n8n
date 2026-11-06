CREATE SCHEMA IF NOT EXISTS comunidad;

CREATE TABLE IF NOT EXISTS comunidad.miembros (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL,
  telefono TEXT,
  fecha_vencimiento DATE,
  estado TEXT NOT NULL DEFAULT 'activo',
  responsable TEXT,
  notas TEXT,
  ultimo_seguimiento DATE
);

CREATE TABLE IF NOT EXISTS comunidad.marcadores_alerta (
  alert_key TEXT PRIMARY KEY,
  miembro_id TEXT NOT NULL,
  tipo TEXT NOT NULL,
  enviado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS comunidad.marcadores_reporte (
  fecha DATE NOT NULL,
  tipo TEXT NOT NULL,
  enviado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (fecha, tipo)
);
