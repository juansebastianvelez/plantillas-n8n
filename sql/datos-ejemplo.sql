INSERT INTO comunidad.miembros (id, nombre, telefono, fecha_vencimiento, estado, responsable, ultimo_seguimiento) VALUES
  ('m-001', 'Ana Prueba', '+570000000001', CURRENT_DATE + 2, 'activo', 'Equipo A', CURRENT_DATE - 1),
  ('m-002', 'Luis Ejemplo', '+570000000002', CURRENT_DATE + 30, 'activo', 'Equipo A', CURRENT_DATE - 20),
  ('m-003', 'Sara Demo', '+570000000003', CURRENT_DATE + 45, 'activo', 'Equipo B', CURRENT_DATE - 2),
  ('m-004', 'Tomás Muestra', '+570000000004', CURRENT_DATE - 5, 'vencido', 'Equipo B', CURRENT_DATE - 40)
ON CONFLICT (id) DO NOTHING;
