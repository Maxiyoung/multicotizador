import { Router } from 'express';
import { getQuotes } from '../controllers/quote.controller';

const router = Router();

router.post('/quotes', getQuotes);

export default router;
