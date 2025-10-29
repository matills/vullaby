CREATE TABLE businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(20) NOT NULL UNIQUE,
  email VARCHAR(255) NOT NULL UNIQUE,
  address TEXT,
  timezone VARCHAR(50) DEFAULT 'America/Argentina/Buenos_Aires',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  phone VARCHAR(20),
  role VARCHAR(20) CHECK (role IN ('admin', 'employee')) DEFAULT 'employee',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  duration_minutes INTEGER NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  email VARCHAR(255),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(business_id, phone)
);

CREATE TABLE appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  service_id UUID REFERENCES services(id) ON DELETE CASCADE,
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP NOT NULL,
  status VARCHAR(20) CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled', 'no_show')) DEFAULT 'pending',
  notes TEXT,
  reminder_sent BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE working_hours (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  day_of_week INTEGER CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_available BOOLEAN DEFAULT true,
  UNIQUE(employee_id, day_of_week)
);

CREATE INDEX idx_appointments_employee ON appointments(employee_id);
CREATE INDEX idx_appointments_customer ON appointments(customer_id);
CREATE INDEX idx_appointments_start_time ON appointments(start_time);
CREATE INDEX idx_appointments_status ON appointments(status);
CREATE INDEX idx_customers_phone ON customers(phone);
CREATE INDEX idx_employees_email ON employees(email);
CREATE INDEX idx_employees_business ON employees(business_id);

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_businesses_updated_at BEFORE UPDATE ON businesses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_employees_updated_at BEFORE UPDATE ON employees
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_services_updated_at BEFORE UPDATE ON services
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON appointments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Habilitar RLS
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE working_hours ENABLE ROW LEVEL SECURITY;

-- BUSINESSES: Solo pueden insertar/ver su propio negocio
CREATE POLICY "businesses_insert_policy"
ON businesses FOR INSERT
TO authenticated
WITH CHECK (email = auth.jwt() ->> 'email');

CREATE POLICY "businesses_select_policy"
ON businesses FOR SELECT
TO authenticated
USING (email = auth.jwt() ->> 'email');

CREATE POLICY "businesses_update_policy"
ON businesses FOR UPDATE
TO authenticated
USING (email = auth.jwt() ->> 'email');

-- EMPLOYEES: Usar auth.uid() para evitar recursión
CREATE POLICY "employees_insert_policy"
ON employees FOR INSERT
TO authenticated
WITH CHECK (email = auth.jwt() ->> 'email');

CREATE POLICY "employees_select_policy"
ON employees FOR SELECT
TO authenticated
USING (
  email = auth.jwt() ->> 'email'
  OR
  business_id = (
    SELECT business_id FROM employees 
    WHERE email = auth.jwt() ->> 'email'
    LIMIT 1
  )
);

CREATE POLICY "employees_update_policy"
ON employees FOR UPDATE
TO authenticated
USING (
  business_id = (
    SELECT business_id FROM employees 
    WHERE email = auth.jwt() ->> 'email'
    LIMIT 1
  )
);

CREATE POLICY "employees_delete_policy"
ON employees FOR DELETE
TO authenticated
USING (
  business_id = (
    SELECT business_id FROM employees 
    WHERE email = auth.jwt() ->> 'email'
    LIMIT 1
  )
  AND email != auth.jwt() ->> 'email'
);

-- SERVICES: Usar subquery simple sin recursión
CREATE POLICY "services_all_policy"
ON services FOR ALL
TO authenticated
USING (
  business_id = (
    SELECT business_id FROM employees 
    WHERE email = auth.jwt() ->> 'email'
    LIMIT 1
  )
)
WITH CHECK (
  business_id = (
    SELECT business_id FROM employees 
    WHERE email = auth.jwt() ->> 'email'
    LIMIT 1
  )
);

-- CUSTOMERS: Mismo patrón
CREATE POLICY "customers_all_policy"
ON customers FOR ALL
TO authenticated
USING (
  business_id = (
    SELECT business_id FROM employees 
    WHERE email = auth.jwt() ->> 'email'
    LIMIT 1
  )
)
WITH CHECK (
  business_id = (
    SELECT business_id FROM employees 
    WHERE email = auth.jwt() ->> 'email'
    LIMIT 1
  )
);

-- APPOINTMENTS: Mismo patrón
CREATE POLICY "appointments_all_policy"
ON appointments FOR ALL
TO authenticated
USING (
  business_id = (
    SELECT business_id FROM employees 
    WHERE email = auth.jwt() ->> 'email'
    LIMIT 1
  )
)
WITH CHECK (
  business_id = (
    SELECT business_id FROM employees 
    WHERE email = auth.jwt() ->> 'email'
    LIMIT 1
  )
);

-- WORKING_HOURS: Acceso a los del mismo negocio
CREATE POLICY "working_hours_all_policy"
ON working_hours FOR ALL
TO authenticated
USING (
  employee_id IN (
    SELECT id FROM employees 
    WHERE business_id = (
      SELECT business_id FROM employees 
      WHERE email = auth.jwt() ->> 'email'
      LIMIT 1
    )
  )
)
WITH CHECK (
  employee_id IN (
    SELECT id FROM employees 
    WHERE business_id = (
      SELECT business_id FROM employees 
      WHERE email = auth.jwt() ->> 'email'
      LIMIT 1
    )
  )
);