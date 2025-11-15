# 🚀 Próximos Pasos - Proyecto Lina (Vullaby)

## 📌 Estado Actual del Proyecto

Tu aplicación es un **sistema de agendamiento con WhatsApp bot** que está en fase MVP/Early Stage:

✅ **Completado**:
- Backend API con Express + TypeScript + Supabase
- WhatsApp bot conversacional funcional
- Sistema de citas (CRUD completo)
- Sistema de recordatorios con Bull Queue
- Frontend React con interfaz de appointments
- Autenticación básica con Supabase Auth

⚠️ **Parcialmente Completado**:
- UI de administración (solo appointments completo)
- Multi-tenancy (business_id hardcodeado)

❌ **Pendiente**:
- Tests
- UI para employees management
- UI para customers management
- Settings page completa
- Email notifications
- Reportes y analytics

## 🎯 Recomendaciones Prioritarias

### 🔴 CRÍTICO - Completar Antes de Producción (2-3 semanas)

#### 1. Aplicar las Refactorizaciones Base ⚡ **MÁXIMA PRIORIDAD**

**Por qué**: Tienes ~5,000 líneas de código duplicado que hacen el proyecto difícil de mantener

**Qué hacer**:
```bash
# Ya están creadas las clases base, ahora aplicarlas:

# 1. Reemplazar controllers uno por uno
mv backend/src/controllers/customer.controller.ts backend/src/controllers/customer.controller.old.ts
mv backend/src/controllers/customer.controller.refactored.ts backend/src/controllers/customer.controller.ts

# 2. Hacer lo mismo con services
mv backend/src/services/customer.service.ts backend/src/services/customer.service.old.ts
mv backend/src/services/customer.service.refactored.ts backend/src/services/customer.service.ts

# 3. Probar que todo funcione
npm run dev  # en backend
# Probar endpoints de customers

# 4. Repetir para employee, business, appointment, etc.
```

**Orden recomendado de refactorización**:
1. `customer.controller.ts` y `customer.service.ts` (más simple)
2. `employee.controller.ts` y `employee.service.ts`
3. `business.controller.ts` y `business.service.ts`
4. `appointment.controller.ts` y `appointment.service.ts`
5. `availability.controller.ts` y `availability.service.ts`
6. `business-user.controller.ts` y `business-user.service.ts`

**Tiempo estimado**: 3-5 días
**Beneficio**: Eliminar 90% del código duplicado

#### 2. Implementar Tests Básicos 🧪

**Por qué**: 0% de cobertura es un riesgo enorme para producción

**Qué hacer**:

```bash
# Backend
cd backend
npm install -D jest @types/jest ts-jest supertest @types/supertest

# Crear configuración
npx ts-jest config:init
```

```javascript
// backend/jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],
  collectCoverageFrom: ['src/**/*.ts'],
};
```

```bash
# Frontend
cd frontend
npm install -D vitest @testing-library/react @testing-library/react-hooks
```

**Tests prioritarios a escribir** (en orden):
1. **Services CRUD básicos** (20 tests) - 1 día
   - `customer.service.test.ts`
   - `employee.service.test.ts`
   - `appointment.service.test.ts`

2. **Controllers endpoints** (20 tests) - 1 día
   - `customer.controller.test.ts`
   - `employee.controller.test.ts`

3. **WhatsApp flow crítico** (10 tests) - 1 día
   - Flujo completo de booking
   - Estados del bot
   - Validaciones

4. **Frontend hooks** (15 tests) - 1 día
   - `useCustomers.test.ts`
   - `useAppointments.test.ts`

**Tiempo estimado**: 4-5 días
**Meta**: 60%+ cobertura en servicios críticos

#### 3. Implementar Multi-Tenancy Real 🏢

**Por qué**: El `DEFAULT_BUSINESS_ID` hardcodeado impide escalar a múltiples negocios

**Qué hacer**:

```typescript
// 1. Crear middleware de autenticación
// backend/src/middlewares/auth.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { supabase } from '../config/supabase';

export interface AuthRequest extends Request {
  userId?: string;
  businessId?: string;
  userRole?: string;
}

export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'No authorization token provided',
      });
    }

    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid token',
      });
    }

    // Buscar el business_id del usuario
    const { data: businessUser } = await supabase
      .from('business_users')
      .select('business_id, role')
      .eq('user_id', user.id)
      .single();

    if (!businessUser) {
      return res.status(403).json({
        success: false,
        error: 'User not associated with any business',
      });
    }

    req.userId = user.id;
    req.businessId = businessUser.business_id;
    req.userRole = businessUser.role;

    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Authentication failed',
    });
  }
};

// 2. Aplicar middleware a todas las rutas
// backend/src/routes/*.routes.ts
import { requireAuth } from '../middlewares/auth.middleware';

router.use(requireAuth); // Aplicar a todas las rutas

// 3. Usar businessId en services
// Actualizar todos los services para recibir businessId como parámetro
async getEmployeesByBusiness(businessId: string) {
  const { data, error } = await this.supabase
    .from('employees')
    .select('*')
    .eq('business_id', businessId);
  return data;
}
```

**Archivos a actualizar**:
- `backend/src/services/whatsapp.service.ts` (eliminar DEFAULT_BUSINESS_ID)
- `frontend/src/pages/Appointments.tsx` (obtener de auth context)
- Todos los services que filtren por business_id

**Tiempo estimado**: 3-4 días
**Beneficio**: App lista para múltiples negocios

#### 4. Dividir `whatsapp.service.ts` 📦

**Por qué**: 474 líneas en un solo archivo es difícil de mantener

**Qué hacer**:

```bash
mkdir -p backend/src/services/whatsapp
```

```typescript
// backend/src/services/whatsapp/types.ts
export type ConversationState =
  | 'initial'
  | 'asking_name'
  | 'selecting_employee'
  | 'selecting_date'
  | 'selecting_time'
  | 'confirming';

export interface WhatsAppSession {
  phone: string;
  state: ConversationState;
  data: {
    customer_name?: string;
    business_id?: string;
    employee_id?: string;
    employee_name?: string;
    // ...
  };
}

// backend/src/services/whatsapp/MessageFormatter.ts
export class MessageFormatter {
  static formatWelcome(name?: string) {
    return name
      ? `¡Hola ${name}! 👋 ¿En qué puedo ayudarte?`
      : '¡Hola! 👋 Bienvenido...';
  }

  static formatEmployeeList(employees: Employee[]) {
    return employees
      .map((emp, i) => `${i + 1}. ${emp.name}${emp.role ? ` - ${emp.role}` : ''}`)
      .join('\n');
  }

  // ... más formatters
}

// backend/src/services/whatsapp/StateHandlers.ts
export class StateHandlers {
  constructor(
    private sessionService: SessionService,
    private customerService: CustomerService,
    private employeeService: EmployeeService,
    private messageSender: (phone: string, msg: string) => Promise<void>
  ) {}

  async handleInitialState(phone: string, body: string) {
    // ... lógica específica
  }

  async handleNameInput(phone: string, body: string) {
    // ... lógica específica
  }

  // ... más handlers
}

// backend/src/services/whatsapp/WhatsAppService.ts
import { StateHandlers } from './StateHandlers';
import { MessageFormatter } from './MessageFormatter';

export class WhatsAppService {
  private stateHandlers: StateHandlers;

  constructor() {
    this.stateHandlers = new StateHandlers(
      sessionService,
      customerService,
      employeeService,
      this.sendMessage.bind(this)
    );
  }

  async handleIncomingMessage(message: IncomingWhatsAppMessage) {
    const { phone, body } = message;
    const session = sessionService.getOrCreateSession(phone);

    switch (session.state) {
      case 'initial':
        return this.stateHandlers.handleInitialState(phone, body);
      case 'asking_name':
        return this.stateHandlers.handleNameInput(phone, body);
      // ...
    }
  }
}
```

**Tiempo estimado**: 2-3 días
**Beneficio**: Código más organizado y testeable

### 🟡 IMPORTANTE - Completar UI (1-2 semanas)

#### 5. Completar UI de Employee Management 👥

**Por qué**: Es crítico para que los negocios puedan administrar su personal

**Qué hacer**:
```bash
# Ya existe el backend completo, solo falta el frontend
# Crear página: frontend/src/pages/Employees.tsx
```

**Funcionalidades a implementar**:
- ✅ Listar empleados (usar hook `useEmployees`)
- ✅ Crear nuevo empleado (formulario con React Hook Form)
- ✅ Editar empleado
- ✅ Activar/Desactivar empleado
- ✅ Ver estadísticas de empleado
- ✅ Gestionar disponibilidad (integrar con availability)

**Componentes a crear**:
1. `EmployeeList.tsx` - Lista de empleados
2. `EmployeeCard.tsx` - Card individual
3. `EmployeeForm.tsx` - Formulario create/edit
4. `EmployeeStats.tsx` - Estadísticas
5. `EmployeeAvailability.tsx` - Gestión de horarios

**Tiempo estimado**: 2-3 días

#### 6. Completar UI de Customer Management 👤

**Funcionalidades a implementar**:
- Lista de clientes
- Búsqueda de clientes
- Ver historial de citas
- Editar información de cliente
- Ver estadísticas de cliente

**Componentes a crear**:
1. `CustomerList.tsx`
2. `CustomerCard.tsx`
3. `CustomerHistory.tsx`
4. `CustomerSearch.tsx`

**Tiempo estimado**: 2-3 días

#### 7. Completar Settings Page ⚙️

**Funcionalidades a implementar**:
- Información del negocio (editable)
- Configuración de WhatsApp (números, mensajes)
- Configuración de recordatorios (timing, templates)
- Gestión de usuarios del negocio
- Horarios de atención general

**Tiempo estimado**: 2-3 días

### 🟢 BUENO TENER - Features Adicionales (2-3 semanas)

#### 8. Implementar Email Notifications 📧

**Por qué**: Redundancia con WhatsApp, mejor UX

**Opciones**:
- **SendGrid** (más común, free tier generoso)
- **Resend** (moderno, developer-friendly)
- **AWS SES** (si ya usas AWS)

```bash
npm install @sendgrid/mail
# o
npm install resend
```

```typescript
// backend/src/services/email.service.ts
import sgMail from '@sendgrid/mail';

sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

export const emailService = {
  async sendAppointmentConfirmation(
    email: string,
    appointment: Appointment
  ) {
    const msg = {
      to: email,
      from: 'noreply@tu-negocio.com',
      subject: 'Confirmación de Cita',
      html: `
        <h1>Tu cita ha sido confirmada</h1>
        <p>Fecha: ${appointment.start_time}</p>
        <p>Empleado: ${appointment.employee_name}</p>
      `,
    };

    await sgMail.send(msg);
  },

  async sendAppointmentReminder(
    email: string,
    appointment: Appointment
  ) {
    // Similar...
  },
};
```

**Tiempo estimado**: 2 días

#### 9. Implementar Analytics/Reportes 📊

**Qué reportes incluir**:
- Citas por día/semana/mes (gráfico de líneas)
- Citas por empleado (gráfico de barras)
- Tasa de cancelación
- Clientes nuevos vs recurrentes
- Horarios más solicitados
- Ingresos (si añades pricing)

**Librerías**:
- Ya tienes Recharts instalado ✅
- Usar TanStack Query para data fetching

```typescript
// backend/src/controllers/analytics.controller.ts
export const analyticsController = {
  async getAppointmentsByPeriod(req, res) {
    const { business_id, start_date, end_date, period } = req.query;

    const stats = await appointmentService.getAppointmentStats(
      business_id,
      start_date,
      end_date,
      period // 'day', 'week', 'month'
    );

    res.json({ success: true, data: stats });
  },

  async getEmployeePerformance(req, res) {
    // Estadísticas por empleado
  },
};
```

**Tiempo estimado**: 3-4 días

#### 10. Implementar Calendar View 📅

**Por qué**: Mejor UX para ver disponibilidad y citas

**Librería recomendada**: `react-big-calendar` o `fullcalendar`

```bash
npm install react-big-calendar date-fns
npm install -D @types/react-big-calendar
```

```typescript
// frontend/src/components/AppointmentCalendar.tsx
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';

const locales = { 'es': require('date-fns/locale/es') };

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

export function AppointmentCalendar({ appointments }) {
  const events = appointments.map(apt => ({
    title: `${apt.customer_name} - ${apt.employee_name}`,
    start: new Date(apt.start_time),
    end: new Date(apt.end_time),
    resource: apt,
  }));

  return (
    <Calendar
      localizer={localizer}
      events={events}
      startAccessor="start"
      endAccessor="end"
      style={{ height: 600 }}
      onSelectEvent={(event) => {
        // Abrir modal con detalles
      }}
    />
  );
}
```

**Tiempo estimado**: 2-3 días

### 🔵 FUTURO - Mejoras a Largo Plazo (1-2 meses)

#### 11. Multi-canal (SMS, Email, WhatsApp) 📱

- Permitir a clientes elegir su canal preferido
- Enviar confirmaciones y recordatorios por múltiples canales
- Integrar con Twilio SMS además de WhatsApp

#### 12. Pagos Online 💳

- Integrar Stripe o Mercado Pago
- Pagos al agendar (opcional)
- Pagos de depósitos para confirmar
- Reportes de ingresos

#### 13. Sistema de Reviews ⭐

- Clientes pueden dejar reviews después de la cita
- Ratings por empleado
- Mostrar reviews públicas en landing page

#### 14. App Móvil 📱

- React Native para iOS y Android
- Usar la misma API
- Notificaciones push

#### 15. Integraciones 🔌

- Google Calendar sync
- Outlook Calendar sync
- Zoom/Google Meet para citas virtuales
- Zapier para automatizaciones

## 📋 Plan de Acción Recomendado (4 semanas)

### Semana 1: Refactorización Core
- [ ] Día 1-2: Aplicar BaseController y BaseService a todos los módulos
- [ ] Día 3: Aplicar hooks genéricos en frontend
- [ ] Día 4-5: Dividir whatsapp.service.ts y availability.service.ts

### Semana 2: Testing & Multi-tenancy
- [ ] Día 1-2: Setup de testing + tests de services
- [ ] Día 3: Tests de controllers
- [ ] Día 4-5: Implementar multi-tenancy con auth middleware

### Semana 3: Completar UI Admin
- [ ] Día 1-2: Employee Management UI
- [ ] Día 3: Customer Management UI
- [ ] Día 4-5: Settings Page

### Semana 4: Polish & Features
- [ ] Día 1-2: Email notifications
- [ ] Día 3: Analytics básicos
- [ ] Día 4: Calendar view
- [ ] Día 5: Testing end-to-end, fix bugs

## 🎯 Priorización Personalizada

**Si tu objetivo es**:

### "Lanzar a producción rápido" 🚀
**Prioridad**:
1. Multi-tenancy (critical para seguridad)
2. Tests básicos (critical para estabilidad)
3. Aplicar refactorizaciones (importante para mantenimiento)
4. Email notifications (redundancia)
5. Completar UIs faltantes

### "Conseguir primeros clientes" 💼
**Prioridad**:
1. Completar Employee Management UI
2. Completar Customer Management UI
3. Settings Page
4. Email notifications
5. Analytics básicos
6. Mejorar landing page con features/pricing

### "Hacer el código production-ready" 🏗️
**Prioridad**:
1. Aplicar todas las refactorizaciones
2. Tests comprehensivos (70%+ coverage)
3. Multi-tenancy
4. CI/CD pipeline
5. Docker + docker-compose
6. Monitoring (Sentry, LogRocket)
7. Security audit

### "Escalar el producto" 📈
**Prioridad**:
1. Multi-tenancy + RLS policies
2. Caching con Redis
3. Database indexing optimization
4. Rate limiting
5. CDN para assets
6. Load balancing
7. Horizontal scaling

## 🛠️ DevOps & Deployment

### Setup de CI/CD

```yaml
# .github/workflows/ci.yml
name: CI/CD

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  backend-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: cd backend && npm install
      - run: cd backend && npm test
      - run: cd backend && npm run build

  frontend-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: cd frontend && npm install
      - run: cd frontend && npm test
      - run: cd frontend && npm run build

  deploy:
    needs: [backend-test, frontend-test]
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to production
        run: echo "Deploy steps here"
```

### Opciones de Hosting

**Backend**:
- **Railway** (recomendado, fácil, free tier)
- **Render** (similar a Railway)
- **Fly.io** (más control)
- **AWS Elastic Beanstalk** (enterprise)
- **Vercel** (solo para Next.js/serverless)

**Frontend**:
- **Vercel** (recomendado para React)
- **Netlify** (alternativa a Vercel)
- **Cloudflare Pages** (más rápido)

**Database**:
- Ya usas Supabase ✅ (perfect!)

**Queue (Bull)**:
- Necesitas Redis host:
  - **Redis Cloud** (free tier)
  - **Upstash** (serverless Redis)

## 📚 Recursos de Aprendizaje

- [React Query Best Practices](https://tkdodo.eu/blog/practical-react-query)
- [TypeScript Deep Dive](https://basarat.gitbook.io/typescript/)
- [Clean Architecture](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
- [Supabase Docs](https://supabase.com/docs)

## ❓ Preguntas para Decidir Prioridades

1. **¿Cuál es tu timeline para lanzar?**
   - <1 mes: Enfócate en multi-tenancy + UIs + tests básicos
   - 1-3 meses: Haz refactorización completa + tests + features
   - >3 meses: Haz todo + móvil + integraciones

2. **¿Ya tienes clientes esperando?**
   - Sí: Prioriza UIs de administración + email notifications
   - No: Prioriza calidad de código + tests

3. **¿Vas a tener múltiples negocios?**
   - Sí: Multi-tenancy es CRÍTICO
   - No (un solo negocio): Puede esperar

4. **¿Tienes equipo o estás solo?**
   - Solo: Enfócate en features, menos en arquitectura
   - Con equipo: Refactorización + tests son críticos

---

**¿Necesitas ayuda con alguno de estos pasos?**

Puedo ayudarte a:
- Implementar cualquiera de estas features
- Escribir los tests
- Configurar CI/CD
- Desplegar la aplicación
- Crear la documentación de API

**¡Dime qué quieres hacer primero y empezamos!** 🚀
