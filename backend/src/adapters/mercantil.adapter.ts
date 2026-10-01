// src/adapters/mercantil.adapter.ts
import axios from 'axios';
import { BaseAdapter } from './base.adapter';
import { QuoteInput, StandardQuote } from '../interfaces/quote.interface';

export class MercantilAdapter extends BaseAdapter {
  readonly companyName = 'Mercantil Andina';

  // Método privado para resolver la autenticación por Token (Paso 3 de tu guía)
  private async getAuthToken(): Promise<string> {
    const url = 'https://apidev.mercantilandina.com.ar/credentials/v2/';
    const data = new URLSearchParams({
      client_id: 'api-clientes-login',
      username: process.env.MERCANTIL_USER || 'USUARIO_TEST',
      password: process.env.MERCANTIL_PASSWORD || 'PASS_TEST',
      grant_type: 'password'
    });

    try {
      const response = await axios.post(url, data, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Ocp-Apim-Subscription-Key': process.env.MERCANTIL_SUBSCRIPTION_KEY || 'KEY_TEST'
        }
      });
      return response.data.access_token;
    } catch (error) {
      console.error(`[${this.companyName} Auth Error]:`, error);
      throw new Error(`Autenticación fallida en ${this.companyName}`);
    }
  }

  // Implementación del método obligatorio de cotización
  async getQuote(input: QuoteInput): Promise<StandardQuote[]> {
    try {
      // 1. Obtener token de acceso
      // const token = await this.getAuthToken();

      // 2. Aquí iría la llamada real al endpoint de cotización de Mercantil usando el token.
      // Simulamos el comportamiento de la API externa con un delay de 1.5 segundos:
      await new Promise(resolve => setTimeout(resolve, 1500));

      // 3. Normalizador (Mapeo de la respuesta externa a tu StandardQuote)
      // Simulamos que la API nos devolvió dos planes (Terceros y Todo Riesgo)
      return [
        {
          companyName: this.companyName,
          logo: 'https://apiportal.mercantilandina.com.ar/assets/logo.png', // URL ficticia o asset local
          planName: 'Terceros Completo Premium',
          price: 45000,
          coverageDetails: ['Responsabilidad Civil', 'Robo/Incendio Total y Parcial', 'Granizo hasta $800.000'],
          externalId: 'MA-99281A'
        },
        {
          companyName: this.companyName,
          logo: 'https://apiportal.mercantilandina.com.ar/assets/logo.png',
          planName: 'Todo Riesgo con Franquicia',
          price: 78000,
          coverageDetails: ['Responsabilidad Civil', 'Todo Riesgo', 'Franquicia fija de $150.000', 'Inundación total'],
          externalId: 'MA-99281B'
        }
      ];
    } catch (error) {
      // Lanzas el error hacia arriba para que el orquestador lo registre
      throw new Error(`Error al cotizar en ${this.companyName}`);
    }
  }
}