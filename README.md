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
- `GET /api/catalog/meta` — origen de códigos (`seed` / `infoauto`), totales del catálogo y aseguradoras activas.
- `GET /api/catalog/brands?year=2022` — marcas disponibles (26 marcas, 204 versiones semilla AR).
- `GET /api/catalog/models?brand=Toyota&year=2022` — modelos disponibles.
- `GET /api/catalog/versions?brand=Toyota&model=Corolla&year=2022` — versiones con `infoAutoCode` y valor sugerido.
- `GET /api/catalog/search?q=hilux+4x4&year=2023` — búsqueda instantánea por texto o código InfoAuto.
- `GET /api/catalog/postal-codes/:cp` — resolución de CP/CPA argentino (2.288 códigos postales en las 24 jurisdicciones).
- `GET /api/catalog/postal-codes?q=rosario` — autocompletado por localidad, provincia o CP.
- `POST /api/quotes` — cotización multicompañía normalizada.
- `POST /api/leads` — registro liviano de intención comercial al abrir WhatsApp.

## Carga de Códigos InfoAuto Oficiales

Los códigos `CODIA` oficiales de InfoAuto requieren suscripción comercial; el catálogo incluido (`src/catalog/data/vehicles-ar.json`) usa códigos de referencia (`codeOrigin: "seed"`) para desarrollo y demos. Cuando cuentes con la tabla oficial o credenciales de InfoAuto tenés 2 opciones sin tocar código:

1. **Importar archivo CSV/JSON oficial (InfoAuto o export de aseguradora):**
   ```bash
   cd backend
   npm run catalog:import -- ./ruta/al/infoauto.csv
   ```
   Genera `backend/data/vehicles.infoauto.json` (ignorado en `.gitignore`) con `codeOrigin: "infoauto"` y el backend lo carga automáticamente al iniciar.
2. **Conectar la API B2B de InfoAuto en vivo:**
   Configurá `CATALOG_PROVIDER=infoauto-api`, `INFOAUTO_BASE_URL`, `INFOAUTO_USER` e `INFOAUTO_PASSWORD` en `backend/.env`.

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

## Verificación y Diagnóstico

```bash
# Desde la raíz de multi/ — verifica backend + frontend completos
npm run verify

# Diagnóstico rápido de variables, catálogo y conexión a APIs
npm run api:doctor

# Diagnóstico + prueba de cotización real/mock end-to-end
npm run api:doctor:quote
```

## Documentación

- **[docs/ARQUITECTURA.md](./docs/ARQUITECTURA.md)** — diseño del sistema, resiliencia, seguridad y estrategia de catálogos.
- **[docs/API_REFERENCE.md](./docs/API_REFERENCE.md)** — contrato completo de todos los endpoints REST y códigos de error.
- **[docs/GUIA_NUEVA_ASEGURADORA.md](./docs/GUIA_NUEVA_ASEGURADORA.md)** — guía paso a paso para sumar nuevas aseguradoras.
- **[DEPLOY_Y_APIS.md](./DEPLOY_Y_APIS.md)** — checklist de deploy (Render + Vercel + Docker) y activación `mock -> live`.

## Deploy y Activación de APIs Reales (`mock` -> `live`)

Consultá la guía paso a paso en **[DEPLOY_Y_APIS.md](./DEPLOY_Y_APIS.md)** (incluye Blueprint de Render `render.yaml`, configuración de Vercel `frontend/vercel.json`, `backend/Dockerfile` y workflow de GitHub Actions `.github/workflows/ci.yml`).
