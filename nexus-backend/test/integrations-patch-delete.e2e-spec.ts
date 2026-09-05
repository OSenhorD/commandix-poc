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

describe.skipIf(!hasDatabase)('PATCH/DELETE /integrations (e2e)', () => {
  let app: INestApplication<App>;
  let adminToken: string;
  let otherTenantAdminToken: string;

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

    const otherSlug = `other-patch-${Date.now()}`;
    await request(app.getHttpServer())
      .post('/api/v1/tenants/bootstrap')
      .send({
        tenantName: 'Other Patch Tenant',
        tenantSlug: otherSlug,
        adminEmail: `admin@${otherSlug}.com`,
        adminPassword: 'Other123!',
      })
      .expect(201);

    const otherLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: `admin@${otherSlug}.com`,
        password: 'Other123!',
      })
      .expect(200);

    otherTenantAdminToken = otherLogin.body.accessToken;
  });

  afterAll(async () => {
    await app.close();
    await db.close();
  });

  async function createIntegration(name: string) {
    const response = await request(app.getHttpServer())
      .post('/api/v1/integrations')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name,
        type: 'WEBHOOK',
        targetUrl: 'https://example.com/webhook',
        authKey: 'secret-key',
        customHeaders: { 'X-Custom': 'old' },
        defaultPayload: { source: 'commandix' },
        isActive: true,
      })
      .expect(201);

    return response.body.id as string;
  }

  it('PATCH { isActive: false } deactivates the integration', async () => {
    const id = await createIntegration(`Deactivate ${Date.now()}`);

    const response = await request(app.getHttpServer())
      .patch(`/api/v1/integrations/${id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ isActive: false })
      .expect(200);

    expect(response.body.isActive).toBe(false);
    expect(response.body.authKey).toBe('****-key');
  });

  it('PATCH keeps authKey when omitted', async () => {
    const id = await createIntegration(`Keep AuthKey ${Date.now()}`);

    const response = await request(app.getHttpServer())
      .patch(`/api/v1/integrations/${id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ targetUrl: 'https://example.com/updated' })
      .expect(200);

    expect(response.body.targetUrl).toBe('https://example.com/updated');
    expect(response.body.authKey).toBe('****-key');
  });

  it('PATCH replaces customHeaders entirely', async () => {
    const id = await createIntegration(`Replace Headers ${Date.now()}`);

    const response = await request(app.getHttpServer())
      .patch(`/api/v1/integrations/${id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ customHeaders: { 'X-New': 'value' } })
      .expect(200);

    expect(response.body.customHeaders).toEqual({ 'X-New': 'value' });
  });

  it('returns 400 for PATCH with empty body', async () => {
    const id = await createIntegration(`Empty Patch ${Date.now()}`);

    await request(app.getHttpServer())
      .patch(`/api/v1/integrations/${id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({})
      .expect(400);
  });

  it('returns 404 for PATCH from another tenant', async () => {
    const id = await createIntegration(`Cross Tenant Patch ${Date.now()}`);

    await request(app.getHttpServer())
      .patch(`/api/v1/integrations/${id}`)
      .set('Authorization', `Bearer ${otherTenantAdminToken}`)
      .send({ isActive: false })
      .expect(404);
  });

  it('DELETE removes integration and cascades executions', async () => {
    const id = await createIntegration(`Delete Me ${Date.now()}`);

    await db.orm.public.IntegrationExecution.create({
      integrationId: id,
      status: 'SUCCESS',
      httpStatusCode: 200,
      responseTimeMs: 42,
      requestPayload: { test: true } as never,
      responseBody: 'ok',
    });

    const beforeDelete = await db.orm.public.IntegrationExecution.where({
      integrationId: id,
    }).aggregate((aggregate) => ({ total: aggregate.count() }));
    expect(beforeDelete.total).toBe(1);

    await request(app.getHttpServer())
      .delete(`/api/v1/integrations/${id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(204);

    const integration = await db.orm.public.Integration.where({ id }).first();
    expect(integration).toBeNull();

    const afterDelete = await db.orm.public.IntegrationExecution.where({
      integrationId: id,
    }).aggregate((aggregate) => ({ total: aggregate.count() }));
    expect(afterDelete.total).toBe(0);
  });

  it('returns 404 for DELETE from another tenant', async () => {
    const id = await createIntegration(`Cross Tenant Delete ${Date.now()}`);

    await request(app.getHttpServer())
      .delete(`/api/v1/integrations/${id}`)
      .set('Authorization', `Bearer ${otherTenantAdminToken}`)
      .expect(404);
  });
});
