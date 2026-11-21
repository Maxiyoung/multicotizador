import { PostalCodeEntry } from '../interfaces/catalog.interface';
import { normalizePostalCode } from '../schemas/quote.schema';
import rawPostalCodes from './data/postal-codes-ar.json';

function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

interface IndexedPostalCode {
  entry: PostalCodeEntry;
  searchKey: string;
  localityNorm: string;
}

class PostalCodesService {
  private readonly entries: PostalCodeEntry[];
  private readonly byCode = new Map<string, PostalCodeEntry[]>();
  private readonly indexed: IndexedPostalCode[];
  private readonly provincesCount: number;

  constructor(data: PostalCodeEntry[]) {
    this.entries = data;
    const provinces = new Set<string>();

    this.indexed = data.map((entry) => {
      provinces.add(entry.province);
      const bucket = this.byCode.get(entry.postalCode) ?? [];
      bucket.push(entry);
      this.byCode.set(entry.postalCode, bucket);

      const aliasesStr = entry.aliases ? entry.aliases.join(' ') : '';
      return {
        entry,
        localityNorm: normalizeText(entry.locality),
        searchKey: normalizeText(
          `${entry.postalCode} ${entry.locality} ${aliasesStr} ${entry.province}`
        ),
      };
    });

    this.provincesCount = provinces.size;
  }

  getStats() {
    return {
      postalCodesCount: this.byCode.size,
      entriesCount: this.entries.length,
      provincesCount: this.provincesCount,
    };
  }

  lookupByCode(rawPostalCode: string): PostalCodeEntry[] {
    const normalized = normalizePostalCode(rawPostalCode);
    const exact = this.byCode.get(normalized);
    if (exact && exact.length > 0) {
      return exact;
    }

    // Rango general oficial de CABA (1000..1499) si algún sub-CP no figuraba en el padrón base
    const numeric = Number(normalized);
    if (/^\d{4}$/.test(normalized) && numeric >= 1000 && numeric <= 1499) {
      return [
        {
          postalCode: normalized,
          locality: 'Ciudad Autónoma de Buenos Aires',
          province: 'Ciudad Autónoma de Buenos Aires',
        },
      ];
    }

    return [];
  }

  search(query: string, limit = 12): PostalCodeEntry[] {
    const norm = normalizeText(query);
    if (!norm) return [];

    // Si es un CP numérico (o CPA parcial), priorizamos coincidencias de prefijo de CP
    const digitsMatch = norm.match(/^[a-z]?(\d{2,4})[a-z]{0,3}$/);
    if (digitsMatch) {
      const prefix = digitsMatch[1];
      if (prefix.length === 4) {
        const exact = this.lookupByCode(prefix);
        if (exact.length > 0) return exact.slice(0, limit);
      }
      return this.entries.filter((e) => e.postalCode.startsWith(prefix)).slice(0, limit);
    }

    const tokens = norm.split(/\s+/).filter(Boolean);
    const matches: Array<{ entry: PostalCodeEntry; score: number }> = [];

    for (const item of this.indexed) {
      if (!tokens.every((token) => item.searchKey.includes(token))) {
        continue;
      }

      let score = 0;
      if (item.localityNorm === norm) score += 100;
      else if (item.localityNorm.startsWith(norm)) score += 60;
      else if (item.localityNorm.includes(norm)) score += 30;
      else score += 10;

      matches.push({ entry: item.entry, score });
    }

    return matches
      .sort(
        (a, b) =>
          b.score - a.score ||
          a.entry.locality.localeCompare(b.entry.locality, 'es') ||
          a.entry.postalCode.localeCompare(b.entry.postalCode)
      )
      .slice(0, limit)
      .map((m) => m.entry);
  }
}

export const postalCodesService = new PostalCodesService(rawPostalCodes as PostalCodeEntry[]);
