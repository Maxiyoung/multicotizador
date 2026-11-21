import { Request, Response } from 'express';
import { leadIntentSchema } from '../schemas/lead.schema';
import { logger } from '../lib/logger';

/**
 * Registra la intención comercial cuando el usuario hace clic en contratar vía WhatsApp.
 * Hoy opera stateless (log estructurado seguro) listo para conectar una tabla SQL/Supabase.
 */
export function registerLeadIntent(req: Request, res: Response): void {
  const parsed = leadIntentSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({
      error: 'Datos de lead inválidos',
      details: parsed.error.issues.map((issue) => issue.message),
    });
    return;
  }

  logger.info('lead.whatsapp_intent', {
    companyId: parsed.data.companyId,
    planType: parsed.data.planType,
    planName: parsed.data.planName,
    price: parsed.data.price,
    quoteReference: parsed.data.quoteReference,
    source: parsed.data.source,
    vehicleYear: parsed.data.vehicle.year,
    vehicleBrand: parsed.data.vehicle.brand,
    vehicleModel: parsed.data.vehicle.model,
    infoAutoCode: parsed.data.vehicle.infoAutoCode,
    postalCode: parsed.data.vehicle.postalCode,
  });

  res.status(202).json({ recorded: true });
}
