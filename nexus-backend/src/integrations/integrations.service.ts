import { Injectable, NotFoundException } from '@nestjs/common';

import { buildPaginatedResponse } from '@/common/utils/pagination.util.js';
import { DatabaseService } from '@/database/database.service.js';

import { CreateIntegrationDto } from './dto/create-integration.dto.js';
import { ListIntegrationsQueryDto } from './dto/list-integrations-query.dto.js';
import {
  toIntegrationListItem,
  toIntegrationResponse,
} from './integrations.mapper.js';

@Injectable()
export class IntegrationsService {
  constructor(private readonly database: DatabaseService) {}

  async create(tenantId: string, dto: CreateIntegrationDto) {
    const integration = await this.database.orm.public.Integration.create({
      tenantId,
      name: dto.name,
      type: dto.type,
      targetUrl: dto.targetUrl,
      authKey: dto.authKey ?? null,
      customHeaders: dto.customHeaders ?? null,
      defaultPayload: (dto.defaultPayload ?? null) as never,
      isActive: dto.isActive ?? true,
    });

    return toIntegrationResponse(integration);
  }

  async findAll(tenantId: string, query: ListIntegrationsQueryDto) {
    const page = query.resolvedPage;
    const limit = query.resolvedLimit;
    const offset = query.offset;
    const where = {
      tenantId,
      ...(query.isActive === undefined ? {} : { isActive: query.isActive }),
    };

    const { total } = await this.database.orm.public.Integration.where(
      where,
    ).aggregate((aggregate) => ({ total: aggregate.count() }));
    const integrations = await this.database.orm.public.Integration.where(where)
      .select(
        'id',
        'name',
        'type',
        'targetUrl',
        'authKey',
        'isActive',
        'createdAt',
        'updatedAt',
      )
      .orderBy((integration) => integration.updatedAt.desc())
      .offset(offset)
      .limit(limit)
      .all();

    return buildPaginatedResponse(
      integrations.map(toIntegrationListItem),
      page,
      limit,
      total,
    );
  }

  async findOne(id: string, tenantId: string) {
    const integration = await this.database.orm.public.Integration.where({
      id,
      tenantId,
    }).first();

    if (!integration) {
      throw new NotFoundException();
    }

    return toIntegrationResponse(integration);
  }
}
