import { ApiProperty } from '@nestjs/swagger';

import { IntegrationListItemDto } from './integration-list-item.dto.js';

class PaginationMetaDto {
  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 20 })
  limit!: number;

  @ApiProperty({ example: 1 })
  total!: number;

  @ApiProperty({ example: 1 })
  totalPages!: number;

  @ApiProperty()
  hasNextPage!: boolean;

  @ApiProperty()
  hasPreviousPage!: boolean;
}

export class PaginatedIntegrationsResponseDto {
  @ApiProperty({ type: [IntegrationListItemDto] })
  data!: IntegrationListItemDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta!: PaginationMetaDto;
}
