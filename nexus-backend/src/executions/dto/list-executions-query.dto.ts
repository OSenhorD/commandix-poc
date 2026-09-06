import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';

import { PaginationQueryDto } from '@/common/dto/pagination-query.dto.js';
import { ExecutionStatusEnum } from '@/common/enums/execution-status.enum.js';

export class ListExecutionsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    enum: ExecutionStatusEnum,
    enumName: 'ExecutionStatus',
  })
  @IsOptional()
  @IsEnum(ExecutionStatusEnum)
  status?: ExecutionStatusEnum;

  @ApiPropertyOptional({
    description: 'ISO 8601 or YYYY-MM-DD, inclusive, UTC when no offset',
    example: '2026-01-01',
  })
  @IsOptional()
  @IsString()
  from?: string;

  @ApiPropertyOptional({
    description: 'ISO 8601 or YYYY-MM-DD, inclusive, UTC when no offset',
    example: '2026-01-31',
  })
  @IsOptional()
  @IsString()
  to?: string;
}
