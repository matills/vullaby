# Lina Backend

Sistema de gestión de turnos vía WhatsApp para cualquier rubro de servicios.

## Stack Tecnológico

- **Node.js + TypeScript + Express**
- **Supabase** (PostgreSQL + Auth)
- **Twilio** (WhatsApp Business API)
- **Bull** (Job Queue para recordatorios)
- **Zod** (Validación de datos)

## Setup

### 1. Instalar dependencias

```bash
npm install
```

### 2. Configurar Supabase

1. Crear cuenta en [Supabase](https://supabase.com)
2. Crear nuevo proyecto
3. Ir a SQL Editor y ejecutar el archivo `database-schema.sql`
4. Copiar las credenciales (URL, anon key, service key)

### 3. Configurar Twilio

1. Crear cuenta en [Twilio](https://www.twilio.com)
2. Activar WhatsApp Sandbox o configurar número de producción
3. Copiar Account SID, Auth Token y WhatsApp Number

### 4. Variables de entorno

Crear archivo `.env` basado en `.env.example`:

```bash
cp .env.example .env
```

Completar con tus credenciales:

```env
NODE_ENV=development
PORT=3000

SUPABASE_URL=tu_url_de_supabase
SUPABASE_ANON_KEY=tu_anon_key
SUPABASE_SERVICE_KEY=tu_service_key

TWILIO_ACCOUNT_SID=tu_account_sid
TWILIO_AUTH_TOKEN=tu_auth_token
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886

JWT_SECRET=un_secreto_muy_seguro

REDIS_HOST=localhost
REDIS_PORT=6379

FRONTEND_URL=http://localhost:5173
```

### 5. Configurar webhook de Twilio

1. En Twilio Console → WhatsApp Sandbox
2. Configurar webhook URL: `https://tu-dominio.com/api/webhook/whatsapp`
3. Método: POST

## Ejecución

### Desarrollo

```bash
npm run dev
```

### Producción

```bash
npm run build
npm start
```

## Estructura del Proyecto

```
src/
├── config/          # Configuraciones (DB, Twilio, env)
├── controllers/     # Controladores HTTP
├── services/        # Lógica de negocio
├── middlewares/     # Auth, validación, errores
├── routes/          # Definición de rutas
├── models/          # Modelos de TypeScript
├── types/           # Tipos e interfaces
├── utils/           # Utilidades (logger, parsers)
├── jobs/            # Jobs de Bull (recordatorios)
└── app.ts           # Aplicación principal
```