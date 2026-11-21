import {
  PlanCategory,
  QuoteInput,
  QuoteSource,
  StandardQuote,
} from '../../interfaces/quote.interface';
import { SancorConfig } from '../../config/insurers';
import {
  SancorQuotationPlan,
  SancorVehicleQuotationRequest,
  SancorVehicleQuotationResponse,
} from './sancor.types';

const SANCOR_LOGO = 'https://www.sancorseguros.com.ar/favicon.ico';

export function classifySancorPlan(plan: SancorQuotationPlan): PlanCategory {
  const text = `${plan.module?.coverageName ?? ''} ${plan.module?.coverageAbbreviatedName ?? ''} ${
    plan.module?.observations ?? ''
  }`.toLowerCase();

  if (
    text.includes('todo riesgo') ||
    text.includes('auto todo') ||
    /(?<!sin\s)franquicia/i.test(text) ||
    text.includes('daños parciales')
  ) {
    return 'TODO_RIESGO';
  }

  if (
    text.includes('responsabilidad civil') ||
    text.includes('auto base') ||
    /\brc\b/.test(text)
  ) {
    return 'RC';
  }

  return 'TERCEROS_COMPLETO';
}

function extractFranchise(plan: SancorQuotationPlan): {
  franchise?: number;
  franchiseType?: 'fixed' | 'percentage';
} {
  const detailsText = [
    plan.module?.coverageName,
    plan.module?.observations,
    ...(plan.details ?? []).map((d) => `${d.planDetail ?? ''} ${d.chargeDescription ?? ''}`),
  ]
    .filter(Boolean)
    .join(' ');

  const amountMatch = detailsText.match(/franquicia[^0-9$%]*\$\s*([\d.]+)/i);
  if (amountMatch) {
    const parsed = Number(amountMatch[1].replace(/\./g, ''));
    if (Number.isFinite(parsed) && parsed > 0) {
      return { franchise: parsed, franchiseType: 'fixed' };
    }
  }

  const percentMatch = detailsText.match(/franquicia[^0-9%]*(\d+(?:[.,]\d+)?)\s*%/i);
  if (percentMatch && plan.vehicleInsuredSum) {
    const pct = Number(percentMatch[1].replace(',', '.'));
    if (Number.isFinite(pct) && pct > 0) {
      return {
        franchise: Math.round((plan.vehicleInsuredSum * (pct / 100)) / 1000) * 1000,
        franchiseType: 'percentage',
      };
    }
  }

  return {};
}

function extractCoverageDetails(plan: SancorQuotationPlan, category: PlanCategory): string[] {
  const items = new Set<string>();

  for (const detail of plan.details ?? []) {
    const label = (detail.planDetail || detail.chargeDescription || '').trim();
    if (label.length >= 4) {
      items.add(label);
    }
  }

  if (plan.module?.observations?.trim()) {
    items.add(plan.module.observations.trim());
  }

  if (items.size > 0) {
    return Array.from(items).slice(0, 6);
  }

  if (category === 'RC') {
    return [
      'Responsabilidad Civil obligatoria hacia terceros',
      'Asistencia en viaje y remolque según condiciones de póliza',
      'Extensión de cobertura en países del Mercosur',
    ];
  }

  if (category === 'TODO_RIESGO') {
    return [
      'Daños parciales por accidente con franquicia',
      'Robo, hurto e incendio total y parcial',
      'Destrucción total por accidente',
      'Cobertura de cristales, cerraduras y granizo',
    ];
  }

  return [
    'Responsabilidad Civil hacia terceros',
    'Robo, hurto e incendio total y parcial',
    'Destrucción total por accidente',
    'Cristales y granizo según módulo contratado',
  ];
}

export function buildSancorQuotationRequest(
  input: QuoteInput,
  config: SancorConfig,
  referenceDate: Date = new Date()
): SancorVehicleQuotationRequest {
  const startDate = referenceDate.toISOString();
  const monthsDuration = config.vigencyCode === 2 ? 6 : config.vigencyCode === 3 ? 3 : 12;
  const endDateObj = new Date(referenceDate);
  endDateObj.setMonth(endDateObj.getMonth() + monthsDuration);

  const estimatedSum =
    input.vehicleValue ?? Math.max(8_000_000, (input.year - 2005) * 1_450_000);
  const gncSum = input.hasGnc ? input.gncValue ?? 900_000 : undefined;

  return {
    vehicleQuotation: {
      person: {
        isJuridicPerson: false,
        identificationType: 'D',
        ...(input.dni ? { identificationNumber: Number(input.dni) } : {}),
      },
      currencyCode: 1, // ARS
      policyPeriodStartEffectiveDate: startDate,
      policyPeriodEndEffectiveDate: endDateObj.toISOString(),
      coveredItemInsuredSum: estimatedSum,
      conditionCode: config.ivaConditionCode,
      respectClientIvaCondition: false,
      intermediary: {
        prodProducerCode: config.producerCode,
        upperProducerCode: config.upperProducerCode,
        ...(config.statisticCode ? { statisticCode: config.statisticCode } : {}),
      },
      policyVigencyCode: config.vigencyCode,
      policyPaymentPeriodicityCode: config.paymentPeriodicityCode,
      policyQuotas: config.policyQuotas,
      productCode: config.productCode,
      zone: {
        postalCode: Number(input.postalCode),
      },
      vehicle: {
        vehicleCode: input.infoAutoCode ?? '000000',
        vehicleYear: input.year,
        yearSuggestedValue: estimatedSum,
        vehicleUseTypeCode: input.use === 'comercial' ? 4 : 2,
        vehicleTrackingEquipment: false,
        zeroKM: input.isZeroKm,
        gncInformation: {
          hasGNC: input.hasGnc,
          ...(gncSum ? { accesoryInsuredSum: gncSum } : {}),
        },
      },
      driversUnder25: false,
      anualKM: false,
      garageParking: input.hasGarage,
    },
  };
}

export function mapSancorQuotationResponse(
  response: SancorVehicleQuotationResponse,
  input: QuoteInput,
  source: QuoteSource
): StandardQuote[] {
  const quotation = response.vehicleQuotation;
  const plans = quotation?.plans ?? [];
  const quotationCode = quotation?.quotationCode;
  const validUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  return plans
    .filter((plan) => {
      if (plan.success === false) return false;
      const monthly = plan.quotaPremiumMonthly ?? plan.premiumTotals?.quotaAmount ?? 0;
      return monthly > 0;
    })
    .map((plan, index): StandardQuote => {
      const planType = classifySancorPlan(plan);
      const monthlyPrice = Math.round(
        plan.quotaPremiumMonthly ?? plan.premiumTotals?.quotaAmount ?? plan.premium ?? 0
      );
      const coverageCode = plan.module?.coverageCode ?? plan.id ?? index + 1;
      const planName =
        plan.module?.coverageName?.trim() ||
        plan.module?.coverageAbbreviatedName?.trim() ||
        `Sancor Plan #${coverageCode}`;
      const { franchise, franchiseType } = extractFranchise(plan);

      return {
        companyId: 'sancor-seguros',
        companyName: 'Sancor Seguros',
        logo: SANCOR_LOGO,
        planName,
        planType,
        price: monthlyPrice,
        currency: 'ARS',
        billingPeriod: 'MENSUAL',
        insuredSum: plan.vehicleInsuredSum ?? input.vehicleValue,
        franchise,
        franchiseType,
        coverageDetails: extractCoverageDetails(plan, planType),
        externalId: `SS-${quotationCode ?? input.year}-${coverageCode}`,
        quoteReference: quotationCode ? `SS-${quotationCode}` : undefined,
        validUntil,
        source,
      };
    });
}
