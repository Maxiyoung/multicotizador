import { describe, expect, it, vi } from 'vitest';
import { TokenManager } from '../src/lib/token-manager';

describe('TokenManager', () => {
  it('cachea el token y evita llamadas duplicadas ante concurrencia (anti-stampede)', async () => {
    let clock = 1_000_000;
    const fetcher = vi.fn(async () => {
      await new Promise((r) => setTimeout(r, 20));
      return { accessToken: 'tok-abc', expiresInSec: 3600 };
    });

    const manager = new TokenManager({
      providerName: 'TestInsurer',
      fetcher,
      now: () => clock,
    });

    // 5 llamadas simultáneas deben disparar 1 solo login
    const results = await Promise.all([
      manager.getToken(),
      manager.getToken(),
      manager.getToken(),
      manager.getToken(),
      manager.getToken(),
    ]);

    expect(results).toEqual(['tok-abc', 'tok-abc', 'tok-abc', 'tok-abc', 'tok-abc']);
    expect(fetcher).toHaveBeenCalledTimes(1);

    // Dentro de la ventana válida sigue devolviendo caché
    clock += 1_800_000;
    expect(await manager.getToken()).toBe('tok-abc');
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('renueva anticipadamente cuando entra en el margen de seguridad y permite invalidar tras 401', async () => {
    let clock = 1_000_000;
    let counter = 0;
    const fetcher = vi.fn(async () => {
      counter += 1;
      return { accessToken: `tok-${counter}`, expiresInSec: 120 };
    });

    const manager = new TokenManager({
      providerName: 'TestInsurer',
      fetcher,
      refreshBufferMs: 30_000,
      now: () => clock,
    });

    expect(await manager.getToken()).toBe('tok-1');

    // A los 95s ya entró en el buffer de 30s antes de expirar (120s)
    clock += 95_000;
    expect(await manager.getToken()).toBe('tok-2');
    expect(fetcher).toHaveBeenCalledTimes(2);

    // Invalidación manual por 401
    manager.invalidate();
    expect(await manager.getToken()).toBe('tok-3');
    expect(fetcher).toHaveBeenCalledTimes(3);
  });
});
