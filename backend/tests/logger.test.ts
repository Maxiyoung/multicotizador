import { describe, expect, it } from 'vitest';
import { AxiosError, AxiosHeaders } from 'axios';
import { redactObject, sanitizeError } from '../src/lib/logger';

describe('logger security & sanitization', () => {
  it('redacta recursivamente claves sensibles en metadata', () => {
    const redacted = redactObject({
      provider: 'mercantil-andina',
      headers: {
        Authorization: 'Bearer super-secret-jwt',
        'Ocp-Apim-Subscription-Key': 'sub-key-123',
        gss_apiclient_id: 'sancor-client-secret',
        'Content-Type': 'application/json',
      },
      credentials: {
        username: 'pas_user',
        password: 'mi-password-real',
      },
    }) as Record<string, unknown>;

    const headers = redacted.headers as Record<string, string>;
    const creds = redacted.credentials as Record<string, string>;

    expect(headers.Authorization).toBe('[REDACTED]');
    expect(headers['Ocp-Apim-Subscription-Key']).toBe('[REDACTED]');
    expect(headers.gss_apiclient_id).toBe('[REDACTED]');
    expect(headers['Content-Type']).toBe('application/json');
    expect(creds.password).toBe('[REDACTED]');
    expect(creds.username).toBe('pas_user');
  });

  it('extrae únicamente metadata segura de AxiosError sin filtrar headers ni body', () => {
    const axiosErr = new AxiosError(
      'Request failed with status code 401',
      'ERR_BAD_REQUEST',
      {
        method: 'post',
        url: '/credenciales/v2/',
        headers: new AxiosHeaders({
          Authorization: 'Bearer SECRET_TOKEN',
          'Ocp-Apim-Subscription-Key': 'SECRET_KEY',
        }),
        data: 'password=SUPER_SECRET_PASSWORD',
      },
      undefined,
      {
        status: 401,
        statusText: 'Unauthorized',
        headers: {},
        config: { headers: new AxiosHeaders() },
        data: { error: 'invalid_grant' },
      }
    );

    const summary = sanitizeError(axiosErr);
    const serialized = JSON.stringify(summary);

    expect(summary.status).toBe(401);
    expect(summary.url).toBe('/credenciales/v2/');
    expect(summary.method).toBe('POST');
    expect(serialized).not.toContain('SECRET_TOKEN');
    expect(serialized).not.toContain('SECRET_KEY');
    expect(serialized).not.toContain('SUPER_SECRET_PASSWORD');
  });
});
