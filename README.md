# Lina - Sistema de Gestión de Turnos vía WhatsApp

Sistema completo para gestionar turnos y citas a través de WhatsApp, con panel de administración web.

## Características

- 📱 **Integración WhatsApp**: Gestiona turnos directamente desde WhatsApp usando Twilio
- 📅 **Panel de Administración**: Interfaz web completa para gestionar turnos, clientes y empleados
- 🔐 **Autenticación**: Sistema seguro de login con Supabase
- 👥 **Multi-empleado**: Gestión de múltiples empleados y sus horarios
- 🔔 **Recordatorios**: Sistema automatizado de recordatorios
- 📊 **Dashboard**: Métricas y reportes en tiempo real

## Stack Tecnológico

### Backend
- Node.js + Express
- TypeScript
- Supabase (PostgreSQL + Auth)
- Twilio (WhatsApp API)
- Bull (Job Queue)
- Winston (Logging)

### Frontend
- React + Vite
- TypeScript
- Tailwind CSS
- Zustand (State Management)
- React Query (Data Fetching)
- React Router (Routing)

## Estructura del Proyecto

```
vullaby/
├── backend/                # Servidor Node.js
│   ├── src/
│   │   ├── controllers/   # Controladores de rutas
│   │   ├── services/      # Lógica de negocio
│   │   ├── models/        # Modelos de datos
│   │   ├── routes/        # Definición de rutas
│   │   ├── middlewares/   # Middlewares personalizados
│   │   ├── utils/         # Utilidades
│   │   ├── config/        # Configuración (Supabase, Twilio, etc.)
│   │   └── types/         # Tipos TypeScript
│   └── package.json
├── frontend/              # Aplicación React
│   ├── src/
│   │   ├── components/   # Componentes reutilizables
│   │   ├── pages/        # Páginas de la aplicación
│   │   ├── services/     # Servicios API
│   │   ├── store/        # Estado global (Zustand)
│   │   ├── hooks/        # React hooks personalizados
│   │   └── utils/        # Utilidades
│   └── package.json
└── docs/                  # Documentación
```

## Configuración Inicial

### Prerrequisitos

- Node.js 18+
- npm o yarn
- Cuenta de Supabase
- Cuenta de Twilio (para WhatsApp)

### 1. Clonar el repositorio

```bash
git clone <repository-url>
cd vullaby
```

### 2. Configurar Backend

```bash
cd backend
npm install
```

Crear archivo `.env` basado en `.env.example`:

```env
PORT=3000
NODE_ENV=development

SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886

FRONTEND_URL=http://localhost:5173
```

### 3. Configurar Frontend

```bash
cd frontend
npm install
```

Crear archivo `.env` basado en `.env.example`:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_API_URL=http://localhost:3000
```

### 4. Configurar Base de Datos (Supabase)

Ver el archivo `docs/arquitectura.md` para el esquema completo de la base de datos.

## Desarrollo

### Iniciar Backend

```bash
cd backend
npm run dev
```

El servidor estará disponible en `http://localhost:3000`

### Iniciar Frontend

```bash
cd frontend
npm run dev
```

La aplicación estará disponible en `http://localhost:5173`

## Scripts Disponibles

### Backend

- `npm run dev` - Inicia el servidor en modo desarrollo con hot reload
- `npm run build` - Compila TypeScript a JavaScript
- `npm start` - Inicia el servidor en modo producción
- `npm run lint` - Ejecuta ESLint
- `npm run format` - Formatea el código con Prettier

### Frontend

- `npm run dev` - Inicia la aplicación en modo desarrollo
- `npm run build` - Compila la aplicación para producción
- `npm run preview` - Preview de la build de producción
- `npm run lint` - Ejecuta ESLint
- `npm run format` - Formatea el código con Prettier

## Roadmap

Ver el archivo `Roadmap.mp` para el plan completo de desarrollo en 7 fases.

### Fase Actual: Fase 0 ✅
- [x] Setup del proyecto
- [x] Configurar estructura de carpetas
- [x] Configurar stack tecnológico
- [ ] Configurar cuentas: Twilio, Supabase

### Próximos Pasos: Fase 1 (MVP Core)
- [ ] Implementar integración WhatsApp
- [ ] Crear motor de reservas
- [ ] Desarrollar dashboard básico
- [ ] Sistema de autenticación

## Contribuir

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## Licencia

ISC

## Contacto

Para preguntas y soporte, abre un issue en el repositorio.
