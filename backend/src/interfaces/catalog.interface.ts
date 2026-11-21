export interface VehicleVersionOption {
  infoAutoCode: string;
  brand: string;
  model: string;
  version: string;
  yearFrom: number;
  yearTo: number;
  estimatedValue: number;
  bodyType: 'sedan' | 'hatchback' | 'suv' | 'pickup' | 'utilitario';
}

export interface VehicleCatalogProvider {
  readonly providerName: string;
  getYearRange(): { minYear: number; maxYear: number };
  getBrands(year?: number): Promise<string[]>;
  getModels(brand: string, year?: number): Promise<string[]>;
  getVersions(brand: string, model: string, year?: number): Promise<VehicleVersionOption[]>;
  findByInfoAutoCode(code: string): Promise<VehicleVersionOption | null>;
}
