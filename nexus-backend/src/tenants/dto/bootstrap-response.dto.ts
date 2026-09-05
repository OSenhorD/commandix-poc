import { ApiProperty } from '@nestjs/swagger';

import { TenantSummaryDto } from '@/common/dto/tenant-summary.dto.js';
import { UserSummaryDto } from '@/common/dto/user-summary.dto.js';

export class BootstrapTenantResponseDto {
  @ApiProperty({ type: TenantSummaryDto })
  tenant!: TenantSummaryDto;

  @ApiProperty({ type: UserSummaryDto })
  user!: UserSummaryDto;
}
