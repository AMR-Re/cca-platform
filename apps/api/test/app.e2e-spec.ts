import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import request from 'supertest';

import { AppModule } from './../src/app.module';
import { AllExceptionsFilter } from './../src/common/filters/all-exceptions.filter';
import { TransformInterceptor } from './../src/common/interceptors/transform.interceptor';

describe('Health (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.useGlobalInterceptors(new TransformInterceptor());
    app.useGlobalFilters(new AllExceptionsFilter(await app.resolve(PinoLogger)));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/api/v1/health (GET) returns the standardized success envelope', async () => {
    const response = await request(app.getHttpServer()).get('/api/v1/health');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.status).toBe('ok');
  });
});
