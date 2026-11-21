# Referencia de API REST — SegurosAutoYa

**Base URL local:** `http://localhost:3000/api`  
**Formato:** JSON (`Content-Type: application/json`, límite de body `16kb`)

---

## 1. Estado del Servicio

### `GET /api/health`
Verifica que el servidor esté operativo y lista las aseguradoras activas junto a su modo (`mock` o `live`).

**Respuesta `200 OK`:**
```json
{
  "status": "ok",
  "environment": "development",
  "providers": [
    { "companyId": "mercantil-andina", "companyName": "Mercantil Andina", "mode": "mock" },
    { "companyId": "sancor-seguros", "companyName": "Sancor Seguros", "mode": "mock" }
  ]
}
```

---

## 2. Catálogo de Vehículos y Códigos Postales

### `GET /api/catalog/meta`
Devuelve metadatos del catálogo cargado, origen de códigos (`seed` o `infoauto`), totales y aseguradoras activas.

**Respuesta `200 OK`:**
```json
{
  "catalogProvider": "local-argentina-seed",
  "codeOrigin": "seed",
  "vehiclesCount": 204,
  "brandsCount": 26,
  "postalCodesCount": 2288,
  "provincesCount": 24,
  "yearRange": { "minYear": 1990, "maxYear": 2027 },
  "activeProviders": [
    { "companyId": "mercantil-andina", "companyName": "Mercantil Andina", "mode": "mock" },
    { "companyId": "sancor-seguros", "companyName": "Sancor Seguros", "mode": "mock" }
  ]
}
```

### `GET /api/catalog/brands`
Lista marcas ordenadas alfabéticamente.
- **Query params:** `year` *(opcional, entero 1990..año+1)*

### `GET /api/catalog/models`
Lista modelos para una marca.
- **Query params:** `brand` *(obligatorio)*, `year` *(opcional)*
- **Errores:** `400` si falta `brand`.

### `GET /api/catalog/versions`
Lista versiones con código InfoAuto (`infoAutoCode`) y valor estimado ajustado al año solicitado.
- **Query params:** `brand` *(obligatorio)*, `model` *(obligatorio)*, `year` *(opcional)*
- **Errores:** `400` si falta `brand` o `model`.

**Ejemplo de ítem:**
```json
{
  "infoAutoCode": "440310",
  "brand": "Toyota",
  "model": "Corolla",
  "version": "2.0 XEI CVT",
  "yearFrom": 2014,
  "yearTo": 2027,
  "estimatedValue": 29800000,
  "bodyType": "sedan",
  "fuel": "nafta",
  "codeOrigin": "seed"
}
```

### `GET /api/catalog/search`
Búsqueda inteligente *full-text* sin tildes sobre marca, modelo, versión o código InfoAuto. Soporta alias argentinos (`vw`, `chevy`, `mercedes`), sinónimos (`automatico`, `hibrido`, `diesel`, `4x4`, `full`), año embebido (`"vw gol trend 2020"`) y tolerancia a typos (`"corola xei"`).
- **Query params:** `q` *(mínimo 2 caracteres)*, `year` *(opcional)*, `limit` *(opcional, 1..30, default 12)*

### `POST /api/catalog/resolve`
Resuelve texto libre o datos manuales de vehículo a su `infoAutoCode` más probable con score de confianza (`0..1`) y top 5 candidatos para desambiguación (ideal para carga manual o bots de WhatsApp).
- **Request Body:** `{ "brand": "VW", "model": "Gol Trend", "version": "1.6 Trendline", "year": 2020 }` o `{ "query": "corolla xei 2022" }`
- **Respuesta `200 OK`:** `{ "resolved": true, "confidence": 0.96, "bestMatch": { ... }, "candidates": [ ... ] }`

### `GET /api/catalog/postal-codes/:cp`
Resuelve un código postal argentino (4 dígitos o CPA como `C1425ABC`).
- **Respuesta `200 OK`:**
```json
{
  "found": true,
  "postalCode": "5000",
  "primary": { "postalCode": "5000", "locality": "Córdoba", "province": "Córdoba" },
  "results": [{ "postalCode": "5000", "locality": "Córdoba", "province": "Córdoba" }]
}
```
- **Respuesta `404 Not Found`:** `{ "found": false, "postalCode": "...", "results": [], "error": "..." }`

### `GET /api/catalog/postal-codes`
Autocompletado por prefijo de CP, nombre de localidad o provincia.
- **Query params:** `q` *(mínimo 2 caracteres)*, `limit` *(opcional, 1..25, default 10)*

---

## 3. Cotización Multicompañía

### `POST /api/quotes`
Rate limit específico: **60 solicitudes cada 15 minutos por IP**.

**Request Body:**
```json
{
  "year": 2022,
  "brand": "Toyota",
  "model": "Corolla",
  "version": "2.0 XEI CVT",
  "infoAutoCode": "440310",
  "vehicleValue": 31000000,
  "postalCode": "5000",
  "locality": "Córdoba",
  "province": "Córdoba",
  "use": "particular",
  "hasGnc": false,
  "isZeroKm": false,
  "hasGarage": true
}
```

| Campo | Tipo | Requerido | Reglas / Notas |
|---|---|---|---|
| `year` | `number` | Sí | Entero entre `1990` y `añoActual + 1` |
| `brand`, `model`, `version` | `string` | Sí | Texto normalizado (trim) |
| `postalCode` | `string` | Sí | 4 dígitos (`5000`) o CPA (`X5000ABC`), normalizado a 4 dígitos |
| `infoAutoCode` | `string` | No* | 4 a 10 dígitos (*obligatorio para Sancor en modo `live`*) |
| `vehicleValue` | `number` | No | Si falta y viene `infoAutoCode`, se completa desde el catálogo |
| `locality`, `province` | `string` | No | Se enriquecen automáticamente desde el padrón de CP si faltan |
| `use` | `'particular' \| 'comercial'` | No | Default `'particular'` |
| `hasGnc`, `isZeroKm`, `hasGarage` | `boolean` | No | Default `false` |
| `gncValue` | `number` | No | Opcional si `hasGnc: true` (valor positivo en ARS) |
| `dni` | `string` | No | 7 u 8 dígitos numéricos |

**Respuesta `200 OK`:**
```json
{
  "quotes": [
    {
      "companyId": "sancor-seguros",
      "companyName": "Sancor Seguros",
      "logo": "https://www.sancorseguros.com.ar/favicon.ico",
      "planName": "Auto Base — Responsabilidad Civil",
      "planType": "RC",
      "price": 20200,
      "currency": "ARS",
      "billingPeriod": "MENSUAL",
      "insuredSum": 31000000,
      "coverageDetails": [
        "Responsabilidad Civil obligatoria hacia terceros"
      ],
      "externalId": "SS-902200-10",
      "quoteReference": "SS-902200",
      "validUntil": "2026-11-28T22:00:00.000Z",
      "source": "mock"
    }
  ],
  "failedProviders": [],
  "providerStatuses": [
    {
      "companyId": "mercantil-andina",
      "companyName": "Mercantil Andina",
      "status": "ok",
      "source": "mock",
      "durationMs": 355,
      "quotesCount": 3
    }
  ],
  "cached": false,
  "timestamp": "2026-11-21T22:00:00.000Z"
}
```

**Códigos de error:**
- `400 Bad Request`: JSON malformado o error de validación Zod (`{ error, details }`).
- `429 Too Many Requests`: límite de cotizaciones excedido.
- `500 Internal Server Error`: error no controlado.

---

## 4. Registro de Intención Comercial (Leads)

### `POST /api/leads`
Registra de forma liviana y no bloqueante la selección de un plan cuando el usuario hace clic en contratar vía WhatsApp.

**Respuesta `202 Accepted`:**
```json
{ "recorded": true }
```
