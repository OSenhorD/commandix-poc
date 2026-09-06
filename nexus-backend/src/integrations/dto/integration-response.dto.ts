import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { IntegrationTypeEnum } from '@/common/enums/integration-type.enum.js';

export class IntegrationResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'Order Webhook' })
  name!: string;

  @ApiProperty({ enum: IntegrationTypeEnum, enumName: 'IntegrationType' })
  type!: IntegrationTypeEnum;

  @ApiProperty({ example: 'https://webhook.site/abc-123' })
  targetUrl!: string;

  @ApiPropertyOptional({ example: '****-key', nullable: true })
  authKey!: string | null;

  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  customHeaders!: Record<string, string> | null;

  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  defaultPayload!: Record<string, unknown> | null;

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}
