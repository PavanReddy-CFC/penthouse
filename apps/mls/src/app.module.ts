import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app/app.controller';
import { AppConfigModule } from './config/app-config.module';
import { AppConfigService } from './config/app-config.service';
import { ElasticsearchModule } from './elasticsearch/elasticsearch.module';
import { HealthModule } from './health/health.module';
import { ListingsModule } from './listings/listings.module';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';

@Module({
  imports: [
    AppConfigModule,
    ThrottlerModule.forRootAsync({
      inject: [AppConfigService],
      useFactory: (config: AppConfigService) => [
        { ttl: config.get('rateLimit').ttlMs, limit: config.get('rateLimit').max },
      ],
    }),
    PrismaModule,
    RedisModule,
    ElasticsearchModule,
    HealthModule,
    ListingsModule,
  ],
  controllers: [AppController],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
