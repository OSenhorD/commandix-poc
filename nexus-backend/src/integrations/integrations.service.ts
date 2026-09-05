import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';

import { buildPaginatedResponse } from '@/common/utils/pagination.util.js';
import { DatabaseService } from '@/database/database.service.js';

import { CreateIntegrationDto } from './dto/create-integration.dto.js';
import { ListIntegrationsQueryDto } from './dto/list-integrations-query.dto.js';
import { UpdateIntegrationDto } from './dto/update-integration.dto.js';
import {
  toIntegrationListItem,
  toIntegrationResponse,
} from './integrations.mapper.js';

const integrationDetailSelect = [
  'id',
  'name',
  'type',
  'targetUrl',
  'authKey',
  'customHeaders',
  'defaultPayload',
  'isActive',
  'createdAt',
  'updatedAt',
] as const;

@Injectable()
export class IntegrationsService {
  constructor(private readonly database: DatabaseService) {}

  private buildUpdateData(
    dto: UpdateIntegrationDto,
  ): Record<string, unknown> | null {
    const data: Record<string, unknown> = {};

    if (dto.name !== undefined) {
      data.name = dto.name;
    }
    if (dto.type !== undefined) {
      data.type = dto.type;
    }
    if (dto.targetUrl !== undefined) {
      data.targetUrl = dto.targetUrl;
    }
    if (dto.authKey !== undefined) {
      data.authKey = dto.authKey;
    }
    if (dto.customHeaders !== undefined) {
      data.customHeaders = dto.customHeaders;
    }
    if (dto.defaultPayload !== undefined) {
      data.defaultPayload = dto.defaultPayload;
    }
    if (dto.isActive !== undefined) {
      data.isActive = dto.isActive;
    }

    return Object.keys(data).length > 0 ? data : null;
  }

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

  async update(id: string, tenantId: string, dto: UpdateIntegrationDto) {
    const data = this.buildUpdateData(dto);
    if (!data) {
      throw new BadRequestException();
    }

    const existing = await this.database.orm.public.Integration.where({
      id,
      tenantId,
    }).first();

    if (!existing) {
      throw new NotFoundException();
    }

    const integration = await this.database.orm.public.Integration.where({
      id,
      tenantId,
    })
      .select(...integrationDetailSelect)
      .update(data as never);

    if (!integration) {
      throw new NotFoundException();
    }

    return toIntegrationResponse(integration);
  }

  async remove(id: string, tenantId: string): Promise<void> {
    const existing = await this.database.orm.public.Integration.where({
      id,
      tenantId,
    }).first();

    if (!existing) {
      throw new NotFoundException();
    }

    await this.database.orm.public.Integration.where({ id, tenantId }).delete();
  }
}
