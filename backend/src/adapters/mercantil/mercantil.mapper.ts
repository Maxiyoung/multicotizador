import { PlanCategory, QuoteInput, StandardQuote } from '../../interfaces/quote.interface';

export interface MercantilRawPlan {
  codigo?: string | number;
  plan?: string;
  descripcion?: string;
  premioMensual?: number;
  cuota?: number;
  franquicia?: number;
  sumaAsegurada?: number;
  coberturas?: string[];
  cotizacionId?: string | number;
}

export interface MercantilRawQuoteResponse {
  cotizacionId?: string | number;
  planes?: MercantilRawPlan[];
  vigenciaHasta?: string;
}

export function classifyMercantilPlan(name: string): PlanCategory {
  const normalized = name.toLowerCase();
  if (normalized.includes('todo riesgo') || /(?<!sin\s)franquicia/i.test(normalized)) {
    return 'TODO_RIESGO';
  }
  if (
    normalized.includes('responsabilidad civil') ||
    normalized === 'plan a' ||
    normalized.includes('plan a')
  ) {
    return 'RC';
  }
  return 'TERCEROS_COMPLETO';
}

export function buildMercantilQuoteRequest(input: QuoteInput): Record<string, unknown> {
  return {
    anio: input.year,
    codigoInfoAuto: input.infoAutoCode,
    marca: input.brand,
    modelo: input.model,
    version: input.version,
    codigoPostal: Number(input.postalCode),
    uso: input.use === 'comercial' ? 'COMERCIAL' : 'PARTICULAR',
    tieneGnc: input.hasGnc,
    valorGnc: input.hasGnc ? input.gncValue : undefined,
    esCeroKm: input.isZeroKm,
    guardaEnGarage: input.hasGarage,
    sumaAsegurada: input.vehicleValue,
  };
}

export function mapMercantilQuoteResponse(
  raw: MercantilRawQuoteResponse,
  input: QuoteInput
): StandardQuote[] {
  const plans = raw.planes ?? [];
  const rootRef = raw.cotizacionId ? `MA-${raw.cotizacionId}` : undefined;

  return plans
    .filter((plan) => (plan.premioMensual ?? plan.cuota ?? 0) > 0)
    .map((plan, index): StandardQuote => {
      const planName = plan.descripcion || plan.plan || `Plan Mercantil #${index + 1}`;
      const price = Math.round(plan.premioMensual ?? plan.cuota ?? 0);
      const code = String(plan.codigo ?? index + 1);

      return {
        companyId: 'mercantil-andina',
        companyName: 'Mercantil Andina',
        logo: 'https://apiportal.mercantilandina.com.ar/assets/logo.png',
        planName,
        planType: classifyMercantilPlan(planName),
        price,
        currency: 'ARS',
        billingPeriod: 'MENSUAL',
        insuredSum: plan.sumaAsegurada ?? input.vehicleValue,
        franchise: plan.franquicia && plan.franquicia > 0 ? Math.round(plan.franquicia) : undefined,
        franchiseType: plan.franquicia && plan.franquicia > 0 ? 'fixed' : undefined,
        coverageDetails:
          plan.coberturas && plan.coberturas.length > 0
            ? plan.coberturas
            : ['Cobertura oficial cotizada vía API Mercantil Andina'],
        externalId: `MA-${code}-${input.year}`,
        quoteReference: plan.cotizacionId ? `MA-${plan.cotizacionId}` : rootRef,
        validUntil: raw.vigenciaHasta,
        source: 'live',
      };
    });
}
