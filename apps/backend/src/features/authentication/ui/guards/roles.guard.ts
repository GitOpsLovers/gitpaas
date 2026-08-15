import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
// eslint-disable-next-line @typescript-eslint/no-redeclare
import type { Request } from 'express';

import { ROLES_KEY } from '../decorators/roles.decorator';

import { User, UserRole } from '@features/users/domain/models/user.models';

/**
 * Guard that enforces the roles a route declares with `@Roles(...)`.
 *
 * A route that declares no role stays open to each authenticated user, so the
 * guard only narrows the routes that opt in.
 */
@Injectable()
export class RolesGuard implements CanActivate {
    constructor(private readonly reflector: Reflector) {}

    /**
     * Lets a request through when the authenticated user carries one of the declared roles.
     *
     * @param context Current execution context
     *
     * @returns Whether the request may proceed
     */
    public canActivate(context: ExecutionContext): boolean {
        const roles = this.reflector.getAllAndOverride<UserRole[] | undefined>(ROLES_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);

        if (!roles || roles.length === 0) {
            return true;
        }

        const request = context.switchToHttp().getRequest<Request & { user?: User }>();
        const role = request.user?.role;

        if (!role || !roles.includes(role)) {
            throw new ForbiddenException('The role of the user does not allow this operation');
        }

        return true;
    }
}
