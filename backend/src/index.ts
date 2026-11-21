import { env } from './config/env';
import { createApp } from './app';
import { logger } from './lib/logger';

const app = createApp();

const server = app.listen(env.PORT, () => {
  logger.info('server.started', {
    port: env.PORT,
    environment: env.NODE_ENV,
    mercantilMode: env.MERCANTIL_MODE,
    sancorMode: env.SANCOR_MODE,
  });
});

function shutdown(signal: string) {
  logger.info('server.shutdown_started', { signal });
  server.close((err) => {
    if (err) {
      logger.error('server.shutdown_error', err);
      process.exit(1);
    }
    logger.info('server.shutdown_complete', { signal });
    process.exit(0);
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
