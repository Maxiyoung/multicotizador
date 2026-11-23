import { describe, expect, it, vi } from 'vitest';
import { BaseAdapter, QuoteExecutionOptions } from '../src/adapters/base.adapter';
import { OrchestratorService } from '../src/services/orchestrator.service';
import { QuoteInput, StandardQuote } from '../src/interfaces/quote.interface';

class FakeAdapter extends BaseAdapter {
  readonly mode = 'mock' as const;

  constructor(
    readonly companyId: string,
    readonly companyName: string,
    private readonly handler: (
      input: QuoteInput,
      options?: QuoteExecutionOptions
    ) => Promise<StandardQuote[]>
  ) {
    super();
  }

  getQuote(input: QuoteInput, options?: QuoteExecutionOptions): Promise<StandardQuote[]> {
    return this.handler(input, options);
  }
}

const sampleInput: QuoteInput = {
  year: 2022,
  brand: 'Fiat',
  model: 'Cronos',
  version: '1.3 Drive GSE MT',
  infoAutoCode: '160215',
  vehicleValue: 20_900_000,
  postalCode: '5000',
  use: 'particular',
  hasGnc: false,
  isZeroKm: false,
  hasGarage: false,
};

function makeQuote(companyId: string, companyName: string, price: number): StandardQuote {
  return {
    companyId,
    companyName,
    logo: '',
    planName: `Plan ${price}`,
    planType: 'TERCEROS_COMPLETO',
    price,
    currency: 'ARS',
    billingPeriod: 'MENSUAL',
    coverageDetails: ['Detalle'],
    externalId: `${companyId}-${price}`,
    source: 'mock',
  };
}

describe('OrchestratorService', () => {
  it('tolera fallos parciales, ordena por precio ascendente y reporta providerStatuses', async () => {
    const okAdapter = new FakeAdapter('ok-insurer', 'Aseguradora OK', async () => [
      makeQuote('ok-insurer', 'Aseguradora OK', 45000),
      makeQuote('ok-insurer', 'Aseguradora OK', 25000),
    ]);
    const failingAdapter = new FakeAdapter('down-insurer', 'Aseguradora Caída', async () => {
      throw new Error('Timeout externo');
    });

    const orchestrator = new OrchestratorService({
      adapters: [okAdapter, failingAdapter],
      cacheTtlMs: 60_000,
    });

    const result = await orchestrator.calculateAllQuotes(sampleInput);

    expect(result.quotes.map((q) => q.price)).toEqual([25000, 45000]);
    expect(result.failedProviders).toEqual(['Aseguradora Caída']);
    expect(result.providerStatuses).toHaveLength(2);
    expect(result.cached).toBe(false);
  });

  it('cachea respuestas exitosas completas y evita llamar de nuevo a los adaptadores', async () => {
    const spy = vi.fn(async () => [makeQuote('ok', 'Aseguradora OK', 30000)]);
    const adapter = new FakeAdapter('ok', 'Aseguradora OK', spy);

    const orchestrator = new OrchestratorService({
      adapters: [adapter],
      cacheTtlMs: 60_000,
    });

    const first = await orchestrator.calculateAllQuotes(sampleInput);
    const second = await orchestrator.calculateAllQuotes(sampleInput);

    expect(first.cached).toBe(false);
    expect(second.cached).toBe(true);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('no cachea cotizaciones live para evitar reutilizar el mismo quotationCode entre usuarios', async () => {
    const spy = vi.fn(async () => [{ ...makeQuote('live', 'Aseguradora Live', 30000), source: 'live' as const }]);
    const adapter = new FakeAdapter('live', 'Aseguradora Live', spy);

    const orchestrator = new OrchestratorService({
      adapters: [adapter],
      cacheTtlMs: 60_000,
    });

    const first = await orchestrator.calculateAllQuotes(sampleInput);
    const second = await orchestrator.calculateAllQuotes(sampleInput);

    expect(first.cached).toBe(false);
    expect(second.cached).toBe(false);
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it('aborta adaptadores lentos cuando se supera el timeout global', async () => {
    const slowAdapter = new FakeAdapter('slow', 'Lenta SA', async (_input, options) => {
      return new Promise<StandardQuote[]>((resolve, reject) => {
        const timer = setTimeout(() => resolve([makeQuote('slow', 'Lenta SA', 10000)]), 500);
        options?.signal?.addEventListener(
          'abort',
          () => {
            clearTimeout(timer);
            reject(new Error('Aborted'));
          },
          { once: true }
        );
      });
    });

    const orchestrator = new OrchestratorService({
      adapters: [slowAdapter],
      timeoutMs: 40,
      cacheTtlMs: 0,
    });

    const result = await orchestrator.calculateAllQuotes(sampleInput);
    expect(result.quotes).toEqual([]);
    expect(result.failedProviders).toEqual(['Lenta SA']);
  });
});
