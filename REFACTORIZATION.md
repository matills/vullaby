# Refactorización de la Aplicación Lina (Vullaby)

## 📋 Resumen

Este documento describe las refactorizaciones realizadas para mejorar la calidad del código, reducir la duplicación y mejorar la mantenibilidad de la aplicación.

## 🎯 Objetivos

1. **Eliminar ~5,000 líneas de código duplicado** en controllers y services
2. **Mejorar la arquitectura** con patrones de diseño establecidos
3. **Facilitar el testing** con mejor separación de responsabilidades
4. **Preparar para multi-tenancy** removiendo dependencias hardcodeadas

## ✅ Refactorizaciones Completadas

### 1. Clases Base para Controllers (Backend)

**Archivo**: `backend/src/core/base.controller.ts`

**Beneficio**: Elimina ~2,500 líneas de código duplicado en 7 controllers

**Características**:
- Implementación genérica de CRUD operations (create, getById, update, delete, getAll, search)
- Validación automática con Zod schemas
- Manejo de errores estandarizado
- Logging consistente
- Type-safe con TypeScript generics

**Uso**:
```typescript
class CustomerController extends BaseController<Customer, CreateCustomerInput, UpdateCustomerInput> {
  protected entityName = 'Customer';
  protected service = customerService;
  protected createSchema = CreateCustomerSchema;
  protected updateSchema = UpdateCustomerSchema;

  // Solo implementar métodos custom específicos
  async getByPhone(req, res) { ... }
}
```

**Controllers que pueden refactorizarse**:
- ✅ `customer.controller.ts` (ejemplo creado en `.refactored.ts`)
- ⏳ `employee.controller.ts`
- ⏳ `business.controller.ts`
- ⏳ `appointment.controller.ts`
- ⏳ `availability.controller.ts`
- ⏳ `business-user.controller.ts`
- ⏳ `reminder.controller.ts`

### 2. Clases Base para Services (Backend)

**Archivo**: `backend/src/core/base.service.ts`

**Beneficio**: Elimina ~2,000 líneas de código duplicado en 6 services

**Características**:
- Interface `ICrudService<T>` para contratos consistentes
- Clase abstracta `BaseService<T>` con implementaciones genéricas
- Integración con Supabase
- Manejo de errores con custom exceptions
- Logging automático de operaciones

**Uso**:
```typescript
class CustomerService extends BaseService<Customer> {
  protected tableName = 'customers';
  protected entityName = 'Customer';

  constructor() {
    super(supabase);
  }

  // Override métodos para lógica custom
  async create(data) {
    const existing = await this.getCustomerByPhone(data.phone);
    if (existing) return existing;
    return await super.create(data);
  }

  // Añadir métodos específicos
  async getCustomerByPhone(phone) { ... }
}
```

**Services que pueden refactorizarse**:
- ✅ `customer.service.ts` (ejemplo creado en `.refactored.ts`)
- ⏳ `employee.service.ts`
- ⏳ `business.service.ts`
- ⏳ `appointment.service.ts`
- ⏳ `availability.service.ts`
- ⏳ `business-user.service.ts`

### 3. Sistema de Errores Personalizado (Backend)

**Archivo**: `backend/src/core/errors.ts`

**Beneficio**: Manejo de errores type-safe y consistente

**Clases de Error**:
- `AppError` - Error base con statusCode
- `NotFoundError` - 404 errors
- `ValidationError` - 400 errors con detalles
- `UnauthorizedError` - 401 errors
- `ForbiddenError` - 403 errors
- `ConflictError` - 409 errors
- `InternalServerError` - 500 errors

**Uso**:
```typescript
import { NotFoundError } from '../core/errors';

async getById(id: string) {
  const data = await this.supabase.from('table').select().eq('id', id).single();

  if (error.code === 'PGRST116') {
    throw new NotFoundError('Customer');
  }

  return data;
}
```

### 4. Hooks Genéricos CRUD (Frontend)

**Archivo**: `frontend/src/hooks/useCrud.ts`

**Beneficio**: Elimina duplicación en hooks de React Query

**Características**:
- Factory function `useCrudResource<T>()` que genera hooks completos
- Hooks generados: `useAll`, `useOne`, `useCreate`, `useUpdate`, `useDelete`, `useSearch`
- Configuración de cache automática
- Invalidación de queries inteligente
- Type-safe con TypeScript generics

**Uso**:
```typescript
// En el archivo de hooks específico
const { useOne, useCreate, useUpdate, useDelete } = useCrudResource<Customer>(
  'customers',
  customersApi
);

export const useCustomer = useOne;
export const useCreateCustomer = useCreate;
export const useUpdateCustomer = useUpdate;
export const useDeleteCustomer = useDelete;

// Hooks custom específicos se mantienen
export function useCustomers(businessId, searchQuery) {
  return useQuery({
    queryKey: ['customers', businessId, searchQuery],
    queryFn: () => customersApi.search(businessId, searchQuery),
    // ...
  });
}
```

**Hooks que pueden refactorizarse**:
- ✅ `useCustomers.ts` (ejemplo creado en `.refactored.ts`)
- ⏳ `useEmployees.ts`
- ⏳ Futuros hooks para appointments, availability, etc.

## 🚧 Refactorizaciones Pendientes

### 5. Dividir `whatsapp.service.ts` (474 líneas)

**Problema**: Archivo muy grande con múltiples responsabilidades

**Propuesta**:
```
backend/src/services/whatsapp/
├── WhatsAppService.ts           # Orchestrator principal
├── MessageHandler.ts            # State machine y routing
├── StateHandlers.ts             # Handlers para cada estado
│   ├── InitialStateHandler.ts
│   ├── NameInputHandler.ts
│   ├── EmployeeSelectionHandler.ts
│   ├── DateSelectionHandler.ts
│   ├── TimeSelectionHandler.ts
│   └── ConfirmationHandler.ts
├── MessageFormatter.ts          # Formateo de mensajes
└── types.ts                     # Types específicos
```

**Beneficio**:
- Cada archivo <100 líneas
- Responsabilidades claras
- Más fácil de testear
- Más fácil de extender

### 6. Implementar Multi-Tenancy

**Problema**: `DEFAULT_BUSINESS_ID` hardcodeado en múltiples lugares

**Archivos afectados**:
- `backend/src/services/whatsapp.service.ts:12`
- `frontend/src/pages/Appointments.tsx:9`

**Propuesta**:
1. Crear middleware de autenticación para extraer `business_id` del JWT
2. Usar AsyncLocalStorage o cls-hooked para request context
3. Actualizar todos los services para usar business_id del contexto
4. Implementar RLS policies en Supabase
5. Frontend: obtener business_id del usuario autenticado

**Código propuesto**:
```typescript
// backend/src/middlewares/auth.middleware.ts
export const authMiddleware = async (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  const { data: { user } } = await supabase.auth.getUser(token);

  req.businessId = user.user_metadata.business_id;
  req.userId = user.id;

  next();
};

// backend/src/core/request-context.ts
const { AsyncLocalStorage } = require('async_hooks');
export const requestContext = new AsyncLocalStorage();

// En services
const businessId = requestContext.getStore().businessId;
```

### 7. Dividir `availability.service.ts` (360 líneas)

**Propuesta**:
```
backend/src/services/availability/
├── AvailabilityService.ts       # CRUD operations
├── SlotCalculator.ts            # Lógica de cálculo de slots
├── ConflictDetector.ts          # Detección de conflictos
└── types.ts
```

### 8. Añadir Tests

**Estructura propuesta**:
```
backend/
├── src/
└── tests/
    ├── unit/
    │   ├── services/
    │   ├── controllers/
    │   └── utils/
    ├── integration/
    │   └── api/
    └── setup.ts

frontend/
├── src/
└── tests/
    ├── components/
    ├── hooks/
    └── setup.ts
```

**Librerías a instalar**:
- Backend: Jest, Supertest, @types/jest
- Frontend: Vitest, @testing-library/react, @testing-library/react-hooks

**Meta de cobertura**: 70%+ en services/hooks

### 9. Crear Package Compartido para Types

**Problema**: Types duplicados entre backend y frontend

**Propuesta**:
```
packages/
└── shared/
    ├── package.json
    ├── tsconfig.json
    └── src/
        ├── types/
        │   ├── customer.ts
        │   ├── employee.ts
        │   ├── appointment.ts
        │   └── index.ts
        └── index.ts
```

**Beneficios**:
- Single source of truth
- Backend genera types desde Zod schemas
- Frontend consume los mismos types
- Usar `zod-to-typescript` o `@anatine/zod-ts`

### 10. Implementar Repository Pattern

**Beneficio**: Abstraer capa de datos para facilitar testing y cambiar DB en futuro

**Propuesta**:
```typescript
// backend/src/repositories/base.repository.ts
interface IRepository<T> {
  findById(id: string): Promise<T | null>;
  findAll(filters?): Promise<T[]>;
  create(data: Partial<T>): Promise<T>;
  update(id: string, data: Partial<T>): Promise<T>;
  delete(id: string): Promise<boolean>;
}

class SupabaseRepository<T> implements IRepository<T> {
  constructor(private tableName: string) {}
  // Implementaciones genéricas
}

// Services usan repositories en lugar de Supabase directamente
class CustomerService {
  constructor(private repository: IRepository<Customer>) {}
}
```

## 📊 Métricas de Impacto

### Antes de Refactorización
- **Líneas de código**: ~7,300
- **Código duplicado**: ~5,000 líneas
- **Archivos >300 líneas**: 9 archivos
- **Cobertura de tests**: 0%

### Después de Refactorización (Estimado)
- **Líneas de código**: ~3,500 (52% reducción)
- **Código duplicado**: ~500 líneas (90% reducción)
- **Archivos >300 líneas**: 0 archivos
- **Cobertura de tests**: 70%+

### Tiempo Estimado
- ✅ **Completado** (Prioridad 1 parcial): 2 días
- ⏳ **Pendiente** (Prioridad 1 completa): 6-9 días
- ⏳ **Prioridad 2**: 15-20 días
- ⏳ **Prioridad 3**: 10-15 días
- **Total**: 8-10 semanas

## 🚀 Plan de Migración

### Fase 1: Probar Refactorizaciones (Actual)
1. ✅ Crear clases base
2. ✅ Refactorizar customer.controller y customer.service como ejemplos
3. ⏳ Probar en desarrollo
4. ⏳ Validar que todas las funcionalidades siguen funcionando

### Fase 2: Aplicar a Todos los Módulos
1. Refactorizar todos los controllers usando BaseController
2. Refactorizar todos los services usando BaseService
3. Actualizar todos los hooks del frontend
4. Dividir archivos grandes
5. Tests para cada módulo refactorizado

### Fase 3: Mejoras Arquitectónicas
1. Implementar multi-tenancy
2. Añadir middleware de autenticación
3. Implementar repository pattern
4. Crear package compartido de types

### Fase 4: DevOps & Producción
1. CI/CD pipeline
2. Docker containers
3. Monitoring y logging
4. Security hardening

## 📝 Checklist de Migración por Archivo

### Controllers
- ✅ customer.controller.ts (ejemplo .refactored.ts)
- [ ] employee.controller.ts
- [ ] business.controller.ts
- [ ] appointment.controller.ts
- [ ] availability.controller.ts
- [ ] business-user.controller.ts
- [ ] reminder.controller.ts

### Services
- ✅ customer.service.ts (ejemplo .refactored.ts)
- [ ] employee.service.ts
- [ ] business.service.ts
- [ ] appointment.service.ts
- [ ] availability.service.ts
- [ ] business-user.service.ts
- [ ] whatsapp.service.ts (requiere división primero)

### Frontend Hooks
- ✅ useCustomers.ts (ejemplo .refactored.ts)
- [ ] useEmployees.ts
- [ ] Futuros hooks

## 🔗 Referencias

- [TypeScript Generics](https://www.typescriptlang.org/docs/handbook/2/generics.html)
- [Repository Pattern](https://martinfowler.com/eaaCatalog/repository.html)
- [React Query Best Practices](https://tkdodo.eu/blog/practical-react-query)
- [Clean Architecture](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)

## ✍️ Notas

- Todos los archivos `.refactored.ts` son ejemplos y deben revisarse antes de reemplazar los originales
- Mantener archivos originales hasta que las refactorizaciones estén completamente probadas
- Considerar crear feature flags para migrar gradualmente en producción
- Documentar breaking changes si los hay

---

**Última actualización**: 2025-11-15
**Estado**: En progreso (Fase 1)
