import axios from 'axios';
import { BaseAdapter, QuoteExecutionOptions } from '../base.adapter';
import { QuoteInput, QuoteSource, StandardQuote } from '../../interfaces/quote.interface';
import { MercantilConfig } from '../../config/insurers';
import { TokenManager } from '../../lib/token-manager';
import { logger } from '../../lib/logger';
import { buildMercantilMockQuotes } from './mercantil.mock';
import {
  buildMercantilQuoteRequest,
  mapMercantilQuoteResponse,
  MercantilRawQuoteResponse,
} from './mercantil.mapper';

interface MercantilTokenResponse {
  access_token: string;
  expires_in?: number;
}

export class MercantilAdapter extends BaseAdapter {
  readonly companyId = 'mercantil-andina';
  readonly companyName = 'Mercantil Andina';
  readonly mode: QuoteSource;

  private readonly tokenManager: TokenManager;

  constructor(private readonly config: MercantilConfig, timeoutMs = 5000) {
    super(config.baseURL, timeoutMs);
    this.mode = config.mode === 'live' ? 'live' : 'mock';

    this.tokenManager = new TokenManager({
      providerName: this.companyName,
      fetcher: async () => {
        const body = new URLSearchParams({
          client_id: this.config.clientId,
          username: this.config.username,
          password: this.config.password,
          grant_type: 'password',
        });

        const response = await this.http.post<MercantilTokenResponse>(
          this.config.authPath,
          body.toString(),
          {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              'Ocp-Apim-Subscription-Key': this.config.subscriptionKey,
            },
          }
        );

        return {
          accessToken: response.data.access_token,
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
    if (!this.config.quotePath) {
      throw new Error(
        'Falta configurar MERCANTIL_QUOTE_PATH con el endpoint oficial del Swagger de cotización de Mercantil Andina'
      );
    }

    const token = await this.tokenManager.getToken(isRetry);
    const payload = buildMercantilQuoteRequest(input);

    try {
      const response = await this.http.post<MercantilRawQuoteResponse>(
        this.config.quotePath,
        payload,
        {
          signal: options?.signal,
          headers: {
            Authorization: `Bearer ${token}`,
            'Ocp-Apim-Subscription-Key': this.config.subscriptionKey,
            'Content-Type': 'application/json',
          },
        }
      );

      return mapMercantilQuoteResponse(response.data, input);
    } catch (error) {
      if (!isRetry && axios.isAxiosError(error) && error.response?.status === 401) {
        logger.warn('adapter.auth_retry', { provider: this.companyId });
        this.tokenManager.invalidate();
        return this.requestLiveQuotes(input, options, true);
      }
      throw error;
    }
  }

  async getQuote(input: QuoteInput, options?: QuoteExecutionOptions): Promise<StandardQuote[]> {
    if (this.mode === 'mock') {
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(resolve, 350);
        options?.signal?.addEventListener(
          'abort',
          () => {
            clearTimeout(timer);
            reject(new Error('Cotización cancelada por timeout'));
          },
          { once: true }
        );
      });
      return buildMercantilMockQuotes(input);
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
