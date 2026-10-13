import { BaseAdapter } from './base.adapters';
import { QuoteInput, StandardQuote } from '../interfaces/quote.interface';
import { env } from '../config/env';

export class MercantilAdapter extends BaseAdapter {
  readonly companyName = 'Mercantil Andina';
  private cachedToken: string | null = null;
  private tokenExpiresAt = 0;

  constructor() {
    super('https://apidev.mercantilandina.com.ar');
  }

  private async getAuthToken(): Promise<string> {
    if (this.cachedToken && Date.now() < this.tokenExpiresAt - 60000) {
      return this.cachedToken;
    }

    const data = new URLSearchParams({
      client_id: 'api-clientes-login',
      username: env.MERCANTIL_USER,
      password: env.MERCANTIL_PASSWORD,
      grant_type: 'password',
    });

    try {
      const response = await this.http.post('/credentials/v2/', data, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Ocp-Apim-Subscription-Key': env.MERCANTIL_SUBSCRIPTION_KEY,
        },
      });

      this.cachedToken = response.data.access_token;
      const expiresInSec = response.data.expires_in || 3600;
      this.tokenExpiresAt = Date.now() + expiresInSec * 1000;

      return this.cachedToken!;
    } catch (error) {
      console.error(`[${this.companyName} Auth Error]:`, error);
      throw new Error(`Autenticación fallida en ${this.companyName}`);
    }
  }

  async getQuote(input: QuoteInput): Promise<StandardQuote[]> {
    try {
      // 1. Cuando conectes credenciales reales, descomentás:
      // const token = await this.getAuthToken();

      // 2. Simulamos latencia de API externa
      await new Promise((resolve) => setTimeout(resolve, 900));

      // 3. Tarifación dinámica según año, GNC, 0km y uso
      const ageFactor = Math.max(1, (input.year - 1995) * 0.03);
      const gncFactor = input.hasGnc ? 1.12 : 1;
      const useFactor = input.use === 'comercial' ? 1.25 : 1;
      const zeroKmFactor = input.isZeroKm ? 1.08 : 1;
      const multiplier = ageFactor * gncFactor * useFactor * zeroKmFactor;

      const quotes: StandardQuote[] = [
        {
          companyName: this.companyName,
          logo: 'https://apiportal.mercantilandina.com.ar/assets/logo.png',
          planName: 'Responsabilidad Civil Obligatoria (Plan A)',
          planType: 'RC',
          price: Math.round(19500 * useFactor),
          coverageDetails: [
            'Responsabilidad Civil hasta $160.000.000',
            'Servicio de grúa y asistencia mecánica hasta 100 km',
            'Cobertura en países limítrofes (Mercosur)',
          ],
          externalId: `MA-RC-${input.year}`,
        },
        {
          companyName: this.companyName,
          logo: 'https://apiportal.mercantilandina.com.ar/assets/logo.png',
          planName: 'Terceros Completo Premium (M+)',
          planType: 'TERCEROS_COMPLETO',
          price: Math.round(34000 * multiplier),
          coverageDetails: [
            'Responsabilidad Civil',
            'Robo e Incendio Total y Parcial',
            'Cristales laterales, parabrisas y luneta sin tope',
            'Daños por granizo hasta $1.200.000',
          ],
          externalId: `MA-TC-${input.year}`,
        },
      ];

      // Regla de negocio: Todo Riesgo disponible para vehículos de hasta 12 años de antigüedad
      if (input.year >= new Date().getFullYear() - 12) {
        quotes.push({
          companyName: this.companyName,
          logo: 'https://apiportal.mercantilandina.com.ar/assets/logo.png',
          planName: 'Todo Riesgo con Franquicia Fija',
          planType: 'TODO_RIESGO',
          price: Math.round(56000 * multiplier),
          franchise: 250000,
          coverageDetails: [
            'Daños parciales por accidente con franquicia fija',
            'Robo e Incendio Total y Parcial sin franquicia',
            'Destrucción Total por accidente (cláusula 80%)',
            'Granizo e inundación total sin límite de eventos',
          ],
          externalId: `MA-TR-${input.year}`,
        });
      }

      return quotes;
    } catch (error) {
      throw new Error(`Error al cotizar en ${this.companyName}`);
    }
  }
}
