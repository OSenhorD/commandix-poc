import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiOperation,
  ApiTags,
  ApiTooManyRequestsResponse,
} from '@nestjs/swagger';
import { ThrottlerGuard } from '@nestjs/throttler';

import { Public } from '@/common/decorators/public.decorator.js';

import { BootstrapTenantResponseDto } from './dto/bootstrap-response.dto.js';
import { BootstrapTenantDto } from './dto/bootstrap-tenant.dto.js';
import { TenantsService } from './tenants.service.js';

@ApiTags('tenants')
@Controller('tenants')
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Public()
  @UseGuards(ThrottlerGuard)
  @Post('bootstrap')
  @ApiOperation({ summary: 'Create tenant and first ADMIN user', security: [] })
  @ApiCreatedResponse({ type: BootstrapTenantResponseDto })
  @ApiConflictResponse({ description: 'Duplicate slug or email' })
  @ApiBadRequestResponse({ description: 'Validation error' })
  @ApiTooManyRequestsResponse({ description: 'Bootstrap rate limit exceeded' })
  bootstrap(@Body() dto: BootstrapTenantDto) {
    return this.tenantsService.bootstrap(dto);
  }
}
