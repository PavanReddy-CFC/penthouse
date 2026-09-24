import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app/app.controller';
import { AppConfigModule } from './config/app-config.module';
import { AppConfigService } from './config/app-config.service';
import { FavoritesModule } from './favorites/favorites.module';
import { HealthModule } from './health/health.module';
import { InquiriesModule } from './inquiries/inquiries.module';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';

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
    HealthModule,
    UsersModule,
    FavoritesModule,
    InquiriesModule,
  ],
  controllers: [AppController],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
