import { createParamDecorator, ExecutionContext } from '@nestjs/common';

import type { AuthenticatedUser } from '@/common/interfaces/authenticated-user.interface.js';

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedUser => {
    const request = context
      .switchToHttp()
      .getRequest<{ user: AuthenticatedUser }>();
    return request.user;
  },
);
