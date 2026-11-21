import axios, { AxiosError, AxiosInstance } from 'axios';
import axiosRetry from 'axios-retry';
import { QuoteInput, QuoteSource, StandardQuote } from '../interfaces/quote.interface';

export interface QuoteExecutionOptions {
  signal?: AbortSignal;
}

export abstract class BaseAdapter {
  abstract readonly companyId: string;
  abstract readonly companyName: string;
  abstract readonly mode: QuoteSource;

  protected readonly http: AxiosInstance;

  constructor(baseURL?: string, timeoutMs = 5000) {
    this.http = axios.create({
      baseURL,
      timeout: timeoutMs,
    });

    // Las cotizaciones son lecturas modeladas como POST: permitimos reintentar
    // solo ante fallos transitorios de red, timeout o 5xx (nunca ante 4xx ni aborts).
    axiosRetry(this.http, {
      retries: 1,
      retryDelay: (retryCount) => retryCount * 350,
      shouldResetTimeout: false,
      retryCondition: (error: AxiosError) => {
        if (error.code === 'ERR_CANCELED' || error.name === 'CanceledError') {
          return false;
        }
        const status = error.response?.status;
        if (status !== undefined) {
          return status >= 500 || status === 429;
        }
        return axiosRetry.isNetworkError(error) || error.code === 'ECONNABORTED';
      },
    });
  }

  abstract getQuote(input: QuoteInput, options?: QuoteExecutionOptions): Promise<StandardQuote[]>;
}
