import { describe, expect, it } from 'vitest';
import { runApiDoctor } from '../src/scripts/api-doctor';

describe('API Doctor CLI', () => {
  it('reporta OK en modo mock y valida cotización de prueba en ambas aseguradoras', async () => {
    const result = await runApiDoctor({
      rawEnv: {
        NODE_ENV: 'test',
        PORT: '3000',
        CORS_ORIGIN: 'http://localhost:5173',
        MERCANTIL_MODE: 'mock',
        SANCOR_MODE: 'mock',
      },
      runQuoteTest: true,
    });

    expect(result.ok).toBe(true);
    expect(result.checks.some((c) => c.component === 'Mercantil Andina (Prueba Cotización)' && c.status === 'ok')).toBe(
      true
    );
    expect(
      result.checks.some((c) => c.component === 'Grupo Sancor Seguros (Prueba Cotización)' && c.status === 'ok')
    ).toBe(true);
  });

  it('reporta error claro si una aseguradora está en modo live sin credenciales', async () => {
    const result = await runApiDoctor({
      rawEnv: {
        MERCANTIL_MODE: 'live',
        SANCOR_MODE: 'off',
      },
    });

    expect(result.ok).toBe(false);
    expect(result.checks[0].status).toBe('error');
    expect(result.checks[0].detail).toContain('MERCANTIL_USER');
  });
});
