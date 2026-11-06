import test, { before } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import * as Q from '../sql/consultas.js';

const leer = (f) => fs.readFileSync(new URL(`../sql/${f}`, import.meta.url), 'utf8');
let db;

before(async () => {
  db = new PGlite();
  await db.exec(leer('esquema.sql'));
  await db.exec(leer('datos-ejemplo.sql'));
});

test('lee solo miembros activos', async () => {
  const { rows } = await db.query(Q.MIEMBROS_ACTIVOS);
  assert.equal(rows.length, 3);
  assert.match(rows[0].fecha_vencimiento, /^\d{4}-\d{2}-\d{2}$/);
});

test('el marcador de alerta no se duplica', async () => {
  const fila = JSON.stringify({ alert_key: 'VENCE|m-001|x', miembro_id: 'm-001', tipo: 'VENCE', telefono: '1', texto: 't' });
  await db.query(Q.INSERTAR_MARCADOR_ALERTA, [fila]);
  await db.query(Q.INSERTAR_MARCADOR_ALERTA, [fila]);
  const { rows } = await db.query(Q.MARCADORES_ALERTA);
  assert.equal(rows.length, 1);
});

test('el resumen cuenta y solo se marca una vez al día', async () => {
  const { rows: [resumen] } = await db.query(Q.RESUMEN_DIARIO);
  assert.deepEqual(resumen, { activos: 3, vencidos: 1, vencen_pronto: 1, alertas_hoy: 1 });
  assert.equal((await db.query(Q.REPORTE_PENDIENTE)).rows[0].pendiente, true);
  await db.query(Q.INSERTAR_MARCADOR_REPORTE);
  await db.query(Q.INSERTAR_MARCADOR_REPORTE);
  assert.equal((await db.query(Q.REPORTE_PENDIENTE)).rows[0].pendiente, false);
});

test('la sincronización no toca columnas protegidas y resiste inyección', async () => {
  const filas = [{
    id: 'm-002',
    responsable: "x'; DROP TABLE comunidad.miembros; --",
    notas: null,
    ultimo_seguimiento: '2030-01-01',
    estado: 'borrado',
  }];
  await db.query(Q.APLICAR_EDICIONES, [JSON.stringify(filas)]);
  const { rows: [m] } = await db.query("SELECT estado, responsable FROM comunidad.miembros WHERE id = 'm-002'");
  assert.equal(m.estado, 'activo');
  assert.equal(m.responsable, filas[0].responsable);
});
