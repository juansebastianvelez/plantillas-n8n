import fs from 'node:fs';
import * as Q from '../sql/consultas.js';

const leerCodigo = (archivo) => fs.readFileSync(new URL(`../codigo/${archivo}`, import.meta.url), 'utf8')
  .replace(/^export function/gm, 'function');

const ID = (nombre) => nombre.toLowerCase().replace(/[^a-z0-9]+/g, '-');

function nodo(name, type, typeVersion, parameters, x, y, extra = {}) {
  return { id: ID(name), name, type: `n8n-nodes-base.${type}`, typeVersion, position: [x, y], parameters, ...extra };
}

// alwaysOutputData evita que el flujo se detenga cuando una consulta devuelve 0 filas.
function sql(name, query, x, y, replacement) {
  const options = replacement ? { queryReplacement: replacement } : {};
  return nodo(name, 'postgres', 2.5, { operation: 'executeQuery', query, options }, x, y, { alwaysOutputData: true });
}

function codigo(name, jsCode, x, y) {
  return nodo(name, 'code', 2, { jsCode }, x, y);
}

function si(name, condicion, x, y) {
  return nodo(name, 'if', 2.2, {
    conditions: {
      options: { caseSensitive: true, leftValue: '', typeValidation: 'loose', version: 2 },
      conditions: [{
        id: 'condicion',
        leftValue: condicion,
        rightValue: true,
        operator: { type: 'boolean', operation: 'true', singleValue: true },
      }],
      combinator: 'and',
    },
    options: {},
  }, x, y);
}

function enviar(name, telefono, texto, x, y) {
  return nodo(name, 'httpRequest', 4.2, {
    method: 'POST',
    url: '={{ $env.MENSAJES_URL }}',
    sendHeaders: true,
    headerParameters: {
      parameters: [{ name: 'Authorization', value: '=Bearer {{ $env.MENSAJES_TOKEN }}' }],
    },
    sendBody: true,
    specifyBody: 'json',
    jsonBody: `={{ JSON.stringify({ telefono: ${telefono}, texto: ${texto} }) }}`,
    options: { response: { response: { fullResponse: true, neverError: true } } },
  }, x, y);
}

const manual = (y) => nodo('Prueba manual', 'manualTrigger', 1, {}, 0, y);
const programa = (expresion, y) => nodo('Programación', 'scheduleTrigger', 1.2, {
  rule: { interval: [{ field: 'cronExpression', expression: expresion }] },
}, 0, y);

function enlaces(pares) {
  const conexiones = {};
  for (const [origen, destino, salida = 0] of pares) {
    conexiones[origen] ??= { main: [] };
    conexiones[origen].main[salida] ??= [];
    conexiones[origen].main[salida].push({ node: destino, type: 'main', index: 0 });
  }
  return conexiones;
}

const plantilla = (name, nodes, pares) => ({
  name, nodes, connections: enlaces(pares), settings: { executionOrder: 'v1' }, pinData: {},
});

const alertas = plantilla('Alertas sin duplicados', [
  manual(0),
  programa('0 9 * * *', 200),
  sql('Leer miembros', Q.MIEMBROS_ACTIVOS, 220, 100),
  sql('Leer marcadores', Q.MARCADORES_ALERTA, 440, 100),
  codigo('Detectar alertas', `${leerCodigo('alertas.js')}
const miembros = $('Leer miembros').all().map((i) => i.json);
const marcadores = $('Leer marcadores').all().map((i) => i.json).filter((m) => m.alert_key);
const hoy = new Date().toISOString().slice(0, 10);
return detectarAlertas(miembros, marcadores, hoy).map((json) => ({ json }));`, 880, 100),
  nodo('Uno por uno', 'splitInBatches', 3, { batchSize: 1, options: {} }, 1100, 100),
  enviar('Enviar alerta', '$json.telefono', '$json.texto', 1320, 100),
  si('¿Se envió?', '={{ $json.statusCode >= 200 && $json.statusCode < 300 }}', 1540, 100),
  sql('Guardar marcador', Q.INSERTAR_MARCADOR_ALERTA, 1760, 0,
    "={{ [JSON.stringify($('Uno por uno').item.json)] }}"),
], [
  ['Prueba manual', 'Leer miembros'],
  ['Programación', 'Leer miembros'],
  ['Leer miembros', 'Leer marcadores'],
  ['Leer marcadores', 'Detectar alertas'],
  ['Detectar alertas', 'Uno por uno'],
  ['Uno por uno', 'Enviar alerta', 1],
  ['Enviar alerta', '¿Se envió?'],
  ['¿Se envió?', 'Guardar marcador', 0],
  ['¿Se envió?', 'Uno por uno', 1],
  ['Guardar marcador', 'Uno por uno'],
]);

const resumen = plantilla('Resumen diario idempotente', [
  manual(0),
  programa('5 7 * * *', 200),
  sql('¿Ya se envió hoy?', Q.REPORTE_PENDIENTE, 220, 100),
  si('¿Pendiente?', '={{ $json.pendiente }}', 440, 100),
  sql('Calcular resumen', Q.RESUMEN_DIARIO, 660, 0),
  codigo('Armar mensaje', `${leerCodigo('resumen.js')}
const datos = $input.first().json;
const fecha = $('¿Ya se envió hoy?').first().json.fecha;
return [{ json: { texto: construirResumen(datos, fecha) } }];`, 880, 0),
  enviar('Enviar resumen', '$env.REPORTE_TELEFONO', '$json.texto', 1100, 0),
  si('¿Se envió?', '={{ $json.statusCode >= 200 && $json.statusCode < 300 }}', 1320, 0),
  sql('Guardar marcador', Q.INSERTAR_MARCADOR_REPORTE, 1540, -100),
], [
  ['Prueba manual', '¿Ya se envió hoy?'],
  ['Programación', '¿Ya se envió hoy?'],
  ['¿Ya se envió hoy?', '¿Pendiente?'],
  ['¿Pendiente?', 'Calcular resumen', 0],
  ['Calcular resumen', 'Armar mensaje'],
  ['Armar mensaje', 'Enviar resumen'],
  ['Enviar resumen', '¿Se envió?'],
  ['¿Se envió?', 'Guardar marcador', 0],
]);

const sincronizacion = plantilla('Sincronización controlada desde Google Sheets', [
  manual(0),
  programa('*/20 * * * *', 200),
  nodo('Leer hoja', 'googleSheets', 4.5, {
    documentId: { __rl: true, mode: 'id', value: '={{ $env.HOJA_ID }}' },
    sheetName: { __rl: true, mode: 'name', value: 'Seguimiento' },
    options: {},
  }, 220, 100),
  codigo('Validar ediciones', `${leerCodigo('sincronizacion.js')}
const filas = $input.all().map((i) => i.json);
return [{ json: prepararEdiciones(filas) }];`, 440, 100),
  si('¿Hay cambios?', '={{ $json.total > 0 }}', 660, 100),
  sql('Aplicar ediciones', Q.APLICAR_EDICIONES, 880, 0, '={{ [JSON.stringify($json.filas)] }}'),
], [
  ['Prueba manual', 'Leer hoja'],
  ['Programación', 'Leer hoja'],
  ['Leer hoja', 'Validar ediciones'],
  ['Validar ediciones', '¿Hay cambios?'],
  ['¿Hay cambios?', 'Aplicar ediciones', 0],
]);

const salidas = {
  'alertas-sin-duplicados': alertas,
  'resumen-diario': resumen,
  'sincronizacion-sheets': sincronizacion,
};
for (const [nombre, contenido] of Object.entries(salidas)) {
  fs.writeFileSync(new URL(`../plantillas/${nombre}.json`, import.meta.url), `${JSON.stringify(contenido, null, 2)}\n`);
}
console.log(`Generadas ${Object.keys(salidas).length} plantillas`);
