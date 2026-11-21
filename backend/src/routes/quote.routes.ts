import { Router } from 'express';
import { OrchestratorService } from '../services/orchestrator.service';
import { createQuoteController } from '../controllers/quote.controller';

export function createQuoteRouter(orchestrator: OrchestratorService): Router {
  const router = Router();
  router.post('/quotes', createQuoteController(orchestrator));
  return router;
}
