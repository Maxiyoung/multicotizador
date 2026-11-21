import { NextFunction, Request, Response } from 'express';
import { logger } from '../lib/logger';

interface HttpSyntaxError extends SyntaxError {
  status?: number;
  body?: unknown;
}

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const syntaxErr = err as HttpSyntaxError;
  if (syntaxErr instanceof SyntaxError && syntaxErr.status === 400 && 'body' in syntaxErr) {
    res.status(400).json({
      error: 'El cuerpo de la solicitud no es un JSON válido.',
    });
    return;
  }

  logger.error('http.unhandled_error', err, {
    method: req.method,
    path: req.path,
  });

  res.status(500).json({
    error: 'Ocurrió un error interno al procesar la solicitud.',
  });
}
