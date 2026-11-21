export interface TokenResult {
  accessToken: string;
  expiresInSec: number;
}

export interface TokenManagerOptions {
  providerName: string;
  fetcher: () => Promise<TokenResult>;
  refreshBufferMs?: number;
  now?: () => number;
}

/**
 * Caché de tokens OAuth2/Auth0 segura para concurrencia:
 * - Evita token stampede compartiendo una sola promesa en vuelo.
 * - Renueva anticipadamente según `refreshBufferMs`.
 * - Permite invalidar ante respuestas 401 para reintentar una sola vez.
 */
export class TokenManager {
  private cachedToken: string | null = null;
  private expiresAt = 0;
  private inFlight: Promise<string> | null = null;
  private readonly refreshBufferMs: number;
  private readonly now: () => number;

  constructor(private readonly options: TokenManagerOptions) {
    this.refreshBufferMs = options.refreshBufferMs ?? 60_000;
    this.now = options.now ?? (() => Date.now());
  }

  async getToken(forceRefresh = false): Promise<string> {
    if (!forceRefresh && this.cachedToken && this.now() < this.expiresAt - this.refreshBufferMs) {
      return this.cachedToken;
    }

    if (this.inFlight) {
      return this.inFlight;
    }

    this.inFlight = this.options
      .fetcher()
      .then((result) => {
        if (!result.accessToken) {
          throw new Error(`Token vacío recibido de ${this.options.providerName}`);
        }
        const safeExpiresSec = Number.isFinite(result.expiresInSec) && result.expiresInSec > 0
          ? result.expiresInSec
          : 3600;
        this.cachedToken = result.accessToken;
        this.expiresAt = this.now() + safeExpiresSec * 1000;
        return result.accessToken;
      })
      .finally(() => {
        this.inFlight = null;
      });

    return this.inFlight;
  }

  invalidate(): void {
    this.cachedToken = null;
    this.expiresAt = 0;
  }
}
