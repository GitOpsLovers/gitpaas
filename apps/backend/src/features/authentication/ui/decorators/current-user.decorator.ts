import { createParamDecorator, ExecutionContext } from '@nestjs/common';
// eslint-disable-next-line @typescript-eslint/no-redeclare
import type { Request } from 'express';

import { User } from '@features/users/domain/models/user.model';

/**
 * Extracts the authenticated user that the JWT strategy attached to the
 * request, for use in protected route handlers.
 */
export const currentUserFactory = (_data: unknown, context: ExecutionContext): User => {
    const request = context.switchToHttp().getRequest<Request & { user: User }>();

    return request.user;
};

export const CurrentUser = createParamDecorator(currentUserFactory);
