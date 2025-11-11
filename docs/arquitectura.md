# Arquitectura del Sistema

## Visión General

Lina es un sistema de gestión de turnos que permite a los negocios gestionar citas a través de WhatsApp y un panel web administrativo.

## Arquitectura de Alto Nivel

```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│             │         │              │         │             │
│  WhatsApp   │────────▶│   Backend    │────────▶│  Supabase   │
│  (Cliente)  │         │  (Node.js)   │         │ (Database)  │
│             │         │              │         │             │
└─────────────┘         └──────────────┘         └─────────────┘
                               │
                               │
                               ▼
                        ┌──────────────┐
                        │              │
                        │   Frontend   │
                        │   (React)    │
                        │              │
                        └──────────────┘
```

## Esquema de Base de Datos

### Tabla: businesses

Almacena información de los negocios que usan el sistema.

```sql
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
```

### Tabla: employees

Empleados o profesionales que atienden los turnos.

```sql
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

CREATE INDEX idx_employees_business ON employees(business_id);
```

### Tabla: customers

Clientes que solicitan turnos.

```sql
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone VARCHAR(20) NOT NULL UNIQUE,
  name VARCHAR(255),
  email VARCHAR(255),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_customers_phone ON customers(phone);
```

### Tabla: appointments

Turnos o citas programadas.

```sql
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

CREATE INDEX idx_appointments_business ON appointments(business_id);
CREATE INDEX idx_appointments_employee ON appointments(employee_id);
CREATE INDEX idx_appointments_customer ON appointments(customer_id);
CREATE INDEX idx_appointments_start_time ON appointments(start_time);
CREATE INDEX idx_appointments_status ON appointments(status);
```

**Estados posibles:**
- `pending` - Pendiente de confirmación
- `confirmed` - Confirmado
- `cancelled` - Cancelado
- `completed` - Completado
- `no_show` - Cliente no se presentó

### Tabla: availability

Define los horarios disponibles por empleado.

```sql
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

CREATE INDEX idx_availability_employee ON availability(employee_id);
```

**day_of_week:**
- 0 = Domingo
- 1 = Lunes
- 2 = Martes
- 3 = Miércoles
- 4 = Jueves
- 5 = Viernes
- 6 = Sábado

### Tabla: whatsapp_sessions

Mantiene el estado de las conversaciones de WhatsApp.

```sql
CREATE TABLE whatsapp_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone VARCHAR(20) NOT NULL UNIQUE,
  state VARCHAR(50) NOT NULL DEFAULT 'initial',
  data JSONB DEFAULT '{}',
  last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_whatsapp_sessions_phone ON whatsapp_sessions(phone);
CREATE INDEX idx_whatsapp_sessions_last_activity ON whatsapp_sessions(last_activity);
```

**Estados posibles:**
- `initial` - Estado inicial
- `selecting_date` - Seleccionando fecha
- `selecting_time` - Seleccionando hora
- `selecting_employee` - Seleccionando empleado
- `confirming` - Confirmando turno
- `completed` - Turno creado exitosamente

## Flujo de Datos

### 1. Cliente solicita turno vía WhatsApp

```
Cliente → Twilio → Backend Webhook → Procesar Mensaje → Actualizar Sesión
                                           ↓
                              Consultar Disponibilidad (Supabase)
                                           ↓
                                Responder vía Twilio
```

### 2. Administrador gestiona desde Panel Web

```
Admin → Frontend → API Backend → Supabase → Retornar Datos → Frontend
```

### 3. Sistema de Recordatorios

```
Cron Job → Verificar Turnos Próximos → Enviar Mensaje WhatsApp
                  ↓
           (Bull Queue)
```

## Arquitectura del Backend

### Controllers
Manejan las peticiones HTTP y delegan la lógica a los servicios.

### Services
Contienen la lógica de negocio principal:
- `appointmentService.ts` - Gestión de turnos
- `whatsappService.ts` - Procesamiento de mensajes WhatsApp
- `availabilityService.ts` - Gestión de disponibilidad
- `reminderService.ts` - Sistema de recordatorios

### Models
Definen los tipos y validaciones de datos usando Zod.

### Routes
Definen los endpoints de la API:
- `/api/appointments` - CRUD de turnos
- `/api/customers` - CRUD de clientes
- `/api/employees` - CRUD de empleados
- `/api/webhooks/whatsapp` - Webhook de Twilio

## Arquitectura del Frontend

### Pages
Páginas principales de la aplicación:
- `Login.tsx` - Autenticación
- `Dashboard.tsx` - Panel principal con métricas
- `Appointments.tsx` - Gestión de turnos
- `Customers.tsx` - Gestión de clientes
- `Employees.tsx` - Gestión de empleados

### Store (Zustand)
Estado global de la aplicación:
- `authStore.ts` - Estado de autenticación
- `appointmentStore.ts` - Estado de turnos (futuro)

### Services
Comunicación con el backend:
- `supabase.ts` - Cliente de Supabase
- `api.ts` - Cliente HTTP para el backend (futuro)

## Seguridad

### Autenticación
- Supabase Auth para el panel web
- JWT tokens para comunicación Backend-Frontend

### Autorización
- Row Level Security (RLS) en Supabase
- Validación de business_id en todas las operaciones

### Validación
- Zod para validación de datos en backend
- Validación de inputs en frontend

## Escalabilidad

### Horizontal Scaling
- Backend puede escalar horizontalmente agregando más instancias
- Load balancer delante de múltiples instancias

### Database Optimization
- Índices en columnas frecuentemente consultadas
- Particionamiento de tabla appointments por fecha (futuro)

### Caching
- Redis para sesiones de WhatsApp activas
- Cache de disponibilidad frecuentemente consultada

## Monitoreo

### Logging
- Winston para logs estructurados
- Diferentes niveles: error, warn, info, debug

### Error Tracking
- Integración con Sentry (fase 6)

### Metrics
- Uptime monitoring
- Response time tracking
- Error rate monitoring

## Próximos Pasos

1. Implementar Row Level Security en Supabase
2. Crear funciones de base de datos para operaciones complejas
3. Implementar sistema de caché con Redis
4. Agregar índices adicionales basados en queries reales
5. Configurar backups automáticos de la base de datos
