import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiNoContentResponse,
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
import { UpdateIntegrationDto } from './dto/update-integration.dto.js';
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

  @Patch(':id')
  @Roles(RoleEnum.ADMIN)
  @ApiOperation({
    summary: 'Partially update an integration for the current tenant',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: IntegrationResponseDto })
  @ApiBadRequestResponse({ description: 'Validation error or empty body' })
  @ApiNotFoundResponse({ description: 'Integration not found' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token' })
  @ApiForbiddenResponse({ description: 'Insufficient role' })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateIntegrationDto,
  ) {
    return this.integrationsService.update(id, user.tenantId, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  @Roles(RoleEnum.ADMIN)
  @ApiOperation({ summary: 'Delete an integration and its executions' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiNoContentResponse({ description: 'Integration deleted' })
  @ApiNotFoundResponse({ description: 'Integration not found' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token' })
  @ApiForbiddenResponse({ description: 'Insufficient role' })
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.integrationsService.remove(id, user.tenantId);
  }
}
