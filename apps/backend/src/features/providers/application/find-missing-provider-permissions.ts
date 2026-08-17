import {
    PROVIDER_PERMISSION_LEVELS,
    ProviderAppPermissions,
    ProviderPermissionLevel,
    REQUIRED_PROVIDER_PERMISSIONS,
} from '../domain/constants/provider-permissions.constants';

/**
 * Rank of a level of a permission.
 *
 * @param level Level to rank
 *
 * @returns The rank of the level, or -1 when the level is unknown
 */
function rankOf(level: string | undefined): number {
    return level === undefined ? -1 : PROVIDER_PERMISSION_LEVELS.indexOf(level as ProviderPermissionLevel);
}

/**
 * Compare the permissions of a provider against the ones the platform needs.
 *
 * @param permissions Permissions the provider carries, as the provider reports them
 *
 * @returns The names of the needed permissions the provider does not carry
 */
export function findMissingProviderPermissions(permissions: ProviderAppPermissions | undefined): string[] {
    const granted = permissions ?? {};

    return Object.entries(REQUIRED_PROVIDER_PERMISSIONS)
        // eslint-disable-next-line security/detect-object-injection
        .filter(([name, needed]) => rankOf(granted[name]) < rankOf(needed))
        .map(([name]) => name);
}
