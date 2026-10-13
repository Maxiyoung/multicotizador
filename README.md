# SegurosAutoYa — Cotizador Oficial de Seguros Automotores

Plataforma web full-stack para cotización y comparación de seguros de auto en tiempo real, diseñada con arquitectura de adaptadores resilientes y cierre comercial directo vía WhatsApp.

## Stack Tecnológico

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS v4, TanStack Query, React Hook Form + Zod, Lucide Icons.
- **Backend:** Node.js, Express 5, TypeScript, Zod, Axios + Axios-Retry, Helmet, Express Rate Limit.

## Arquitectura

- `/backend`: API REST con patrón Orchestrator + Adapters (`MercantilAdapter`), caché de tokens OAuth2 en memoria y tolerancia a fallos mediante `Promise.allSettled`.
- `/frontend`: Interfaz SPA responsiva con filtrado instantáneo por categoría de cobertura (`RC`, `TERCEROS_COMPLETO`, `TODO_RIESGO`) y generación de leads pre-formateados para WhatsApp.
