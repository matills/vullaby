-- Lina Database Schema
-- Sistema de Gestión de Turnos vía WhatsApp

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- TABLE: businesses
-- ============================================
CREATE TABLE IF NOT EXISTS businesses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(20) NOT NULL UNIQUE,
  email VARCHAR(255),
  industry VARCHAR(100),
  settings JSONB DEFAULT '{}',
  plan VARCHAR(50) DEFAULT 'basic',
  -- WhatsApp configuration
  whatsapp_phone_number_id VARCHAR(50),
  whatsapp_phone_number VARCHAR(20),
  whatsapp_enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE businesses IS 'Negocios que utilizan el sistema';
COMMENT ON COLUMN businesses.settings IS 'Configuraciones personalizadas del negocio en formato JSON';
COMMENT ON COLUMN businesses.plan IS 'Plan de suscripción: basic, pro, enterprise';
COMMENT ON COLUMN businesses.whatsapp_phone_number_id IS 'Meta WhatsApp Business API Phone Number ID';
COMMENT ON COLUMN businesses.whatsapp_phone_number IS 'WhatsApp phone number for display';
COMMENT ON COLUMN businesses.whatsapp_enabled IS 'Whether WhatsApp messaging is enabled';

-- Index for webhook routing
CREATE INDEX IF NOT EXISTS idx_businesses_whatsapp_phone
ON businesses(whatsapp_phone_number)
WHERE whatsapp_phone_number IS NOT NULL;

-- ============================================
-- TABLE: employees
-- ============================================
CREATE TABLE IF NOT EXISTS employees (
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

COMMENT ON TABLE employees IS 'Empleados o profesionales que atienden turnos';
COMMENT ON COLUMN employees.is_active IS 'Indica si el empleado está activo y puede recibir turnos';

CREATE INDEX idx_employees_business ON employees(business_id);
CREATE INDEX idx_employees_active ON employees(is_active) WHERE is_active = true;

-- ============================================
-- TABLE: customers
-- ============================================
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone VARCHAR(20) NOT NULL UNIQUE,
  name VARCHAR(255),
  email VARCHAR(255),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE customers IS 'Clientes que solicitan turnos';
COMMENT ON COLUMN customers.notes IS 'Notas internas sobre el cliente';

CREATE INDEX idx_customers_phone ON customers(phone);

-- ============================================
-- TABLE: appointments
-- ============================================
CREATE TABLE IF NOT EXISTS appointments (
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

  CONSTRAINT valid_time_range CHECK (end_time > start_time),
  CONSTRAINT valid_status CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed', 'no_show'))
);

COMMENT ON TABLE appointments IS 'Turnos o citas programadas';
COMMENT ON COLUMN appointments.status IS 'Estados: pending, confirmed, cancelled, completed, no_show';

CREATE INDEX idx_appointments_business ON appointments(business_id);
CREATE INDEX idx_appointments_employee ON appointments(employee_id);
CREATE INDEX idx_appointments_customer ON appointments(customer_id);
CREATE INDEX idx_appointments_start_time ON appointments(start_time);
CREATE INDEX idx_appointments_status ON appointments(status);

-- ============================================
-- TABLE: availability
-- ============================================
CREATE TABLE IF NOT EXISTS availability (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  slot_duration_minutes INTEGER DEFAULT 30,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT valid_time_range CHECK (end_time > start_time),
  CONSTRAINT valid_slot_duration CHECK (slot_duration_minutes > 0)
);

COMMENT ON TABLE availability IS 'Horarios disponibles por empleado';
COMMENT ON COLUMN availability.day_of_week IS '0=Domingo, 1=Lunes, 2=Martes, 3=Miércoles, 4=Jueves, 5=Viernes, 6=Sábado';
COMMENT ON COLUMN availability.slot_duration_minutes IS 'Duración de cada slot en minutos';

CREATE INDEX idx_availability_employee ON availability(employee_id);
CREATE INDEX idx_availability_day ON availability(day_of_week);

-- ============================================
-- TABLE: whatsapp_sessions
-- ============================================
CREATE TABLE IF NOT EXISTS whatsapp_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone VARCHAR(20) NOT NULL UNIQUE,
  state VARCHAR(50) NOT NULL DEFAULT 'initial',
  data JSONB DEFAULT '{}',
  last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT valid_state CHECK (state IN ('initial', 'selecting_employee', 'selecting_date', 'selecting_time', 'confirming', 'completed'))
);

COMMENT ON TABLE whatsapp_sessions IS 'Estado de conversaciones activas de WhatsApp';
COMMENT ON COLUMN whatsapp_sessions.state IS 'Estados: initial, selecting_employee, selecting_date, selecting_time, confirming, completed';
COMMENT ON COLUMN whatsapp_sessions.data IS 'Datos temporales de la sesión en formato JSON';

CREATE INDEX idx_whatsapp_sessions_phone ON whatsapp_sessions(phone);
CREATE INDEX idx_whatsapp_sessions_last_activity ON whatsapp_sessions(last_activity);

-- ============================================
-- FUNCTION: Update updated_at timestamp
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- TRIGGERS: Auto-update updated_at
-- ============================================
CREATE TRIGGER update_businesses_updated_at
  BEFORE UPDATE ON businesses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_employees_updated_at
  BEFORE UPDATE ON employees
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customers_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_appointments_updated_at
  BEFORE UPDATE ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_availability_updated_at
  BEFORE UPDATE ON availability
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_whatsapp_sessions_updated_at
  BEFORE UPDATE ON whatsapp_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
