import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiBadRequestResponse,
} from '@nestjs/swagger';

import { ApiAuth } from '@/common/decorators/api-auth.decorator.js';
import { CurrentUser } from '@/common/decorators/current-user.decorator.js';
import { Roles } from '@/common/decorators/roles.decorator.js';
import { RoleEnum } from '@/common/enums/role.enum.js';
import type { AuthenticatedUser } from '@/common/interfaces/authenticated-user.interface.js';

import { CreateIntegrationDto } from './dto/create-integration.dto.js';
import { IntegrationResponseDto } from './dto/integration-response.dto.js';
import { ListIntegrationsQueryDto } from './dto/list-integrations-query.dto.js';
import { PaginatedIntegrationsResponseDto } from './dto/paginated-integrations-response.dto.js';
import { IntegrationsService } from './integrations.service.js';

@ApiAuth()
@ApiTags('integrations')
@Controller('integrations')
export class IntegrationsController {
  constructor(private readonly integrationsService: IntegrationsService) {}

  @Get()
  @Roles(RoleEnum.ADMIN, RoleEnum.VIEWER)
  @ApiOperation({ summary: 'List integrations for the current tenant' })
  @ApiOkResponse({ type: PaginatedIntegrationsResponseDto })
  @ApiBadRequestResponse({ description: 'Validation error' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token' })
  @ApiForbiddenResponse({ description: 'Insufficient role' })
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListIntegrationsQueryDto,
  ) {
    return this.integrationsService.findAll(user.tenantId, query);
  }

  @Post()
  @Roles(RoleEnum.ADMIN)
  @ApiOperation({ summary: 'Create an integration for the current tenant' })
  @ApiCreatedResponse({ type: IntegrationResponseDto })
  @ApiBadRequestResponse({ description: 'Validation error' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token' })
  @ApiForbiddenResponse({ description: 'Insufficient role' })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateIntegrationDto,
  ) {
    return this.integrationsService.create(user.tenantId, dto);
  }

  @Get(':id')
  @Roles(RoleEnum.ADMIN, RoleEnum.VIEWER)
  @ApiOperation({ summary: 'Get integration details for the current tenant' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: IntegrationResponseDto })
  @ApiNotFoundResponse({ description: 'Integration not found' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token' })
  @ApiForbiddenResponse({ description: 'Insufficient role' })
  findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.integrationsService.findOne(id, user.tenantId);
  }
}
