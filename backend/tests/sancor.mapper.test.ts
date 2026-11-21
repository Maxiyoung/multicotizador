import { describe, expect, it, vi } from 'vitest';
import { AxiosError, AxiosHeaders } from 'axios';
import {
  buildSancorQuotationRequest,
  mapSancorQuotationResponse,
} from '../src/adapters/sancor/sancor.mapper';
import { SancorAdapter } from '../src/adapters/sancor/sancor.adapter';
import { SancorConfig } from '../src/config/insurers';
import { QuoteInput } from '../src/interfaces/quote.interface';

const baseConfig: SancorConfig = {
  mode: 'live',
  baseURL: 'https://external-pre-api.gruposancorseguros.com/apissa/pre-catalog',
  clientId: 'test-client-id',
  username: 'pas-user',
  password: 'pas-password',
  appClient: 'SegurosAutoYa',
  producerCode: 12345,
  upperProducerCode: 10000,
  productCode: 24,
  vigencyCode: 1,
  paymentPeriodicityCode: 5,
  policyQuotas: 12,
  ivaConditionCode: 4,
};

const sampleInput: QuoteInput = {
  year: 2022,
  brand: 'Toyota',
  model: 'Corolla',
  version: '2.0 XEI CVT',
  infoAutoCode: '440310',
  vehicleValue: 32_500_000,
  postalCode: '5000',
  use: 'particular',
  hasGnc: true,
  gncValue: 1_100_000,
  isZeroKm: false,
  hasGarage: true,
};

describe('Sancor mapper & adapter', () => {
  it('construye un payload VehicleQuotation conforme al Swagger oficial', () => {
    const refDate = new Date('2026-10-01T12:00:00.000Z');
    const req = buildSancorQuotationRequest(sampleInput, baseConfig, refDate);

    expect(req.vehicleQuotation.intermediary.prodProducerCode).toBe(12345);
    expect(req.vehicleQuotation.intermediary.upperProducerCode).toBe(10000);
    expect(req.vehicleQuotation.zone.postalCode).toBe(5000);
    expect(req.vehicleQuotation.vehicle.vehicleCode).toBe('440310');
    expect(req.vehicleQuotation.vehicle.vehicleYear).toBe(2022);
    expect(req.vehicleQuotation.vehicle.yearSuggestedValue).toBe(32_500_000);
    expect(req.vehicleQuotation.vehicle.vehicleUseTypeCode).toBe(2);
    expect(req.vehicleQuotation.vehicle.gncInformation).toEqual({
      hasGNC: true,
      accesoryInsuredSum: 1_100_000,
    });
    expect(req.vehicleQuotation.garageParking).toBe(true);
    expect(req.vehicleQuotation.conditionCode).toBe(4);
  });

  it('mapea VehicleQuotationResponse a StandardQuote[] filtrando planes inválidos y extrayendo franquicia', () => {
    const quotes = mapSancorQuotationResponse(
      {
        vehicleQuotation: {
          quotationCode: 778899,
          plans: [
            {
              id: 1,
              success: false,
              quotaPremiumMonthly: 99999,
              module: { coverageCode: 1, coverageName: 'Plan rechazado' },
            },
            {
              id: 2,
              success: true,
              quotaPremiumMonthly: 22450.6,
              vehicleInsuredSum: 32_500_000,
              module: {
                coverageCode: 10,
                coverageName: 'Auto Base Responsabilidad Civil',
              },
              details: [{ planDetail: 'Responsabilidad Civil hasta $160M' }],
            },
            {
              id: 3,
              success: true,
              quotaPremiumMonthly: 64900,
              vehicleInsuredSum: 32_500_000,
              module: {
                coverageCode: 50,
                coverageName: 'Auto Todo Riesgo',
                observations: 'Franquicia fija de $450.000',
              },
              details: [{ planDetail: 'Daños parciales por accidente' }],
            },
          ],
        },
      },
      sampleInput,
      'live'
    );

    expect(quotes).toHaveLength(2);
    expect(quotes[0]).toMatchObject({
      companyId: 'sancor-seguros',
      planType: 'RC',
      price: 22451,
      quoteReference: 'SS-778899',
      source: 'live',
    });
    expect(quotes[1]).toMatchObject({
      planType: 'TODO_RIESGO',
      price: 64900,
      franchise: 450000,
      franchiseType: 'fixed',
      insuredSum: 32_500_000,
    });
  });

  it('reintenta automáticamente una vez tras recibir 401 renovando token Auth0', async () => {
    const adapter = new SancorAdapter(baseConfig);
    const httpPost = vi.spyOn(
      (adapter as unknown as { http: { post: (...args: unknown[]) => Promise<unknown> } }).http,
      'post'
    );

    let quoteAttempts = 0;
    httpPost.mockImplementation(async (url: unknown) => {
      if (url === '/v2/security/auth0/token') {
        return { data: { access_token: `jwt-${quoteAttempts + 1}`, expires_in: 3600 } };
      }

      if (url === '/quotations/vehicle/automotive') {
        quoteAttempts += 1;
        if (quoteAttempts === 1) {
          throw new AxiosError('Unauthorized', 'ERR_BAD_REQUEST', undefined, undefined, {
            status: 401,
            statusText: 'Unauthorized',
            headers: {},
            config: { headers: new AxiosHeaders() },
            data: {},
          });
        }
        return {
          data: {
            vehicleQuotation: {
              quotationCode: 551122,
              plans: [
                {
                  id: 1,
                  success: true,
                  quotaPremiumMonthly: 35000,
                  vehicleInsuredSum: 32_500_000,
                  module: { coverageCode: 30, coverageName: 'Auto Max Terceros Completo' },
                },
              ],
            },
          },
        };
      }
      throw new Error(`Unexpected URL ${String(url)}`);
    });

    const quotes = await adapter.getQuote(sampleInput);

    expect(quotes).toHaveLength(1);
    expect(quotes[0].price).toBe(35000);
    expect(quotes[0].quoteReference).toBe('SS-551122');
    // 2 logins + 2 intentos de cotización (el primero dio 401)
    expect(httpPost).toHaveBeenCalledTimes(4);
  });
});
