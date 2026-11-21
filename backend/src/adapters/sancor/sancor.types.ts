/**
 * Tipos derivados directamente de las especificaciones Swagger oficiales
 * de Grupo Sancor Seguros:
 * - TokenGenerator-V2 (`tokengenerator-v2_1.0.0.json`)
 * - Cotización Automotores (`automotive-policy-quotation_1.0.0.json`)
 */

export interface SancorTokenRequest {
  username: string;
  password: string;
  app_client: string;
}

export interface SancorTokenResponse {
  access_token: string;
  id_token?: string;
  scope?: string;
  expires_in?: number;
  token_type?: string;
}

export interface SancorVehicleQuotationRequest {
  vehicleQuotation: {
    relationQuotationCode?: number;
    person: {
      identificationNumber?: number;
      identificationType: 'D' | 'C' | 'L' | 'I' | 'J';
      isJuridicPerson: boolean;
    };
    currencyCode: number;
    policyPeriodStartEffectiveDate: string;
    policyPeriodEndEffectiveDate?: string;
    coveredItemInsuredSum?: number;
    conditionCode: number;
    respectClientIvaCondition?: boolean;
    intermediary: {
      prodProducerCode: number;
      upperProducerCode: number;
      statisticCode?: number;
    };
    policyVigencyCode: number;
    policyPaymentPeriodicityCode: number;
    policyQuotas: number;
    productCode: number;
    zone: {
      postalCode: number;
      cityCode?: number;
    };
    vehicle: {
      vehicleCode: string;
      vehicleYear: number;
      yearSuggestedValue: number;
      vehicleUseTypeCode: number;
      vehicleTrackingEquipment: boolean;
      gncInformation?: {
        hasGNC: boolean;
        accesoryInsuredSum?: number;
      };
      zeroKM?: boolean;
    };
    driversUnder25?: boolean;
    anualKM?: boolean;
    garageParking?: boolean;
  };
}

export interface SancorPlanDetail {
  chargeBasisAmount?: number;
  chargeDescription?: string;
  planDetail?: string;
  chargeCode?: number;
  quotaAmount?: number;
  premium?: number;
  chargetype?: string;
}

export interface SancorQuotationPlan {
  id?: number;
  success?: boolean;
  validationResults?: string;
  outStandard?: boolean;
  quotaPremiumMonthly?: number;
  premium?: number;
  vehicleInsuredSum?: number;
  module?: {
    coverageCode?: number;
    coverageName?: string;
    coverageAbbreviatedName?: string;
    message?: string;
    observations?: string;
  };
  details?: SancorPlanDetail[];
  premiumTotals?: {
    quotaAmount?: number;
    quotationPremium?: number;
  };
}

export interface SancorVehicleQuotationResponse {
  vehicleQuotation?: {
    quotationCode?: number;
    relationQuotationCode?: number;
    plans?: SancorQuotationPlan[];
  };
  messages?: Array<{
    status?: string;
    code?: string;
    text?: string;
    help?: string;
  }>;
}
