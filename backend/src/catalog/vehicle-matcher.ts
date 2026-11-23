import { VehicleVersionOption } from '../interfaces/catalog.interface';

const BRAND_ALIASES: Record<string, string> = {
  vw: 'volkswagen',
  volks: 'volkswagen',
  chevy: 'chevrolet',
  chev: 'chevrolet',
  mb: 'mercedes-benz',
  mercedes: 'mercedes-benz',
  'mercedes benz': 'mercedes-benz',
  citroen: 'citroen',
  peug: 'peugeot',
  ren: 'renault',
  toyo: 'toyota',
  mitsu: 'mitsubishi',
};

const TOKEN_SYNONYMS: Record<string, string[]> = {
  automatico: ['at', 'cvt', 'dsg', 'tiptronic', 'edc', 'ecvt', 'at6', 'at9', 's-tronic'],
  automatica: ['at', 'cvt', 'dsg', 'tiptronic', 'edc', 'ecvt', 'at6', 'at9', 's-tronic'],
  auto: ['at', 'cvt', 'dsg', 'tiptronic', 'edc'],
  at: ['at', 'cvt', 'dsg', 'tiptronic', 'edc', 'at6', 'at9'],
  manual: ['mt'],
  mt: ['mt'],
  hibrido: ['hibrido', 'hybrid', 'ecvt', 'e-power', 'e-tense'],
  hybrid: ['hibrido', 'hybrid', 'ecvt'],
  diesel: ['diesel', 'tdi', 'hdi', 'cdi', 'crdi', 'dci', 'td', 'bi-td', 'bi-turbo'],
  nafta: ['nafta'],
  '5puertas': ['5p'],
  '4puertas': ['4p'],
  '3puertas': ['3p'],
  full: [
    'highline',
    'feline',
    'premier',
    'titanium',
    'seg',
    'srx',
    'limited',
    'extreme',
    'platinum',
    'precision',
    'gt',
  ],
  base: ['track', 'like', 'active', 'xs', 'dx', 'xl', 'ls', 'zen', 'live', 'sport'],
  '4x4': ['4x4', '4wd', 'awd', 'quattro', '4matic', 'allgrip'],
  '4wd': ['4x4', '4wd', 'awd'],
  awd: ['4x4', '4wd', 'awd'],
  pickup: ['pickup'],
  camioneta: ['pickup', 'suv'],
  furgon: ['furgon', 'utilitario'],
};

export interface VehicleMatchCandidate {
  vehicle: VehicleVersionOption;
  confidence: number;
}

export interface VehicleResolutionResult {
  resolved: boolean;
  confidence: number;
  bestMatch: VehicleVersionOption | null;
  candidates: VehicleMatchCandidate[];
  extractedYear?: number;
}

export function normalizeVehicleText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/(\d)\s+puertas?\b/g, '$1p')
    .replace(/doble\s+cabina\b/g, 'dc')
    .replace(/cabina\s+simple\b/g, 'cs')
    .replace(/[-/_,()]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function canonicalizeBrand(rawBrand: string): string {
  const norm = normalizeVehicleText(rawBrand);
  return BRAND_ALIASES[norm] ?? norm;
}

export function extractInlineYear(query: string): { cleanQuery: string; year?: number } {
  const currentYear = new Date().getFullYear();
  const match = query.match(/\b(199\d|20[0-3]\d)\b/);
  if (!match) {
    return { cleanQuery: query };
  }
  const year = Number(match[1]);
  if (year < 1990 || year > currentYear + 1) {
    return { cleanQuery: query };
  }
  const cleanQuery = query.replace(match[0], ' ').replace(/\s+/g, ' ').trim();
  return { cleanQuery, year };
}

function getBigrams(str: string): Map<string, number> {
  const map = new Map<string, number>();
  if (str.length < 2) {
    if (str.length === 1) map.set(str, 1);
    return map;
  }
  for (let i = 0; i < str.length - 1; i += 1) {
    const bg = str.slice(i, i + 2);
    map.set(bg, (map.get(bg) ?? 0) + 1);
  }
  return map;
}

export function diceSimilarity(a: string, b: string): number {
  if (!a || !b) return 0;
  if (a === b) return 1;
  if (a.length < 2 || b.length < 2) {
    return a[0] === b[0] ? 0.5 : 0;
  }

  const bigramsA = getBigrams(a);
  const bigramsB = getBigrams(b);
  let intersections = 0;

  for (const [bg, countA] of bigramsA.entries()) {
    const countB = bigramsB.get(bg) ?? 0;
    intersections += Math.min(countA, countB);
  }

  return (2 * intersections) / (a.length - 1 + (b.length - 1));
}

export function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  let prev = Array.from({ length: b.length + 1 }, (_, idx) => idx);
  let curr = new Array<number>(b.length + 1);

  for (let i = 1; i <= a.length; i += 1) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    [prev, curr] = [curr, prev];
  }

  return prev[b.length];
}

function tokenMatchScore(queryToken: string, vehicleTokens: string[], vehicleHaystack: string): number {
  const expanded = new Set<string>([queryToken]);
  if (BRAND_ALIASES[queryToken]) {
    expanded.add(normalizeVehicleText(BRAND_ALIASES[queryToken]));
  }
  if (TOKEN_SYNONYMS[queryToken]) {
    for (const syn of TOKEN_SYNONYMS[queryToken]) {
      expanded.add(syn);
    }
  }

  let best = 0;
  for (const variant of expanded) {
    if (vehicleTokens.includes(variant)) {
      return 1;
    }
    if (variant.length >= 2 && vehicleTokens.some((vt) => vt.startsWith(variant))) {
      best = Math.max(best, 0.9);
      continue;
    }
    if (variant.length >= 3 && vehicleHaystack.includes(variant)) {
      best = Math.max(best, 0.84);
      continue;
    }

    // Matching difuso para palabras >= 4 letras (tolera typos como "corola" o "crnos")
    if (variant.length >= 4 && !/^\d+(\.\d+)?$/.test(variant)) {
      for (const vt of vehicleTokens) {
        if (vt.length < 3 || /^\d+(\.\d+)?$/.test(vt)) continue;
        if (Math.abs(variant.length - vt.length) <= 2) {
          const dist = levenshteinDistance(variant, vt);
          if (dist === 1) {
            best = Math.max(best, 0.82);
            continue;
          }
          if (dist === 2 && Math.max(variant.length, vt.length) >= 7) {
            best = Math.max(best, 0.74);
            continue;
          }
        }
        const sim = diceSimilarity(variant, vt);
        if (sim >= 0.72) {
          best = Math.max(best, sim * 0.85);
        }
      }
    }
  }

  return best;
}

function scorePhraseSimilarity(queryPhrase: string, targetPhrase: string): number {
  if (!queryPhrase || !targetPhrase) return 0;
  if (queryPhrase === targetPhrase) return 1;
  if (targetPhrase.includes(queryPhrase)) return 0.92;

  const qTokens = queryPhrase.split(' ').filter(Boolean);
  const tTokens = targetPhrase.split(' ').filter(Boolean);
  if (qTokens.length === 0 || tTokens.length === 0) return 0;

  let sum = 0;
  for (const qt of qTokens) {
    sum += tokenMatchScore(qt, tTokens, targetPhrase);
  }
  const tokenCoverage = sum / qTokens.length;
  const dice = diceSimilarity(queryPhrase, targetPhrase);

  return Math.max(tokenCoverage * 0.95, dice);
}

export interface IndexedVehicle {
  item: VehicleVersionOption;
  brandNorm: string;
  modelNorm: string;
  versionNorm: string;
  haystack: string;
  tokens: string[];
}

export function indexVehicles(vehicles: VehicleVersionOption[]): IndexedVehicle[] {
  return vehicles.map((item) => {
    const brandNorm = normalizeVehicleText(item.brand);
    const modelNorm = normalizeVehicleText(item.model);
    const versionNorm = normalizeVehicleText(item.version);
    const haystack = normalizeVehicleText(
      `${item.infoAutoCode} ${item.brand} ${item.model} ${item.version} ${item.fuel} ${item.bodyType}`
    );
    const tokens = Array.from(new Set(haystack.split(' ').filter(Boolean)));
    return {
      item,
      brandNorm,
      modelNorm,
      versionNorm,
      haystack,
      tokens,
    };
  });
}

export function searchIndexedVehicles(
  indexed: IndexedVehicle[],
  rawQuery: string,
  explicitYear?: number,
  limit = 15
): { candidates: VehicleMatchCandidate[]; effectiveYear?: number } {
  const { cleanQuery, year: inlineYear } = extractInlineYear(rawQuery);
  const effectiveYear = inlineYear ?? explicitYear;
  const norm = normalizeVehicleText(cleanQuery || rawQuery);
  if (!norm) {
    return { candidates: [], effectiveYear };
  }

  // Búsqueda directa por código InfoAuto
  if (/^\d{4,10}$/.test(norm)) {
    const codeHits = indexed
      .filter((entry) => {
        if (effectiveYear && (effectiveYear < entry.item.yearFrom || effectiveYear > entry.item.yearTo)) {
          return false;
        }
        return entry.item.infoAutoCode === norm || entry.item.infoAutoCode.startsWith(norm);
      })
      .map((entry) => ({
        vehicle: entry.item,
        confidence: entry.item.infoAutoCode === norm ? 1 : 0.92,
      }))
      .slice(0, limit);
    return { candidates: codeHits, effectiveYear };
  }

  const queryTokens = norm.split(' ').filter(Boolean);
  if (queryTokens.length === 0) {
    return { candidates: [], effectiveYear };
  }

  const scored: VehicleMatchCandidate[] = [];

  for (const entry of indexed) {
    if (effectiveYear && (effectiveYear < entry.item.yearFrom || effectiveYear > entry.item.yearTo)) {
      continue;
    }

    let tokenSum = 0;
    let matchedTokens = 0;

    for (const qt of queryTokens) {
      const score = tokenMatchScore(qt, entry.tokens, entry.haystack);
      if (score > 0) {
        matchedTokens += 1;
        tokenSum += score;
      }
    }

    const minRatio = queryTokens.length >= 3 ? 0.75 : 1;
    if (matchedTokens / queryTokens.length < minRatio) {
      continue;
    }

    let confidence = tokenSum / queryTokens.length;

    const firstTokenCanonical = canonicalizeBrand(queryTokens[0]);
    if (entry.brandNorm === firstTokenCanonical || entry.modelNorm.startsWith(queryTokens[0])) {
      confidence = Math.min(1, confidence + 0.05);
    }

    if (matchedTokens < queryTokens.length) {
      confidence *= matchedTokens / queryTokens.length;
    }

    scored.push({
      vehicle: entry.item,
      confidence: Number(confidence.toFixed(3)),
    });
  }

  scored.sort(
    (a, b) =>
      b.confidence - a.confidence ||
      a.vehicle.brand.localeCompare(b.vehicle.brand, 'es') ||
      a.vehicle.model.localeCompare(b.vehicle.model, 'es')
  );

  return {
    candidates: scored.slice(0, limit),
    effectiveYear,
  };
}

export function resolveStructuredVehicle(
  indexed: IndexedVehicle[],
  params: {
    brand?: string;
    model?: string;
    version?: string;
    query?: string;
    year?: number;
  },
  autoResolveThreshold = 0.76
): VehicleResolutionResult {
  if (params.query) {
    const { candidates, effectiveYear } = searchIndexedVehicles(
      indexed,
      params.query,
      params.year,
      5
    );
    const best = candidates[0] ?? null;
    const second = candidates[1] ?? null;
    // Si hay empate entre múltiples versiones (ej. query="corolla"), NO forzamos auto-resolución
    const isClearWinner =
      best !== null &&
      best.confidence >= autoResolveThreshold &&
      (!second || best.confidence - second.confidence >= 0.08);

    return {
      resolved: isClearWinner,
      confidence: best?.confidence ?? 0,
      bestMatch: best?.vehicle ?? null,
      candidates,
      extractedYear: effectiveYear,
    };
  }

  const canonicalBrand = params.brand ? canonicalizeBrand(params.brand) : '';
  const modelNorm = params.model ? normalizeVehicleText(params.model) : '';
  const versionNorm = params.version ? normalizeVehicleText(params.version) : '';

  const yearFiltered = indexed.filter((entry) =>
    params.year ? params.year >= entry.item.yearFrom && params.year <= entry.item.yearTo : true
  );

  const scored: VehicleMatchCandidate[] = [];

  for (const entry of yearFiltered) {
    const brandScore = canonicalBrand
      ? entry.brandNorm === canonicalBrand
        ? 1
        : scorePhraseSimilarity(canonicalBrand, entry.brandNorm)
      : 1;

    if (canonicalBrand && brandScore < 0.72) {
      continue;
    }

    const modelScore = modelNorm ? scorePhraseSimilarity(modelNorm, entry.modelNorm) : 0.5;
    if (modelNorm && modelScore < 0.65) {
      continue;
    }

    const versionScore = versionNorm
      ? scorePhraseSimilarity(versionNorm, entry.versionNorm)
      : 0.5;

    // Ponderación estricta: Marca (25%) + Modelo (45%) + Versión (30%)
    const combined = brandScore * 0.25 + modelScore * 0.45 + versionScore * 0.3;

    scored.push({
      vehicle: entry.item,
      confidence: Number(combined.toFixed(3)),
    });
  }

  scored.sort((a, b) => b.confidence - a.confidence);
  const topCandidates = scored.slice(0, 5);
  const best = topCandidates[0] ?? null;
  const second = topCandidates[1] ?? null;

  const isClearWinner =
    best !== null &&
    best.confidence >= autoResolveThreshold &&
    (!second || best.confidence - second.confidence >= 0.05 || best.confidence >= 0.94);

  return {
    resolved: isClearWinner,
    confidence: best?.confidence ?? 0,
    bestMatch: best?.vehicle ?? null,
    candidates: topCandidates,
    extractedYear: params.year,
  };
}
