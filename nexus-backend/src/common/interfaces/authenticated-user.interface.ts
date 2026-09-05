import type { RoleEnum } from '@/common/enums/role.enum.js';

export interface AuthenticatedUser {
  id: string;
  tenantId: string;
  role: RoleEnum;
  email: string;
}
