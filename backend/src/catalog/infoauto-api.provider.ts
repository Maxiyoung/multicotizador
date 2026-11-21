import axios, { AxiosInstance } from 'axios';
import {
  CatalogStats,
  VehicleCatalogProvider,
  VehicleVersionOption,
} from '../interfaces/catalog.interface';
import { TokenManager } from '../lib/token-manager';
import { LocalVehicleCatalogProvider } from './local-catalog.provider';
import { logger } from '../lib/logger';

export interface InfoAutoApiConfig {
  baseURL: string;
  authPath: string;
  vehiclesPath: string;
  username: string;
  password: string;
}

interface RawInfoAutoRecord {
  codia?: string | number;
  brand?: { name?: string } | string;
  group?: { name?: string } | string;
  description?: string;
  name?: string;
  prices_from?: number;
  prices_to?: number;
  list_price?: number;
}

/**
 * Proveedor preparado para la API B2B oficial de InfoAuto (CODIA + valuaciones).
 * Descarga y cachea el catálogo en memoria (TTL 6h) delegando consultas rápidas
 * sobre `LocalVehicleCatalogProvider` para latencia < 1 ms en el formulario.
 */
export class InfoAutoApiCatalogProvider implements VehicleCatalogProvider {
  readonly providerName = 'infoauto-api-live';
  readonly codeOrigin = 'infoauto' as const;

  private readonly http: AxiosInstance;
  private readonly tokenManager: TokenManager;
  private cachedDelegate: LocalVehicleCatalogProvider | null = null;
  private cacheExpiresAt = 0;
  private readonly cacheTtlMs = 6 * 60 * 60 * 1000;

  constructor(private readonly config: InfoAutoApiConfig) {
    this.http = axios.create({
      baseURL: config.baseURL,
      timeout: 10_000,
    });

    this.tokenManager = new TokenManager({
      providerName: 'InfoAuto API',
      fetcher: async () => {
        const res = await this.http.post<{ access_token: string; expires_in?: number }>(
          this.config.authPath,
          {},
          {
            auth: {
              username: this.config.username,
              password: this.config.password,
            },
          }
        );

        return {
          accessToken: res.data.access_token,
          expiresInSec: res.data.expires_in ?? 3600,
        };
      },
    });
  }

  private async ensureDelegate(): Promise<LocalVehicleCatalogProvider> {
    if (this.cachedDelegate && Date.now() < this.cacheExpiresAt) {
      return this.cachedDelegate;
    }

    const token = await this.tokenManager.getToken();
    const res = await this.http.get<RawInfoAutoRecord[]>(this.config.vehiclesPath, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const currentYear = new Date().getFullYear();
    const normalized: VehicleVersionOption[] = (res.data ?? [])
      .filter((row) => row.codia !== undefined && row.codia !== null)
      .map((row) => {
        const brand = typeof row.brand === 'string' ? row.brand : row.brand?.name ?? 'Otros';
        const model = typeof row.group === 'string' ? row.group : row.group?.name ?? 'Estándar';
        const version = (row.description || row.name || model).trim();
        return {
          infoAutoCode: String(row.codia).trim(),
          brand: brand.trim(),
          model: model.trim(),
          version,
          yearFrom: row.prices_from ?? 1995,
          yearTo: row.prices_to ?? currentYear + 1,
          estimatedValue: row.list_price && row.list_price > 0 ? row.list_price : 20_000_000,
          bodyType: 'sedan',
          fuel: 'nafta',
          codeOrigin: 'infoauto',
        };
      });

    logger.info('catalog.infoauto_api_synced', { count: normalized.length });
    this.cachedDelegate = new LocalVehicleCatalogProvider({ vehicles: normalized });
    this.cacheExpiresAt = Date.now() + this.cacheTtlMs;
    return this.cachedDelegate;
  }

  getYearRange(): { minYear: number; maxYear: number } {
    return { minYear: 1990, maxYear: new Date().getFullYear() + 1 };
  }

  async getStats(): Promise<CatalogStats> {
    const delegate = await this.ensureDelegate();
    return delegate.getStats();
  }

  async getBrands(year?: number): Promise<string[]> {
    const delegate = await this.ensureDelegate();
    return delegate.getBrands(year);
  }

  async getModels(brand: string, year?: number): Promise<string[]> {
    const delegate = await this.ensureDelegate();
    return delegate.getModels(brand, year);
  }

  async getVersions(brand: string, model: string, year?: number): Promise<VehicleVersionOption[]> {
    const delegate = await this.ensureDelegate();
    return delegate.getVersions(brand, model, year);
  }

  async search(query: string, year?: number, limit?: number): Promise<VehicleVersionOption[]> {
    const delegate = await this.ensureDelegate();
    return delegate.search(query, year, limit);
  }

  async findByInfoAutoCode(code: string): Promise<VehicleVersionOption | null> {
    const delegate = await this.ensureDelegate();
    return delegate.findByInfoAutoCode(code);
  }
}
