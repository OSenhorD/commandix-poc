import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { ExecutionStatusEnum } from '@/common/enums/execution-status.enum.js';

export class ExecutionListItemDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  integrationId!: string;

  @ApiProperty({ enum: ExecutionStatusEnum, enumName: 'ExecutionStatus' })
  status!: ExecutionStatusEnum;

  @ApiPropertyOptional({ nullable: true })
  httpStatusCode!: number | null;

  @ApiProperty()
  responseTimeMs!: number;

  @ApiProperty()
  executedAt!: string;
}
