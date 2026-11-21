# SegurosAutoYa — Multicotizador de Seguros Automotores

Plataforma web full-stack para cotización y comparación de seguros automotores en múltiples aseguradoras argentinas (**Mercantil Andina** y **Grupo Sancor Seguros**), diseñada con arquitectura de adaptadores resilientes (`mock` / `live` por compañía), catálogo homologado con códigos InfoAuto y cierre comercial vía WhatsApp.

## Stack Tecnológico

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS v4, TanStack Query, React Hook Form + Zod, Lucide Icons.
- **Backend:** Node.js, Express 5, TypeScript, Zod, Axios + Axios-Retry, Helmet, Express Rate Limit, Vitest.

## Arquitectura

- `/backend`:
  - `src/adapters/`: patrón `BaseAdapter` + `InsurerRegistry` con `MercantilAdapter` y `SancorAdapter` (cada uno con mappers puros y modo dual `mock | live | off`).
  - `src/lib/`: `TokenManager` (caché OAuth2/Auth0 anti-stampede con auto-refresh ante `401`), `QuoteCache` (TTL en memoria) y `logger` estructurado con redacción de secretos.
  - `src/catalog/`: módulo desacoplado (`VehicleCatalogProvider`) con catálogo semilla argentino + códigos InfoAuto, listo para conectar la API oficial de InfoAuto o de las aseguradoras.
  - `src/services/orchestrator.service.ts`: ejecuta adaptadores en paralelo con presupuesto de timeout global (`AbortController`), reporte de `providerStatuses` y tolerancia a fallos parciales.
  - `tests/`: suite unitaria y de integración HTTP con Vitest.
- `/frontend`:
  - Formulario encadenado por catálogo (Año -> Marca -> Modelo -> Versión con InfoAuto y suma de referencia) + fallback manual.
  - Comparativa multicompañía con filtros por categoría (`RC`, `TERCEROS_COMPLETO`, `TODO_RIESGO`), filtro por aseguradora, ordenamiento y derivación a WhatsApp con referencia de cotización.

## Endpoints del Backend

- `GET /api/health` — estado del servidor y proveedores habilitados (`mock`/`live`).
- `GET /api/catalog/meta` — rango de años y aseguradoras activas.
- `GET /api/catalog/brands?year=2022` — marcas disponibles.
- `GET /api/catalog/models?brand=Toyota&year=2022` — modelos disponibles.
- `GET /api/catalog/versions?brand=Toyota&model=Corolla&year=2022` — versiones con `infoAutoCode` y valor sugerido.
- `POST /api/quotes` — cotización multicompany normalizada.
- `POST /api/leads` — registro liviano de intención comercial al abrir WhatsApp.

## Puesta en Marcha Local

```bash
# Backend
cd backend
cp .env.example .env
npm install
npm run dev

# Frontend (otra terminal)
cd frontend
cp .env.example .env
npm install
npm run dev
```

## Verificación Completa

```bash
# Backend (typecheck + 22 tests Vitest + build)
cd backend && npm run verify

# Frontend (typecheck + eslint + build)
cd frontend && npm run verify
```

## Activación de APIs Reales (`mock` -> `live`)

El servidor valida las variables al arrancar (`src/config/env.ts`) y bloquea el inicio si activás un proveedor en `live` sin credenciales completas.

1. **Grupo Sancor Seguros** (integración completa según Swagger `TokenGenerator-V2` + `Cotización Automotores`):
   - Configurá en `backend/.env`: `SANCOR_MODE=live`, `SANCOR_BASE_URL`, `SANCOR_CLIENT_ID`, `SANCOR_USERNAME`, `SANCOR_PASSWORD`, `SANCOR_APP_CLIENT`, `SANCOR_PRODUCER_CODE` y `SANCOR_UPPER_PRODUCER_CODE`.
2. **Mercantil Andina** (login OAuth2 en `/credenciales/v2/` ya conectado):
   - Configurá en `backend/.env`: `MERCANTIL_MODE=live`, `MERCANTIL_BASE_URL`, `MERCANTIL_USER`, `MERCANTIL_PASSWORD`, `MERCANTIL_SUBSCRIPTION_KEY` y `MERCANTIL_QUOTE_PATH` (una vez descargado el Swagger de cotización del portal), ajustando `src/adapters/mercantil/mercantil.mapper.ts` a los nombres exactos de campos del Swagger.
