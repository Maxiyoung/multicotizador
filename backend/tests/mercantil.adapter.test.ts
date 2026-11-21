import { describe, expect, it, vi } from 'vitest';
import { MercantilAdapter } from '../src/adapters/mercantil/mercantil.adapter';
import { MercantilConfig } from '../src/config/insurers';
import { QuoteInput } from '../src/interfaces/quote.interface';

const input: QuoteInput = {
  year: 2021,
  brand: 'Volkswagen',
  model: 'Gol Trend',
  version: '1.6 Trendline 5P',
  infoAutoCode: '460412',
  vehicleValue: 13_800_000,
  postalCode: '5000',
  use: 'particular',
  hasGnc: false,
  isZeroKm: false,
  hasGarage: false,
};

describe('MercantilAdapter', () => {
  it('en modo mock devuelve planes ordenables con companyId y source=mock', async () => {
    const config: MercantilConfig = {
      mode: 'mock',
      baseURL: 'https://apidev.mercantilandina.com.ar',
      authPath: '/credenciales/v2/',
      quotePath: '',
      clientId: 'api-clientes-login',
      username: '',
      password: '',
      subscriptionKey: '',
    };

    const adapter = new MercantilAdapter(config);
    const quotes = await adapter.getQuote(input);

    expect(quotes.length).toBeGreaterThanOrEqual(2);
    expect(quotes.every((q) => q.companyId === 'mercantil-andina' && q.source === 'mock')).toBe(
      true
    );
  });

  it('en modo live llama a /credenciales/v2/ con Ocp-Apim-Subscription-Key y luego al quotePath', async () => {
    const config: MercantilConfig = {
      mode: 'live',
      baseURL: 'https://apidev.mercantilandina.com.ar',
      authPath: '/credenciales/v2/',
      quotePath: '/automotores/v1/cotizar',
      clientId: 'api-clientes-login',
      username: 'user_test',
      password: 'pass_test',
      subscriptionKey: 'sub_key_test',
    };

    const adapter = new MercantilAdapter(config);
    const httpPost = vi.spyOn(
      (adapter as unknown as { http: { post: (...args: unknown[]) => Promise<unknown> } }).http,
      'post'
    );

    httpPost.mockImplementation(async (url: unknown) => {
      if (url === '/credenciales/v2/') {
        return { data: { access_token: 'ma-token-123', expires_in: 3600 } };
      }
      if (url === '/automotores/v1/cotizar') {
        return {
          data: {
            cotizacionId: '99123',
            planes: [
              {
                codigo: 'MPLUS',
                descripcion: 'Terceros Completo Premium (M+)',
                premioMensual: 41200,
                sumaAsegurada: 13_800_000,
                coberturas: ['Robo e Incendio', 'Cristales'],
              },
            ],
          },
        };
      }
      throw new Error(`Unexpected URL ${String(url)}`);
    });

    const quotes = await adapter.getQuote(input);

    expect(httpPost).toHaveBeenNthCalledWith(
      1,
      '/credenciales/v2/',
      expect.stringContaining('client_id=api-clientes-login'),
      expect.objectContaining({
        headers: expect.objectContaining({
          'Ocp-Apim-Subscription-Key': 'sub_key_test',
        }),
      })
    );
    expect(quotes).toHaveLength(1);
    expect(quotes[0]).toMatchObject({
      companyId: 'mercantil-andina',
      price: 41200,
      planType: 'TERCEROS_COMPLETO',
      quoteReference: 'MA-99123',
      source: 'live',
    });
  });

  it('falla explícitamente en modo live si falta MERCANTIL_QUOTE_PATH', async () => {
    const config: MercantilConfig = {
      mode: 'live',
      baseURL: 'https://apidev.mercantilandina.com.ar',
      authPath: '/credenciales/v2/',
      quotePath: '',
      clientId: 'api-clientes-login',
      username: 'u',
      password: 'p',
      subscriptionKey: 'k',
    };

    const adapter = new MercantilAdapter(config);
    await expect(adapter.getQuote(input)).rejects.toThrow('Error al cotizar en Mercantil Andina');
  });
});
