import fs from 'node:fs';
import path from 'node:path';
import {
  VehicleBodyType,
  VehicleFuelType,
  VehicleVersionOption,
} from '../interfaces/catalog.interface';

/**
 * Importador oficial de tablas InfoAuto / Aseguradoras (CSV con `;` o `,`, o JSON).
 *
 * Acepta nombres de columnas estándar de InfoAuto y aseguradoras argentinas:
 * - Código:   codia | infoAutoCode | vehicleCode | codigo_infoauto | codigo
 * - Marca:    nmarc | marca | brand
 * - Modelo:   ngrup | modelo | model | grupo
 * - Versión:  nmode | version | descripcion | description
 * - Años:     anio / year (agrupa filas por CODIA) o anio_desde/anio_hasta | yearFrom/yearTo
 * - Precio:   precio | valor | suma_asegurada | estimatedValue | list_price
 *
 * Uso CLI:
 *   npm run catalog:import -- ./ruta/al/infoauto.csv
 */

function normalizeHeader(header: string): string {
  return header
    .replace(/^\uFEFF/, '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}

function splitCsvLine(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === delimiter && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

function pickField(record: Record<string, unknown>, candidates: string[]): string {
  for (const key of candidates) {
    const value = record[key];
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      return String(value).trim();
    }
  }
  return '';
}

function parseNumberSafe(raw: string): number | undefined {
  if (!raw) return undefined;
  const cleaned = raw.replace(/\$/g, '').replace(/\s+/g, '');
  // Soporta formato AR (18.500.000,50) e internacional (18500000.50)
  const normalized =
    cleaned.includes(',') && cleaned.includes('.')
      ? cleaned.replace(/\./g, '').replace(',', '.')
      : cleaned.includes(',')
        ? cleaned.replace(',', '.')
        : cleaned.replace(/\.(?=\d{3}(?:\D|$))/g, '');
  const n = Number(normalized);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : undefined;
}

function inferBodyType(text: string): VehicleBodyType {
  const t = text.toLowerCase();
  if (/pickup|hilux|amarok|ranger|s10|toro|strada|frontier|rampage|maverick|l200|saveiro|oroch|alaskan|4x4\s*dc/.test(t)) {
    return 'pickup';
  }
  if (/furgon|furgón|kangoo|partner|berlingo|sprinter|transit|master|fiorino|hiace|daily|chasis|k2500/.test(t)) {
    return 'utilitario';
  }
  if (/suv|cross|tracker|renegade|compass|t-cross|nivus|taos|duster|kicks|hr-v|cr-v|creta|tucson|sportage|tiggo|pulse|territory|bronco|sw4/.test(t)) {
    return 'suv';
  }
  if (/sedan|sedán|4p|corolla|cronos|virtus|vento|versa|sentra|civic|logan|fluence|prisma|siena|voyage/.test(t)) {
    return 'sedan';
  }
  return 'hatchback';
}

function inferFuelType(text: string): VehicleFuelType {
  const t = text.toLowerCase();
  if (/hybrid|hibrid|e-power|e-tense/.test(t)) return 'hibrido';
  if (/electr|ev\b/.test(t)) return 'electrico';
  if (/gnc/.test(t)) return 'gnc';
  if (/tdi|hdi|cdi|crdi|dci|diesel|diésel|\btd\b/.test(t)) return 'diesel';
  return 'nafta';
}

export function parseInfoAutoRecords(rawRecords: Array<Record<string, unknown>>): VehicleVersionOption[] {
  const currentYear = new Date().getFullYear();
  const byCode = new Map<string, VehicleVersionOption>();

  for (const raw of rawRecords) {
    const normalized: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(raw)) {
      normalized[normalizeHeader(k)] = v;
    }

    const code = pickField(normalized, ['codia', 'infoautocode', 'info_auto_code', 'vehiclecode', 'vehicle_code', 'codigo_infoauto', 'codigo']);
    const brand = pickField(normalized, ['nmarc', 'marca', 'brand']);
    const model = pickField(normalized, ['ngrup', 'modelo', 'model', 'grupo']);
    const version = pickField(normalized, ['nmode', 'version', 'descripcion', 'description']) || model;

    if (!/^\d{4,10}$/.test(code) || !brand || !model) {
      continue;
    }

    const singleYear = parseNumberSafe(pickField(normalized, ['anio', 'ano', 'year']));
    const yearFromRaw = parseNumberSafe(pickField(normalized, ['anio_desde', 'yearfrom', 'year_from', 'desde']));
    const yearToRaw = parseNumberSafe(pickField(normalized, ['anio_hasta', 'yearto', 'year_to', 'hasta']));
    const valueRaw = parseNumberSafe(
      pickField(normalized, ['precio', 'valor', 'suma_asegurada', 'estimatedvalue', 'estimated_value', 'list_price', 'valuacion'])
    );

    const yearFrom = yearFromRaw ?? singleYear ?? 2010;
    const yearTo = yearToRaw ?? singleYear ?? currentYear + 1;
    const estimatedValue = valueRaw ?? 20_000_000;

    const existing = byCode.get(code);
    if (existing) {
      existing.yearFrom = Math.min(existing.yearFrom, yearFrom);
      existing.yearTo = Math.max(existing.yearTo, yearTo);
      if (yearTo >= existing.yearTo && valueRaw) {
        existing.estimatedValue = valueRaw;
      }
      continue;
    }

    const descriptor = `${brand} ${model} ${version}`;
    byCode.set(code, {
      infoAutoCode: code,
      brand,
      model,
      version,
      yearFrom,
      yearTo,
      estimatedValue,
      bodyType: inferBodyType(descriptor),
      fuel: inferFuelType(descriptor),
      codeOrigin: 'infoauto',
    });
  }

  return Array.from(byCode.values()).sort(
    (a, b) =>
      a.brand.localeCompare(b.brand, 'es') ||
      a.model.localeCompare(b.model, 'es') ||
      a.version.localeCompare(b.version, 'es')
  );
}

export function parseInfoAutoCatalogContent(
  content: string,
  format: 'csv' | 'json'
): VehicleVersionOption[] {
  if (format === 'json') {
    const parsed = JSON.parse(content) as unknown;
    const rows = Array.isArray(parsed)
      ? (parsed as Array<Record<string, unknown>>)
      : Array.isArray((parsed as { vehicles?: unknown }).vehicles)
        ? ((parsed as { vehicles: Array<Record<string, unknown>> }).vehicles)
        : [];
    return parseInfoAutoRecords(rows);
  }

  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length < 2) return [];

  const headerLine = lines[0];
  const delimiter =
    (headerLine.match(/;/g)?.length ?? 0) >= (headerLine.match(/,/g)?.length ?? 0) ? ';' : ',';
  const headers = splitCsvLine(headerLine, delimiter).map(normalizeHeader);

  const records: Array<Record<string, unknown>> = [];
  for (let i = 1; i < lines.length; i += 1) {
    const values = splitCsvLine(lines[i], delimiter);
    const obj: Record<string, unknown> = {};
    headers.forEach((h, idx) => {
      obj[h] = values[idx] ?? '';
    });
    records.push(obj);
  }

  return parseInfoAutoRecords(records);
}

if (require.main === module) {
  const inputArg = process.argv[2];
  if (!inputArg) {
    console.error('Uso: npm run catalog:import -- <ruta-al-archivo.csv|json> [salida.json]');
    process.exit(1);
  }

  const inputPath = path.resolve(process.cwd(), inputArg);
  if (!fs.existsSync(inputPath)) {
    console.error(`No se encontró el archivo: ${inputPath}`);
    process.exit(1);
  }

  const ext = path.extname(inputPath).toLowerCase();
  const format: 'csv' | 'json' = ext === '.json' ? 'json' : 'csv';
  const raw = fs.readFileSync(inputPath, 'utf8');
  const vehicles = parseInfoAutoCatalogContent(raw, format);

  if (vehicles.length === 0) {
    console.error('No se pudieron importar registros válidos. Verificá los encabezados (CODIA, marca, modelo, version).');
    process.exit(1);
  }

  const outputPath = process.argv[3]
    ? path.resolve(process.cwd(), process.argv[3])
    : path.resolve(process.cwd(), 'data', 'vehicles.infoauto.json');

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(vehicles, null, 2), 'utf8');
  const brandsCount = new Set(vehicles.map((v) => v.brand)).size;
  console.log(`OK: Importados ${vehicles.length} vehículos (${brandsCount} marcas) con códigos InfoAuto oficiales en ${outputPath}`);
}
