import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { App } from 'supertest/types';

import { AppModule } from '@/app.module.js';
import { configureApp } from '@/configure-app.js';
import { db } from '@/prisma/db.js';

const hasDatabase = Boolean(process.env['DATABASE_URL']);

describe.skipIf(!hasDatabase)('POST /tenants/bootstrap (e2e)', () => {
  let app: INestApplication<App>;
  const slug = `bootstrap-${Date.now()}`;
  const email = `admin-${Date.now()}@example.com`;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    await db.close();
  });

  it('creates tenant and admin user', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/tenants/bootstrap')
      .send({
        tenantName: 'Bootstrap Test Corp',
        tenantSlug: slug,
        adminEmail: email,
        adminPassword: 'SecurePass1!',
      })
      .expect(201);

    expect(response.body).toEqual({
      tenant: {
        id: expect.any(String),
        name: 'Bootstrap Test Corp',
        slug,
      },
      user: {
        id: expect.any(String),
        email,
        role: 'ADMIN',
        tenantId: response.body.tenant.id,
      },
    });
    expect(response.body.user).not.toHaveProperty('passwordHash');
    expect(response.body.user).not.toHaveProperty('password');
  });

  it('returns 409 when tenant slug already exists', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/tenants/bootstrap')
      .send({
        tenantName: 'Another Corp',
        tenantSlug: slug,
        adminEmail: 'other@example.com',
        adminPassword: 'SecurePass1!',
      })
      .expect(409);
  });

  it('returns 400 for invalid body', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/tenants/bootstrap')
      .send({
        tenantName: 'Bad Slug Corp',
        tenantSlug: 'INVALID SLUG',
        adminEmail: 'not-an-email',
        adminPassword: 'short',
      })
      .expect(400);
  });
});
