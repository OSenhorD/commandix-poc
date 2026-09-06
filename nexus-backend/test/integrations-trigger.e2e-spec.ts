import { createServer, type IncomingMessage, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';

import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { App } from 'supertest/types';

import { AppModule } from '@/app.module.js';
import { configureApp } from '@/configure-app.js';
import { db } from '@/prisma/db.js';
import { runSeed } from '@/prisma/seed.js';

const hasDatabase = Boolean(process.env['DATABASE_URL']);

interface RecordedRequest {
  method: string | undefined;
  headers: IncomingMessage['headers'];
  body: string;
}

describe.skipIf(!hasDatabase)('POST /integrations/:id/trigger (e2e)', () => {
  let app: INestApplication<App>;
  let adminToken: string;
  let viewerToken: string;
  let otherTenantAdminToken: string;
  let server: Server;
  let targetUrl: string;
  let lastRequest: RecordedRequest | undefined;
  let nextResponse: { status: number; body: string };

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

    const viewerLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'viewer@acme.com', password: 'Admin123!' })
      .expect(200);
    viewerToken = viewerLogin.body.accessToken;

    const otherSlug = `other-trigger-${Date.now()}`;
    await request(app.getHttpServer())
      .post('/api/v1/tenants/bootstrap')
      .send({
        tenantName: 'Other Trigger Tenant',
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

    nextResponse = { status: 200, body: '{"ok":true}' };
    server = createServer((req, res) => {
      const chunks: Buffer[] = [];
      req.on('data', (chunk: Buffer) => chunks.push(chunk));
      req.on('end', () => {
        lastRequest = {
          method: req.method,
          headers: req.headers,
          body: Buffer.concat(chunks).toString('utf8'),
        };
        res.writeHead(nextResponse.status, {
          'Content-Type': 'application/json',
        });
        res.end(nextResponse.body);
      });
    });
    await new Promise<void>((resolve) =>
      server.listen(0, '127.0.0.1', resolve),
    );
    const address = server.address() as AddressInfo;
    targetUrl = `http://127.0.0.1:${address.port}/webhook`;
  });

  afterEach(() => {
    nextResponse = { status: 200, body: '{"ok":true}' };
    lastRequest = undefined;
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await app.close();
    await db.close();
  });

  async function createIntegration(
    name: string,
    overrides: Partial<{
      isActive: boolean;
      defaultPayload: Record<string, unknown>;
      authKey: string;
      targetUrl: string;
    }> = {},
  ) {
    const response = await request(app.getHttpServer())
      .post('/api/v1/integrations')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name,
        type: 'WEBHOOK',
        targetUrl: overrides.targetUrl ?? targetUrl,
        authKey: overrides.authKey,
        defaultPayload: overrides.defaultPayload ?? { source: 'commandix' },
        isActive: overrides.isActive ?? true,
      })
      .expect(201);

    return response.body.id as string;
  }

  it('triggers a SUCCESS execution and persists the merged payload', async () => {
    const id = await createIntegration(`Trigger Success ${Date.now()}`, {
      defaultPayload: { source: 'commandix', keep: 'me' },
    });

    const response = await request(app.getHttpServer())
      .post(`/api/v1/integrations/${id}/trigger`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ payload: { event: 'order.created', source: 'override' } })
      .expect(200);

    expect(response.body.status).toBe('SUCCESS');
    expect(response.body.httpStatusCode).toBe(200);
    expect(response.body.integrationId).toBe(id);
    expect(response.body.requestPayload).toEqual({
      source: 'override',
      keep: 'me',
      event: 'order.created',
    });
    expect(response.body.responseBody).toBe('{"ok":true}');
    expect(lastRequest?.method).toBe('POST');
    expect(JSON.parse(lastRequest?.body ?? '{}')).toEqual({
      source: 'override',
      keep: 'me',
      event: 'order.created',
    });

    const persisted = await db.orm.public.IntegrationExecution.where({
      integrationId: id,
    }).first();
    expect(persisted?.status).toBe('SUCCESS');
  });

  it('returns FAILURE when the external API responds with a non-2xx status', async () => {
    nextResponse = { status: 500, body: 'internal error' };
    const id = await createIntegration(`Trigger Failure ${Date.now()}`);

    const response = await request(app.getHttpServer())
      .post(`/api/v1/integrations/${id}/trigger`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({})
      .expect(200);

    expect(response.body.status).toBe('FAILURE');
    expect(response.body.httpStatusCode).toBe(500);
  });

  it('sends the Authorization header derived from authKey', async () => {
    const id = await createIntegration(`Trigger Auth ${Date.now()}`, {
      authKey: 'secret-token',
    });

    await request(app.getHttpServer())
      .post(`/api/v1/integrations/${id}/trigger`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({})
      .expect(200);

    expect(lastRequest?.headers['authorization']).toBe('Bearer secret-token');
  });

  it('truncates a response body larger than 10 240 bytes before persisting', async () => {
    nextResponse = { status: 200, body: 'a'.repeat(11_000) };
    const id = await createIntegration(`Trigger Truncate ${Date.now()}`);

    const response = await request(app.getHttpServer())
      .post(`/api/v1/integrations/${id}/trigger`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({})
      .expect(200);

    const expected = 'a'.repeat(10_240) + '… [truncated]';
    expect(response.body.responseBody).toBe(expected);

    const persisted = await db.orm.public.IntegrationExecution.where({
      integrationId: id,
    }).first();
    expect(persisted?.responseBody).toBe(expected);
  });

  it('returns FAILURE with a null status code on a network error', async () => {
    const id = await createIntegration(`Trigger Network Error ${Date.now()}`, {
      targetUrl: 'http://127.0.0.1:1/unreachable',
    });

    const response = await request(app.getHttpServer())
      .post(`/api/v1/integrations/${id}/trigger`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({})
      .expect(200);

    expect(response.body.status).toBe('FAILURE');
    expect(response.body.httpStatusCode).toBeNull();
  });

  it('rejects a trigger for an inactive integration', async () => {
    const id = await createIntegration(`Trigger Inactive ${Date.now()}`, {
      isActive: false,
    });

    await request(app.getHttpServer())
      .post(`/api/v1/integrations/${id}/trigger`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({})
      .expect(400);
  });

  it('returns 404 for a trigger from another tenant', async () => {
    const id = await createIntegration(`Trigger Cross Tenant ${Date.now()}`);

    await request(app.getHttpServer())
      .post(`/api/v1/integrations/${id}/trigger`)
      .set('Authorization', `Bearer ${otherTenantAdminToken}`)
      .send({})
      .expect(404);
  });

  it('returns 403 when a VIEWER attempts to trigger', async () => {
    const id = await createIntegration(`Trigger Viewer ${Date.now()}`);

    await request(app.getHttpServer())
      .post(`/api/v1/integrations/${id}/trigger`)
      .set('Authorization', `Bearer ${viewerToken}`)
      .send({})
      .expect(403);
  });
});
