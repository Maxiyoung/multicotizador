import { Request, Response } from 'express';
import { OrchestratorService } from '../services/orchestrator.service';
import { quoteInputSchema } from '../schemas/quote.schema';
import { catalogService } from '../catalog/catalog.service';
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
