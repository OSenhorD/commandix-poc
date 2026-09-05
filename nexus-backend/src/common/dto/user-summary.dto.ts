import { ApiProperty } from '@nestjs/swagger';

import { RoleEnum } from '@/common/enums/role.enum.js';

export class UserSummaryDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'admin@acme.com' })
  email!: string;

  @ApiProperty({ enum: RoleEnum, enumName: 'Role' })
  role!: RoleEnum;

  @ApiProperty({ format: 'uuid' })
  tenantId!: string;
}
