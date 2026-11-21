interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

export class QuoteCache<T> {
  private readonly store = new Map<string, CacheEntry<T>>();

  constructor(
    private readonly ttlMs: number,
    private readonly maxEntries = 500,
    private readonly now: () => number = () => Date.now()
  ) {}

  get(key: string): T | null {
    if (this.ttlMs <= 0) return null;

    const entry = this.store.get(key);
    if (!entry) return null;

    if (this.now() >= entry.expiresAt) {
      this.store.delete(key);
      return null;
    }

    return entry.value;
  }

  set(key: string, value: T): void {
    if (this.ttlMs <= 0) return;

    if (this.store.size >= this.maxEntries && !this.store.has(key)) {
      const oldestKey = this.store.keys().next().value;
      if (oldestKey !== undefined) {
        this.store.delete(oldestKey);
      }
    }

    this.store.set(key, {
      value,
      expiresAt: this.now() + this.ttlMs,
    });
  }

  clear(): void {
    this.store.clear();
  }
}
