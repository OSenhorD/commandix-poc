import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { buildPaginatedResponse } from '@/common/utils/pagination.util.js';
import { DatabaseService } from '@/database/database.service.js';

import { ListExecutionsQueryDto } from './dto/list-executions-query.dto.js';
import { toExecutionListItem } from './executions.mapper.js';
import { parseDateFilter } from './utils/parse-date-filter.util.js';

@Injectable()
export class ExecutionsService {
  constructor(private readonly database: DatabaseService) {}

  async findAllForIntegration(
    integrationId: string,
    tenantId: string,
    query: ListExecutionsQueryDto,
  ) {
    const integration = await this.database.orm.public.Integration.where({
      id: integrationId,
      tenantId,
    }).first();

    if (!integration) {
      throw new NotFoundException();
    }

    const from = query.from ? parseDateFilter(query.from, 'start') : undefined;
    const to = query.to ? parseDateFilter(query.to, 'end') : undefined;

    if (from && to && from.getTime() > to.getTime()) {
      throw new BadRequestException('"from" must not be after "to"');
    }

    const page = query.resolvedPage;
    const limit = query.resolvedLimit;
    const offset = query.offset;

    let collection = this.database.orm.public.IntegrationExecution.where({
      integrationId,
      ...(query.status === undefined ? {} : { status: query.status }),
    });

    if (from) {
      const fromIso = from.toISOString();
      collection = collection.where((execution) =>
        execution.executedAt.gte(fromIso),
      );
    }
    if (to) {
      const toIso = to.toISOString();
      collection = collection.where((execution) =>
        execution.executedAt.lte(toIso),
      );
    }

    const { total } = await collection.aggregate((aggregate) => ({
      total: aggregate.count(),
    }));
    const executions = await collection
      .select(
        'id',
        'integrationId',
        'status',
        'httpStatusCode',
        'responseTimeMs',
        'executedAt',
      )
      .orderBy((execution) => execution.executedAt.desc())
      .offset(offset)
      .limit(limit)
      .all();

    return buildPaginatedResponse(
      executions.map(toExecutionListItem),
      page,
      limit,
      total,
    );
  }
}
