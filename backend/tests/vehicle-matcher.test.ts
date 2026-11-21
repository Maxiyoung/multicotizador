import { describe, expect, it } from 'vitest';
import { LocalVehicleCatalogProvider } from '../src/catalog/local-catalog.provider';
import { VehicleHomologator } from '../src/catalog/vehicle-homologation';

describe('Motor avanzado de mapeo de vehículos a InfoAuto', () => {
  const catalog = new LocalVehicleCatalogProvider();

  it('soporta alias de marcas argentinas (vw, chevy, mercedes) y extrae año embebido', async () => {
    const vwResults = await catalog.search('vw gol trend 2020');
    expect(vwResults.length).toBeGreaterThan(0);
    expect(vwResults[0].brand).toBe('Volkswagen');
    expect(vwResults[0].model).toBe('Gol Trend');

    const mbResults = await catalog.search('mercedes sprinter');
    expect(mbResults.length).toBeGreaterThan(0);
    expect(mbResults[0].brand).toBe('Mercedes-Benz');
    expect(mbResults[0].model).toBe('Sprinter');

    const chevyResults = await catalog.search('chevy onix');
    expect(chevyResults.length).toBeGreaterThan(0);
    expect(chevyResults[0].brand).toBe('Chevrolet');
  });

  it('expande sinónimos de caja, combustible y nivel de equipamiento', async () => {
    const auto208 = await catalog.search('208 automatico', 2023);
    expect(auto208.length).toBeGreaterThan(0);
    expect(auto208[0].brand).toBe('Peugeot');
    expect(auto208[0].model).toBe('208');

    const hybridCorolla = await catalog.search('corolla hibrido', 2023);
    expect(hybridCorolla.length).toBeGreaterThan(0);
    expect(hybridCorolla[0].fuel).toBe('hibrido');

    const dieselPickup = await catalog.search('hilux diesel 4x4', 2023);
    expect(dieselPickup.length).toBeGreaterThan(0);
    expect(dieselPickup[0].fuel).toBe('diesel');
  });

  it('tolera errores tipográficos comunes (fuzzy Dice)', async () => {
    const typoCorolla = await catalog.search('corola xei', 2022);
    expect(typoCorolla.length).toBeGreaterThan(0);
    expect(typoCorolla[0].brand).toBe('Toyota');
    expect(typoCorolla[0].model).toBe('Corolla');

    const typoCronos = await catalog.search('fiat crnos', 2022);
    expect(typoCronos.length).toBeGreaterThan(0);
    expect(typoCronos[0].model).toBe('Cronos');
  });

  it('resuelve automáticamente texto estructurado manual a infoAutoCode con score de confianza', async () => {
    const resolved = await catalog.resolveVehicle({
      brand: 'VW',
      model: 'Gol Trend',
      version: '1.6 Trendline',
      year: 2020,
    });

    expect(resolved.resolved).toBe(true);
    expect(resolved.confidence).toBeGreaterThanOrEqual(0.76);
    expect(resolved.bestMatch?.infoAutoCode).toBe('460412');
    expect(resolved.bestMatch?.estimatedValue).toBeGreaterThan(0);
  });

  it('devuelve candidatos sin forzar resolución automática cuando el texto libre es ambiguo', async () => {
    const ambiguous = await catalog.resolveVehicle({
      query: 'corolla',
      year: 2023,
    });

    expect(ambiguous.candidates.length).toBeGreaterThan(1);
    // Hay múltiples versiones empatadas (XEI, SEG, Hybrid), no debe elegir a ciegas
    expect(ambiguous.resolved).toBe(false);
  });

  it('homologa códigos InfoAuto a códigos internos por aseguradora con fallback 1:1', () => {
    const homologator = new VehicleHomologator({
      '440310': {
        'mercantil-andina': 'MA_88421',
      },
    });

    expect(homologator.resolveForInsurer('mercantil-andina', '440310')).toBe('MA_88421');
    expect(homologator.resolveForInsurer('sancor-seguros', '440310')).toBe('440310');
    expect(homologator.resolveForInsurer('mercantil-andina', '460412')).toBe('460412');
  });
});
