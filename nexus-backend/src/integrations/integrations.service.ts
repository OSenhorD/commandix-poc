import { Injectable, NotFoundException } from '@nestjs/common';

import { DatabaseService } from '@/database/database.service.js';

import { CreateIntegrationDto } from './dto/create-integration.dto.js';
import { toIntegrationResponse } from './integrations.mapper.js';

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
