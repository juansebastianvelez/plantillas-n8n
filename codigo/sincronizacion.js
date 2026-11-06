const EDITABLES = ['responsable', 'notas', 'ultimo_seguimiento'];
const FECHA = /^\d{4}-\d{2}-\d{2}$/;

function limpiar(valor) {
  const texto = String(valor ?? '').trim();
  return texto === '' ? null : texto;
}

export function prepararEdiciones(filas) {
  const validas = [];
  const rechazadas = [];

  for (const fila of filas) {
    const id = limpiar(fila.id);
    const salida = { id };
    for (const campo of EDITABLES) salida[campo] = limpiar(fila[campo]);
    const fechaMala = salida.ultimo_seguimiento && !FECHA.test(salida.ultimo_seguimiento);
    const sinCambios = EDITABLES.every((campo) => salida[campo] === null);
    if (!id || fechaMala) rechazadas.push({ id, motivo: !id ? 'sin_id' : 'fecha_invalida' });
    else if (!sinCambios) validas.push(salida);
  }
  return { filas: validas, rechazadas, total: validas.length };
}
