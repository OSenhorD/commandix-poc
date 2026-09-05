import { ApiProperty } from '@nestjs/swagger';

export class TenantSummaryDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'Acme Corp' })
  name!: string;

  @ApiProperty({ example: 'acme' })
  slug!: string;
}
