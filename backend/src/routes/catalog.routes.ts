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

  return router;
}
