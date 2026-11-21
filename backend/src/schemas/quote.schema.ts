import { z } from 'zod';

const POSTAL_CODE_REGEX = /^[A-Za-z]?\d{4}[A-Za-z]{0,3}$/;

export function normalizePostalCode(raw: string): string {
  const match = raw.trim().match(/\d{4}/);
  return match ? match[0] : raw.trim();
}

export const quoteInputSchema = z.object({
  year: z
    .number()
    .int()
    .min(1990, 'El vehículo debe ser año 1990 o superior')
    .max(new Date().getFullYear() + 1, 'Año de vehículo inválido'),
  brand: z.string().trim().min(2, 'La marca es obligatoria'),
  model: z.string().trim().min(1, 'El modelo es obligatorio'),
  version: z.string().trim().min(1, 'La versión es obligatoria'),
  infoAutoCode: z
    .string()
    .trim()
    .regex(/^\d{4,10}$/, 'Código InfoAuto inválido')
    .optional(),
  vehicleValue: z.number().positive('El valor del vehículo debe ser mayor a 0').optional(),
  postalCode: z
    .string()
    .trim()
    .regex(POSTAL_CODE_REGEX, 'Código postal inválido (ej: 5000 o C1425)')
    .transform(normalizePostalCode),
  use: z.enum(['particular', 'comercial']).default('particular'),
  hasGnc: z.boolean().default(false),
  gncValue: z.number().positive('El valor del equipo GNC debe ser mayor a 0').optional(),
  isZeroKm: z.boolean().default(false),
  hasGarage: z.boolean().default(false),
  dni: z
    .string()
    .trim()
    .regex(/^\d{7,8}$/, 'DNI inválido')
    .optional(),
});
