-- Seed Script: Poblar datos de disponibilidad para testing
-- Este script crea horarios disponibles para todos los empleados activos

-- Primero, obtener el ID del empleado (asumiendo que ya existe uno)
DO $$
DECLARE
  employee_record RECORD;
BEGIN
  -- Recorrer todos los empleados activos
  FOR employee_record IN
    SELECT id FROM employees WHERE is_active = true
  LOOP
    -- Limpiar disponibilidad existente para este empleado
    DELETE FROM availability WHERE employee_id = employee_record.id;

    -- Lunes a Viernes (1-5)
    -- Horario matutino: 9:00 - 13:00
    INSERT INTO availability (employee_id, day_of_week, start_time, end_time, slot_duration_minutes)
    VALUES
      (employee_record.id, 1, '09:00', '13:00', 60), -- Lunes
      (employee_record.id, 2, '09:00', '13:00', 60), -- Martes
      (employee_record.id, 3, '09:00', '13:00', 60), -- Miércoles
      (employee_record.id, 4, '09:00', '13:00', 60), -- Jueves
      (employee_record.id, 5, '09:00', '13:00', 60); -- Viernes

    -- Lunes a Viernes (1-5)
    -- Horario vespertino: 15:00 - 19:00
    INSERT INTO availability (employee_id, day_of_week, start_time, end_time, slot_duration_minutes)
    VALUES
      (employee_record.id, 1, '15:00', '19:00', 60), -- Lunes
      (employee_record.id, 2, '15:00', '19:00', 60), -- Martes
      (employee_record.id, 3, '15:00', '19:00', 60), -- Miércoles
      (employee_record.id, 4, '15:00', '19:00', 60), -- Jueves
      (employee_record.id, 5, '15:00', '19:00', 60); -- Viernes

    -- Sábado (6)
    -- Solo mañanas: 9:00 - 13:00
    INSERT INTO availability (employee_id, day_of_week, start_time, end_time, slot_duration_minutes)
    VALUES
      (employee_record.id, 6, '09:00', '13:00', 60); -- Sábado

    RAISE NOTICE 'Disponibilidad creada para empleado: %', employee_record.id;
  END LOOP;

  -- Mostrar resumen
  RAISE NOTICE '✅ Datos de disponibilidad creados exitosamente';
  RAISE NOTICE 'Total de registros: %', (SELECT COUNT(*) FROM availability);
END $$;

-- Verificar los datos creados
SELECT
  e.name as empleado,
  CASE a.day_of_week
    WHEN 0 THEN 'Domingo'
    WHEN 1 THEN 'Lunes'
    WHEN 2 THEN 'Martes'
    WHEN 3 THEN 'Miércoles'
    WHEN 4 THEN 'Jueves'
    WHEN 5 THEN 'Viernes'
    WHEN 6 THEN 'Sábado'
  END as dia,
  a.start_time as desde,
  a.end_time as hasta,
  a.slot_duration_minutes as duracion_slot
FROM availability a
JOIN employees e ON a.employee_id = e.id
ORDER BY e.name, a.day_of_week, a.start_time;
