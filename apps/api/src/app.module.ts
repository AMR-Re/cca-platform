import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { randomUUID } from 'crypto';

import { validateEnv } from './config/env.validation';
import { PrismaModule } from './prisma/prisma.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
      envFilePath: ['.env'],
    }),
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        pinoHttp: {
          level: config.get<string>('LOG_LEVEL', 'info'),
          genReqId: (req: { headers: Record<string, string | string[] | undefined> }) =>
            (req.headers['x-request-id'] as string) || randomUUID(),
          // Pretty-print only outside production; production emits raw JSON
          // for log aggregation (e.g. CloudWatch, Loki, ELK).
          transport:
            config.get<string>('NODE_ENV') !== 'production'
              ? { target: 'pino-pretty', options: { singleLine: true } }
              : undefined,
          redact: ['req.headers.authorization', 'req.headers.cookie'],
          customProps: () => ({ context: 'HTTP' }),
        },
      }),
    }),
    PrismaModule,
    HealthModule,
  ],
})
export class AppModule {}
