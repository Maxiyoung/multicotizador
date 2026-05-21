// src/services/orchestrator.service.ts
import { QuoteInput, StandardQuote } from '../interfaces/quote.interface';
import { BaseAdapter } from '../src/adapters/base.adapter';
import { MercantilAdapter } from '../adapters/mercantil.adapter';
// Importarás aquí futuros adaptadores: import { ZurichAdapter } from '../adapters/zurich.adapter';

export class OrchestratorService {
  // Lista de adaptadores activos en el sistema
  private adapters: BaseAdapter[] = [
    new MercantilAdapter(),
    // new ZurichAdapter() <- Cuando lo crees, solo lo agregás acá
  ];

  async calculateAllQuotes(input: QuoteInput): Promise<StandardQuote[]> {
    // Dispara todas las peticiones en paralelo
    const settlementResults = await Promise.allSettled(
      this.adapters.map(adapter => adapter.getQuote(input))
    );

    const normalizerQuotes: StandardQuote[] = [];

    // Recorre los resultados procesando solo los exitosos
    settlementResults.forEach((result, index) => {
      const adapterName = this.adapters[index].companyName;

      if (result.status === 'fulfilled') {
        // Si el adaptador resolvió bien, sumamos sus tarjetas al resultado final
        normalizerQuotes.push(...result.value);
      } else {
        // Si falló, lo registramos en los logs del servidor sin tumbar la app
        console.error(`[Orchestrator] Error en la aseguradora ${adapterName}:`, result.reason);
      }
    });

    // Devolvemos el JSON limpio ordenado por precio de menor a mayor
    return normalizerQuotes.sort((a, b) => a.price - b.price);
  }
}