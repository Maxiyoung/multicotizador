import fs from 'node:fs';
import path from 'node:path';
import {
  CatalogStats,
  CodeOrigin,
  VehicleCatalogProvider,
  VehicleVersionOption,
} from '../interfaces/catalog.interface';
import { logger } from '../lib/logger';
import {
  canonicalizeBrand,
  IndexedVehicle,
  indexVehicles,
  normalizeVehicleText,
  resolveStructuredVehicle,
  searchIndexedVehicles,
  VehicleResolutionResult,
} from './vehicle-matcher';
import seedVehicles from './data/vehicles-ar.json';

function adjustValueForYear(baseValue: number, year: number, referenceYear: number): number {
  const age = Math.max(0, referenceYear - year);
  const factor = Math.max(0.32, 1 - age * 0.055);
  return Math.round((baseValue * factor) / 100000) * 100000;
}

export interface LocalCatalogOptions {
  vehicles?: VehicleVersionOption[];
  customFilePath?: string;
}

export class LocalVehicleCatalogProvider implements VehicleCatalogProvider {
  readonly providerName: string;
  readonly codeOrigin: CodeOrigin;

  private readonly vehicles: VehicleVersionOption[];
  private readonly indexed: IndexedVehicle[];

  constructor(options: LocalCatalogOptions = {}) {
    const loaded = options.vehicles
      ? {
          items: options.vehicles,
          providerName: 'local-custom',
          codeOrigin: options.vehicles[0]?.codeOrigin ?? ('seed' as CodeOrigin),
        }
      : LocalVehicleCatalogProvider.loadCatalogFromDisk(options.customFilePath);

    this.vehicles = loaded.items;
    this.providerName = loaded.providerName;
    this.codeOrigin = loaded.codeOrigin;
    this.indexed = indexVehicles(this.vehicles);
  }

  private static loadCatalogFromDisk(customFilePath?: string): {
    items: VehicleVersionOption[];
    providerName: string;
    codeOrigin: CodeOrigin;
  } {
    const defaultOfficialPath = path.resolve(process.cwd(), 'data', 'vehicles.infoauto.json');
    const candidatePath = customFilePath?.trim()
      ? path.resolve(process.cwd(), customFilePath.trim())
      : defaultOfficialPath;

    if (fs.existsSync(candidatePath)) {
      try {
        const parsed = JSON.parse(fs.readFileSync(candidatePath, 'utf8')) as VehicleVersionOption[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          logger.info('catalog.official_file_loaded', {
            path: candidatePath,
            count: parsed.length,
          });
          return {
            items: parsed,
            providerName: 'local-infoauto-imported',
            codeOrigin: parsed[0]?.codeOrigin ?? 'infoauto',
          };
        }
      } catch (error) {
        logger.error('catalog.official_file_failed', error, { path: candidatePath });
      }
    }

    return {
      items: seedVehicles as VehicleVersionOption[],
      providerName: 'local-argentina-seed',
      codeOrigin: 'seed',
    };
  }

  getYearRange(): { minYear: number; maxYear: number } {
    return {
      minYear: 1990,
      maxYear: new Date().getFullYear() + 1,
    };
  }

  async getStats(): Promise<CatalogStats> {
    const brands = new Set(this.vehicles.map((v) => v.brand));
    return {
      vehiclesCount: this.vehicles.length,
      brandsCount: brands.size,
      codeOrigin: this.codeOrigin,
    };
  }

  private matchesYear(item: VehicleVersionOption, year?: number): boolean {
    if (!year) return true;
    return year >= item.yearFrom && year <= item.yearTo;
  }

  private withAdjustedValue(item: VehicleVersionOption, year?: number): VehicleVersionOption {
    if (!year) return item;
    const currentYear = new Date().getFullYear();
    return {
      ...item,
      estimatedValue: adjustValueForYear(
        item.estimatedValue,
        year,
        Math.min(item.yearTo, currentYear)
      ),
    };
  }

  async getBrands(year?: number): Promise<string[]> {
    const filtered = this.vehicles.filter((v) => this.matchesYear(v, year));
    return Array.from(new Set(filtered.map((v) => v.brand))).sort((a, b) =>
      a.localeCompare(b, 'es')
    );
  }

  async getModels(brand: string, year?: number): Promise<string[]> {
    const normalizedBrand = canonicalizeBrand(brand);
    const filtered = this.vehicles.filter(
      (v) => normalizeVehicleText(v.brand) === normalizedBrand && this.matchesYear(v, year)
    );
    return Array.from(new Set(filtered.map((v) => v.model))).sort((a, b) =>
      a.localeCompare(b, 'es')
    );
  }

  async getVersions(brand: string, model: string, year?: number): Promise<VehicleVersionOption[]> {
    const normalizedBrand = canonicalizeBrand(brand);
    const normalizedModel = normalizeVehicleText(model);

    return this.vehicles
      .filter(
        (v) =>
          normalizeVehicleText(v.brand) === normalizedBrand &&
          normalizeVehicleText(v.model) === normalizedModel &&
          this.matchesYear(v, year)
      )
      .map((v) => this.withAdjustedValue(v, year))
      .sort((a, b) => a.version.localeCompare(b.version, 'es'));
  }

  async search(query: string, year?: number, limit = 15): Promise<VehicleVersionOption[]> {
    const { candidates, effectiveYear } = searchIndexedVehicles(this.indexed, query, year, limit);
    return candidates.map((c) => this.withAdjustedValue(c.vehicle, effectiveYear));
  }

  async resolveVehicle(params: {
    brand?: string;
    model?: string;
    version?: string;
    query?: string;
    year?: number;
  }): Promise<VehicleResolutionResult> {
    const result = resolveStructuredVehicle(this.indexed, params);
    const yearToApply = result.extractedYear ?? params.year;
    return {
      ...result,
      bestMatch: result.bestMatch ? this.withAdjustedValue(result.bestMatch, yearToApply) : null,
      candidates: result.candidates.map((c) => ({
        ...c,
        vehicle: this.withAdjustedValue(c.vehicle, yearToApply),
      })),
    };
  }

  async findByInfoAutoCode(code: string, year?: number): Promise<VehicleVersionOption | null> {
    const found = this.vehicles.find((v) => v.infoAutoCode === code.trim());
    return found ? this.withAdjustedValue(found, year) : null;
  }
}
