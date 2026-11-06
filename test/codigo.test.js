import test from 'node:test';
import assert from 'node:assert/strict';
import { detectarAlertas } from '../codigo/alertas.js';
import { construirResumen } from '../codigo/resumen.js';
import { prepararEdiciones } from '../codigo/sincronizacion.js';

const HOY = '2030-01-10';
const miembro = (extra) => ({
  id: 'm1', nombre: 'Ana', telefono: '+57 000 000 0001', fecha_vencimiento: '2030-06-01', ultimo_seguimiento: '2030-01-09', ...extra,
});

test('avisa cuando el acceso vence pronto', () => {
  const [alerta] = detectarAlertas([miembro({ fecha_vencimiento: '2030-01-12' })], [], HOY);
  assert.equal(alerta.tipo, 'VENCE');
  assert.equal(alerta.alert_key, 'VENCE|m1|2030-01-12');
  assert.equal(alerta.telefono, '+570000000001');
});

test('no repite una alerta que ya tiene marcador', () => {
  const miembros = [miembro({ fecha_vencimiento: '2030-01-12' })];
  const [alerta] = detectarAlertas(miembros, [], HOY);
  assert.deepEqual(detectarAlertas(miembros, [{ alert_key: alerta.alert_key }], HOY), []);
});

test('una renovación genera una alerta nueva', () => {
  const marcador = { alert_key: 'VENCE|m1|2030-01-12' };
  const nuevas = detectarAlertas([miembro({ fecha_vencimiento: '2030-01-13' })], [marcador], HOY);
  assert.equal(nuevas.length, 1);
});

test('detecta falta de seguimiento y omite miembros sin teléfono', () => {
  assert.equal(detectarAlertas([miembro({ ultimo_seguimiento: '2029-12-20' })], [], HOY)[0].tipo, 'SEGUIMIENTO');
  assert.deepEqual(detectarAlertas([miembro({ telefono: '', ultimo_seguimiento: '2029-12-20' })], [], HOY), []);
});

test('no alerta sobre accesos ya vencidos', () => {
  assert.deepEqual(detectarAlertas([miembro({ fecha_vencimiento: '2030-01-01' })], [], HOY), []);
});

test('arma el resumen', () => {
  const texto = construirResumen({ activos: 3, vencidos: 1, vencen_pronto: 1, alertas_hoy: 2 }, HOY);
  assert.match(texto, /Miembros activos: 3/);
});

test('solo acepta campos editables', () => {
  const { filas } = prepararEdiciones([{ id: 'm1', notas: 'ok', estado: 'borrado', nombre: 'Otro' }]);
  assert.deepEqual(Object.keys(filas[0]).sort(), ['id', 'notas', 'responsable', 'ultimo_seguimiento'].sort());
});

test('rechaza filas sin id o con fecha inválida y omite las vacías', () => {
  const r = prepararEdiciones([
    { id: '', notas: 'x' },
    { id: 'm2', ultimo_seguimiento: 'ayer' },
    { id: 'm3', notas: '   ' },
  ]);
  assert.equal(r.total, 0);
  assert.deepEqual(r.rechazadas.map((f) => f.motivo), ['sin_id', 'fecha_invalida']);
});
