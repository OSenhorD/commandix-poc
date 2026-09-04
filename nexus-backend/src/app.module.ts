import { Module } from '@nestjs/common';

import { AppController } from '@/app.controller.js';
import { AppService } from '@/app.service.js';
import { CommonModule } from '@/common/common.module.js';
import { DatabaseModule } from '@/database/database.module.js';
import { TenantsModule } from '@/tenants/tenants.module.js';

@Module({
  imports: [DatabaseModule, CommonModule, TenantsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
