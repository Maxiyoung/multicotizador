import { z } from 'zod';
import { quoteInputSchema } from '../schemas/quote.schema';

export type QuoteInput = z.infer<typeof quoteInputSchema>;

export type PlanCategory = 'RC' | 'TERCEROS_COMPLETO' | 'TODO_RIESGO';

export interface StandardQuote {
  companyName: string;
  logo: string;
  planName: string;
  planType: PlanCategory;
  price: number;
  franchise?: number;
  coverageDetails: string[];
  externalId: string;
}

export interface QuoteResponse {
  quotes: StandardQuote[];
  failedProviders: string[];
  timestamp: string;
}
