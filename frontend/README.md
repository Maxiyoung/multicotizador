# Frontend — SegurosAutoYa

Interfaz SPA construida con **React 19 + TypeScript + Vite + Tailwind CSS v4 + TanStack Query + React Hook Form + Zod**.

## Comandos

```bash
npm install
npm run dev       # Servidor local en http://localhost:5173
npm run verify    # Typecheck + ESLint + Build de producción
npm run preview   # Previsualizar dist/ generado
```

## Variables de entorno (`.env`)

Copiar `.env.example` a `.env`:

- `VITE_API_URL`: URL base del backend (ej. `http://localhost:3000/api` en local o `https://<app>.onrender.com/api` en producción).
- `VITE_WHATSAPP_NUMBER`: número de WhatsApp comercial en formato internacional sin `+` (ej. `5493515449977`).

Para arquitectura, referencia de API y guía de deploy, ver la documentación en la raíz ([README.md](../README.md) y [docs/ARQUITECTURA.md](../docs/ARQUITECTURA.md)).
