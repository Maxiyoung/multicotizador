// src/adapters/base.adapter.ts
import { QuoteInput, StandardQuote } from '../interfaces/quote.interface';

export abstract class BaseAdapter {
  // Cada compañía debe definir su propio identificador único
  abstract readonly companyName: string;

  // Método obligatorio que implementará la lógica de Auth + Fetch + Map
  abstract getQuote(input: QuoteInput): Promise<StandardQuote[]>;
}
