import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { ApiAuth } from '@/common/decorators/api-auth.decorator.js';
import { CurrentUser } from '@/common/decorators/current-user.decorator.js';
import { Roles } from '@/common/decorators/roles.decorator.js';
import { RoleEnum } from '@/common/enums/role.enum.js';
import type { AuthenticatedUser } from '@/common/interfaces/authenticated-user.interface.js';

import { ExecutionResponseDto } from './dto/execution-response.dto.js';
import { ListExecutionsQueryDto } from './dto/list-executions-query.dto.js';
import { PaginatedExecutionsResponseDto } from './dto/paginated-executions-response.dto.js';
import { ExecutionsService } from './executions.service.js';

@ApiAuth()
@ApiTags('executions')
@Controller('integrations/:integrationId/executions')
export class ExecutionsController {
  constructor(private readonly executionsService: ExecutionsService) {}

  @Get()
  @Roles(RoleEnum.ADMIN, RoleEnum.VIEWER)
  @ApiOperation({ summary: 'List executions for an integration' })
  @ApiParam({ name: 'integrationId', format: 'uuid' })
  @ApiOkResponse({ type: PaginatedExecutionsResponseDto })
  @ApiBadRequestResponse({ description: 'Validation error' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token' })
  @ApiForbiddenResponse({ description: 'Insufficient role' })
  @ApiNotFoundResponse({ description: 'Integration not found' })
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Param('integrationId', ParseUUIDPipe) integrationId: string,
    @Query() query: ListExecutionsQueryDto,
  ) {
    return this.executionsService.findAllForIntegration(
      integrationId,
      user.tenantId,
      query,
    );
  }
}

@ApiAuth()
@ApiTags('executions')
@Controller('executions')
export class ExecutionDetailController {
  constructor(private readonly executionsService: ExecutionsService) {}

  @Get(':id')
  @Roles(RoleEnum.ADMIN, RoleEnum.VIEWER)
  @ApiOperation({ summary: 'Get execution detail' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: ExecutionResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token' })
  @ApiForbiddenResponse({ description: 'Insufficient role' })
  @ApiNotFoundResponse({ description: 'Execution not found' })
  findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.executionsService.findOne(id, user.tenantId);
  }
}
