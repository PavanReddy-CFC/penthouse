import { Injectable } from '@nestjs/common';
import { AppConfig } from './app-config.types';
import { loadConfig } from './load-config';

/**
 * Centralized, typed access to configuration.
 * Modules and services inject this instead of touching process.env.
 *
 * Usage: config.get('port'), config.get('swagger').enabled
 */
@Injectable()
export class AppConfigService {
  private readonly config: AppConfig = loadConfig();

  get<K extends keyof AppConfig>(key: K): AppConfig[K] {
    return this.config[key];
  }
}
