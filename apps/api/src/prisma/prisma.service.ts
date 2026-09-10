import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * Thin wrapper around PrismaClient that hooks into Nest's lifecycle so the
 * connection is opened once at bootstrap and closed cleanly on shutdown.
 *
 * NOTE: no tenant-scoping middleware lives here yet - that is introduced
 * in Phase 2 alongside the real domain models (Prisma Client Extensions
 * or middleware to enforce organization/school/provider scoping on every
 * query). Keeping this class minimal now avoids having to rework a
 * half-designed scoping layer once the real schema lands.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit(): Promise<void> {
    await this.$connect();
    this.logger.log('Prisma connected to PostgreSQL');
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
