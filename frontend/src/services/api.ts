// src/services/api.ts
import axios from 'axios';

// Re-declaramos la interfaz para el frontend
export interface QuoteInput {
  year: number;
  brand: string;
  model: string;
  version: string;
  postalCode: string;
}

export interface StandardQuote {
  companyName: string;
  logo: string;
  planName: string;
  price: number;
  coverageDetails: string[];
  externalId: string;
}

const api = axios.create({
  baseURL: 'https://multicotizador-api.onrender.com/api', 
});

export const fetchQuotes = async (data: QuoteInput): Promise<StandardQuote[]> => {
  const response = await api.post('/quotes', data);
  return response.data;
};