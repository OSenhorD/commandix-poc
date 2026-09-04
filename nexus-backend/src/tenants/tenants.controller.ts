import { Body, Controller, Post } from '@nestjs/common';

import { BootstrapTenantDto } from './dto/bootstrap-tenant.dto.js';
import { TenantsService } from './tenants.service.js';

@Controller('tenants')
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Post('bootstrap')
  bootstrap(@Body() dto: BootstrapTenantDto) {
    return this.tenantsService.bootstrap(dto);
  }
}
