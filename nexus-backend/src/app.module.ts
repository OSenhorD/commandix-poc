import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';

import { AppController } from '@/app.controller.js';
import { AppService } from '@/app.service.js';
import { AuthModule } from '@/auth/auth.module.js';
import { CommonModule } from '@/common/common.module.js';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard.js';
import { RolesGuard } from '@/common/guards/roles.guard.js';
import { DatabaseModule } from '@/database/database.module.js';
import { TenantsModule } from '@/tenants/tenants.module.js';

@Module({
  imports: [DatabaseModule, CommonModule, TenantsModule, AuthModule],
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
