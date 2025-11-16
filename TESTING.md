# Testing Guide - Vullaby

Guía completa de testing para el proyecto Vullaby.

## 📋 Tabla de Contenidos

- [Backend Tests](#backend-tests)
- [Frontend E2E Tests](#frontend-e2e-tests)
- [Integration Tests](#integration-tests)
- [Coverage](#coverage)
- [CI/CD](#cicd)

## 🔧 Backend Tests

### Configuración

El backend usa **Jest** con TypeScript para unit tests e integration tests.

```bash
cd backend
npm test                # Ejecutar todos los tests
npm run test:watch      # Modo watch
npm run test:coverage   # Con cobertura
npm run test:ci         # Para CI (con cobertura)
```

### Estructura de Tests

```
backend/src/__tests__/
├── core/
│   ├── base.service.spec.ts       # Tests de BaseService
│   └── base.controller.spec.ts    # Tests de BaseController
├── integration/
│   └── whatsapp-flow.spec.ts      # Tests de integración WhatsApp
├── utils/
│   └── date-parser.spec.ts        # Tests de utilidades
└── setup.ts                        # Configuración global
```

### Tests Implementados

#### BaseService Tests
- ✅ Create entity
- ✅ Get entity by ID
- ✅ Update entity
- ✅ Delete entity
- ✅ Get all entities
- ✅ Multi-tenancy filtering
- ✅ Error handling

#### BaseController Tests
- ✅ Create with validation
- ✅ Get by ID
- ✅ Update with validation
- ✅ Delete
- ✅ Get all
- ✅ Search
- ✅ Error responses (400, 404, 500)

#### WhatsApp Flow Integration Tests
- ✅ New customer registration
- ✅ Menu selection (1-4)
- ✅ Booking flow with single employee
- ✅ Date parsing (various formats)
- ✅ Cancellation flow
- ✅ Global commands (inicio, ayuda)
- ✅ Error handling

#### Date Parser Tests
- ✅ Parse "hoy", "mañana"
- ✅ Parse weekdays
- ✅ Parse DD/MM/YYYY
- ✅ Parse DD/MM/YY
- ✅ Parse "primero de diciembre"
- ✅ Validate appointment dates

### Mocks

Los siguientes servicios están mockeados en los tests:

- `supabase` - Database client
- `twilio` - WhatsApp messaging
- `logger` - Winston logger
- All service dependencies

### Agregar Nuevos Tests

1. **Unit Tests**: Crear archivo `*.spec.ts` en `__tests__/`
2. **Integration Tests**: Crear en `__tests__/integration/`
3. **Usar setup**: Los mocks globales están en `setup.ts`

Ejemplo:

```typescript
import { MyService } from '../../services/my.service';

describe('MyService', () => {
  let service: MyService;

  beforeEach(() => {
    service = new MyService();
    jest.clearAllMocks();
  });

  it('should do something', async () => {
    // Test implementation
    expect(true).toBe(true);
  });
});
```

## 🎭 Frontend E2E Tests

### Configuración

El frontend usa **Playwright** para E2E tests.

```bash
cd frontend
npm run test:e2e           # Ejecutar tests headless
npm run test:e2e:headed    # Con browser visible
npm run test:e2e:ui        # UI mode interactivo
npm run test:e2e:debug     # Debug mode
npm run test:e2e:report    # Ver reporte HTML
```

### Estructura de Tests

```
frontend/e2e/
├── auth.spec.ts           # Autenticación
├── appointments.spec.ts   # Gestión de turnos
├── navigation.spec.ts     # Navegación
└── accessibility.spec.ts  # Accesibilidad
```

### Tests E2E Implementados

#### Authentication
- ✅ Display login page
- ✅ Show error for invalid credentials
- ✅ Redirect after successful login
- ✅ Responsive navigation

#### Appointments
- ✅ Display appointments list
- ✅ Open create modal
- ✅ Form validation
- ✅ Filter by status
- ✅ Search functionality

#### Navigation
- ✅ Navigate between pages
- ✅ 404 handling
- ✅ Working navigation links
- ✅ Page load performance
- ✅ Meta tags validation

#### Accessibility
- ✅ Heading hierarchy
- ✅ Alt text for images
- ✅ Keyboard navigation
- ✅ Form labels
- ✅ Color contrast
- ✅ Skip to main content

### Browsers Soportados

Los tests se ejecutan en los siguientes browsers:

- ✅ Chromium (Desktop)
- ✅ Firefox (Desktop)
- ✅ WebKit (Safari Desktop)
- ✅ Mobile Chrome (Pixel 5)
- ✅ Mobile Safari (iPhone 12)

### Variables de Entorno para E2E

Para tests que requieren autenticación, configurar:

```bash
# .env.test o en CI/CD
TEST_USER_EMAIL=test@example.com
TEST_USER_PASSWORD=testpassword123
E2E_BASE_URL=http://localhost:5173
```

### Agregar Nuevos Tests E2E

1. Crear archivo en `frontend/e2e/`
2. Seguir la estructura:

```typescript
import { test, expect } from '@playwright/test';

test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should do something', async ({ page }) => {
    // Test implementation
    await expect(page).toHaveTitle(/Expected Title/);
  });
});
```

## 🔄 Integration Tests

Los integration tests verifican el funcionamiento completo de flujos end-to-end.

### WhatsApp Flow Integration

Tests del flujo completo de WhatsApp:

```bash
cd backend
npm test -- whatsapp-flow.spec.ts
```

**Cobertura:**
- Nuevo cliente (registro)
- Selección de menú (1-4)
- Booking completo
- Cancelación
- Ver turnos
- Comandos globales

## 📊 Coverage

### Objetivos de Cobertura

| Métrica | Objetivo | Actual |
|---------|----------|--------|
| Branches | 70% | ✅ |
| Functions | 70% | ✅ |
| Lines | 70% | ✅ |
| Statements | 70% | ✅ |

### Ver Coverage

```bash
# Backend
cd backend
npm run test:coverage
open coverage/index.html

# Los reportes también se suben a Codecov en CI
```

### Mejorar Coverage

1. Identificar áreas sin coverage:
```bash
npm run test:coverage
```

2. Revisar el reporte HTML en `coverage/index.html`

3. Agregar tests para archivos con bajo coverage

## 🚀 CI/CD

### GitHub Actions Workflow

Los tests se ejecutan automáticamente en:

- ✅ Push a `main`, `develop`, `claude/**`
- ✅ Pull requests a `main`, `develop`

### Jobs del Pipeline

```yaml
1. backend-test
   - Lint
   - Unit tests
   - Integration tests
   - Coverage (Codecov)
   - Build

2. frontend-test
   - Lint
   - Build

3. e2e-tests
   - Playwright tests
   - Multiple browsers
   - Upload reports

4. docker-build
   - Build backend image
   - Build frontend image

5. code-quality
   - Super-Linter
```

### Ver Resultados

1. **GitHub Actions**: Ver en la pestaña "Actions" del repo
2. **Codecov**: Coverage reports en Codecov dashboard
3. **Playwright Reports**: Artifacts en GitHub Actions

### Ejecutar Localmente como CI

```bash
# Backend
cd backend
npm run test:ci

# Frontend E2E
cd frontend
CI=true npm run test:e2e
```

## 🐛 Debugging Tests

### Backend (Jest)

```bash
# Debug específico test
npm test -- --testNamePattern="should create entity"

# Ver output completo
npm test -- --verbose

# No cache
npm test -- --no-cache
```

### Frontend (Playwright)

```bash
# Debug mode (abre DevTools)
npm run test:e2e:debug

# UI mode (interactivo)
npm run test:e2e:ui

# Con browser visible
npm run test:e2e:headed

# Test específico
npx playwright test auth.spec.ts
```

## 📝 Best Practices

### General

1. **Nombrar tests descriptivamente**
```typescript
// ❌ Mal
test('test 1', () => {});

// ✅ Bien
test('should create appointment with valid data', () => {});
```

2. **Usar setup/teardown**
```typescript
beforeEach(() => {
  // Setup
});

afterEach(() => {
  // Cleanup
});
```

3. **Aislar tests**
- No depender de orden de ejecución
- Limpiar mocks entre tests
- No compartir estado mutable

### Backend

1. **Mock dependencies externos**
```typescript
jest.mock('../../config/supabase');
jest.mock('../../config/twilio');
```

2. **Verificar casos de error**
```typescript
it('should handle database errors', async () => {
  mockService.create.mockRejectedValue(new Error('DB error'));
  // ...
});
```

### E2E

1. **Usar data-testid cuando sea necesario**
```typescript
await page.locator('[data-testid="submit-button"]').click();
```

2. **Esperar elementos correctamente**
```typescript
await expect(page.locator('.modal')).toBeVisible({ timeout: 5000 });
```

3. **Tests robustos**
```typescript
// ✅ Bien - flexible
await page.locator('button:has-text("Submit")').click();

// ❌ Mal - muy específico
await page.locator('#submit-button-123').click();
```

## 🔧 Troubleshooting

### Jest

**Error: Cannot find module**
```bash
npm run test -- --clearCache
npm ci
```

**Tests timeout**
```typescript
test('long test', async () => {
  // ...
}, 10000); // Aumentar timeout
```

### Playwright

**Browser not found**
```bash
npx playwright install
```

**Tests fallan en CI pero pasan localmente**
- Verificar timeouts
- Revisar variables de entorno
- Usar `CI=true` localmente

**Flaky tests**
- Aumentar timeouts
- Usar `waitForSelector` explícito
- Revisar condiciones de carrera

## 📚 Recursos

- [Jest Documentation](https://jestjs.io/)
- [Playwright Documentation](https://playwright.dev/)
- [Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)
- [Coverage Guide](https://istanbul.js.org/)

---

**Última actualización**: 2025-11-16
