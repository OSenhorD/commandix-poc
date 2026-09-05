import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
} from 'class-validator';

import { IntegrationTypeEnum } from '@/common/enums/integration-type.enum.js';

export class CreateIntegrationDto {
  @ApiProperty({ example: 'Order Webhook' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ enum: IntegrationTypeEnum, enumName: 'IntegrationType' })
  @IsEnum(IntegrationTypeEnum)
  type!: IntegrationTypeEnum;

  @ApiProperty({ example: 'https://webhook.site/abc-123' })
  @IsUrl()
  targetUrl!: string;

  @ApiPropertyOptional({ example: 'secret-key' })
  @IsOptional()
  @IsString()
  authKey?: string;

  @ApiPropertyOptional({ example: { 'X-Custom': 'value' } })
  @IsOptional()
  @IsObject()
  customHeaders?: Record<string, string>;

  @ApiPropertyOptional({ example: { source: 'commandix' } })
  @IsOptional()
  @IsObject()
  defaultPayload?: Record<string, unknown>;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
