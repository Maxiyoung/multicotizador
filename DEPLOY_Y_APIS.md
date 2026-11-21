# Guía Rápida — Deploy y Conexión de APIs Reales

Esta guía resume el flujo mínimo para dejar **SegurosAutoYa** online hoy mismo (en modo `mock`) y pasar luego a cotizaciones reales (`live`) en cuestión de minutos sin tocar arquitectura.

---

## 1. Deploy en Producción (5 minutos)

### Backend en Render (automático vía `render.yaml`)
1. Entrá a [Render Blueprints](https://dashboard.render.com/blueprints) y conectá el repositorio `Maxiyoung/multicotizador`.
2. Render detecta automáticamente [render.yaml](./render.yaml) y crea el servicio `segurosautoya-api` (con `healthCheckPath: /api/health`).
3. Completá inicialmente solo una variable:
   - `CORS_ORIGIN`: la URL pública de tu frontend (ej. `https://segurosautoya.vercel.app`). Podés listar varias separadas por coma.
4. Verificá que responda entrando a `https://<tu-backend>.onrender.com/api/health`.

*(Alternativa Docker: también tenés `backend/Dockerfile` listo para Railway, Fly.io o VPS.)*

### Frontend en Vercel
1. Importá el repositorio `Maxiyoung/multicotizador` en [Vercel](https://vercel.com/new).
2. Configurá **Root Directory:** `frontend` (usa automáticamente `frontend/vercel.json`).
3. Cargá estas 2 variables de entorno:
   - `VITE_API_URL`: `https://<tu-backend>.onrender.com/api`
   - `VITE_WHATSAPP_NUMBER`: tu WhatsApp en formato internacional sin `+` (ej. `5493515449977`).
4. Desplegá y probá desde tu celular el flujo completo hasta abrir WhatsApp.

---

## 2. Cómo Enchufar las APIs Cuando Lleguen las Credenciales

Siempre probá primero **en local** con el comando `api:doctor` antes de subir las credenciales a Render:

```bash
# Desde la raíz de multi/
npm run api:doctor

# Para ejecutar también una cotización real de prueba (Toyota Corolla 2022, CP 5000):
npm run api:doctor:quote
```

### A. Activar Grupo Sancor Seguros (100% mapeado contra Swagger)
1. En `backend/.env`, cargá las variables que te entregue Sancor:
   ```env
   SANCOR_MODE=live
   SANCOR_BASE_URL=https://external-pre-api.gruposancorseguros.com/apissa/pre-catalog
   SANCOR_CLIENT_ID=<tu_gss_apiclient_id>
   SANCOR_USERNAME=<tu_usuario>
   SANCOR_PASSWORD=<tu_password>
   SANCOR_APP_CLIENT=<nombre_app_asignado>
   SANCOR_PRODUCER_CODE=<tu_codigo_productor>
   SANCOR_UPPER_PRODUCER_CODE=<tu_codigo_organizador>
   ```
2. Corré `npm run api:doctor:quote`.
3. Si devuelve `✅`, copiá esas mismas variables en **Render -> Environment -> Save Changes**.

### B. Activar Mercantil Andina
1. Cargá en `backend/.env`:
   ```env
   MERCANTIL_MODE=live
   MERCANTIL_BASE_URL=https://apidev.mercantilandina.com.ar
   MERCANTIL_AUTH_PATH=/credenciales/v2/
   MERCANTIL_USER=<usuario_test>
   MERCANTIL_PASSWORD=<password_test>
   MERCANTIL_SUBSCRIPTION_KEY=<subscription_key_del_portal>
   MERCANTIL_QUOTE_PATH=<ruta_del_swagger_de_cotizacion>
   ```
2. Corré `npm run api:doctor` — valida el login OAuth2 contra `/credenciales/v2/` al instante.
3. Cuando descargues el Swagger de cotización del portal de Mercantil, ajustá los nombres exactos de campos en `backend/src/adapters/mercantil/mercantil.mapper.ts` y verificá con `npm run api:doctor:quote`.

### C. Activar Códigos InfoAuto Oficiales
Elegí la opción que te provean:
- **Opción 1 (Archivo CSV/JSON oficial):**
  ```bash
  npm run catalog:import ./ruta/al/infoauto.csv
  ```
  El backend detecta automáticamente `backend/data/vehicles.infoauto.json` al iniciar y cambia el origen a `infoauto` oficial.
- **Opción 2 (API B2B de InfoAuto):**
  En `.env` / Render cambiá `CATALOG_PROVIDER=infoauto-api` y completá `INFOAUTO_USER` + `INFOAUTO_PASSWORD`.

---

## 3. Verificación Automática (CI)

Cada push o Pull Request a `main` ejecuta [`.github/workflows/ci.yml`](./.github/workflows/ci.yml):
- **Backend:** `tsc --noEmit` + suite completa Vitest + `tsc` build + smoke test de `api:doctor`.
- **Frontend:** `tsc -b --noEmit` + `eslint .` + `vite build`.
