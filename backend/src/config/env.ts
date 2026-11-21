import 'dotenv/config';
import { z } from 'zod';

export const adapterModeSchema = z.enum(['mock', 'live', 'off']);
export type AdapterMode = z.infer<typeof adapterModeSchema>;

export const catalogProviderModeSchema = z.enum(['local', 'infoauto-api']);
export type CatalogProviderMode = z.infer<typeof catalogProviderModeSchema>;

const envSchema = z
  .object({
    PORT: z.coerce.number().int().min(1).max(65535).default(3000),
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    CORS_ORIGIN: z.string().min(1).default('http://localhost:5173'),
    QUOTE_TIMEOUT_MS: z.coerce.number().int().min(1000).max(30000).default(9000),
    QUOTE_CACHE_TTL_SEC: z.coerce.number().int().min(0).max(3600).default(300),

    // Catálogo de vehículos (local con JSON importado/semilla o InfoAuto API oficial)
    CATALOG_PROVIDER: catalogProviderModeSchema.default('local'),
    CATALOG_FILE_PATH: z.string().optional().default(''),
    INFOAUTO_BASE_URL: z.string().url().default('https://api.infoauto.com.ar'),
    INFOAUTO_AUTH_PATH: z.string().default('/cars/auth/login'),
    INFOAUTO_VEHICLES_PATH: z.string().default('/cars/pub/models'),
    INFOAUTO_USER: z.string().optional().default(''),
    INFOAUTO_PASSWORD: z.string().optional().default(''),

    // Mercantil Andina
    MERCANTIL_MODE: adapterModeSchema.default('mock'),
    MERCANTIL_BASE_URL: z.string().url().default('https://apidev.mercantilandina.com.ar'),
    MERCANTIL_AUTH_PATH: z.string().default('/credenciales/v2/'),
    MERCANTIL_QUOTE_PATH: z.string().optional().default(''),
    MERCANTIL_CLIENT_ID: z.string().default('api-clientes-login'),
    MERCANTIL_USER: z.string().optional().default(''),
    MERCANTIL_PASSWORD: z.string().optional().default(''),
    MERCANTIL_SUBSCRIPTION_KEY: z.string().optional().default(''),

    // Grupo Sancor Seguros
    SANCOR_MODE: adapterModeSchema.default('mock'),
    SANCOR_BASE_URL: z
      .string()
      .url()
      .default('https://external-pre-api.gruposancorseguros.com/apissa/pre-catalog'),
    SANCOR_CLIENT_ID: z.string().optional().default(''),
    SANCOR_USERNAME: z.string().optional().default(''),
    SANCOR_PASSWORD: z.string().optional().default(''),
    SANCOR_APP_CLIENT: z.string().default('SegurosAutoYa'),
    SANCOR_PRODUCER_CODE: z.coerce.number().int().positive().default(10001),
    SANCOR_UPPER_PRODUCER_CODE: z.coerce.number().int().positive().default(10000),
    SANCOR_STATISTIC_CODE: z.coerce.number().int().positive().optional(),
    SANCOR_PRODUCT_CODE: z.coerce.number().int().positive().default(24),
    SANCOR_VIGENCY_CODE: z.coerce.number().int().min(1).max(3).default(1),
    SANCOR_PAYMENT_PERIODICITY_CODE: z.coerce.number().int().default(5),
    SANCOR_POLICY_QUOTAS: z.coerce.number().int().min(1).max(12).default(12),
    SANCOR_IVA_CONDITION_CODE: z.coerce.number().int().min(1).max(8).default(4),
  })
  .superRefine((data, ctx) => {
    if (data.CATALOG_PROVIDER === 'infoauto-api') {
      const required: Array<keyof typeof data> = ['INFOAUTO_USER', 'INFOAUTO_PASSWORD'];
      for (const key of required) {
        if (!data[key]) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [key],
            message: `${key} es obligatorio cuando CATALOG_PROVIDER=infoauto-api`,
          });
        }
      }
    }

    if (data.MERCANTIL_MODE === 'live') {
      const required: Array<keyof typeof data> = [
        'MERCANTIL_USER',
        'MERCANTIL_PASSWORD',
        'MERCANTIL_SUBSCRIPTION_KEY',
      ];
      for (const key of required) {
        if (!data[key]) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [key],
            message: `${key} es obligatorio cuando MERCANTIL_MODE=live`,
          });
        }
      }
    }

    if (data.SANCOR_MODE === 'live') {
      const required: Array<keyof typeof data> = [
        'SANCOR_CLIENT_ID',
        'SANCOR_USERNAME',
        'SANCOR_PASSWORD',
      ];
      for (const key of required) {
        if (!data[key]) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [key],
            message: `${key} es obligatorio cuando SANCOR_MODE=live`,
          });
        }
      }
    }
  });

export type EnvConfig = z.infer<typeof envSchema>;

export function parseEnv(rawEnv: NodeJS.ProcessEnv = process.env): EnvConfig {
  return envSchema.parse(rawEnv);
}

export const env: EnvConfig = parseEnv();

export function getCorsOrigins(corsOriginRaw: string = env.CORS_ORIGIN): string[] {
  return corsOriginRaw
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}
