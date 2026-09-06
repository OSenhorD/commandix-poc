import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';

import { AppController } from '@/app.controller.js';
import { AppService } from '@/app.service.js';
import { AuthModule } from '@/auth/auth.module.js';
import { CommonModule } from '@/common/common.module.js';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard.js';
import { RolesGuard } from '@/common/guards/roles.guard.js';
import { DatabaseModule } from '@/database/database.module.js';
import { IntegrationsModule } from '@/integrations/integrations.module.js';
import {
  getBootstrapThrottleLimit,
  getBootstrapThrottleTtl,
} from '@/tenants/bootstrap-throttle.constants.js';
import { TenantsModule } from '@/tenants/tenants.module.js';

@Module({
  imports: [
    DatabaseModule,
    CommonModule,
    ThrottlerModule.forRoot([
      {
        ttl: getBootstrapThrottleTtl(),
        limit: getBootstrapThrottleLimit(),
      },
    ]),
    TenantsModule,
    AuthModule,
    IntegrationsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}
