import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { ExecutionStatusEnum } from '@/common/enums/execution-status.enum.js';

export class ExecutionResponseDto {
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

  @ApiPropertyOptional({
    type: 'object',
    additionalProperties: true,
    nullable: true,
  })
  requestPayload!: Record<string, unknown> | null;

  @ApiPropertyOptional({ nullable: true })
  responseBody!: string | null;

  @ApiProperty()
  executedAt!: string;
}
