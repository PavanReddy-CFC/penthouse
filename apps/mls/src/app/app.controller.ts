import { Controller, Get } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { AppConfigService } from '../config/app-config.service';

/**
 * @swagger
 * tags:
 *   - name: General
 *     description: Service status
 */
@SkipThrottle()
@Controller()
export class AppController {
  constructor(private readonly config: AppConfigService) {}

  /**
   * @swagger
   * /:
   *   get:
   *     tags: [General]
   *     summary: Check whether the API is running
   *     responses:
   *       200:
   *         description: API is running
   *         content:
   *           application/json:
   *             example:
   *               message: penthouselife-api is running
   *               docs: /api-docs
   */
  @Get()
  root(): { message: string; docs: string | null } {
    const swagger = this.config.get('swagger');
    return {
      message: `${this.config.get('serviceName')} is running`,
      docs: swagger.enabled ? `/${swagger.path}` : null,
    };
  }
}
