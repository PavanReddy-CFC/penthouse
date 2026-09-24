import { Controller, Get } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { AppConfigService } from '../config/app-config.service';
import { PrismaService } from '../prisma/prisma.service';

export interface HealthResponse {
  status: 'ok' | 'degraded';
  service: string;
  appEnv: string;
  database: 'up' | 'down';
  uptimeSeconds: number;
  timestamp: string;
}

@SkipThrottle()
@Controller('health')
export class HealthController {
  constructor(
    private readonly config: AppConfigService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * @swagger
   * /health:
   *   get:
   *     tags: [General]
   *     summary: Check the service and database health
   *     responses:
   *       200:
   *         description: Health status. `status` is `degraded` when the database is down.
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Health'
   */
  @Get()
  async check(): Promise<HealthResponse> {
    let database: HealthResponse['database'] = 'up';
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      database = 'down';
    }

    return {
      status: database === 'up' ? 'ok' : 'degraded',
      service: this.config.get('serviceName'),
      appEnv: this.config.get('appEnv'),
      database,
      uptimeSeconds: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    };
  }
}
