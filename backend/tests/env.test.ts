import { describe, expect, it } from 'vitest';
import { getCorsOrigins, parseEnv } from '../src/config/env';

describe('env validation', () => {
  it('permite arrancar en modo mock sin credenciales reales', () => {
    const cfg = parseEnv({
      NODE_ENV: 'development',
      MERCANTIL_MODE: 'mock',
      SANCOR_MODE: 'mock',
    });

    expect(cfg.MERCANTIL_MODE).toBe('mock');
    expect(cfg.SANCOR_MODE).toBe('mock');
    expect(cfg.MERCANTIL_AUTH_PATH).toBe('/credenciales/v2/');
  });

  it('falla al arrancar si MERCANTIL_MODE=live y faltan credenciales', () => {
    expect(() =>
      parseEnv({
        MERCANTIL_MODE: 'live',
        SANCOR_MODE: 'off',
      })
    ).toThrow(/MERCANTIL_USER/);
  });

  it('falla al arrancar si SANCOR_MODE=live y faltan credenciales', () => {
    expect(() =>
      parseEnv({
        MERCANTIL_MODE: 'off',
        SANCOR_MODE: 'live',
      })
    ).toThrow(/SANCOR_CLIENT_ID/);
  });

  it('parsea múltiples orígenes CORS separados por coma', () => {
    expect(getCorsOrigins('http://localhost:5173, https://segurosautoya.com.ar ')).toEqual([
      'http://localhost:5173',
      'https://segurosautoya.com.ar',
    ]);
  });
});
