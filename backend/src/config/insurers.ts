import { AdapterMode, EnvConfig, env } from './env';

export interface MercantilConfig {
  mode: AdapterMode;
  baseURL: string;
  authPath: string;
  quotePath: string;
  clientId: string;
  username: string;
  password: string;
  subscriptionKey: string;
}

export interface SancorConfig {
  mode: AdapterMode;
  baseURL: string;
  clientId: string;
  username: string;
  password: string;
  appClient: string;
  useEsbAuth: boolean;
  producerCode: number;
  upperProducerCode: number;
  statisticCode?: number;
  productCode: number;
  vigencyCode: number;
  paymentPeriodicityCode: number;
  policyQuotas: number;
  ivaConditionCode: number;
}

export interface InsurersConfig {
  mercantil: MercantilConfig;
  sancor: SancorConfig;
}

export function buildInsurersConfig(cfg: EnvConfig = env): InsurersConfig {
  return {
    mercantil: {
      mode: cfg.MERCANTIL_MODE,
      baseURL: cfg.MERCANTIL_BASE_URL,
      authPath: cfg.MERCANTIL_AUTH_PATH,
      quotePath: cfg.MERCANTIL_QUOTE_PATH,
      clientId: cfg.MERCANTIL_CLIENT_ID,
      username: cfg.MERCANTIL_USER,
      password: cfg.MERCANTIL_PASSWORD,
      subscriptionKey: cfg.MERCANTIL_SUBSCRIPTION_KEY,
    },
    sancor: {
      mode: cfg.SANCOR_MODE,
      baseURL: cfg.SANCOR_BASE_URL,
      clientId: cfg.SANCOR_CLIENT_ID,
      username: cfg.SANCOR_USERNAME,
      password: cfg.SANCOR_PASSWORD,
      appClient: cfg.SANCOR_APP_CLIENT,
      useEsbAuth: cfg.SANCOR_USE_ESB_AUTH,
      producerCode: cfg.SANCOR_PRODUCER_CODE ?? 10001,
      upperProducerCode: cfg.SANCOR_UPPER_PRODUCER_CODE ?? 10000,
      statisticCode: cfg.SANCOR_STATISTIC_CODE,
      productCode: cfg.SANCOR_PRODUCT_CODE,
      vigencyCode: cfg.SANCOR_VIGENCY_CODE,
      paymentPeriodicityCode: cfg.SANCOR_PAYMENT_PERIODICITY_CODE,
      policyQuotas: cfg.SANCOR_POLICY_QUOTAS,
      ivaConditionCode: cfg.SANCOR_IVA_CONDITION_CODE,
    },
  };
}
