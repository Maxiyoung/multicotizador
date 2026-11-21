import { QuoteInput, StandardQuote } from '../../interfaces/quote.interface';

export function buildMercantilMockQuotes(input: QuoteInput): StandardQuote[] {
  const currentYear = new Date().getFullYear();
  const baseInsuredSum = input.vehicleValue ?? Math.max(8_000_000, (input.year - 2005) * 1_450_000);
  const valueFactor = Math.max(0.75, Math.min(2.6, baseInsuredSum / 18_000_000));
  const gncFactor = input.hasGnc ? 1.12 : 1;
  const useFactor = input.use === 'comercial' ? 1.25 : 1;
  const zeroKmFactor = input.isZeroKm ? 1.07 : 1;
  const garageFactor = input.hasGarage ? 0.96 : 1;
  const multiplier = valueFactor * gncFactor * useFactor * zeroKmFactor * garageFactor;

  const validUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const refSuffix = `${input.year}-${input.postalCode}`;

  const quotes: StandardQuote[] = [
    {
      companyId: 'mercantil-andina',
      companyName: 'Mercantil Andina',
      logo: 'https://apiportal.mercantilandina.com.ar/assets/logo.png',
      planName: 'Responsabilidad Civil Obligatoria (Plan A)',
      planType: 'RC',
      price: Math.round(21500 * useFactor),
      currency: 'ARS',
      billingPeriod: 'MENSUAL',
      insuredSum: baseInsuredSum,
      coverageDetails: [
        'Responsabilidad Civil hasta $160.000.000',
        'Servicio de grúa y asistencia mecánica hasta 100 km',
        'Cobertura en países limítrofes (Mercosur)',
      ],
      externalId: `MA-RC-${refSuffix}`,
      quoteReference: `MA-SIM-${refSuffix}-A`,
      validUntil,
      source: 'mock',
    },
    {
      companyId: 'mercantil-andina',
      companyName: 'Mercantil Andina',
      logo: 'https://apiportal.mercantilandina.com.ar/assets/logo.png',
      planName: 'Terceros Completo Premium (M+)',
      planType: 'TERCEROS_COMPLETO',
      price: Math.round(37500 * multiplier),
      currency: 'ARS',
      billingPeriod: 'MENSUAL',
      insuredSum: baseInsuredSum,
      coverageDetails: [
        'Responsabilidad Civil ampliada',
        'Robo e Incendio Total y Parcial',
        'Cristales laterales, parabrisas y luneta sin tope',
        'Daños por granizo hasta $1.500.000 y cerraduras',
      ],
      externalId: `MA-TC-${refSuffix}`,
      quoteReference: `MA-SIM-${refSuffix}-MPLUS`,
      validUntil,
      source: 'mock',
    },
  ];

  if (input.year >= currentYear - 12) {
    quotes.push({
      companyId: 'mercantil-andina',
      companyName: 'Mercantil Andina',
      logo: 'https://apiportal.mercantilandina.com.ar/assets/logo.png',
      planName: 'Todo Riesgo con Franquicia Fija',
      planType: 'TODO_RIESGO',
      price: Math.round(61000 * multiplier),
      currency: 'ARS',
      billingPeriod: 'MENSUAL',
      insuredSum: baseInsuredSum,
      franchise: Math.round((baseInsuredSum * 0.02) / 10000) * 10000,
      franchiseType: 'fixed',
      coverageDetails: [
        'Daños parciales por accidente con franquicia fija',
        'Robo e Incendio Total y Parcial sin franquicia',
        'Destrucción Total por accidente (cláusula 80%)',
        'Granizo e inundación total sin límite de eventos',
      ],
      externalId: `MA-TR-${refSuffix}`,
      quoteReference: `MA-SIM-${refSuffix}-TR`,
      validUntil,
      source: 'mock',
    });
  }

  return quotes;
}
