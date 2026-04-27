# CLAUDE.md — INKABOT SaaS

## Contexto del proyecto

INKABOT es un servicio de chatbots de WhatsApp para pequeñas empresas en Perú.
El dueño y único administrador es José Manuel (rol `admin`).
Sus clientes son pequeños negocios peruanos (rol `client`).

Este repositorio tiene dos partes:
- `frontend/` — Next.js 15, panel web para admin y clientes
- `backend/` — FastAPI, API REST + webhook de WhatsApp

## Stack técnico

### Frontend
- Next.js 15 (App Router)
- TypeScript
- Tailwind CSS
- Recharts para gráficas

### Backend
- Python 3.11+
- FastAPI
- SQLAlchemy 2.0 (async)
- PostgreSQL 15
- Alembic (migraciones)
- JWT con python-jose, bcrypt
- Docker + Docker Compose
- Traefik como reverse proxy (ya configurado en VPS)

## Infraestructura (VPS Hostinger)

El VPS tiene corriendo con Docker Compose:
- PostgreSQL en red interna `inkabot_network`
- Redis
- Traefik

El backend se agrega como nuevo servicio al docker-compose existente.
- Backend: `api.inkabot.pe`
- Frontend: `app.inkabot.pe`

## Arquitectura multi-tenant

Cada cliente de INKABOT es un tenant. Todos los datos están aislados por `tenant_id`.

- Rol `admin` (José Manuel): ve y gestiona todos los tenants
- Rol `client`: solo ve su propio tenant

## Flujo del sistema

### Onboarding de clientes
1. José Manuel recibe el pago (Yape/Plin/transferencia)
2. José Manuel entra al panel admin y crea el cliente (tenant + user)
3. El sistema genera credenciales automáticamente
4. El cliente recibe sus credenciales por WhatsApp
5. El cliente entra a su panel y configura su vendedor IA (nombre, negocio, productos, tono)

### Flujo de mensajes WhatsApp
```
Usuario final → Meta WhatsApp Business API
                      ↓
              Webhook POST /api/v1/webhook/whatsapp
                      ↓
          Identificar tenant por número de teléfono
                      ↓
          Cargar system prompt del tenant desde DB
                      ↓
          Cargar historial de conversación desde DB
                      ↓
          Llamar Anthropic API (claude-haiku-4-5-20251001)
                      ↓
          Guardar mensaje y respuesta en DB
                      ↓
          Enviar respuesta vía Meta WhatsApp API
```

## Modelos de base de datos

### Ya implementados (NO modificar estructura, solo agregar si falta):
- `Tenant` — cliente de INKABOT (empresa)
- `User` — login, rol admin o client, pertenece a un tenant
- `Plan` — Emprendedor o Profesional
- `Subscription` — qué plan tiene cada tenant
- `Payment` — pagos registrados manualmente por el admin
- `Agent` — configuración del vendedor IA por tenant (system prompt, nombre, etc.)

### Agregar (si no existen):
- `WhatsappNumber` — número Meta conectado, phone_number_id, access_token, tenant_id
- `Conversation` — conversación activa, identificada por número del usuario final + tenant
- `Message` — mensajes individuales (role: user/assistant, content, timestamp)

## Integraciones

### Meta WhatsApp Business API (DIRECTO — sin YCloud)
- Auth: Bearer token por número (`access_token` guardado en `WhatsappNumber`)
- Enviar mensaje: `POST https://graph.facebook.com/v19.0/{phone_number_id}/messages`
- Webhook verificación: `GET /api/v1/webhook/whatsapp` con `hub.verify_token`
- Webhook mensajes: `POST /api/v1/webhook/whatsapp`
- El `WEBHOOK_VERIFY_TOKEN` se guarda en `.env`

### Anthropic API
- Modelo: `claude-haiku-4-5-20251001` (rápido y económico para producción)
- El system prompt se carga desde `Agent.system_prompt` por tenant
- El historial se carga desde tabla `Message` (últimos 20 mensajes)
- Auth: `ANTHROPIC_API_KEY` en `.env`

### NO usar:
- ❌ YCloud — eliminado, usar Meta directo
- ❌ n8n — eliminado, el backend maneja todo
- ❌ `services/ycloud.py` — reemplazar con `services/meta_whatsapp.py`
- ❌ `services/n8n_reader.py` — eliminar, queries directas a Postgres

## Estructura de carpetas

```
saas_inkabot/
├── frontend/
│   ├── app/
│   │   ├── admin/
│   │   │   ├── dashboard/
│   │   │   ├── clientes/
│   │   │   │   └── [id]/        ← detalle + crear tenant
│   │   │   ├── pagos/
│   │   │   ├── estadisticas/
│   │   │   └── configuracion/
│   │   ├── cliente/
│   │   │   ├── dashboard/
│   │   │   ├── vendedores/
│   │   │   │   └── [id]/        ← editar system prompt del agente
│   │   │   ├── estadisticas/
│   │   │   └── plan/
│   │   └── login/
│   ├── components/
│   ├── lib/
│   │   ├── api.ts               ← cliente HTTP, conectar al backend real
│   │   ├── auth.ts
│   │   └── mock-data.ts         ← REEMPLAZAR con llamadas reales a la API
│   └── types/
│
└── backend/
    ├── app/
    │   ├── api/v1/
    │   │   ├── auth.py
    │   │   ├── tenants.py
    │   │   ├── agents.py
    │   │   ├── payments.py
    │   │   ├── stats.py
    │   │   ├── webhook.py       ← AGREGAR si no existe
    │   │   └── whatsapp.py      ← actualizar para Meta directo
    │   ├── models/
    │   │   ├── conversation.py  ← AGREGAR si no existe
    │   │   └── message.py       ← AGREGAR si no existe
    │   └── services/
    │       ├── meta_whatsapp.py ← AGREGAR (reemplaza ycloud.py)
    │       ├── anthropic.py     ← AGREGAR si no existe
    │       └── simulator.py     ← mantener para testing
    ├── alembic/
    └── tests/
```

## Variables de entorno (.env)

```
# Base de datos
DATABASE_URL=postgresql+asyncpg://user:pass@postgres:5432/inkabot_saas

# JWT
SECRET_KEY=cambiar_en_produccion
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440

# Anthropic
ANTHROPIC_API_KEY=

# Meta WhatsApp
WEBHOOK_VERIFY_TOKEN=inkabot_webhook_secret

# CORS
CORS_ORIGINS=["https://app.inkabot.pe","http://localhost:3000"]
```

## Endpoints principales

```
# Auth
POST   /api/v1/auth/login
GET    /api/v1/auth/me

# Tenants (admin crea clientes)
GET    /api/v1/tenants/
POST   /api/v1/tenants/
GET    /api/v1/tenants/{id}
PUT    /api/v1/tenants/{id}
DELETE /api/v1/tenants/{id}

# Agentes (vendedor IA por tenant)
GET    /api/v1/agents/{tenant_id}
PUT    /api/v1/agents/{tenant_id}

# Pagos
POST   /api/v1/payments/
GET    /api/v1/payments/{tenant_id}

# Estadísticas
GET    /api/v1/stats/global          ← admin only
GET    /api/v1/stats/{tenant_id}

# WhatsApp
GET    /api/v1/whatsapp/{tenant_id}/status
POST   /api/v1/whatsapp/{tenant_id}/number    ← registrar número Meta

# Webhook Meta (NO requiere JWT)
GET    /api/v1/webhook/whatsapp      ← verificación Meta
POST   /api/v1/webhook/whatsapp      ← mensajes entrantes
```

## Estado actual del proyecto

### Completado:
- ✅ Estructura base frontend y backend
- ✅ Autenticación JWT
- ✅ Panel admin: clientes, pagos, estadísticas, configuración
- ✅ Panel cliente: dashboard, vendedores, plan
- ✅ Modelos SQLAlchemy: tenant, user, agent, plan, subscription, payment
- ✅ Componentes UI: Button, Card, Table, Badge, Navbar, Sidebar

### Pendiente (prioridad de implementación):
1. 🔴 `services/meta_whatsapp.py` — enviar/recibir mensajes Meta
2. 🔴 `api/v1/webhook.py` — handler webhook Meta
3. 🔴 `services/anthropic.py` — llamadas IA con system prompt por tenant
4. 🔴 Modelos `Conversation` y `Message` + migraciones Alembic
5. 🟡 Conectar `lib/mock-data.ts` al backend real
6. 🟡 Página `vendedores/[id]` — editor de system prompt
7. 🟡 Eliminar `services/ycloud.py` y `services/n8n_reader.py`

## Convenciones de código

- Todo en inglés (variables, funciones, modelos, comentarios de código)
- Comentarios explicativos en español cuando la lógica es compleja de negocio
- Rutas API con prefijo `/api/v1/`
- Respuestas siempre en formato `{ data, message, status }`
- Manejo de errores con `HTTPException` y códigos apropiados
- Async/await en todos los endpoints y queries
- NUNCA hardcodear credenciales, siempre variables de entorno
- El admin puede acceder a cualquier `tenant_id`
- El cliente solo puede acceder a su propio `tenant_id` (validar siempre)
- CORS configurado solo para dominios de INKABOT

## Comandos útiles

```bash
# Backend — levantar en desarrollo
cd backend && docker compose up -d

# Backend — crear migración
alembic revision --autogenerate -m "descripcion"

# Backend — aplicar migraciones
alembic upgrade head

# Frontend — desarrollo local
cd frontend && npm run dev

# Ver logs backend
docker compose logs -f inkabot-backend
```

## Notas para Claude Code

- Siempre crear migraciones Alembic cuando se modifiquen o agreguen modelos
- Los schemas Pydantic deben tener ejemplos en `model_config`
- Usar `Annotated` para dependencias en FastAPI
- Preferir `select()` de SQLAlchemy 2.0 sobre el estilo legacy
- Al agregar un endpoint nuevo, agregar también su schema y test básico
- El webhook de Meta NO lleva autenticación JWT — usar `WEBHOOK_VERIFY_TOKEN`
- El frontend tiene datos mock en `lib/mock-data.ts` — reemplazar con llamadas a `lib/api.ts`
- Al editar el agente de un cliente, el cambio se refleja inmediatamente en sus próximas conversaciones de WhatsApp
