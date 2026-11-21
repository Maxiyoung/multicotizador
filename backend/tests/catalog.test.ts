import { describe, expect, it } from 'vitest';
import { LocalVehicleCatalogProvider } from '../src/catalog/local-catalog.provider';
import { postalCodesService } from '../src/catalog/postal-codes.service';
import { parseInfoAutoCatalogContent } from '../src/catalog/import-infoauto';

describe('Catálogo de Vehículos y Códigos Postales AR', () => {
  it('expone más de 200 versiones y 25+ marcas del parque argentino con búsqueda full-text y por código', async () => {
    const provider = new LocalVehicleCatalogProvider();
    const stats = await provider.getStats();

    expect(stats.vehiclesCount).toBeGreaterThanOrEqual(200);
    expect(stats.brandsCount).toBeGreaterThanOrEqual(25);
    expect(stats.codeOrigin).toBe('seed');

    const byName = await provider.search('corolla hybrid', 2023);
    expect(byName.length).toBeGreaterThan(0);
    expect(byName[0].brand).toBe('Toyota');
    expect(byName[0].model).toBe('Corolla');
    expect(byName[0].fuel).toBe('hibrido');

    const byCode = await provider.search('440450');
    expect(byCode).toHaveLength(1);
    expect(byCode[0].model).toBe('Hilux');
  });

  it('cubre las 24 jurisdicciones argentinas y resuelve CP numéricos, CPA y búsquedas por ciudad', () => {
    const stats = postalCodesService.getStats();
    expect(stats.provincesCount).toBe(24);
    expect(stats.postalCodesCount).toBeGreaterThan(2000);

    // CP directos y CPA
    expect(postalCodesService.lookupByCode('5000')[0]).toMatchObject({
      postalCode: '5000',
      locality: 'Córdoba',
      province: 'Córdoba',
    });
    expect(postalCodesService.lookupByCode('C1425ABC')[0]).toMatchObject({
      postalCode: '1425',
      province: 'Ciudad Autónoma de Buenos Aires',
    });
    expect(postalCodesService.lookupByCode('2000')[0]).toMatchObject({
      postalCode: '2000',
      locality: 'Rosario',
      province: 'Santa Fe',
    });
    expect(postalCodesService.lookupByCode('4600')[0]).toMatchObject({
      postalCode: '4600',
      province: 'Jujuy',
    });

    // Búsqueda por nombre de ciudad (sin tildes)
    const marDelPlata = postalCodesService.search('mar del plata');
    expect(marDelPlata[0]).toMatchObject({
      postalCode: '7600',
      locality: 'Mar del Plata',
    });
  });

  it('importa tablas CSV oficiales de InfoAuto agrupando filas por año y marcando codeOrigin=infoauto', () => {
    const csv = [
      'CODIA;NMARC;NGRUP;NMODE;ANIO;PRECIO',
      '180499;Ford;Ranger;3.0 V6 Limited 4x4 AT;2023;52.000.000',
      '180499;Ford;Ranger;3.0 V6 Limited 4x4 AT;2025;64.500.000',
      '440311;Toyota;Corolla;2.0 XEI CVT;2024;34.000.000',
    ].join('\n');

    const imported = parseInfoAutoCatalogContent(csv, 'csv');
    expect(imported).toHaveLength(2);

    const ranger = imported.find((v) => v.infoAutoCode === '180499');
    expect(ranger).toMatchObject({
      brand: 'Ford',
      model: 'Ranger',
      yearFrom: 2023,
      yearTo: 2025,
      estimatedValue: 64_500_000,
      bodyType: 'pickup',
      codeOrigin: 'infoauto',
    });
  });
});
