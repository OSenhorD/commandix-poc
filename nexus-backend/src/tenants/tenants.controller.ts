import { Body, Controller, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { Public } from '@/common/decorators/public.decorator.js';

import { BootstrapTenantResponseDto } from './dto/bootstrap-response.dto.js';
import { BootstrapTenantDto } from './dto/bootstrap-tenant.dto.js';
import { TenantsService } from './tenants.service.js';

@ApiTags('tenants')
@Controller('tenants')
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Public()
  @Post('bootstrap')
  @ApiOperation({ summary: 'Create tenant and first ADMIN user', security: [] })
  @ApiCreatedResponse({ type: BootstrapTenantResponseDto })
  @ApiConflictResponse({ description: 'Duplicate slug or email' })
  @ApiBadRequestResponse({ description: 'Validation error' })
  bootstrap(@Body() dto: BootstrapTenantDto) {
    return this.tenantsService.bootstrap(dto);
  }
}
