-- Lina Row Level Security (RLS) Policies
-- Políticas de seguridad a nivel de fila

CREATE TABLE IF NOT EXISTS business_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  auth_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role VARCHAR(50) DEFAULT 'owner',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(business_id, auth_id)
);

CREATE INDEX idx_business_users_auth ON business_users(auth_id);
CREATE INDEX idx_business_users_business ON business_users(business_id);

-- ============================================
-- Enable RLS on all tables
-- ============================================
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_sessions ENABLE ROW LEVEL SECURITY;

-- ============================================
-- BUSINESSES Policies
-- ============================================

-- Business owners can view their own business
CREATE POLICY "Users can view their own business"
  ON businesses FOR SELECT
  USING (auth.uid() IN (
    SELECT auth_id FROM business_users WHERE business_id = businesses.id
  ));

-- Business owners can update their own business
CREATE POLICY "Users can update their own business"
  ON businesses FOR UPDATE
  USING (auth.uid() IN (
    SELECT auth_id FROM business_users WHERE business_id = businesses.id
  ));

-- Allow service role to insert businesses (for backend)
CREATE POLICY "Service role can insert businesses"
  ON businesses FOR INSERT
  WITH CHECK (auth.jwt()->>'role' = 'service_role');

-- Allow service role to do anything (for backend)
CREATE POLICY "Service role has full access to businesses"
  ON businesses FOR ALL
  USING (auth.jwt()->>'role' = 'service_role')
  WITH CHECK (auth.jwt()->>'role' = 'service_role');

-- ============================================
-- EMPLOYEES Policies
-- ============================================

-- Business owners can view their employees
CREATE POLICY "Users can view employees of their business"
  ON employees FOR SELECT
  USING (business_id IN (
    SELECT business_id FROM business_users WHERE auth_id = auth.uid()
  ));

-- Business owners can insert employees
CREATE POLICY "Users can insert employees to their business"
  ON employees FOR INSERT
  WITH CHECK (business_id IN (
    SELECT business_id FROM business_users WHERE auth_id = auth.uid()
  ));

-- Business owners can update their employees
CREATE POLICY "Users can update employees of their business"
  ON employees FOR UPDATE
  USING (business_id IN (
    SELECT business_id FROM business_users WHERE auth_id = auth.uid()
  ));

-- Business owners can delete their employees
CREATE POLICY "Users can delete employees of their business"
  ON employees FOR DELETE
  USING (business_id IN (
    SELECT business_id FROM business_users WHERE auth_id = auth.uid()
  ));

-- Service role has full access
CREATE POLICY "Service role has full access to employees"
  ON employees
  USING (auth.jwt()->>'role' = 'service_role');

-- ============================================
-- CUSTOMERS Policies
-- ============================================

-- Allow anyone to view customers (needed for WhatsApp integration)
-- In production, you might want to restrict this
CREATE POLICY "Service role can view all customers"
  ON customers FOR SELECT
  USING (auth.jwt()->>'role' = 'service_role');

-- Allow creating customers from WhatsApp
CREATE POLICY "Service role can insert customers"
  ON customers FOR INSERT
  WITH CHECK (auth.jwt()->>'role' = 'service_role');

-- Allow updating customers
CREATE POLICY "Service role can update customers"
  ON customers FOR UPDATE
  USING (auth.jwt()->>'role' = 'service_role');

-- Business owners can view customers who have appointments with them
CREATE POLICY "Business owners can view their customers"
  ON customers FOR SELECT
  USING (id IN (
    SELECT DISTINCT customer_id
    FROM appointments
    WHERE business_id IN (
      SELECT business_id FROM business_users WHERE auth_id = auth.uid()
    )
  ));

-- ============================================
-- APPOINTMENTS Policies
-- ============================================

-- Business owners can view their appointments
CREATE POLICY "Users can view appointments of their business"
  ON appointments FOR SELECT
  USING (business_id IN (
    SELECT business_id FROM business_users WHERE auth_id = auth.uid()
  ));

-- Business owners can create appointments
CREATE POLICY "Users can create appointments for their business"
  ON appointments FOR INSERT
  WITH CHECK (business_id IN (
    SELECT business_id FROM business_users WHERE auth_id = auth.uid()
  ));

-- Business owners can update their appointments
CREATE POLICY "Users can update appointments of their business"
  ON appointments FOR UPDATE
  USING (business_id IN (
    SELECT business_id FROM business_users WHERE auth_id = auth.uid()
  ));

-- Business owners can delete their appointments
CREATE POLICY "Users can delete appointments of their business"
  ON appointments FOR DELETE
  USING (business_id IN (
    SELECT business_id FROM business_users WHERE auth_id = auth.uid()
  ));

-- Service role has full access (for WhatsApp integration)
CREATE POLICY "Service role has full access to appointments"
  ON appointments
  USING (auth.jwt()->>'role' = 'service_role');

-- ============================================
-- AVAILABILITY Policies
-- ============================================

-- Business owners can view availability of their employees
CREATE POLICY "Users can view availability of their employees"
  ON availability FOR SELECT
  USING (employee_id IN (
    SELECT id FROM employees
    WHERE business_id IN (
      SELECT business_id FROM business_users WHERE auth_id = auth.uid()
    )
  ));

-- Business owners can manage availability
CREATE POLICY "Users can insert availability for their employees"
  ON availability FOR INSERT
  WITH CHECK (employee_id IN (
    SELECT id FROM employees
    WHERE business_id IN (
      SELECT business_id FROM business_users WHERE auth_id = auth.uid()
    )
  ));

CREATE POLICY "Users can update availability of their employees"
  ON availability FOR UPDATE
  USING (employee_id IN (
    SELECT id FROM employees
    WHERE business_id IN (
      SELECT business_id FROM business_users WHERE auth_id = auth.uid()
    )
  ));

CREATE POLICY "Users can delete availability of their employees"
  ON availability FOR DELETE
  USING (employee_id IN (
    SELECT id FROM employees
    WHERE business_id IN (
      SELECT business_id FROM business_users WHERE auth_id = auth.uid()
    )
  ));

-- Service role has full access
CREATE POLICY "Service role has full access to availability"
  ON availability
  USING (auth.jwt()->>'role' = 'service_role');

-- ============================================
-- WHATSAPP_SESSIONS Policies
-- ============================================

-- Only service role can access WhatsApp sessions
CREATE POLICY "Service role has full access to whatsapp_sessions"
  ON whatsapp_sessions
  USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Service role can insert whatsapp_sessions"
  ON whatsapp_sessions FOR INSERT
  WITH CHECK (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Service role can update whatsapp_sessions"
  ON whatsapp_sessions FOR UPDATE
  USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Service role can delete whatsapp_sessions"
  ON whatsapp_sessions FOR DELETE
  USING (auth.jwt()->>'role' = 'service_role');

-- ============================================
-- Helper table for business users (auth)
-- ============================================
-- This table links Supabase auth users to businesses

COMMENT ON TABLE business_users IS 'Relaciona usuarios autenticados con negocios';
COMMENT ON COLUMN business_users.role IS 'Rol del usuario en el negocio: owner, admin, staff';

-- Enable RLS on business_users
ALTER TABLE business_users ENABLE ROW LEVEL SECURITY;

-- Users can view their own business relationships
CREATE POLICY "Users can view their own business relationships"
  ON business_users FOR SELECT
  USING (auth_id = auth.uid());

-- Service role has full access
CREATE POLICY "Service role has full access to business_users"
  ON business_users
  USING (auth.jwt()->>'role' = 'service_role');
