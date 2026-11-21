import type { VehicleResolutionResult } from '../catalog/vehicle-matcher';

export type CodeOrigin = 'seed' | 'infoauto';

export type VehicleBodyType = 'sedan' | 'hatchback' | 'suv' | 'pickup' | 'utilitario';
export type VehicleFuelType = 'nafta' | 'diesel' | 'hibrido' | 'gnc' | 'electrico';

export interface VehicleVersionOption {
  infoAutoCode: string;
  brand: string;
  model: string;
  version: string;
  yearFrom: number;
  yearTo: number;
  estimatedValue: number;
  bodyType: VehicleBodyType;
  fuel: VehicleFuelType;
  codeOrigin: CodeOrigin;
}

export interface PostalCodeEntry {
  postalCode: string;
  locality: string;
  province: string;
  aliases?: string[];
}

export interface CatalogStats {
  vehiclesCount: number;
  brandsCount: number;
  codeOrigin: CodeOrigin;
}

export interface VehicleCatalogProvider {
  readonly providerName: string;
  readonly codeOrigin: CodeOrigin;
  getYearRange(): { minYear: number; maxYear: number };
  getStats(): Promise<CatalogStats>;
  getBrands(year?: number): Promise<string[]>;
  getModels(brand: string, year?: number): Promise<string[]>;
  getVersions(brand: string, model: string, year?: number): Promise<VehicleVersionOption[]>;
  search(query: string, year?: number, limit?: number): Promise<VehicleVersionOption[]>;
  resolveVehicle(params: {
    brand?: string;
    model?: string;
    version?: string;
    query?: string;
    year?: number;
  }): Promise<VehicleResolutionResult>;
  findByInfoAutoCode(code: string, year?: number): Promise<VehicleVersionOption | null>;
}
