import { Controller, Get } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { AppConfigService } from '../config/app-config.service';
import { ElasticsearchService } from '../elasticsearch/elasticsearch.service';
import { PrismaService } from '../prisma/prisma.service';
import { DependencyStatus, RedisService } from '../redis/redis.service';

export interface HealthResponse {
  status: 'ok' | 'degraded';
  service: string;
  appEnv: string;
  database: 'up' | 'down';
  redis: DependencyStatus;
  elasticsearch: DependencyStatus;
  uptimeSeconds: number;
  timestamp: string;
}

@SkipThrottle()
@Controller('health')
export class HealthController {
  constructor(
    private readonly config: AppConfigService,
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly es: ElasticsearchService,
  ) {}

  /**
   * @swagger
   * /health:
   *   get:
   *     tags: [General]
   *     summary: Check the service, database, Redis and Elasticsearch
   *     description: |
   *       `status` is `degraded` when the database or any configured dependency is down.
   *       Redis and Elasticsearch show `disabled` when their URL is empty.
   *     responses:
   *       200:
   *         description: Health status
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Health'
   */
  @Get()
  async check(): Promise<HealthResponse> {
    const [database, elasticsearch] = await Promise.all([
      this.prisma.$queryRaw`SELECT 1`.then(
        () => 'up' as const,
        () => 'down' as const,
      ),
      this.es.status(),
    ]);
    const redis = this.redis.status();
    const healthy = database === 'up' && redis !== 'down' && elasticsearch !== 'down';

    return {
      status: healthy ? 'ok' : 'degraded',
      service: this.config.get('serviceName'),
      appEnv: this.config.get('appEnv'),
      database,
      redis,
      elasticsearch,
      uptimeSeconds: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    };
  }
}
