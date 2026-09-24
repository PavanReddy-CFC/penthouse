import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { AppConfigService } from '../config/app-config.service';

/**
 * Prisma client wired to the centralized configuration, including the
 * connection-pool settings (DATABASE_POOL_*). The connection opens lazily on
 * the first query, so the service can start and report health without a DB.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  constructor(config: AppConfigService) {
    super({ datasourceUrl: config.get('prismaDatasourceUrl') });
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
