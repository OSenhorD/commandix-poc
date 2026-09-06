import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsObject, IsOptional } from 'class-validator';

export class TriggerIntegrationDto {
  @ApiPropertyOptional({ example: { event: 'order.created', orderId: '123' } })
  @IsOptional()
  @IsObject()
  payload?: Record<string, unknown>;
}
