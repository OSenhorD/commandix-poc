import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { App } from 'supertest/types';

import { AppModule } from '@/app.module.js';
import { configureApp } from '@/configure-app.js';
import { configureOpenApi } from '@/openapi/configure-openapi.js';
import { db } from '@/prisma/db.js';

describe('OpenAPI + Scalar (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    process.env['ENABLE_API_DOCS'] = 'true';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    configureOpenApi(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    await db.close();
  });

  it('GET /api/openapi.json returns OpenAPI 3 document', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/openapi.json')
      .expect(200);

    expect(response.body.openapi).toMatch(/^3\./);
    expect(response.body.paths['/api/v1/health']).toBeDefined();
  });

  it('GET /api/docs serves Scalar UI', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/docs')
      .expect(200);

    expect(response.text.toLowerCase()).toContain('scalar');
  });

  it('ENABLE_API_DOCS=false skips routes', async () => {
    process.env['ENABLE_API_DOCS'] = 'false';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    const disabledApp = moduleFixture.createNestApplication();
    configureApp(disabledApp);
    configureOpenApi(disabledApp);
    await disabledApp.init();

    await request(disabledApp.getHttpServer())
      .get('/api/openapi.json')
      .expect(404);

    await disabledApp.close();
    process.env['ENABLE_API_DOCS'] = 'true';
  });
});
