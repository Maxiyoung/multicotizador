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
