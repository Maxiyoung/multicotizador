import axios from 'axios';

export type PlanCategory = 'RC' | 'TERCEROS_COMPLETO' | 'TODO_RIESGO';

export interface QuoteInput {
  year: number;
  brand: string;
  model: string;
  version: string;
  postalCode: string;
  use: 'particular' | 'comercial';
  hasGnc: boolean;
  isZeroKm: boolean;
}

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

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
});

export const fetchQuotes = async (data: QuoteInput): Promise<QuoteResponse> => {
  const response = await api.post<QuoteResponse>('/quotes', data);
  return response.data;
};
