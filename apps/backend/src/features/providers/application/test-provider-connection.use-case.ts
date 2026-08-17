import { ProviderConnectionTest, ProviderCredentials } from '../domain/models/provider.models';
import { ProviderClient } from '../domain/ports/provider-client.port';

import { findMissingProviderPermissions } from './find-missing-provider-permissions';

/**
 * Use case that tests the credentials of a provider.
 *
 * @param providerClient Provider client port
 * @param credentials Credentials of the provider
 *
 * @returns The outcome of the test, and the names of the missing permissions
 */
export async function testProviderConnectionUseCase(
    providerClient: ProviderClient,
    credentials: ProviderCredentials,
): Promise<ProviderConnectionTest> {
    const { accepted, permissions } = await providerClient.verifyCredentials(credentials);

    if (!accepted) {
        return { outcome: 'unauthorized', missingPermissions: [] };
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const missingPermissions = findMissingProviderPermissions(permissions);

    return missingPermissions.length === 0
        ? { outcome: 'ok', missingPermissions: [] }
        : { outcome: 'incomplete', missingPermissions };
}
