import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AddressInfo } from 'node:net';
import { Server } from 'node:http';
import { createApp } from '../src/app';

describe('HTTP API integration', () => {
  let server: Server;
  let baseUrl: string;

  beforeAll(async () => {
    const app = createApp();
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => resolve());
    });
    const addr = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${addr.port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  });

  it('responde healthcheck con proveedores activos', async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      status: string;
      providers: Array<{ companyId: string; mode: string }>;
    };
    expect(body.status).toBe('ok');
    expect(body.providers.map((p) => p.companyId)).toEqual([
      'mercantil-andina',
      'sancor-seguros',
    ]);
  });

  it('expone catálogo encadenado de vehículos con códigos InfoAuto', async () => {
    const brandsRes = await fetch(`${baseUrl}/api/catalog/brands?year=2022`);
    expect(brandsRes.status).toBe(200);
    const { brands } = (await brandsRes.json()) as { brands: string[] };
    expect(brands).toContain('Toyota');

    const modelsRes = await fetch(`${baseUrl}/api/catalog/models?brand=Toyota&year=2022`);
    const { models } = (await modelsRes.json()) as { models: string[] };
    expect(models).toContain('Corolla');

    const versionsRes = await fetch(
      `${baseUrl}/api/catalog/versions?brand=Toyota&model=Corolla&year=2022`
    );
    const { versions } = (await versionsRes.json()) as {
      versions: Array<{ infoAutoCode: string; estimatedValue: number }>;
    };
    expect(versions.length).toBeGreaterThan(0);
    expect(versions[0].infoAutoCode).toMatch(/^\d{4,10}$/);
    expect(versions[0].estimatedValue).toBeGreaterThan(0);

    const searchRes = await fetch(`${baseUrl}/api/catalog/search?q=hilux&year=2023`);
    expect(searchRes.status).toBe(200);
    const { results: vehicleResults } = (await searchRes.json()) as {
      results: Array<{ brand: string; model: string; infoAutoCode: string }>;
    };
    expect(vehicleResults.length).toBeGreaterThan(0);
    expect(vehicleResults[0].brand).toBe('Toyota');

    const cpRes = await fetch(`${baseUrl}/api/catalog/postal-codes/5000`);
    expect(cpRes.status).toBe(200);
    const cpBody = (await cpRes.json()) as {
      found: boolean;
      primary: { locality: string; province: string };
    };
    expect(cpBody.found).toBe(true);
    expect(cpBody.primary.locality).toBe('Córdoba');

    const resolveRes = await fetch(`${baseUrl}/api/catalog/resolve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        brand: 'VW',
        model: 'Gol Trend',
        version: '1.6 Trendline',
        year: 2020,
      }),
    });
    expect(resolveRes.status).toBe(200);
    const resolveBody = (await resolveRes.json()) as {
      resolved: boolean;
      bestMatch: { infoAutoCode: string } | null;
    };
    expect(resolveBody.resolved).toBe(true);
    expect(resolveBody.bestMatch?.infoAutoCode).toBe('460412');
  });

  it('cotiza en ambas aseguradoras y devuelve planes ordenados por precio', async () => {
    const res = await fetch(`${baseUrl}/api/quotes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        year: 2022,
        brand: 'Toyota',
        model: 'Corolla',
        version: '2.0 XEI CVT',
        infoAutoCode: '440310',
        postalCode: 'X5000ABC',
        use: 'particular',
        hasGnc: false,
        isZeroKm: false,
        hasGarage: true,
      }),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      quotes: Array<{ companyId: string; price: number }>;
      failedProviders: string[];
      providerStatuses: Array<{ companyId: string; status: string }>;
    };

    expect(body.failedProviders).toEqual([]);
    expect(new Set(body.quotes.map((q) => q.companyId))).toEqual(
      new Set(['mercantil-andina', 'sancor-seguros'])
    );
    // Verifica ordenamiento ascendente
    for (let i = 1; i < body.quotes.length; i += 1) {
      expect(body.quotes[i].price).toBeGreaterThanOrEqual(body.quotes[i - 1].price);
    }
  });

  it('devuelve 400 JSON ante payload malformado', async () => {
    const res = await fetch(`${baseUrl}/api/quotes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{invalid-json',
    });

    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toContain('JSON');
  });

  it('registra intención de lead vía POST /api/leads', async () => {
    const res = await fetch(`${baseUrl}/api/leads`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        companyId: 'sancor-seguros',
        companyName: 'Sancor Seguros',
        planName: 'Auto Max 6',
        planType: 'TERCEROS_COMPLETO',
        price: 42000,
        quoteReference: 'SS-902200',
        externalId: 'SS-902200-30',
        source: 'mock',
        vehicle: {
          year: 2022,
          brand: 'Toyota',
          model: 'Corolla',
          version: '2.0 XEI CVT',
          infoAutoCode: '440310',
          postalCode: '5000',
          hasGnc: false,
          isZeroKm: false,
        },
      }),
    });

    expect(res.status).toBe(202);
    expect(await res.json()).toEqual({ recorded: true });
  });
});
