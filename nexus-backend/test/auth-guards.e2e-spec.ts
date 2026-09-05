import { Controller, Get, INestApplication, Module } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { App } from 'supertest/types';

import { AppModule } from '@/app.module.js';
import { RoleEnum } from '@/common/enums/role.enum.js';
import { CurrentUser } from '@/common/decorators/current-user.decorator.js';
import { Roles } from '@/common/decorators/roles.decorator.js';
import type { AuthenticatedUser } from '@/common/interfaces/authenticated-user.interface.js';
import { configureApp } from '@/configure-app.js';
import { db } from '@/prisma/db.js';
import { runSeed } from '@/prisma/seed.js';

@Controller('test-auth')
class TestAuthController {
  @Get('protected')
  protected(@CurrentUser() user: AuthenticatedUser) {
    return user;
  }

  @Roles(RoleEnum.ADMIN)
  @Get('admin-only')
  adminOnly() {
    return { ok: true };
  }
}

@Module({
  controllers: [TestAuthController],
})
class TestAuthModule {}

const hasDatabase = Boolean(process.env['DATABASE_URL']);

describe.skipIf(!hasDatabase)('Auth guards (e2e)', () => {
  let app: INestApplication<App>;
  let adminAccessToken: string;
  let viewerAccessToken: string;

  beforeAll(async () => {
    process.env['JWT_ACCESS_SECRET'] ??= 'test-access-secret';
    process.env['JWT_REFRESH_SECRET'] ??= 'test-refresh-secret';

    await runSeed();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule, TestAuthModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();

    const adminLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: 'admin@acme.com',
        password: 'Admin123!',
      })
      .expect(200);

    adminAccessToken = adminLogin.body.accessToken;

    const bootstrap = await request(app.getHttpServer())
      .post('/api/v1/tenants/bootstrap')
      .send({
        tenantName: 'Viewer Tenant',
        tenantSlug: 'viewer-co',
        adminEmail: 'viewer@viewer-co.com',
        adminPassword: 'Viewer123!',
      })
      .expect(201);

    await db.orm.public.User.where({ id: bootstrap.body.user.id }).update({
      role: RoleEnum.VIEWER,
    });

    const viewerLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: 'viewer@viewer-co.com',
        password: 'Viewer123!',
      })
      .expect(200);

    viewerAccessToken = viewerLogin.body.accessToken;
  });

  afterAll(async () => {
    await app.close();
    await db.close();
  });

  it('returns 401 for protected route without token', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/test-auth/protected')
      .expect(401);
  });

  it('returns 401 for GET /auth/me without token', async () => {
    await request(app.getHttpServer()).get('/api/v1/auth/me').expect(401);
  });

  it('populates CurrentUser for valid token', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/test-auth/protected')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .expect(200);

    expect(response.body).toMatchObject({
      email: 'admin@acme.com',
      role: 'ADMIN',
      tenantId: expect.any(String),
      id: expect.any(String),
    });
  });

  it('returns current user from GET /auth/me', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .expect(200);

    expect(response.body.email).toBe('admin@acme.com');
  });

  it('returns 403 when VIEWER accesses ADMIN-only route', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/test-auth/admin-only')
      .set('Authorization', `Bearer ${viewerAccessToken}`)
      .expect(403);
  });

  it('allows ADMIN on ADMIN-only route', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/test-auth/admin-only')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .expect(200)
      .expect({ ok: true });
  });

  it('allows public routes without token', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/health')
      .expect(200)
      .expect({ status: 'ok' });

    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: 'admin@acme.com',
        password: 'Admin123!',
      })
      .expect(200);
  });
});
