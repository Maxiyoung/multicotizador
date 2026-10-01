import axios from 'axios';
import { BaseAdapter } from './base.adapter';
import { QuoteInput, StandardQuote } from '../interfaces/quote.interface';

export class SancorAdapter extends BaseAdapter {
  readonly companyName = 'Sancor Seguros';

  // Flujo de Autenticación de Dos Pasos de Sancor
  private async getAuthToken(): Promise<string> {
    const clientId = process.env.SANCOR_API_CLIENT_ID || 'JOsdt0agj5D1NnquA6zWZaOg5GEZZgUP';
    
    // PASO 1: Obtener token de Auth0
    const auth0Url = 'https://external-pre-api.gruposancorseguros.com/apissa/pre-catalog/v2/security/auth0/token';
    const auth0Payload = {
      username: process.env.SANCOR_USERNAME || 'usuario',
      password: process.env.SANCOR_PASSWORD || 'password',
      app_client: process.env.SANCOR_APP_CLIENT || 'Ceibo'
    };

    const auth0Response = await axios.post(auth0Url, auth0Payload, {
      headers: { 'gss_apiclient_id': clientId }
    });
    
    const { access_token, token_type } = auth0Response.data;
    const bearerToken = `${token_type}${access_token}`;

    // PASO 2: Canjear el token de Auth0 por el token del ESB (Enterprise Service Bus)
    const esbUrl = 'https://external-pre-api.gruposancorseguros.com/apissa/pre-catalog/security/generate/authorization/esb';
    const esbResponse = await axios.get(esbUrl, {
      headers: {
        'gss_apiclient_id': clientId,
        'Authorization': bearerToken
      }
    });

    // Retornamos el token definitivo del ESB
    return esbResponse.data;
  }

  async getQuote(input: QuoteInput): Promise<StandardQuote[]> {
    const url = 'https://external-pre-api.gruposancorseguros.com/apissa/pre-catalog/quotations/vehicle/automotive';

    const payload = {
      vehicleQuotation: {
        currencyCode: 1, 
        policyVigencyCode: 1, 
        policyPaymentPeriodicityCode: 5, 
        productCode: 24, 
        policyQuotas: 12,
        policyPeriodStartEffectiveDate: new Date().toISOString(),
        zone: { postalCode: parseInt(input.postalCode) || 1000 },
        person: { isJuridicPerson: false, identificationType: "D - DNI" },
        intermediary: {
          prodProducerCode: parseInt(process.env.SANCOR_PRODUCER_CODE || '0'),
          upperProducerCode: parseInt(process.env.SANCOR_ORGANIZER_CODE || '0')
        },
        vehicle: {
          vehicleCode: "123456", 
          vehicleYear: input.year,
          vehicleUseTypeCode: 2, 
          vehicleTrackingEquipment: false,
          yearSuggestedValue: 5000000 
        }
      }
    };

    try {
      // 1. Ejecutamos el flujo de autenticación de dos pasos
      // const esbToken = await this.getAuthToken();
      // console.log(`[${this.companyName}] Token ESB obtenido exitosamente.`);

      // Simulamos demora
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // 2. Comentado hasta tener credenciales reales
      /*
      const response = await axios.post(url, payload, {
        headers: {
          'Content-Type': 'application/json',
          'gss_apiclient_id': process.env.SANCOR_API_CLIENT_ID || 'JOsdt0agj5D1NnquA6zWZaOg5GEZZgUP',
          'Authorization': `Bearer ${esbToken}`
        }
      });
      const plans = response.data.vehicleQuotation.plans || [];
      // ... mapeo de plans ...
      */

      // Lanzamos error simulado para caer en el mock temporal
      throw new Error("Simulating Auth Error to fall back to mock");

    } catch (error) {
      // Fallback al mock
      return this.getMockQuote();
    }
  }

  private getMockQuote(): StandardQuote[] {
    return [
      {
        companyName: this.companyName,
        logo: 'https://upload.wikimedia.org/wikipedia/commons/e/e0/Sancor_Seguros_Logo.png',
        planName: 'Auto Max 3 (Terceros Completo)',
        price: 52000,
        coverageDetails: ['Responsabilidad Civil', 'Robo/Hurto', 'Granizo', 'Cristales'],
        externalId: 'SANCOR-AM3'
      }
    ];
  }
}
