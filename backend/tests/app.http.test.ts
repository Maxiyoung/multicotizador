import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AddressInfo } from 'node:net';
import { Server } from 'node:http';
import { createApp } from '../src/app';
import { OrchestratorService } from '../src/services/orchestrator.service';
import { BaseAdapter } from '../src/adapters/base.adapter';

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

    const searchRes = await fetch(`${baseUrl}/api/catalog/search?q=hilux&preferredYear=2018`);
    expect(searchRes.status).toBe(200);
    const { results: vehicleResults } = (await searchRes.json()) as {
      results: Array<{ brand: string; model: string; infoAutoCode: string; estimatedValue: number }>;
    };
    expect(vehicleResults.length).toBeGreaterThan(0);
    expect(vehicleResults[0].brand).toBe('Toyota');

    const searchNewerRes = await fetch(
      `${baseUrl}/api/catalog/search?q=hilux&preferredYear=2026`
    );
    const { results: newerResults } = (await searchNewerRes.json()) as {
      results: Array<{ infoAutoCode: string; estimatedValue: number }>;
    };
    const sameHilux2026 = newerResults.find(
      (r) => r.infoAutoCode === vehicleResults[0].infoAutoCode
    );
    expect(sameHilux2026!.estimatedValue).toBeGreaterThan(vehicleResults[0].estimatedValue);

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

  it('rechaza con 400 un auto antiguo marcado como 0 KM', async () => {
    const res = await fetch(`${baseUrl}/api/quotes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        year: 2015,
        brand: 'Volkswagen',
        model: 'Gol Trend',
        version: '1.6 Trendline 5P MT',
        postalCode: '5000',
        isZeroKm: true,
      }),
    });

    expect(res.status).toBe(400);
    const body = (await res.json()) as { details: string[] };
    expect(body.details.join(' ')).toContain('0 KM');
  });

  it('devuelve 503 cuando fallan todas las aseguradoras habilitadas', async () => {
    class AlwaysDownAdapter extends BaseAdapter {
      readonly companyId = 'down-cia';
      readonly companyName = 'Aseguradora Caída';
      readonly mode = 'live' as const;
      async getQuote(): Promise<never> {
        throw new Error('Upstream timeout');
      }
    }

    const failingApp = createApp({
      orchestrator: new OrchestratorService({
        adapters: [new AlwaysDownAdapter()],
        cacheTtlMs: 0,
      }),
    });

    const tempServer = await new Promise<Server>((resolve) => {
      const s = failingApp.listen(0, () => resolve(s));
    });

    try {
      const port = (tempServer.address() as AddressInfo).port;
      const res = await fetch(`http://127.0.0.1:${port}/api/quotes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          year: 2022,
          brand: 'Toyota',
          model: 'Corolla',
          version: '2.0 XEI CVT',
          infoAutoCode: '440310',
          postalCode: '5000',
        }),
      });
      expect(res.status).toBe(503);
      const body = (await res.json()) as { error: string; failedProviders: string[] };
      expect(body.failedProviders).toEqual(['Aseguradora Caída']);
    } finally {
      await new Promise<void>((resolve) => tempServer.close(() => resolve()));
    }
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
