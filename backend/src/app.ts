import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { env, getCorsOrigins } from './config/env';
import { OrchestratorService } from './services/orchestrator.service';
import { createQuoteRouter } from './routes/quote.routes';
import { createCatalogRouter } from './routes/catalog.routes';
import { createLeadRouter } from './routes/lead.routes';
import { errorHandler } from './middlewares/error-handler';

export interface CreateAppOptions {
  orchestrator?: OrchestratorService;
  corsOrigins?: string[];
}

export function createApp(options: CreateAppOptions = {}): Express {
  const app = express();
  const orchestrator = options.orchestrator ?? new OrchestratorService();
  const allowedOrigins = options.corsOrigins ?? getCorsOrigins();

  app.set('trust proxy', 1);
  app.use(helmet());

  app.use(
    cors({
      origin: (origin, callback) => {
        // Permite requests server-to-server / curl sin Origin o los orígenes configurados
        if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
          callback(null, true);
          return;
        }
        callback(null, false);
      },
      methods: ['GET', 'POST', 'OPTIONS'],
    })
  );

  app.use(express.json({ limit: '16kb' }));

  const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Demasiadas solicitudes. Intentá de nuevo en unos minutos.' },
  });

  const quoteLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 60,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Alcanzaste el límite de cotizaciones. Intentá de nuevo en 15 minutos.' },
  });

  app.use('/api/', generalLimiter);
  app.use('/api/quotes', quoteLimiter);

  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      environment: env.NODE_ENV,
      providers: orchestrator.getEnabledProviders(),
    });
  });

  app.use('/api', createQuoteRouter(orchestrator));
  app.use('/api', createCatalogRouter(orchestrator));
  app.use('/api', createLeadRouter());

  app.use((_req, res) => {
    res.status(404).json({ error: 'Endpoint no encontrado' });
  });

  app.use(errorHandler);

  return app;
}
