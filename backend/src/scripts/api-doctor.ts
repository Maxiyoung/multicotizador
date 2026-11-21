import 'dotenv/config';
import { parseEnv } from '../config/env';
import { buildInsurersConfig } from '../config/insurers';
import { MercantilAdapter } from '../adapters/mercantil/mercantil.adapter';
import { SancorAdapter } from '../adapters/sancor/sancor.adapter';
import { catalogService } from '../catalog/catalog.service';
import { postalCodesService } from '../catalog/postal-codes.service';
import { QuoteInput } from '../interfaces/quote.interface';

export interface DoctorCheckResult {
  component: string;
  mode: string;
  status: 'ok' | 'warn' | 'error' | 'off';
  detail: string;
  latencyMs?: number;
}

const SAMPLE_TEST_VEHICLE: QuoteInput = {
  year: 2022,
  brand: 'Toyota',
  model: 'Corolla',
  version: '2.0 XEI CVT',
  infoAutoCode: '440310',
  vehicleValue: 33_500_000,
  postalCode: '5000',
  locality: 'Córdoba',
  province: 'Córdoba',
  use: 'particular',
  hasGnc: false,
  isZeroKm: false,
  hasGarage: true,
};

export async function runApiDoctor(options: {
  rawEnv?: NodeJS.ProcessEnv;
  runQuoteTest?: boolean;
} = {}): Promise<{ ok: boolean; checks: DoctorCheckResult[] }> {
  const checks: DoctorCheckResult[] = [];

  let cfg;
  try {
    cfg = parseEnv(options.rawEnv ?? process.env);
    checks.push({
      component: 'Variables de entorno (.env)',
      mode: cfg.NODE_ENV,
      status: 'ok',
      detail: `PORT=${cfg.PORT} | CORS=${cfg.CORS_ORIGIN} | Timeout=${cfg.QUOTE_TIMEOUT_MS}ms`,
    });
  } catch (error) {
    checks.push({
      component: 'Variables de entorno (.env)',
      mode: 'invalid',
      status: 'error',
      detail: error instanceof Error ? error.message : 'Error de validación en .env',
    });
    return { ok: false, checks };
  }

  // 1. Catálogo de vehículos y CP
  const [vehicleStats, postalStats] = await Promise.all([
    catalogService.getStats(),
    Promise.resolve(postalCodesService.getStats()),
  ]);

  checks.push({
    component: 'Catálogo de Vehículos',
    mode: cfg.CATALOG_PROVIDER,
    status: vehicleStats.codeOrigin === 'infoauto' ? 'ok' : 'warn',
    detail:
      vehicleStats.codeOrigin === 'infoauto'
        ? `${vehicleStats.vehiclesCount} versiones (${vehicleStats.brandsCount} marcas) — Códigos InfoAuto oficiales.`
        : `${vehicleStats.vehiclesCount} versiones (${vehicleStats.brandsCount} marcas) — Códigos semilla (demo). Usá "npm run catalog:import -- archivo.csv" o CATALOG_PROVIDER=infoauto-api para oficiales.`,
  });

  checks.push({
    component: 'Padrón de Códigos Postales AR',
    mode: 'local',
    status: 'ok',
    detail: `${postalStats.postalCodesCount} códigos postales en ${postalStats.provincesCount} jurisdicciones.`,
  });

  const insurers = buildInsurersConfig(cfg);

  // 2. Mercantil Andina
  if (insurers.mercantil.mode === 'off') {
    checks.push({
      component: 'Mercantil Andina',
      mode: 'off',
      status: 'off',
      detail: 'Deshabilitado por MERCANTIL_MODE=off.',
    });
  } else {
    const adapter = new MercantilAdapter(insurers.mercantil);
    const auth = await adapter.verifyAuth();
    const missingQuotePath =
      insurers.mercantil.mode === 'live' && !insurers.mercantil.quotePath;

    checks.push({
      component: 'Mercantil Andina',
      mode: insurers.mercantil.mode,
      status: !auth.ok ? 'error' : missingQuotePath ? 'warn' : 'ok',
      detail: auth.message,
      latencyMs: auth.latencyMs,
    });

    if (options.runQuoteTest && auth.ok && !missingQuotePath) {
      const t0 = Date.now();
      try {
        const quotes = await adapter.getQuote(SAMPLE_TEST_VEHICLE);
        checks.push({
          component: 'Mercantil Andina (Prueba Cotización)',
          mode: insurers.mercantil.mode,
          status: quotes.length > 0 ? 'ok' : 'warn',
          detail: `${quotes.length} planes devueltos para Toyota Corolla 2022 (CP 5000).`,
          latencyMs: Date.now() - t0,
        });
      } catch (err) {
        checks.push({
          component: 'Mercantil Andina (Prueba Cotización)',
          mode: insurers.mercantil.mode,
          status: 'error',
          detail: err instanceof Error ? err.message : 'Fallo al cotizar',
          latencyMs: Date.now() - t0,
        });
      }
    }
  }

  // 3. Grupo Sancor Seguros
  if (insurers.sancor.mode === 'off') {
    checks.push({
      component: 'Grupo Sancor Seguros',
      mode: 'off',
      status: 'off',
      detail: 'Deshabilitado por SANCOR_MODE=off.',
    });
  } else {
    const adapter = new SancorAdapter(insurers.sancor);
    const auth = await adapter.verifyAuth();
    checks.push({
      component: 'Grupo Sancor Seguros',
      mode: insurers.sancor.mode,
      status: auth.ok ? 'ok' : 'error',
      detail: auth.message,
      latencyMs: auth.latencyMs,
    });

    if (options.runQuoteTest && auth.ok) {
      const t0 = Date.now();
      try {
        const quotes = await adapter.getQuote(SAMPLE_TEST_VEHICLE);
        checks.push({
          component: 'Grupo Sancor Seguros (Prueba Cotización)',
          mode: insurers.sancor.mode,
          status: quotes.length > 0 ? 'ok' : 'warn',
          detail: `${quotes.length} planes devueltos para Toyota Corolla 2022 (CP 5000).`,
          latencyMs: Date.now() - t0,
        });
      } catch (err) {
        checks.push({
          component: 'Grupo Sancor Seguros (Prueba Cotización)',
          mode: insurers.sancor.mode,
          status: 'error',
          detail: err instanceof Error ? err.message : 'Fallo al cotizar',
          latencyMs: Date.now() - t0,
        });
      }
    }
  }

  const hasErrors = checks.some((c) => c.status === 'error');
  return { ok: !hasErrors, checks };
}

if (require.main === module) {
  const runQuoteTest = process.argv.includes('--quote-test');
  const icons: Record<DoctorCheckResult['status'], string> = {
    ok: '✅',
    warn: '⚠️',
    error: '❌',
    off: '⚪',
  };

  runApiDoctor({ runQuoteTest })
    .then(({ ok, checks }) => {
      console.log('\n=== SegurosAutoYa — API Doctor ===\n');
      for (const item of checks) {
        const latency = item.latencyMs !== undefined ? ` (${item.latencyMs}ms)` : '';
        console.log(`${icons[item.status]} [${item.mode}] ${item.component}${latency}`);
        console.log(`   ${item.detail}`);
      }
      console.log('\nResultado:', ok ? 'LISTO PARA OPERAR ✅' : 'HAY ERRORES DE CONFIGURACIÓN ❌');
      console.log('Tip: ejecutá "npm run api:doctor -- --quote-test" para probar una cotización completa.\n');
      process.exit(ok ? 0 : 1);
    })
    .catch((err) => {
      console.error('Error ejecutando API Doctor:', err);
      process.exit(1);
    });
}
