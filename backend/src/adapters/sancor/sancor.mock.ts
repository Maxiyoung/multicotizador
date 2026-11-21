import { QuoteInput } from '../../interfaces/quote.interface';
import { SancorVehicleQuotationResponse } from './sancor.types';

/**
 * Simula una respuesta exacta con el schema `VehicleQuotationResponse`
 * del Swagger oficial de Grupo Sancor Seguros, para ejercitar el mapper real
 * incluso durante el desarrollo sin credenciales productivas.
 */
export function buildSancorMockResponse(input: QuoteInput): SancorVehicleQuotationResponse {
  const currentYear = new Date().getFullYear();
  const insuredSum = input.vehicleValue ?? Math.max(8_000_000, (input.year - 2005) * 1_450_000);
  const valueFactor = Math.max(0.75, Math.min(2.6, insuredSum / 18_000_000));
  const gncFactor = input.hasGnc ? 1.1 : 1;
  const useFactor = input.use === 'comercial' ? 1.22 : 1;
  const garageFactor = input.hasGarage ? 0.94 : 1;
  const zeroKmFactor = input.isZeroKm ? 1.05 : 1;
  const multiplier = valueFactor * gncFactor * useFactor * garageFactor * zeroKmFactor;

  const quotationCode = 900000 + (input.year % 100) * 100 + (Number(input.postalCode) % 100);
  const trFranchise = Math.round((insuredSum * 0.025) / 10000) * 10000;

  const plans: NonNullable<SancorVehicleQuotationResponse['vehicleQuotation']>['plans'] = [
    {
      id: 1,
      success: true,
      quotaPremiumMonthly: Math.round(20200 * useFactor),
      vehicleInsuredSum: insuredSum,
      module: {
        coverageCode: 10,
        coverageName: 'Auto Base — Responsabilidad Civil',
        coverageAbbreviatedName: 'RC Base',
      },
      details: [
        { planDetail: 'Responsabilidad Civil obligatoria hacia terceros' },
        { planDetail: 'Asistencia mecánica y remolque 24 hs hasta 150 km' },
        { planDetail: 'Extensión de cobertura en países del Mercosur' },
      ],
    },
    {
      id: 2,
      success: true,
      quotaPremiumMonthly: Math.round(39200 * multiplier),
      vehicleInsuredSum: insuredSum,
      module: {
        coverageCode: 30,
        coverageName: 'Auto Max 6 — Terceros Completo Full',
        coverageAbbreviatedName: 'TC Max 6',
      },
      details: [
        { planDetail: 'Responsabilidad Civil hacia terceros' },
        { planDetail: 'Robo, hurto e incendio total y parcial' },
        { planDetail: 'Cristales, parabrisas, luneta y cerraduras sin franquicia' },
        { planDetail: 'Granizo parcial y total sin tope de eventos' },
      ],
    },
  ];

  if (input.year >= currentYear - 10) {
    plans.push({
      id: 3,
      success: true,
      quotaPremiumMonthly: Math.round(58500 * multiplier),
      vehicleInsuredSum: insuredSum,
      module: {
        coverageCode: 50,
        coverageName: 'Auto Todo Riesgo 200',
        coverageAbbreviatedName: 'TR 200',
        observations: `Daños parciales por accidente con franquicia fija de $${trFranchise.toLocaleString('es-AR')}`,
      },
      details: [
        { planDetail: 'Daños parciales por accidente con franquicia fija' },
        { planDetail: 'Robo, hurto e incendio total y parcial sin franquicia' },
        { planDetail: 'Destrucción total por accidente (cláusula 80%)' },
        { planDetail: 'Granizo, inundación, cristales y cerraduras incluidos' },
      ],
    });
  }

  return {
    vehicleQuotation: {
      quotationCode,
      relationQuotationCode: 1,
      plans,
    },
  };
}
