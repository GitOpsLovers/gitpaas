import { CustomDecorator, SetMetadata } from '@nestjs/common';

/**
 * Metadata key under which the {@link Public} flag is stored.
 */
export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Marks a route (or an entire controller) as public, opting it out of the
 * global JWT authentication guard.
 *
 * @returns The metadata-setting decorator
 */
export function Public(): CustomDecorator {
    return SetMetadata(IS_PUBLIC_KEY, true);
}
