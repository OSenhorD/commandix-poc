import { Module } from '@nestjs/common';

import { HttpOutboundService } from './http-outbound.service.js';
import { IntegrationsController } from './integrations.controller.js';
import { IntegrationsService } from './integrations.service.js';

@Module({
  controllers: [IntegrationsController],
  providers: [IntegrationsService, HttpOutboundService],
  exports: [HttpOutboundService],
})
export class IntegrationsModule {}
