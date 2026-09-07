import { isSafeComposerPath } from '@gitpaas/contracts';

import { UnsafeComposeRecipeError } from '@core/domain/errors/compose.errors';

/**
 * Refuses the path of a compose file that escapes the folder of the repository.
 *
 * @param path Path of the compose file the service stores
 *
 * @throws {UnsafeComposeRecipeError} When the path is absolute, names the home folder, or holds one segment `..`
 */
export function assertComposerPath(path: string): void {
    if (!isSafeComposerPath(path)) {
        throw new UnsafeComposeRecipeError(
            'composerPath',
            `the path "${path}" is not relative to the root of the repository, or it holds one segment ".."`,
        );
    }
}
