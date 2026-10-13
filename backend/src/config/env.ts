import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  MERCANTIL_USER: z.string().default('USUARIO_TEST'),
  MERCANTIL_PASSWORD: z.string().default('PASS_TEST'),
  MERCANTIL_SUBSCRIPTION_KEY: z.string().default('KEY_TEST'),
});

export const env = envSchema.parse(process.env);
