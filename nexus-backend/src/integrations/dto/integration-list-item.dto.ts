import { ApiProperty } from '@nestjs/swagger';

import { IntegrationTypeEnum } from '@/common/enums/integration-type.enum.js';

export class IntegrationListItemDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'Order Webhook' })
  name!: string;

  @ApiProperty({ enum: IntegrationTypeEnum, enumName: 'IntegrationType' })
  type!: IntegrationTypeEnum;

  @ApiProperty({ example: 'https://webhook.site/abc-123' })
  targetUrl!: string;

  @ApiProperty({ example: '****-key', nullable: true })
  authKey!: string | null;

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}
