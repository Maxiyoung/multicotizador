import fs from 'node:fs';
import path from 'node:path';
import { logger } from '../lib/logger';

/**
 * Tabla puente de homologación de códigos de vehículos por aseguradora.
 *
 * - Por defecto, la mayoría de las aseguradoras argentinas (como Sancor Seguros)
 *   aceptan el código InfoAuto (CODIA) de forma directa (1:1).
 * - Si una aseguradora usa códigos internos propios, se puede cargar un archivo
 *   `backend/data/homologation.json` con estructura:
 *   `{ "440310": { "mercantil-andina": "MA_88421", "sancor-seguros": "440310" } }`
 */

export type HomologationMap = Record<string, Record<string, string>>;

export class VehicleHomologator {
  private readonly map: HomologationMap;

  constructor(customMap?: HomologationMap) {
    this.map = customMap ?? VehicleHomologator.loadFromDisk();
  }

  private static loadFromDisk(): HomologationMap {
    const filePath = path.resolve(process.cwd(), 'data', 'homologation.json');
    if (!fs.existsSync(filePath)) {
      return {};
    }
    try {
      const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8')) as HomologationMap;
      if (parsed && typeof parsed === 'object') {
        logger.info('catalog.homologation_loaded', { entries: Object.keys(parsed).length });
        return parsed;
      }
    } catch (error) {
      logger.error('catalog.homologation_failed', error, { path: filePath });
    }
    return {};
  }

  resolveForInsurer(companyId: string, infoAutoCode?: string): string | undefined {
    if (!infoAutoCode) return undefined;
    const cleanCode = infoAutoCode.trim();
    const override = this.map[cleanCode]?.[companyId];
    return override ? override.trim() : cleanCode;
  }
}

export const vehicleHomologator = new VehicleHomologator();
