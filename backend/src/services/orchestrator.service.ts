import {
  ProviderStatus,
  QuoteInput,
  QuoteResponse,
  StandardQuote,
} from '../interfaces/quote.interface';
import { BaseAdapter } from '../adapters/base.adapter';
import { createEnabledAdapters } from '../adapters/registry';
import { env } from '../config/env';
import { QuoteCache } from '../lib/quote-cache';
import { logger } from '../lib/logger';

export interface OrchestratorOptions {
  adapters?: BaseAdapter[];
  timeoutMs?: number;
  cacheTtlMs?: number;
}

export function buildQuoteCacheKey(input: QuoteInput): string {
  return JSON.stringify({
    year: input.year,
    brand: input.brand.toLowerCase(),
    model: input.model.toLowerCase(),
    version: input.version.toLowerCase(),
    infoAutoCode: input.infoAutoCode ?? '',
    vehicleValue: input.vehicleValue ?? 0,
    postalCode: input.postalCode,
    use: input.use,
    hasGnc: input.hasGnc,
    gncValue: input.hasGnc ? input.gncValue ?? 0 : 0,
    isZeroKm: input.isZeroKm,
    hasGarage: input.hasGarage,
    dni: input.dni ?? '',
  });
}

export class OrchestratorService {
  private readonly adapters: BaseAdapter[];
  private readonly timeoutMs: number;
  private readonly cache: QuoteCache<Omit<QuoteResponse, 'cached'>>;

  constructor(options: OrchestratorOptions = {}) {
    this.adapters = options.adapters ?? createEnabledAdapters();
    this.timeoutMs = options.timeoutMs ?? env.QUOTE_TIMEOUT_MS;
    const ttlMs = options.cacheTtlMs ?? env.QUOTE_CACHE_TTL_SEC * 1000;
    this.cache = new QuoteCache<Omit<QuoteResponse, 'cached'>>(ttlMs);
  }

  getEnabledProviders() {
    return this.adapters.map((adapter) => ({
      companyId: adapter.companyId,
      companyName: adapter.companyName,
      mode: adapter.mode,
    }));
  }

  async calculateAllQuotes(input: QuoteInput): Promise<QuoteResponse> {
    const cacheKey = buildQuoteCacheKey(input);
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return { ...cached, cached: true };
    }

    const controller = new AbortController();
    const globalTimer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const providerPromises = this.adapters.map(async (adapter) => {
        const startedAt = Date.now();
        try {
          const quotes = await adapter.getQuote(input, { signal: controller.signal });
          const durationMs = Date.now() - startedAt;
          return {
            adapter,
            status: 'ok' as const,
            quotes,
            durationMs,
          };
        } catch (error) {
          const durationMs = Date.now() - startedAt;
          logger.error('orchestrator.provider_failed', error, {
            provider: adapter.companyId,
            durationMs,
          });
          return {
            adapter,
            status: 'error' as const,
            quotes: [] as StandardQuote[],
            durationMs,
          };
        }
      });

      const results = await Promise.all(providerPromises);

      const quotes: StandardQuote[] = [];
      const failedProviders: string[] = [];
      const providerStatuses: ProviderStatus[] = [];

      for (const res of results) {
        if (res.status === 'ok') {
          quotes.push(...res.quotes);
        } else {
          failedProviders.push(res.adapter.companyName);
        }

        providerStatuses.push({
          companyId: res.adapter.companyId,
          companyName: res.adapter.companyName,
          status: res.status,
          source: res.adapter.mode,
          durationMs: res.durationMs,
          quotesCount: res.quotes.length,
        });
      }

      const payload: Omit<QuoteResponse, 'cached'> = {
        quotes: quotes.sort((a, b) => a.price - b.price),
        failedProviders,
        providerStatuses,
        timestamp: new Date().toISOString(),
      };

      // Solo cacheamos respuestas simuladas (mock): en modo live cada usuario debe obtener
      // su propio quotationCode único ante la aseguradora para evitar colisiones al emitir.
      const hasLiveQuotes = quotes.some((q) => q.source === 'live');
      if (quotes.length > 0 && failedProviders.length === 0 && !hasLiveQuotes) {
        this.cache.set(cacheKey, payload);
      }

      return { ...payload, cached: false };
    } finally {
      clearTimeout(globalTimer);
    }
  }
}
