import { Controller, Get, HttpStatus, Version } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { AppException } from '../common/exceptions/app.exception';
import { ErrorCode } from '@cca/shared-types';

interface HealthPayload {
  status: 'ok';
  uptimeSeconds: number;
  database: 'ok' | 'unavailable';
}

@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Liveness/readiness probe. Not versioned - infrastructure (Docker
   * healthcheck, load balancer) should not need to track API versions.
   */
  @Version('1')
  @Get()
  async check(): Promise<HealthPayload> {
    let database: HealthPayload['database'] = 'ok';

    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      database = 'unavailable';
    }

    if (database === 'unavailable') {
      throw new AppException(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Database is unavailable',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    return {
      status: 'ok',
      uptimeSeconds: Math.round(process.uptime()),
      database,
    };
  }
}
