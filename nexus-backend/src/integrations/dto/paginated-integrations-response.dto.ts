import { ApiProperty } from '@nestjs/swagger';

import { PaginationMetaDto } from '@/common/dto/pagination-meta.dto.js';

import { IntegrationListItemDto } from './integration-list-item.dto.js';

export class PaginatedIntegrationsResponseDto {
  @ApiProperty({ type: [IntegrationListItemDto] })
  data!: IntegrationListItemDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta!: PaginationMetaDto;
}
