-- Lina Database Functions
-- Funciones auxiliares para el sistema

-- ============================================
-- FUNCTION: Get available time slots
-- ============================================
CREATE OR REPLACE FUNCTION get_available_slots(
  p_employee_id UUID,
  p_date DATE,
  p_slot_duration_minutes INTEGER DEFAULT 30
)
RETURNS TABLE (
  slot_time TIME,
  slot_datetime TIMESTAMP WITH TIME ZONE,
  is_available BOOLEAN
) AS $$
DECLARE
  v_day_of_week INTEGER;
  v_availability RECORD;
BEGIN
  -- Get day of week (0 = Sunday)
  v_day_of_week := EXTRACT(DOW FROM p_date);

  -- For each availability slot of the employee for this day
  FOR v_availability IN
    SELECT start_time, end_time, slot_duration_minutes
    FROM availability
    WHERE employee_id = p_employee_id
      AND day_of_week = v_day_of_week
  LOOP
    -- Generate time slots
    RETURN QUERY
    WITH RECURSIVE time_slots AS (
      SELECT v_availability.start_time AS slot_time
      UNION ALL
      SELECT (slot_time + (p_slot_duration_minutes || ' minutes')::INTERVAL)::TIME
      FROM time_slots
      WHERE slot_time + (p_slot_duration_minutes || ' minutes')::INTERVAL < v_availability.end_time
    )
    SELECT
      ts.slot_time,
      (p_date + ts.slot_time)::TIMESTAMP WITH TIME ZONE AS slot_datetime,
      NOT EXISTS (
        SELECT 1
        FROM appointments a
        WHERE a.employee_id = p_employee_id
          AND a.status NOT IN ('cancelled')
          AND (p_date + ts.slot_time)::TIMESTAMP WITH TIME ZONE >= a.start_time
          AND (p_date + ts.slot_time)::TIMESTAMP WITH TIME ZONE < a.end_time
      ) AS is_available
    FROM time_slots ts;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_available_slots IS 'Obtiene todos los slots de tiempo disponibles para un empleado en una fecha específica';

-- ============================================
-- FUNCTION: Check if slot is available
-- ============================================
CREATE OR REPLACE FUNCTION is_slot_available(
  p_employee_id UUID,
  p_start_time TIMESTAMP WITH TIME ZONE,
  p_end_time TIMESTAMP WITH TIME ZONE,
  p_exclude_appointment_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM appointments
  WHERE employee_id = p_employee_id
    AND status NOT IN ('cancelled')
    AND (
      (start_time < p_end_time AND end_time > p_start_time)
    )
    AND (p_exclude_appointment_id IS NULL OR id != p_exclude_appointment_id);

  RETURN v_count = 0;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION is_slot_available IS 'Verifica si un slot de tiempo está disponible para un empleado';

-- ============================================
-- FUNCTION: Get appointments for date range
-- ============================================
CREATE OR REPLACE FUNCTION get_appointments_summary(
  p_business_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE (
  date DATE,
  total_appointments BIGINT,
  confirmed BIGINT,
  pending BIGINT,
  cancelled BIGINT,
  completed BIGINT,
  no_show BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    DATE(a.start_time) AS date,
    COUNT(*) AS total_appointments,
    COUNT(*) FILTER (WHERE a.status = 'confirmed') AS confirmed,
    COUNT(*) FILTER (WHERE a.status = 'pending') AS pending,
    COUNT(*) FILTER (WHERE a.status = 'cancelled') AS cancelled,
    COUNT(*) FILTER (WHERE a.status = 'completed') AS completed,
    COUNT(*) FILTER (WHERE a.status = 'no_show') AS no_show
  FROM appointments a
  WHERE a.business_id = p_business_id
    AND DATE(a.start_time) BETWEEN p_start_date AND p_end_date
  GROUP BY DATE(a.start_time)
  ORDER BY DATE(a.start_time);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_appointments_summary IS 'Obtiene un resumen de citas por fecha para un negocio';

-- ============================================
-- FUNCTION: Get employee statistics
-- ============================================
CREATE OR REPLACE FUNCTION get_employee_stats(
  p_employee_id UUID,
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL
)
RETURNS TABLE (
  total_appointments BIGINT,
  completed_appointments BIGINT,
  cancelled_appointments BIGINT,
  no_show_appointments BIGINT,
  completion_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) AS total_appointments,
    COUNT(*) FILTER (WHERE status = 'completed') AS completed_appointments,
    COUNT(*) FILTER (WHERE status = 'cancelled') AS cancelled_appointments,
    COUNT(*) FILTER (WHERE status = 'no_show') AS no_show_appointments,
    ROUND(
      (COUNT(*) FILTER (WHERE status = 'completed')::NUMERIC / NULLIF(COUNT(*), 0)) * 100,
      2
    ) AS completion_rate
  FROM appointments
  WHERE employee_id = p_employee_id
    AND (p_start_date IS NULL OR DATE(start_time) >= p_start_date)
    AND (p_end_date IS NULL OR DATE(start_time) <= p_end_date);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_employee_stats IS 'Obtiene estadísticas de un empleado';

-- ============================================
-- FUNCTION: Get upcoming appointments
-- ============================================
CREATE OR REPLACE FUNCTION get_upcoming_appointments(
  p_business_id UUID,
  p_hours_ahead INTEGER DEFAULT 24
)
RETURNS TABLE (
  appointment_id UUID,
  customer_name VARCHAR,
  customer_phone VARCHAR,
  employee_name VARCHAR,
  start_time TIMESTAMP WITH TIME ZONE,
  end_time TIMESTAMP WITH TIME ZONE,
  status VARCHAR,
  hours_until NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.id AS appointment_id,
    c.name AS customer_name,
    c.phone AS customer_phone,
    e.name AS employee_name,
    a.start_time,
    a.end_time,
    a.status,
    ROUND(EXTRACT(EPOCH FROM (a.start_time - NOW())) / 3600, 2) AS hours_until
  FROM appointments a
  JOIN customers c ON a.customer_id = c.id
  JOIN employees e ON a.employee_id = e.id
  WHERE a.business_id = p_business_id
    AND a.status IN ('pending', 'confirmed')
    AND a.start_time BETWEEN NOW() AND (NOW() + (p_hours_ahead || ' hours')::INTERVAL)
  ORDER BY a.start_time;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_upcoming_appointments IS 'Obtiene las citas próximas que necesitan recordatorios';

-- ============================================
-- FUNCTION: Clean old WhatsApp sessions
-- ============================================
CREATE OR REPLACE FUNCTION clean_old_sessions(
  p_hours_old INTEGER DEFAULT 24
)
RETURNS INTEGER AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  DELETE FROM whatsapp_sessions
  WHERE last_activity < NOW() - (p_hours_old || ' hours')::INTERVAL;

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION clean_old_sessions IS 'Elimina sesiones de WhatsApp antiguas';

-- ============================================
-- FUNCTION: Get customer history
-- ============================================
CREATE OR REPLACE FUNCTION get_customer_history(
  p_customer_id UUID,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  appointment_id UUID,
  business_name VARCHAR,
  employee_name VARCHAR,
  start_time TIMESTAMP WITH TIME ZONE,
  end_time TIMESTAMP WITH TIME ZONE,
  status VARCHAR,
  notes TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.id AS appointment_id,
    b.name AS business_name,
    e.name AS employee_name,
    a.start_time,
    a.end_time,
    a.status,
    a.notes
  FROM appointments a
  JOIN businesses b ON a.business_id = b.id
  JOIN employees e ON a.employee_id = e.id
  WHERE a.customer_id = p_customer_id
  ORDER BY a.start_time DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_customer_history IS 'Obtiene el historial de citas de un cliente';
