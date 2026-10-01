import { BaseAdapter } from './base.adapter';
import { QuoteInput, StandardQuote } from '../interfaces/quote.interface';

export class ZurichAdapter extends BaseAdapter {
  readonly companyName = 'Zurich';

  async getQuote(input: QuoteInput): Promise<StandardQuote[]> {
    // Simulación de llamada a la API de Zurich
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return [
      {
        companyName: this.companyName,
        logo: 'https://example.com/zurich-logo.png',
        planName: 'Terceros Básico',
        price: 41000,
        coverageDetails: ['Responsabilidad Civil'],
        externalId: 'Z-100'
      }
    ];
  }
}
