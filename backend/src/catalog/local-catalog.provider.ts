import fs from 'node:fs';
import path from 'node:path';
import {
  CatalogStats,
  CodeOrigin,
  VehicleCatalogProvider,
  VehicleVersionOption,
} from '../interfaces/catalog.interface';
import { logger } from '../lib/logger';
import seedVehicles from './data/vehicles-ar.json';

function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

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
  private readonly indexed: Array<{ item: VehicleVersionOption; haystack: string }>;

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

    this.indexed = this.vehicles.map((item) => ({
      item,
      haystack: normalizeText(`${item.infoAutoCode} ${item.brand} ${item.model} ${item.version}`),
    }));
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
      estimatedValue: adjustValueForYear(item.estimatedValue, year, Math.min(item.yearTo, currentYear)),
    };
  }

  async getBrands(year?: number): Promise<string[]> {
    const filtered = this.vehicles.filter((v) => this.matchesYear(v, year));
    return Array.from(new Set(filtered.map((v) => v.brand))).sort((a, b) =>
      a.localeCompare(b, 'es')
    );
  }

  async getModels(brand: string, year?: number): Promise<string[]> {
    const normalizedBrand = normalizeText(brand);
    const filtered = this.vehicles.filter(
      (v) => normalizeText(v.brand) === normalizedBrand && this.matchesYear(v, year)
    );
    return Array.from(new Set(filtered.map((v) => v.model))).sort((a, b) =>
      a.localeCompare(b, 'es')
    );
  }

  async getVersions(brand: string, model: string, year?: number): Promise<VehicleVersionOption[]> {
    const normalizedBrand = normalizeText(brand);
    const normalizedModel = normalizeText(model);

    return this.vehicles
      .filter(
        (v) =>
          normalizeText(v.brand) === normalizedBrand &&
          normalizeText(v.model) === normalizedModel &&
          this.matchesYear(v, year)
      )
      .map((v) => this.withAdjustedValue(v, year))
      .sort((a, b) => a.version.localeCompare(b.version, 'es'));
  }

  async search(query: string, year?: number, limit = 15): Promise<VehicleVersionOption[]> {
    const norm = normalizeText(query);
    if (!norm) return [];

    const tokens = norm.split(/\s+/).filter(Boolean);
    const matches: Array<{ item: VehicleVersionOption; score: number }> = [];

    for (const entry of this.indexed) {
      if (!this.matchesYear(entry.item, year)) continue;
      if (!tokens.every((t) => entry.haystack.includes(t))) continue;

      let score = 0;
      if (entry.item.infoAutoCode === norm) score += 200;
      else if (entry.item.infoAutoCode.startsWith(norm)) score += 120;
      if (normalizeText(entry.item.model).startsWith(tokens[0])) score += 50;
      if (normalizeText(entry.item.brand).startsWith(tokens[0])) score += 30;

      matches.push({ item: this.withAdjustedValue(entry.item, year), score });
    }

    return matches
      .sort(
        (a, b) =>
          b.score - a.score ||
          a.item.brand.localeCompare(b.item.brand, 'es') ||
          a.item.model.localeCompare(b.item.model, 'es')
      )
      .slice(0, limit)
      .map((m) => m.item);
  }

  async findByInfoAutoCode(code: string): Promise<VehicleVersionOption | null> {
    return this.vehicles.find((v) => v.infoAutoCode === code.trim()) ?? null;
  }
}
