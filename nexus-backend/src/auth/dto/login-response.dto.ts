import { ApiProperty } from '@nestjs/swagger';

import { UserSummaryDto } from '@/common/dto/user-summary.dto.js';

export class LoginResponseDto {
  @ApiProperty()
  accessToken!: string;

  @ApiProperty()
  refreshToken!: string;

  @ApiProperty({ type: UserSummaryDto })
  user!: UserSummaryDto;
}
