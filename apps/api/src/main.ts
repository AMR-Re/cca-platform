import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { Logger as PinoNestLogger } from 'nestjs-pino';
import { ValidationPipe, VersioningType } from '@nestjs/common';

import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { validationExceptionFactory } from './common/pipes/validation-exception.factory';
import { PinoLogger } from 'nestjs-pino';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  // Structured (pino) logging replaces Nest's default console logger for
  // everything logged after this point, including framework internals.
  app.useLogger(app.get(PinoNestLogger));

  const config = app.get(ConfigService);

  // /api/v1/... - see ARCHITECTURE.md "API Versioning" for the rationale.
  app.setGlobalPrefix('api');
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: validationExceptionFactory,
    }),
  );

  app.useGlobalFilters(new AllExceptionsFilter(await app.resolve(PinoLogger)));
  app.useGlobalInterceptors(new TransformInterceptor());

  app.enableCors({
    origin: config.get<string>('CORS_ORIGIN', 'http://localhost:3000'),
    credentials: true,
  });

  app.enableShutdownHooks();

  const port = config.get<number>('PORT', 4000);
  await app.listen(port);
}

bootstrap();
