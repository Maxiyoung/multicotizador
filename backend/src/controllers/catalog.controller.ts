import { Request, Response } from 'express';
import { catalogService } from '../catalog/catalog.service';
import { postalCodesService } from '../catalog/postal-codes.service';
import { OrchestratorService } from '../services/orchestrator.service';

function parseOptionalYear(raw: unknown): number | undefined {
  if (typeof raw !== 'string' || !raw.trim()) return undefined;
  const num = Number(raw);
  return Number.isInteger(num) && num >= 1990 && num <= new Date().getFullYear() + 2
    ? num
    : undefined;
}

function parseLimit(raw: unknown, fallback = 12, max = 30): number {
  if (typeof raw !== 'string' || !raw.trim()) return fallback;
  const num = Number(raw);
  if (!Number.isInteger(num) || num < 1) return fallback;
  return Math.min(num, max);
}

export function createCatalogControllers(orchestrator: OrchestratorService) {
  return {
    getMeta: async (_req: Request, res: Response) => {
      const [vehicleStats, postalStats] = await Promise.all([
        catalogService.getStats(),
        Promise.resolve(postalCodesService.getStats()),
      ]);

      res.json({
        catalogProvider: catalogService.providerName,
        codeOrigin: vehicleStats.codeOrigin,
        vehiclesCount: vehicleStats.vehiclesCount,
        brandsCount: vehicleStats.brandsCount,
        postalCodesCount: postalStats.postalCodesCount,
        provincesCount: postalStats.provincesCount,
        yearRange: catalogService.getYearRange(),
        activeProviders: orchestrator.getEnabledProviders(),
      });
    },

    getBrands: async (req: Request, res: Response) => {
      const year = parseOptionalYear(req.query.year);
      const brands = await catalogService.getBrands(year);
      res.json({ brands });
    },

    getModels: async (req: Request, res: Response) => {
      const brand = typeof req.query.brand === 'string' ? req.query.brand.trim() : '';
      if (!brand) {
        res.status(400).json({ error: 'El parámetro "brand" es obligatorio.' });
        return;
      }
      const year = parseOptionalYear(req.query.year);
      const models = await catalogService.getModels(brand, year);
      res.json({ models });
    },

    getVersions: async (req: Request, res: Response) => {
      const brand = typeof req.query.brand === 'string' ? req.query.brand.trim() : '';
      const model = typeof req.query.model === 'string' ? req.query.model.trim() : '';
      if (!brand || !model) {
        res.status(400).json({ error: 'Los parámetros "brand" y "model" son obligatorios.' });
        return;
      }
      const year = parseOptionalYear(req.query.year);
      const versions = await catalogService.getVersions(brand, model, year);
      res.json({ versions });
    },

    searchVehicles: async (req: Request, res: Response) => {
      const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
      if (q.length < 2) {
        res.json({ results: [] });
        return;
      }
      const year = parseOptionalYear(req.query.year);
      const limit = parseLimit(req.query.limit, 12, 30);
      const results = await catalogService.search(q, year, limit);
      res.json({ results });
    },

    searchPostalCodes: (req: Request, res: Response) => {
      const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
      if (q.length < 2) {
        res.json({ results: [] });
        return;
      }
      const limit = parseLimit(req.query.limit, 10, 25);
      const results = postalCodesService.search(q, limit);
      res.json({ results });
    },

    lookupPostalCode: (req: Request, res: Response) => {
      const cpParam = typeof req.params.cp === 'string' ? req.params.cp : '';
      const results = postalCodesService.lookupByCode(cpParam);
      if (results.length === 0) {
        res.status(404).json({
          found: false,
          postalCode: cpParam,
          results: [],
          error: 'No encontramos ese código postal en el padrón argentino.',
        });
        return;
      }

      res.json({
        found: true,
        postalCode: results[0].postalCode,
        primary: results[0],
        results,
      });
    },
  };
}
