import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { App } from 'supertest/types';

import { AppModule } from '@/app.module.js';
import { configureApp } from '@/configure-app.js';
import { db } from '@/prisma/db.js';
import { runSeed } from '@/prisma/seed.js';

const hasDatabase = Boolean(process.env['DATABASE_URL']);

describe.skipIf(!hasDatabase)('GET /integrations list (e2e)', () => {
  let app: INestApplication<App>;
  let adminToken: string;

  beforeAll(async () => {
    process.env['JWT_ACCESS_SECRET'] ??= 'test-access-secret';
    process.env['JWT_REFRESH_SECRET'] ??= 'test-refresh-secret';

    await runSeed();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();

    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'admin@acme.com', password: 'Admin123!' })
      .expect(200);

    adminToken = login.body.accessToken;

    await request(app.getHttpServer())
      .post('/api/v1/integrations')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Active Webhook',
        type: 'WEBHOOK',
        targetUrl: 'https://example.com/active',
        isActive: true,
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/v1/integrations')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Inactive Webhook',
        type: 'REST_API',
        targetUrl: 'https://example.com/inactive',
        isActive: false,
      })
      .expect(201);
  });

  afterAll(async () => {
    await app.close();
    await db.close();
  });

  it('returns paginated integrations ordered by updatedAt DESC', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/integrations')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(response.body.meta).toMatchObject({
      page: 1,
      limit: 20,
      hasPreviousPage: false,
    });
    expect(response.body.meta.total).toBeGreaterThanOrEqual(2);
    expect(response.body.data.length).toBeGreaterThanOrEqual(2);
    expect(response.body.data[0]).toMatchObject({
      name: expect.any(String),
    });
    expect(
      response.body.data[0].authKey === null ||
        typeof response.body.data[0].authKey === 'string',
    ).toBe(true);
    expect(response.body.data[0]).not.toHaveProperty('customHeaders');
    expect(response.body.data[0]).not.toHaveProperty('defaultPayload');
  });

  it('filters by isActive=true', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/integrations?isActive=true')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(
      response.body.data.every((item: { isActive: boolean }) => item.isActive),
    ).toBe(true);
  });

  it('filters by isActive=false', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/integrations?isActive=false')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(
      response.body.data.every((item: { isActive: boolean }) => !item.isActive),
    ).toBe(true);
  });

  it('returns empty data for page beyond totalPages', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/integrations?page=999&limit=20')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(response.body.data).toEqual([]);
    expect(response.body.meta.page).toBe(999);
    expect(response.body.meta.hasNextPage).toBe(false);
  });

  it('returns 400 for invalid pagination', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/integrations?page=0')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(400);

    await request(app.getHttpServer())
      .get('/api/v1/integrations?limit=101')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(400);

    await request(app.getHttpServer())
      .get('/api/v1/integrations?isActive=maybe')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(400);
  });
});
