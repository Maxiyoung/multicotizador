import { Request, Response } from 'express';
import { OrchestratorService } from '../services/orchestrator.service';
import { quoteInputSchema } from '../schemas/quote.schema';
import { catalogService } from '../catalog/catalog.service';
import { postalCodesService } from '../catalog/postal-codes.service';
import { logger } from '../lib/logger';

export function createQuoteController(orchestrator: OrchestratorService) {
  return async (req: Request, res: Response): Promise<void> => {
    const parsed = quoteInputSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        error: 'Datos de cotización inválidos',
        details: parsed.error.issues.map((issue) => issue.message),
      });
      return;
    }

    try {
      const input = { ...parsed.data };

      // Si el usuario eligió un código InfoAuto del catálogo pero no envió valor, lo completamos
      if (input.infoAutoCode && !input.vehicleValue) {
        const match = await catalogService.findByInfoAutoCode(input.infoAutoCode);
        if (match) {
          input.vehicleValue = match.estimatedValue;
        }
      }

      // Enriquecemos localidad y provincia automáticamente desde el padrón de CP argentino
      if (!input.locality || !input.province) {
        const cpMatches = postalCodesService.lookupByCode(input.postalCode);
        if (cpMatches.length > 0) {
          input.locality = input.locality ?? cpMatches[0].locality;
          input.province = input.province ?? cpMatches[0].province;
        }
      }

      const results = await orchestrator.calculateAllQuotes(input);
      res.json(results);
    } catch (error) {
      logger.error('quote.controller_failed', error);
      res.status(500).json({
        error: 'Ocurrió un error interno al procesar las cotizaciones.',
      });
    }
  };
}
