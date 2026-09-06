import { ApiProperty } from '@nestjs/swagger';

import { PaginationMetaDto } from '@/common/dto/pagination-meta.dto.js';

import { ExecutionListItemDto } from './execution-list-item.dto.js';

export class PaginatedExecutionsResponseDto {
  @ApiProperty({ type: [ExecutionListItemDto] })
  data!: ExecutionListItemDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta!: PaginationMetaDto;
}
