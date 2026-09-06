import { INestApplication, Module } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerModule } from '@nestjs/throttler';
import { afterAll, beforeAll, describe, it } from 'vitest';
import request from 'supertest';
import { App } from 'supertest/types';

import { db } from '@/prisma/db.js';
import { runSeed } from '@/prisma/seed.js';
import { configureApp } from '@/configure-app.js';
import { DatabaseModule } from '@/database/database.module.js';
import { TenantsController } from '@/tenants/tenants.controller.js';
import { TenantsService } from '@/tenants/tenants.service.js';
import {
  getBootstrapThrottleLimit,
  getBootstrapThrottleTtl,
} from '@/tenants/bootstrap-throttle.constants.js';

const hasDatabase = Boolean(process.env['DATABASE_URL']);

@Module({
  imports: [
    DatabaseModule,
    ThrottlerModule.forRoot([
      {
        ttl: getBootstrapThrottleTtl(),
        limit: getBootstrapThrottleLimit(),
      },
    ]),
  ],
  controllers: [TenantsController],
  providers: [TenantsService],
})
class BootstrapThrottleTestModule {}

describe.skipIf(!hasDatabase)('Bootstrap rate limit (e2e)', () => {
  let app: INestApplication<App>;
  let loginApp: INestApplication<App>;

  beforeAll(async () => {
    process.env['JWT_ACCESS_SECRET'] ??= 'test-access-secret';
    process.env['JWT_REFRESH_SECRET'] ??= 'test-refresh-secret';

    await runSeed();

    const throttleFixture: TestingModule = await Test.createTestingModule({
      imports: [BootstrapThrottleTestModule],
    }).compile();

    app = throttleFixture.createNestApplication();
    configureApp(app);
    await app.init();

    const { AppModule } = await import('@/app.module.js');
    const loginFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    loginApp = loginFixture.createNestApplication();
    configureApp(loginApp);
    await loginApp.init();
  });

  afterAll(async () => {
    await app?.close();
    await loginApp?.close();
    await db.close();
  });

  it('returns 429 on the 6th bootstrap request from the same IP', async () => {
    for (let index = 0; index < 5; index += 1) {
      await request(app.getHttpServer())
        .post('/api/v1/tenants/bootstrap')
        .send({
          tenantName: `Throttle Tenant ${index}`,
          tenantSlug: `throttle-${Date.now()}-${index}`,
          adminEmail: `admin-${Date.now()}-${index}@example.com`,
          adminPassword: 'Secure123!',
        })
        .expect(201);
    }

    await request(app.getHttpServer())
      .post('/api/v1/tenants/bootstrap')
      .send({
        tenantName: 'Throttle Tenant blocked',
        tenantSlug: `throttle-${Date.now()}-blocked`,
        adminEmail: `blocked-${Date.now()}@example.com`,
        adminPassword: 'Secure123!',
      })
      .expect(429);
  });

  it('does not throttle POST /auth/login', async () => {
    for (let index = 0; index < 6; index += 1) {
      await request(loginApp.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'admin@acme.com',
          password: 'Admin123!',
        })
        .expect(200);
    }
  });
});
