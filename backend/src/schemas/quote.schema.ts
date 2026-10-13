import { z } from 'zod';

export const quoteInputSchema = z.object({
  year: z.number()
    .int()
    .min(1990, 'El vehículo debe ser año 1990 o superior')
    .max(new Date().getFullYear() + 1, 'Año de vehículo inválido'),
  brand: z.string().min(2, 'La marca es obligatoria'),
  model: z.string().min(1, 'El modelo es obligatorio'),
  version: z.string().min(1, 'La versión es obligatoria'),
  postalCode: z.string().regex(/^\d{4,8}$/, 'Código postal inválido'),
  use: z.enum(['particular', 'comercial']).default('particular'),
  hasGnc: z.boolean().default(false),
  isZeroKm: z.boolean().default(false),
});
