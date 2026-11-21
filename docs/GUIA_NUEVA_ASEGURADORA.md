# Guía — Cómo Agregar una Nueva Aseguradora

El backend está diseñado para incorporar nuevas aseguradoras (por ejemplo **Río Uruguay Seguros**, **Seguros Rivadavia**, **La Caja**, **Federación Patronal**, etc.) sin modificar el orquestador ni el frontend.

---

## Checklist de 6 Pasos

### 1. Declarar variables en `backend/src/config/env.ts` y `insurers.ts`
- Agregá `<CIA>_MODE: adapterModeSchema.default('off')` (`mock | live | off`), URL base, credenciales y códigos de productor.
- En `superRefine`, validá que las credenciales sean obligatorias si `<CIA>_MODE === 'live'`.
- Documentá las variables en `backend/.env.example` y `render.yaml`.

### 2. Crear la carpeta `backend/src/adapters/<aseguradora>/`
Respetá esta separación de responsabilidades:
- `<cia>.types.ts`: tipos exactos del request/response según el Swagger/WSDL oficial.
- `<cia>.mapper.ts`: funciones puras `build<Cia>Request(input, config)` y `map<Cia>Response(raw, input, source) => StandardQuote[]` (clasificando siempre en `RC`, `TERCEROS_COMPLETO` o `TODO_RIESGO`).
- `<cia>.mock.ts`: genera una respuesta mock con la **misma forma** del API real para que el mapper se ejercite incluso en modo `mock`.
- `<cia>.adapter.ts`: extiende `BaseAdapter`, define `companyId`, `companyName`, `mode`, usa `TokenManager` (con reintento único ante `401`) e implementa `verifyAuth()` y `getQuote(input, options)`.

> **Importante:** respetá `options?.signal` en las llamadas `this.http.post(..., { signal: options?.signal })` para que el presupuesto global de timeout del orquestador funcione correctamente, y logueá errores únicamente con `logger.error(...)` (nunca `console.error(axiosError)`).

### 3. Registrar el adaptador en `backend/src/adapters/registry.ts`
```ts
if (config.miAseguradora.mode !== 'off') {
  adapters.push(new MiAseguradoraAdapter(config.miAseguradora));
}
```

### 4. Agregar la verificación en `backend/src/scripts/api-doctor.ts`
Sumá el chequeo de `adapter.verifyAuth()` y `adapter.getQuote(SAMPLE_TEST_VEHICLE)` para que `npm run api:doctor:quote` diagnostique la nueva compañía automáticamente.

### 5. Personalizar color de badge en Frontend (opcional)
El frontend detecta la nueva aseguradora automáticamente vía `/api/catalog/meta` y la agrega a los filtros. Solo si querés un color de insignia propio, añadí su `companyId` en `companyStyle` dentro de `frontend/src/components/quotecard.tsx`.

### 6. Escribir tests en `backend/tests/<cia>.mapper.test.ts`
Cubrí como mínimo:
- Mapeo correcto del payload hacia el contrato oficial de la aseguradora.
- Mapeo de respuesta real (incluyendo filtrado de planes rechazados/precio 0, clasificación de categoría y extracción de franquicia).
- Renovación automática de token ante un `401` simulado.

Finalmente ejecutá `npm run verify` desde la raíz de `multi/`.
