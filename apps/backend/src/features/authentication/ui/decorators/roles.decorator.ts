import { CustomDecorator, SetMetadata } from '@nestjs/common';

import { UserRole } from '@features/users/domain/models/user.models';

/**
 * Metadata key under which the {@link Roles} list is stored.
 */
export const ROLES_KEY = 'roles';

/**
 * Restricts a route (or an entire controller) to the given roles, which the
 * `RolesGuard` reads off the authenticated user.
 *
 * @param roles Roles allowed to reach the route
 *
 * @returns The metadata-setting decorator
 */
export function Roles(...roles: UserRole[]): CustomDecorator {
    return SetMetadata(ROLES_KEY, roles);
}
