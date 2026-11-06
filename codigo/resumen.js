export function construirResumen(datos, fecha) {
  return [
    `Resumen del ${fecha}`,
    `Miembros activos: ${datos.activos}`,
    `Vencidos: ${datos.vencidos}`,
    `Vencen en 7 días: ${datos.vencen_pronto}`,
    `Alertas enviadas hoy: ${datos.alertas_hoy}`,
  ].join('\n');
}
