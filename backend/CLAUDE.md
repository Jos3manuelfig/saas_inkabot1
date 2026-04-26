# CLAUDE.md — INKABOT SaaS Backend

## Contexto del proyecto
INKABOT es un servicio de chatbots de WhatsApp para pequeñas empresas en Perú.
Este repositorio contiene el **backend FastAPI** del dashboard SaaS de INKABOT.
El frontend está en Antigravity (React) y se conecta a esta API via HTTPS.

## Stack técnico
- **Lenguaje:** Python 3.11+
- **Framework:** FastAPI
- **ORM:** SQLAlchemy 2.0 (async)
- **Base de datos:** PostgreSQL 15 (ya corre en Docker Compose del VPS)
- **Autenticación:** JWT con python-jose, bcrypt para passwords
- **Migraciones:** Alembic
- **Contenedor:** Docker + Docker Compose
- **Reverse proxy:** Traefik (ya configurado en el VPS)
- **Validación:** Pydantic v2

## Infraestructura existente (VPS Hostinger)
El VPS ya tiene corriendo con Docker Compose:
- PostgreSQL en red interna `inkabot_network`
- Redis
- n8n
- Traefik como reverse proxy

Este backend se agrega como un nuevo servicio al docker-compose existente.
El subdominio será `api.inkabot.pe` (configurado después).

## Arquitectura multi-tenant
Cada cliente de INKABOT es un **tenant**. Todos los datos están aislados por `tenant_id`.
- El rol `admin` ve todos los tenants
- El rol `client` solo ve su propio tenant

## Modelos principales
- `Tenant` — cliente de INKABOT (empresa)
- `User` — login, tiene rol admin o client, pertenece a un tenant
- `Plan` — Emprendedor o Profesional
- `Subscription` — qué plan tiene cada tenant, fecha vencimiento
- `Payment` — pagos registrados manualmente por el admin
- `WhatsappNumber` — número conectado, estado, BSP (YCloud)

## Datos de conversaciones
Los datos de chats y leads están en la base de datos de n8n (mismo Postgres).
El backend los **lee** con queries directas, nunca los modifica.
Tablas relevantes de n8n:
- `chat_histories` — historial de mensajes por session_id
- `leads` — tabla custom con stage, tenant_id, timestamps

## Convenciones de código
- Todo en **inglés** (variables, funciones, modelos, comentarios)
- Comentarios explicativos en **español** cuando la lógica es compleja
- Rutas de API con prefijo `/api/v1/`
- Respuestas siempre en formato JSON `{ data, message, status }`
- Manejo de errores con HTTPException y códigos apropiados
- Async/await en todos los endpoints y queries

## Estructura de carpetas
```
inkabot-backend/
├── app/
│   ├── main.py
│   ├── core/
│   │   ├── config.py       # Settings con pydantic-settings
│   │   ├── database.py     # Engine async y sesión
│   │   └── security.py     # JWT y bcrypt
│   ├── models/             # SQLAlchemy ORM models
│   ├── schemas/            # Pydantic v2 schemas
│   ├── api/
│   │   ├── deps.py         # Dependencias (get_db, get_current_user)
│   │   └── v1/             # Routers por dominio
│   └── services/           # Lógica de negocio y externos
├── alembic/                # Migraciones
├── tests/
├── Dockerfile
├── docker-compose.yml
├── requirements.txt
└── .env.example
```

## Endpoints principales
```
POST   /api/v1/auth/login
GET    /api/v1/auth/me
GET    /api/v1/tenants/               # admin only
POST   /api/v1/tenants/               # admin only
GET    /api/v1/tenants/{id}
PUT    /api/v1/tenants/{id}
GET    /api/v1/stats/global           # admin only
GET    /api/v1/stats/{tenant_id}      # admin o cliente propio
POST   /api/v1/payments/              # admin only
GET    /api/v1/payments/{tenant_id}
GET    /api/v1/whatsapp/{tenant_id}/status
```

## Variables de entorno (.env)
```
DATABASE_URL=postgresql+asyncpg://user:pass@postgres:5432/inkabot_saas
N8N_DATABASE_URL=postgresql+asyncpg://user:pass@postgres:5432/n8n
SECRET_KEY=cambiar_en_produccion
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440
YCLOUD_API_KEY=
CORS_ORIGINS=["https://app.inkabot.pe","http://localhost:5173"]
```

## Reglas importantes
- NUNCA hardcodear credenciales, siempre usar variables de entorno
- NUNCA modificar tablas de n8n, solo SELECT
- Todo endpoint protegido requiere JWT válido en header Authorization
- El admin puede acceder a cualquier tenant_id
- El cliente solo puede acceder a su propio tenant_id (validar siempre)
- CORS configurado solo para dominios de INKABOT

## Comandos útiles
```bash
# Levantar en desarrollo
docker compose up -d

# Crear migración
alembic revision --autogenerate -m "descripcion"

# Aplicar migraciones
alembic upgrade head

# Ver logs
docker compose logs -f inkabot-backend
```

## Integración YCloud
YCloud es el BSP (proveedor WhatsApp). Para verificar estado de un número:
- Base URL: `https://api.ycloud.com/v2`
- Auth: header `X-API-Key`
- Endpoint relevante: `GET /whatsapp/phone-numbers`

## Notas para Claude Code
- Siempre crear migraciones Alembic cuando se modifiquen modelos
- Los schemas Pydantic deben tener ejemplos en `model_config`
- Usar `Annotated` para dependencias en FastAPI
- Preferir `select()` de SQLAlchemy 2.0 sobre el estilo legacy
- Al agregar un endpoint nuevo, agregar también su schema y test básico
