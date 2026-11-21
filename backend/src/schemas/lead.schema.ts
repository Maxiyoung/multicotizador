import { z } from 'zod';

export const leadIntentSchema = z.object({
  companyId: z.string().trim().min(1),
  companyName: z.string().trim().min(1),
  planName: z.string().trim().min(1),
  planType: z.enum(['RC', 'TERCEROS_COMPLETO', 'TODO_RIESGO']),
  price: z.number().positive(),
  quoteReference: z.string().trim().optional(),
  externalId: z.string().trim().min(1),
  source: z.enum(['live', 'mock']),
  vehicle: z.object({
    year: z.number().int(),
    brand: z.string().trim().min(1),
    model: z.string().trim().min(1),
    version: z.string().trim().min(1),
    infoAutoCode: z.string().trim().optional(),
    postalCode: z.string().trim().min(4),
    hasGnc: z.boolean(),
    isZeroKm: z.boolean(),
  }),
});

export type LeadIntent = z.infer<typeof leadIntentSchema>;
