import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { env } from './config/env';
import quoteRoutes from './routes/quote.routes';

const app = express();

app.set('trust proxy', 1);
app.use(helmet());

app.use(
  cors({
    origin: env.CORS_ORIGIN,
    methods: ['GET', 'POST'],
  })
);
app.use(express.json());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas solicitudes de cotización. Intenta de nuevo en 15 minutos.' },
});
app.use('/api/', limiter);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', environment: env.NODE_ENV });
});

app.use('/api', quoteRoutes);

app.listen(env.PORT, () => {
  console.log(`[Server] Listening on http://localhost:${env.PORT} (${env.NODE_ENV})`);
});
