-- =====================================================
-- Lina - Sistema de Gestión de Turnos vía WhatsApp
-- Schema de Base de Datos para Supabase
-- =====================================================

-- Habilitar extensión UUID (si no está habilitada)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- TABLAS PRINCIPALES
-- =====================================================

-- Tabla: businesses
-- Almacena información de los negocios que usan el sistema
CREATE TABLE businesses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(20) NOT NULL UNIQUE,
  email VARCHAR(255),
  industry VARCHAR(100),
  settings JSONB DEFAULT '{}',
  plan VARCHAR(50) DEFAULT 'basic',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla: employees
-- Empleados o profesionales que atienden los turnos
CREATE TABLE employees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  email VARCHAR(255),
  role VARCHAR(100),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla: customers
-- Clientes que solicitan turnos
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone VARCHAR(20) NOT NULL UNIQUE,
  name VARCHAR(255),
  email VARCHAR(255),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla: appointments
-- Turnos o citas programadas
CREATE TABLE appointments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT valid_time_range CHECK (end_time > start_time)
);

-- Comentarios sobre estados de appointments
COMMENT ON COLUMN appointments.status IS 'Estados posibles: pending, confirmed, cancelled, completed, no_show';

-- Tabla: availability
-- Define los horarios disponibles por empleado
CREATE TABLE availability (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT valid_time_range CHECK (end_time > start_time)
);

-- Comentarios sobre day_of_week
COMMENT ON COLUMN availability.day_of_week IS '0=Domingo, 1=Lunes, 2=Martes, 3=Miércoles, 4=Jueves, 5=Viernes, 6=Sábado';

-- Tabla: whatsapp_sessions
-- Mantiene el estado de las conversaciones de WhatsApp
CREATE TABLE whatsapp_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone VARCHAR(20) NOT NULL UNIQUE,
  state VARCHAR(50) NOT NULL DEFAULT 'initial',
  data JSONB DEFAULT '{}',
  last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Comentarios sobre estados de whatsapp_sessions
COMMENT ON COLUMN whatsapp_sessions.state IS 'Estados posibles: initial, selecting_date, selecting_time, selecting_employee, confirming, completed';

-- =====================================================
-- ÍNDICES
-- =====================================================

-- Índices para employees
CREATE INDEX idx_employees_business ON employees(business_id);
CREATE INDEX idx_employees_active ON employees(is_active);

-- Índices para customers
CREATE INDEX idx_customers_phone ON customers(phone);

-- Índices para appointments
CREATE INDEX idx_appointments_business ON appointments(business_id);
CREATE INDEX idx_appointments_employee ON appointments(employee_id);
CREATE INDEX idx_appointments_customer ON appointments(customer_id);
CREATE INDEX idx_appointments_start_time ON appointments(start_time);
CREATE INDEX idx_appointments_status ON appointments(status);
CREATE INDEX idx_appointments_business_date ON appointments(business_id, start_time);

-- Índices para availability
CREATE INDEX idx_availability_employee ON availability(employee_id);
CREATE INDEX idx_availability_day ON availability(day_of_week);

-- Índices para whatsapp_sessions
CREATE INDEX idx_whatsapp_sessions_phone ON whatsapp_sessions(phone);
CREATE INDEX idx_whatsapp_sessions_last_activity ON whatsapp_sessions(last_activity);

-- =====================================================
-- FUNCIONES Y TRIGGERS
-- =====================================================

-- Función para actualizar el campo updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para updated_at en todas las tablas
CREATE TRIGGER update_businesses_updated_at BEFORE UPDATE ON businesses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_employees_updated_at BEFORE UPDATE ON employees
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON appointments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_availability_updated_at BEFORE UPDATE ON availability
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_whatsapp_sessions_updated_at BEFORE UPDATE ON whatsapp_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================
-- Nota: Configurar según necesidades de autenticación
-- Descomentar y ajustar cuando se implemente Supabase Auth

-- Habilitar RLS en todas las tablas
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_sessions ENABLE ROW LEVEL SECURITY;

-- Política para permitir todas las operaciones desde el service role
-- (Para el backend que use el service_role_key)
CREATE POLICY "Service role has full access" ON businesses
    FOR ALL USING (true);

CREATE POLICY "Service role has full access" ON employees
    FOR ALL USING (true);

CREATE POLICY "Service role has full access" ON customers
    FOR ALL USING (true);

CREATE POLICY "Service role has full access" ON appointments
    FOR ALL USING (true);

CREATE POLICY "Service role has full access" ON availability
    FOR ALL USING (true);

CREATE POLICY "Service role has full access" ON whatsapp_sessions
    FOR ALL USING (true);

-- =====================================================
-- DATOS DE PRUEBA (OPCIONAL)
-- =====================================================
-- Descomentar si deseas datos de prueba

/*
-- Negocio de prueba
INSERT INTO businesses (name, phone, email, industry, plan)
VALUES ('Barbería El Corte', '+5491112345678', 'contacto@elcorte.com', 'barbershop', 'basic');

-- Empleados de prueba
INSERT INTO employees (business_id, name, phone, role, is_active)
SELECT
    id,
    'Juan Pérez',
    '+5491112345679',
    'Barbero',
    true
FROM businesses WHERE name = 'Barbería El Corte';

INSERT INTO employees (business_id, name, phone, role, is_active)
SELECT
    id,
    'María García',
    '+5491112345680',
    'Barbera',
    true
FROM businesses WHERE name = 'Barbería El Corte';

-- Disponibilidad de prueba (Lunes a Viernes, 9:00 - 18:00)
INSERT INTO availability (employee_id, day_of_week, start_time, end_time)
SELECT
    e.id,
    d.day,
    '09:00:00'::TIME,
    '18:00:00'::TIME
FROM employees e
CROSS JOIN (
    SELECT 1 AS day UNION
    SELECT 2 UNION
    SELECT 3 UNION
    SELECT 4 UNION
    SELECT 5
) d
WHERE e.name IN ('Juan Pérez', 'María García');

-- Cliente de prueba
INSERT INTO customers (phone, name, email)
VALUES ('+5491198765432', 'Carlos Rodriguez', 'carlos@example.com');
*/

-- =====================================================
-- FIN DEL SCHEMA
-- =====================================================

-- Verificar que todo se creó correctamente
SELECT
    table_name,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public'
    AND table_type = 'BASE TABLE'
    AND table_name IN ('businesses', 'employees', 'customers', 'appointments', 'availability', 'whatsapp_sessions')
ORDER BY table_name;