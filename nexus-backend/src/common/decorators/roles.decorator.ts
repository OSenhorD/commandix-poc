import { SetMetadata } from '@nestjs/common';

import { ROLES_KEY } from '@/common/constants/auth-metadata.constants.js';
import type { RoleEnum } from '@/common/enums/role.enum.js';

export const Roles = (...roles: RoleEnum[]) => SetMetadata(ROLES_KEY, roles);
