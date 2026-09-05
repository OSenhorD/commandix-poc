import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { App } from 'supertest/types';

import { AppModule } from '@/app.module.js';
import { configureApp } from '@/configure-app.js';
import { db } from '@/prisma/db.js';
import { runSeed } from '@/prisma/seed.js';
import { hashRefreshToken } from '@/auth/hash-refresh-token.util.js';

const hasDatabase = Boolean(process.env['DATABASE_URL']);

describe.skipIf(!hasDatabase)('POST /auth/login (e2e)', () => {
  let app: INestApplication<App>;
  let jwtService: JwtService;

  beforeAll(async () => {
    process.env['JWT_ACCESS_SECRET'] ??= 'test-access-secret';
    process.env['JWT_REFRESH_SECRET'] ??= 'test-refresh-secret';

    await runSeed();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    jwtService = moduleFixture.get(JwtService);
    configureApp(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    await db.close();
  });

  it('returns tokens and user for seed admin credentials', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: 'admin@acme.com',
        password: 'Admin123!',
      })
      .expect(200);

    expect(response.body.user).toEqual({
      id: expect.any(String),
      email: 'admin@acme.com',
      role: 'ADMIN',
      tenantId: expect.any(String),
    });
    expect(response.body.accessToken).toEqual(expect.any(String));
    expect(response.body.refreshToken).toEqual(expect.any(String));
    expect(response.body.user).not.toHaveProperty('passwordHash');

    const payload = await jwtService.verifyAsync(response.body.accessToken);

    expect(payload).toMatchObject({
      sub: response.body.user.id,
      tenantId: response.body.user.tenantId,
      role: 'ADMIN',
      email: 'admin@acme.com',
    });

    const tokenHash = hashRefreshToken(response.body.refreshToken);
    const storedRefreshToken = await db.orm.public.RefreshToken.where({
      tokenHash,
    }).first();

    expect(storedRefreshToken).toBeTruthy();
    expect(storedRefreshToken?.userId).toBe(response.body.user.id);
  });

  it('returns 401 for invalid password', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: 'admin@acme.com',
        password: 'wrong-password',
      })
      .expect(401);
  });

  it('returns 401 for unknown email', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: 'missing@acme.com',
        password: 'Admin123!',
      })
      .expect(401);
  });

  it('returns 400 for invalid body', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: 'not-an-email',
        password: '',
      })
      .expect(400);
  });
});
