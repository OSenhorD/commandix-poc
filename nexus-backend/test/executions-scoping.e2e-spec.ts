import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';

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

describe.skipIf(!hasDatabase)('Executions listing and scoping (e2e)', () => {
  let app: INestApplication<App>;
  let adminToken: string;
  let otherTenantAdminToken: string;
  let integrationId: string;
  let server: Server;
  let targetUrl: string;
  let nextStatus: number;

  let oldExecutionId: string;
  let midExecutionId: string;
  let newExecutionId: string;

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

    const otherSlug = `other-exec-${Date.now()}`;
    await request(app.getHttpServer())
      .post('/api/v1/tenants/bootstrap')
      .send({
        tenantName: 'Other Executions Tenant',
        tenantSlug: otherSlug,
        adminEmail: `admin@${otherSlug}.com`,
        adminPassword: 'Other123!',
      })
      .expect(201);

    const otherLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: `admin@${otherSlug}.com`, password: 'Other123!' })
      .expect(200);
    otherTenantAdminToken = otherLogin.body.accessToken;

    nextStatus = 200;
    server = createServer((req, res) => {
      const chunks: Buffer[] = [];
      req.on('data', (chunk: Buffer) => chunks.push(chunk));
      req.on('end', () => {
        res.writeHead(nextStatus, { 'Content-Type': 'application/json' });
        res.end('{"ok":true}');
      });
    });
    await new Promise<void>((resolve) =>
      server.listen(0, '127.0.0.1', resolve),
    );
    const address = server.address() as AddressInfo;
    targetUrl = `http://127.0.0.1:${address.port}/webhook`;

    const createResponse = await request(app.getHttpServer())
      .post('/api/v1/integrations')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: `Executions Scoping ${Date.now()}`,
        type: 'WEBHOOK',
        targetUrl,
        isActive: true,
      })
      .expect(201);
    integrationId = createResponse.body.id;

    // Three executions — SUCCESS, FAILURE, SUCCESS — then pinned to known,
    // well-separated `executedAt` values so ordering/filter assertions are
    // deterministic instead of relying on wall-clock timing between triggers.
    nextStatus = 200;
    const oldResponse = await request(app.getHttpServer())
      .post(`/api/v1/integrations/${integrationId}/trigger`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ payload: { seq: 1 } })
      .expect(200);
    oldExecutionId = oldResponse.body.id;

    nextStatus = 500;
    const midResponse = await request(app.getHttpServer())
      .post(`/api/v1/integrations/${integrationId}/trigger`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ payload: { seq: 2 } })
      .expect(200);
    midExecutionId = midResponse.body.id;

    nextStatus = 200;
    const newResponse = await request(app.getHttpServer())
      .post(`/api/v1/integrations/${integrationId}/trigger`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ payload: { seq: 3 } })
      .expect(200);
    newExecutionId = newResponse.body.id;

    await db.orm.public.IntegrationExecution.where({
      id: oldExecutionId,
    }).update({ executedAt: '2026-01-01T00:00:00.000Z' });
    await db.orm.public.IntegrationExecution.where({
      id: midExecutionId,
    }).update({ executedAt: '2026-01-15T12:00:00.000Z' });
    await db.orm.public.IntegrationExecution.where({
      id: newExecutionId,
    }).update({ executedAt: '2026-01-31T23:59:59.999Z' });
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await app.close();
    await db.close();
  });

  it('lists executions for an integration, ordered by executedAt DESC, with pagination meta', async () => {
    const response = await request(app.getHttpServer())
      .get(`/api/v1/integrations/${integrationId}/executions`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(response.body.meta).toMatchObject({
      page: 1,
      limit: 20,
      total: 3,
      totalPages: 1,
      hasNextPage: false,
      hasPreviousPage: false,
    });
    expect(response.body.data.map((e: { id: string }) => e.id)).toEqual([
      newExecutionId,
      midExecutionId,
      oldExecutionId,
    ]);
    expect(response.body.data[0]).not.toHaveProperty('requestPayload');
    expect(response.body.data[0]).not.toHaveProperty('responseBody');
  });

  it('filters by status', async () => {
    const successResponse = await request(app.getHttpServer())
      .get(`/api/v1/integrations/${integrationId}/executions?status=SUCCESS`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(successResponse.body.data.map((e: { id: string }) => e.id)).toEqual([
      newExecutionId,
      oldExecutionId,
    ]);

    const failureResponse = await request(app.getHttpServer())
      .get(`/api/v1/integrations/${integrationId}/executions?status=FAILURE`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(failureResponse.body.data.map((e: { id: string }) => e.id)).toEqual([
      midExecutionId,
    ]);
  });

  it('filters by from/to inclusively (UTC, date-only shorthand)', async () => {
    const response = await request(app.getHttpServer())
      .get(
        `/api/v1/integrations/${integrationId}/executions?from=2026-01-01&to=2026-01-15`,
      )
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    // `from` is inclusive of the exact instant oldExecutionId was pinned to,
    // and `to` (end of day) includes midExecutionId — newExecutionId (Jan 31) excluded.
    expect(response.body.data.map((e: { id: string }) => e.id)).toEqual([
      midExecutionId,
      oldExecutionId,
    ]);
  });

  it('returns 400 when from is after to', async () => {
    await request(app.getHttpServer())
      .get(
        `/api/v1/integrations/${integrationId}/executions?from=2026-02-01&to=2026-01-01`,
      )
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(400);
  });

  it('returns 404 when listing executions of an integration from another tenant', async () => {
    await request(app.getHttpServer())
      .get(`/api/v1/integrations/${integrationId}/executions`)
      .set('Authorization', `Bearer ${otherTenantAdminToken}`)
      .expect(404);
  });

  it('returns execution detail with full requestPayload and responseBody', async () => {
    const response = await request(app.getHttpServer())
      .get(`/api/v1/executions/${newExecutionId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(response.body.id).toBe(newExecutionId);
    expect(response.body.integrationId).toBe(integrationId);
    expect(response.body.requestPayload).toEqual({ seq: 3 });
    expect(response.body.responseBody).toBe('{"ok":true}');
  });

  it('returns 404 for execution detail from another tenant (cross-tenant via Integration join)', async () => {
    await request(app.getHttpServer())
      .get(`/api/v1/executions/${newExecutionId}`)
      .set('Authorization', `Bearer ${otherTenantAdminToken}`)
      .expect(404);
  });

  it('returns 404 for a non-existent execution id', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/executions/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404);
  });
});
