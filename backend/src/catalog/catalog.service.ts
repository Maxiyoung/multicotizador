import { VehicleCatalogProvider } from '../interfaces/catalog.interface';
import { LocalVehicleCatalogProvider } from './local-catalog.provider';

export const catalogService: VehicleCatalogProvider = new LocalVehicleCatalogProvider();
