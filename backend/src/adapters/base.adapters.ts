import axios, { AxiosInstance } from 'axios';
import axiosRetry from 'axios-retry';
import { QuoteInput, StandardQuote } from '../interfaces/quote.interface';

export abstract class BaseAdapter {
  abstract readonly companyName: string;
  protected readonly http: AxiosInstance;

  constructor(baseURL?: string, timeoutMs = 6000) {
    this.http = axios.create({
      baseURL,
      timeout: timeoutMs,
    });

    axiosRetry(this.http, {
      retries: 2,
      retryDelay: axiosRetry.exponentialDelay,
      retryCondition: (error) =>
        axiosRetry.isNetworkOrIdempotentRequestError(error) ||
        (error.response?.status ? error.response.status >= 500 : false),
    });
  }

  abstract getQuote(input: QuoteInput): Promise<StandardQuote[]>;
}
