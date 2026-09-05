import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { App } from 'supertest/types';

import { AppModule } from '@/app.module.js';
import { configureApp } from '@/configure-app.js';
import { hashRefreshToken } from '@/auth/hash-refresh-token.util.js';
import { db } from '@/prisma/db.js';
import { runSeed } from '@/prisma/seed.js';

const hasDatabase = Boolean(process.env['DATABASE_URL']);

describe.skipIf(!hasDatabase)('Auth session refresh + logout (e2e)', () => {
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

  async function login() {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: 'admin@acme.com',
        password: 'Admin123!',
      })
      .expect(200);

    return response.body as {
      accessToken: string;
      refreshToken: string;
      user: { id: string };
    };
  }

  it('POST /auth/refresh returns a new access token', async () => {
    const session = await login();

    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: session.refreshToken })
      .expect(200);

    expect(response.body.accessToken).toEqual(expect.any(String));

    const payload = await jwtService.verifyAsync(response.body.accessToken);
    expect(payload.sub).toBe(session.user.id);
    expect(payload.email).toBe('admin@acme.com');
  });

  it('POST /auth/refresh returns 401 after logout', async () => {
    const session = await login();

    await request(app.getHttpServer())
      .post('/api/v1/auth/logout')
      .set('Authorization', `Bearer ${session.accessToken}`)
      .send({ refreshToken: session.refreshToken })
      .expect(204);

    await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: session.refreshToken })
      .expect(401);
  });

  it('logout revokes only the submitted refresh token', async () => {
    const firstSession = await login();
    const secondSession = await login();

    await request(app.getHttpServer())
      .post('/api/v1/auth/logout')
      .set('Authorization', `Bearer ${firstSession.accessToken}`)
      .send({ refreshToken: firstSession.refreshToken })
      .expect(204);

    await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: firstSession.refreshToken })
      .expect(401);

    await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: secondSession.refreshToken })
      .expect(200);
  });

  it('POST /auth/logout is idempotent for unknown or revoked tokens', async () => {
    const session = await login();

    await request(app.getHttpServer())
      .post('/api/v1/auth/logout')
      .set('Authorization', `Bearer ${session.accessToken}`)
      .send({ refreshToken: session.refreshToken })
      .expect(204);

    await request(app.getHttpServer())
      .post('/api/v1/auth/logout')
      .set('Authorization', `Bearer ${session.accessToken}`)
      .send({ refreshToken: session.refreshToken })
      .expect(204);

    await request(app.getHttpServer())
      .post('/api/v1/auth/logout')
      .set('Authorization', `Bearer ${session.accessToken}`)
      .send({ refreshToken: 'unknown-refresh-token' })
      .expect(204);
  });

  it('POST /auth/refresh returns 401 for expired refresh token', async () => {
    const session = await login();
    const tokenHash = hashRefreshToken(session.refreshToken);

    await db.orm.public.RefreshToken.where({ tokenHash }).update({
      expiresAt: new Date(Date.now() - 60_000).toISOString(),
    });

    await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: session.refreshToken })
      .expect(401);
  });

  it('POST /auth/logout requires access token', async () => {
    const session = await login();

    await request(app.getHttpServer())
      .post('/api/v1/auth/logout')
      .send({ refreshToken: session.refreshToken })
      .expect(401);
  });
});
