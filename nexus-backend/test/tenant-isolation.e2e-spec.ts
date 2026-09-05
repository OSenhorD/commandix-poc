import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import bcrypt from 'bcrypt';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { App } from 'supertest/types';

import { AppModule } from '@/app.module.js';
import { RoleEnum } from '@/common/enums/role.enum.js';
import { configureApp } from '@/configure-app.js';
import { db } from '@/prisma/db.js';
import { runSeed } from '@/prisma/seed.js';

const hasDatabase = Boolean(process.env['DATABASE_URL']);

describe.skipIf(!hasDatabase)('Integrations tenant isolation (e2e)', () => {
  let app: INestApplication<App>;
  let acmeAdminToken: string;
  let acmeViewerToken: string;
  let acmeViewerEmail: string;
  let otherTenantAdminToken: string;
  let acmeIntegrationId: string;

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

    const acmeLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'admin@acme.com', password: 'Admin123!' })
      .expect(200);

    acmeAdminToken = acmeLogin.body.accessToken;

    const acmeTenant = await db.orm.public.Tenant.where({
      slug: 'acme',
    }).first();
    expect(acmeTenant).toBeTruthy();

    acmeViewerEmail = `viewer-${Date.now()}@acme.com`;

    await db.orm.public.User.create({
      tenantId: acmeTenant!.id,
      email: acmeViewerEmail,
      passwordHash: await bcrypt.hash('Viewer123!', 10),
      role: RoleEnum.VIEWER,
    });

    const viewerLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: acmeViewerEmail,
        password: 'Viewer123!',
      })
      .expect(200);

    acmeViewerToken = viewerLogin.body.accessToken;

    const otherSlug = `other-${Date.now()}`;
    const otherBootstrap = await request(app.getHttpServer())
      .post('/api/v1/tenants/bootstrap')
      .send({
        tenantName: 'Other Tenant',
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

    const createResponse = await request(app.getHttpServer())
      .post('/api/v1/integrations')
      .set('Authorization', `Bearer ${acmeAdminToken}`)
      .send({
        name: 'Order Webhook',
        type: 'WEBHOOK',
        targetUrl: 'https://webhook.site/acme-order',
        authKey: 'secret-key',
        customHeaders: { 'X-Custom': 'value' },
        defaultPayload: { source: 'commandix' },
      })
      .expect(201);

    acmeIntegrationId = createResponse.body.id;
  });

  afterAll(async () => {
    await app.close();
    await db.close();
  });

  it('masks authKey when admin creates an integration', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/integrations')
      .set('Authorization', `Bearer ${acmeAdminToken}`)
      .send({
        name: 'Inventory Webhook',
        type: 'REST_API',
        targetUrl: 'https://example.com/inventory',
        authKey: 'another-secret-key',
      })
      .expect(201);

    expect(response.body.authKey).toBe('****-key');
    expect(response.body).not.toHaveProperty('tenantId');
  });

  it('allows viewer to read integration detail in same tenant', async () => {
    const response = await request(app.getHttpServer())
      .get(`/api/v1/integrations/${acmeIntegrationId}`)
      .set('Authorization', `Bearer ${acmeViewerToken}`)
      .expect(200);

    expect(response.body.id).toBe(acmeIntegrationId);
    expect(response.body.authKey).toBe('****-key');
  });

  it('returns 404 when accessing integration from another tenant', async () => {
    await request(app.getHttpServer())
      .get(`/api/v1/integrations/${acmeIntegrationId}`)
      .set('Authorization', `Bearer ${otherTenantAdminToken}`)
      .expect(404);
  });

  it('returns 403 when viewer tries to create an integration', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/integrations')
      .set('Authorization', `Bearer ${acmeViewerToken}`)
      .send({
        name: 'Forbidden Webhook',
        type: 'WEBHOOK',
        targetUrl: 'https://example.com/forbidden',
      })
      .expect(403);
  });
});
