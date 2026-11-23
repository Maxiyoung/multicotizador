import crypto from 'node:crypto';
import axios from 'axios';
import { BaseAdapter, QuoteExecutionOptions } from '../base.adapter';
import { QuoteInput, QuoteSource, StandardQuote } from '../../interfaces/quote.interface';
import { SancorConfig } from '../../config/insurers';
import { TokenManager } from '../../lib/token-manager';
import { logger, sanitizeError } from '../../lib/logger';
import {
  SancorTokenRequest,
  SancorTokenResponse,
  SancorVehicleQuotationResponse,
} from './sancor.types';
import { buildSancorQuotationRequest, mapSancorQuotationResponse } from './sancor.mapper';
import { buildSancorMockResponse } from './sancor.mock';

export class SancorAdapter extends BaseAdapter {
  readonly companyId = 'sancor-seguros';
  readonly companyName = 'Sancor Seguros';
  readonly mode: QuoteSource;

  private readonly tokenManager: TokenManager;

  constructor(private readonly config: SancorConfig, timeoutMs = 5500) {
    super(config.baseURL, timeoutMs);
    this.mode = config.mode === 'live' ? 'live' : 'mock';

    this.tokenManager = new TokenManager({
      providerName: this.companyName,
      fetcher: async () => {
        const body: SancorTokenRequest = {
          username: this.config.username,
          password: this.config.password,
          app_client: this.config.appClient,
        };

        const response = await this.http.post<SancorTokenResponse>(
          '/v2/security/auth0/token',
          body,
          {
            headers: {
              'Content-Type': 'application/json',
              gss_apiclient_id: this.config.clientId,
            },
          }
        );

        let finalToken = response.data.access_token;

        // Intercambio opcional de token Auth0 -> token ESB según `getauthesb_1.0.0.json`
        if (this.config.useEsbAuth && finalToken) {
          const esbRes = await this.http.get<string>('/security/generate/authorization/esb', {
            headers: {
              Authorization: `Bearer ${finalToken}`,
              gss_apiclient_id: this.config.clientId,
            },
          });
          if (typeof esbRes.data === 'string' && esbRes.data.trim()) {
            finalToken = esbRes.data.trim().replace(/^Bearer\s+/i, '');
          }
        }

        return {
          accessToken: finalToken,
          expiresInSec: response.data.expires_in ?? 3600,
        };
      },
    });
  }

  private async requestLiveQuotes(
    input: QuoteInput,
    options?: QuoteExecutionOptions,
    isRetry = false
  ): Promise<StandardQuote[]> {
    if (!input.infoAutoCode) {
      throw new Error(
        'Sancor Seguros requiere infoAutoCode (vehicleCode de InfoAuto) para cotizar en modo live'
      );
    }

    const token = await this.tokenManager.getToken(isRetry);
    const payload = buildSancorQuotationRequest(input, this.config);

    try {
      const response = await this.http.post<SancorVehicleQuotationResponse>(
        '/quotations/vehicle/automotive',
        payload,
        {
          signal: options?.signal,
          headers: {
            Authorization: `Bearer ${token}`,
            gss_apiclient_id: this.config.clientId,
            'X-dynaTrace': crypto.randomUUID(),
            'Content-Type': 'application/json',
          },
        }
      );

      return mapSancorQuotationResponse(response.data, input, 'live');
    } catch (error) {
      if (!isRetry && axios.isAxiosError(error) && error.response?.status === 401) {
        logger.warn('adapter.auth_retry', { provider: this.companyId });
        this.tokenManager.invalidate();
        return this.requestLiveQuotes(input, options, true);
      }
      throw error;
    }
  }

  async verifyAuth(): Promise<{ ok: boolean; latencyMs: number; message: string }> {
    if (this.mode === 'mock') {
      return { ok: true, latencyMs: 0, message: 'Modo mock activo (sin llamada externa).' };
    }
    const startedAt = Date.now();
    try {
      await this.tokenManager.getToken(true);
      return {
        ok: true,
        latencyMs: Date.now() - startedAt,
        message: `Autenticación Auth0 exitosa (/v2/security/auth0/token). Productor #${this.config.producerCode}.`,
      };
    } catch (error) {
      const safe = sanitizeError(error);
      return {
        ok: false,
        latencyMs: Date.now() - startedAt,
        message: `Error de autenticación (${safe.status ?? safe.code ?? 'red'}): ${safe.message}`,
      };
    }
  }

  async getQuote(input: QuoteInput, options?: QuoteExecutionOptions): Promise<StandardQuote[]> {
    if (this.mode === 'mock') {
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(resolve, 480);
        options?.signal?.addEventListener(
          'abort',
          () => {
            clearTimeout(timer);
            reject(new Error('Cotización cancelada por timeout'));
          },
          { once: true }
        );
      });
      const mockResponse = buildSancorMockResponse(input);
      return mapSancorQuotationResponse(mockResponse, input, 'mock');
    }

    try {
      return await this.requestLiveQuotes(input, options);
    } catch (error) {
      logger.error('adapter.quote_failed', error, {
        provider: this.companyId,
        mode: this.mode,
      });
      throw new Error(`Error al cotizar en ${this.companyName}`);
    }
  }
}
