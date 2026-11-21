import { env } from '../config/env';
import { VehicleCatalogProvider } from '../interfaces/catalog.interface';
import { LocalVehicleCatalogProvider } from './local-catalog.provider';
import { InfoAutoApiCatalogProvider } from './infoauto-api.provider';

function createCatalogService(): VehicleCatalogProvider {
  if (env.CATALOG_PROVIDER === 'infoauto-api') {
    return new InfoAutoApiCatalogProvider({
      baseURL: env.INFOAUTO_BASE_URL,
      authPath: env.INFOAUTO_AUTH_PATH,
      vehiclesPath: env.INFOAUTO_VEHICLES_PATH,
      username: env.INFOAUTO_USER,
      password: env.INFOAUTO_PASSWORD,
    });
  }

  return new LocalVehicleCatalogProvider({
    customFilePath: env.CATALOG_FILE_PATH || undefined,
  });
}

export const catalogService: VehicleCatalogProvider = createCatalogService();
