import { Router } from 'express';
import { registerLeadIntent } from '../controllers/lead.controller';

export function createLeadRouter(): Router {
  const router = Router();
  router.post('/leads', registerLeadIntent);
  return router;
}
