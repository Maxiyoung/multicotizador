import { Router } from 'express';
import { OrchestratorService } from '../services/orchestrator.service';
import { createCatalogControllers } from '../controllers/catalog.controller';

export function createCatalogRouter(orchestrator: OrchestratorService): Router {
  const router = Router();
  const controllers = createCatalogControllers(orchestrator);

  router.get('/catalog/meta', controllers.getMeta);
  router.get('/catalog/brands', controllers.getBrands);
  router.get('/catalog/models', controllers.getModels);
  router.get('/catalog/versions', controllers.getVersions);
  router.get('/catalog/search', controllers.searchVehicles);
  router.get('/catalog/postal-codes', controllers.searchPostalCodes);
  router.get('/catalog/postal-codes/:cp', controllers.lookupPostalCode);

  return router;
}
