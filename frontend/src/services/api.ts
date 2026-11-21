import axios from 'axios';

export type PlanCategory = 'RC' | 'TERCEROS_COMPLETO' | 'TODO_RIESGO';
export type QuoteSource = 'live' | 'mock';

export interface QuoteInput {
  year: number;
  brand: string;
  model: string;
  version: string;
  infoAutoCode?: string;
  vehicleValue?: number;
  postalCode: string;
  use: 'particular' | 'comercial';
  hasGnc: boolean;
  gncValue?: number;
  isZeroKm: boolean;
  hasGarage: boolean;
}

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

export interface VehicleVersionOption {
  infoAutoCode: string;
  brand: string;
  model: string;
  version: string;
  yearFrom: number;
  yearTo: number;
  estimatedValue: number;
  bodyType: 'sedan' | 'hatchback' | 'suv' | 'pickup' | 'utilitario';
}

export interface CatalogMeta {
  catalogProvider: string;
  yearRange: { minYear: number; maxYear: number };
  activeProviders: Array<{
    companyId: string;
    companyName: string;
    mode: QuoteSource;
  }>;
}

export interface LeadIntentPayload {
  companyId: string;
  companyName: string;
  planName: string;
  planType: PlanCategory;
  price: number;
  quoteReference?: string;
  externalId: string;
  source: QuoteSource;
  vehicle: {
    year: number;
    brand: string;
    model: string;
    version: string;
    infoAutoCode?: string;
    postalCode: string;
    hasGnc: boolean;
    isZeroKm: boolean;
  };
}

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
  timeout: 15_000,
});

export function extractApiErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    if (error.code === 'ECONNABORTED') {
      return 'La consulta superó el tiempo máximo de espera. Intentá nuevamente.';
    }

    const data = error.response?.data as { error?: string; details?: string[] } | undefined;
    if (data?.details && data.details.length > 0) {
      return `${data.error ?? 'Revisá los datos ingresados'}: ${data.details.join(' · ')}`;
    }
    if (data?.error) {
      return data.error;
    }
    if (!error.response) {
      return 'No pudimos conectarnos con el servidor de cotizaciones. Verificá que el backend esté activo.';
    }
  }

  return error instanceof Error
    ? error.message
    : 'Ocurrió un error inesperado al procesar la cotización.';
}

export const fetchCatalogMeta = async (): Promise<CatalogMeta> => {
  const response = await api.get<CatalogMeta>('/catalog/meta');
  return response.data;
};

export const fetchBrands = async (year?: number): Promise<string[]> => {
  const response = await api.get<{ brands: string[] }>('/catalog/brands', {
    params: year ? { year } : undefined,
  });
  return response.data.brands;
};

export const fetchModels = async (brand: string, year?: number): Promise<string[]> => {
  const response = await api.get<{ models: string[] }>('/catalog/models', {
    params: { brand, ...(year ? { year } : {}) },
  });
  return response.data.models;
};

export const fetchVersions = async (
  brand: string,
  model: string,
  year?: number
): Promise<VehicleVersionOption[]> => {
  const response = await api.get<{ versions: VehicleVersionOption[] }>('/catalog/versions', {
    params: { brand, model, ...(year ? { year } : {}) },
  });
  return response.data.versions;
};

export const fetchQuotes = async (data: QuoteInput): Promise<QuoteResponse> => {
  try {
    const response = await api.post<QuoteResponse>('/quotes', data);
    return response.data;
  } catch (error) {
    throw new Error(extractApiErrorMessage(error), { cause: error });
  }
};

export const trackLeadClick = async (payload: LeadIntentPayload): Promise<void> => {
  try {
    await api.post('/leads', payload, { timeout: 2500 });
  } catch {
    // No bloqueamos nunca la apertura de WhatsApp si falla el tracking
  }
};
