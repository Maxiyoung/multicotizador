import { VehicleCatalogProvider, VehicleVersionOption } from '../interfaces/catalog.interface';
import { SEED_VEHICLES } from './seed-vehicles.data';

function adjustValueForYear(baseValue: number, year: number, referenceYear: number): number {
  const age = Math.max(0, referenceYear - year);
  // Depreciación estimada de referencia (~5.5% anual, piso 35% del valor base)
  const factor = Math.max(0.35, 1 - age * 0.055);
  return Math.round((baseValue * factor) / 100000) * 100000;
}

export class LocalVehicleCatalogProvider implements VehicleCatalogProvider {
  readonly providerName = 'local-infoauto-seed';

  constructor(private readonly vehicles: VehicleVersionOption[] = SEED_VEHICLES) {}

  getYearRange(): { minYear: number; maxYear: number } {
    return {
      minYear: 1990,
      maxYear: new Date().getFullYear() + 1,
    };
  }

  private matchesYear(item: VehicleVersionOption, year?: number): boolean {
    if (!year) return true;
    return year >= item.yearFrom && year <= item.yearTo;
  }

  async getBrands(year?: number): Promise<string[]> {
    const filtered = this.vehicles.filter((v) => this.matchesYear(v, year));
    return Array.from(new Set(filtered.map((v) => v.brand))).sort((a, b) =>
      a.localeCompare(b, 'es')
    );
  }

  async getModels(brand: string, year?: number): Promise<string[]> {
    const normalizedBrand = brand.trim().toLowerCase();
    const filtered = this.vehicles.filter(
      (v) => v.brand.toLowerCase() === normalizedBrand && this.matchesYear(v, year)
    );
    return Array.from(new Set(filtered.map((v) => v.model))).sort((a, b) =>
      a.localeCompare(b, 'es')
    );
  }

  async getVersions(brand: string, model: string, year?: number): Promise<VehicleVersionOption[]> {
    const normalizedBrand = brand.trim().toLowerCase();
    const normalizedModel = model.trim().toLowerCase();
    const currentYear = new Date().getFullYear();

    return this.vehicles
      .filter(
        (v) =>
          v.brand.toLowerCase() === normalizedBrand &&
          v.model.toLowerCase() === normalizedModel &&
          this.matchesYear(v, year)
      )
      .map((v) => ({
        ...v,
        estimatedValue: year
          ? adjustValueForYear(v.estimatedValue, year, Math.min(v.yearTo, currentYear))
          : v.estimatedValue,
      }))
      .sort((a, b) => a.version.localeCompare(b.version, 'es'));
  }

  async findByInfoAutoCode(code: string): Promise<VehicleVersionOption | null> {
    return this.vehicles.find((v) => v.infoAutoCode === code.trim()) ?? null;
  }
}
