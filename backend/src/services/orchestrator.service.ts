import { QuoteInput, QuoteResponse, StandardQuote } from '../interfaces/quote.interface';
import { BaseAdapter } from '../adapters/base.adapters';
import { MercantilAdapter } from '../adapters/mercantil.adapter';

export class OrchestratorService {
  private adapters: BaseAdapter[] = [
    new MercantilAdapter(),
  ];

  async calculateAllQuotes(input: QuoteInput): Promise<QuoteResponse> {
    const settlementResults = await Promise.allSettled(
      this.adapters.map((adapter) => adapter.getQuote(input))
    );

    const quotes: StandardQuote[] = [];
    const failedProviders: string[] = [];

    settlementResults.forEach((result, index) => {
      const adapterName = this.adapters[index].companyName;

      if (result.status === 'fulfilled') {
        quotes.push(...result.value);
      } else {
        console.error(`[Orchestrator] Error en ${adapterName}:`, result.reason);
        failedProviders.push(adapterName);
      }
    });

    return {
      quotes: quotes.sort((a, b) => a.price - b.price),
      failedProviders,
      timestamp: new Date().toISOString(),
    };
  }
}
