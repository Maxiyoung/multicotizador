import { z } from 'zod';
import { quoteInputSchema } from '../schemas/quote.schema';

export type QuoteInput = z.infer<typeof quoteInputSchema>;

export type PlanCategory = 'RC' | 'TERCEROS_COMPLETO' | 'TODO_RIESGO';
export type QuoteSource = 'live' | 'mock';

export interface StandardQuote {
  companyId: string;
  companyName: string;
  logo: string;
  planName: string;
  planType: PlanCategory;
  price: number;
  currency: 'ARS';
  billingPeriod: 'MENSUAL';
  insuredSum?: number;
  franchise?: number;
  franchiseType?: 'fixed' | 'percentage';
  coverageDetails: string[];
  externalId: string;
  quoteReference?: string;
  validUntil?: string;
  source: QuoteSource;
}

export interface ProviderStatus {
  companyId: string;
  companyName: string;
  status: 'ok' | 'error';
  source: QuoteSource;
  durationMs: number;
  quotesCount: number;
}

export interface QuoteResponse {
  quotes: StandardQuote[];
  failedProviders: string[];
  providerStatuses: ProviderStatus[];
  cached: boolean;
  timestamp: string;
}
