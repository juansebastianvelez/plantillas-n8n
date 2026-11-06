import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const carpeta = new URL('../plantillas/', import.meta.url);
const plantillas = fs.readdirSync(carpeta).map((f) => [f, JSON.parse(fs.readFileSync(new URL(f, carpeta), 'utf8'))]);

test('hay tres plantillas', () => assert.equal(plantillas.length, 3));

for (const [archivo, plantilla] of plantillas) {
  test(`${archivo}: las conexiones apuntan a nodos existentes`, () => {
    const nombres = new Set(plantilla.nodes.map((n) => n.name));
    assert.equal(nombres.size, plantilla.nodes.length);
    for (const [origen, conexion] of Object.entries(plantilla.connections)) {
      assert.ok(nombres.has(origen), origen);
      for (const salida of conexion.main) for (const destino of salida ?? []) assert.ok(nombres.has(destino.node), destino.node);
    }
  });

  test(`${archivo}: no incluye credenciales ni teléfonos`, () => {
    const texto = JSON.stringify(plantilla);
    assert.ok(!plantilla.nodes.some((n) => n.credentials));
    assert.ok(!/\b57\d{10}\b/.test(texto));
    assert.ok(!/Bearer [A-Za-z0-9]/.test(texto));
  });
}

test('las consultas no detienen el flujo cuando devuelven 0 filas', () => {
  const postgres = plantillas.flatMap(([, p]) => p.nodes).filter((n) => n.type.endsWith('.postgres'));
  assert.ok(postgres.length > 0);
  assert.ok(postgres.every((n) => n.alwaysOutputData === true));
});

test('el marcador solo se guarda después de un envío exitoso', () => {
  const [, alertas] = plantillas.find(([f]) => f.startsWith('alertas'));
  const siguiente = (nombre, salida = 0) => alertas.connections[nombre].main[salida].map((d) => d.node);
  assert.deepEqual(siguiente('Enviar alerta'), ['¿Se envió?']);
  assert.deepEqual(siguiente('¿Se envió?', 0), ['Guardar marcador']);
  assert.deepEqual(siguiente('¿Se envió?', 1), ['Uno por uno']);
});
