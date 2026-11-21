import { buildInsurersConfig, InsurersConfig } from '../config/insurers';
import { BaseAdapter } from './base.adapter';
import { MercantilAdapter } from './mercantil/mercantil.adapter';
import { SancorAdapter } from './sancor/sancor.adapter';

export function createEnabledAdapters(config: InsurersConfig = buildInsurersConfig()): BaseAdapter[] {
  const adapters: BaseAdapter[] = [];

  if (config.mercantil.mode !== 'off') {
    adapters.push(new MercantilAdapter(config.mercantil));
  }

  if (config.sancor.mode !== 'off') {
    adapters.push(new SancorAdapter(config.sancor));
  }

  return adapters;
}
