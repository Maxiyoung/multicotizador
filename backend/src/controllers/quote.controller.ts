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

      // 1. Si no vino infoAutoCode (carga manual), solo auto-enlazamos si hay coincidencia prácticamente exacta
      //    (>= 0.96) para evitar cotizar silenciosamente una versión distinta a la ingresada por el usuario.
      if (!input.infoAutoCode) {
        const resolution = await catalogService.resolveVehicle({
          brand: input.brand,
          model: input.model,
          version: input.version,
          year: input.year,
        });
        if (resolution.resolved && resolution.confidence >= 0.96 && resolution.bestMatch) {
          input.infoAutoCode = resolution.bestMatch.infoAutoCode;
          input.vehicleValue = input.vehicleValue ?? resolution.bestMatch.estimatedValue;
          logger.info('quote.vehicle_auto_resolved', {
            infoAutoCode: resolution.bestMatch.infoAutoCode,
            confidence: resolution.confidence,
            codeOrigin: resolution.bestMatch.codeOrigin,
          });
        }
      } else if (!input.vehicleValue) {
        // 2. Si vino código InfoAuto del catálogo pero no valor, completamos valuación ajustada al año
        const match = await catalogService.findByInfoAutoCode(input.infoAutoCode, input.year);
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

      if (results.quotes.length === 0 && results.failedProviders.length > 0) {
        res.status(503).json({
          error: `No pudimos obtener respuesta de ${results.failedProviders.join(', ')} en este momento. Intentá nuevamente en unos segundos.`,
          failedProviders: results.failedProviders,
          providerStatuses: results.providerStatuses,
        });
        return;
      }

      res.json(results);
    } catch (error) {
      logger.error('quote.controller_failed', error);
      res.status(500).json({
        error: 'Ocurrió un error interno al procesar las cotizaciones.',
      });
    }
  };
}
