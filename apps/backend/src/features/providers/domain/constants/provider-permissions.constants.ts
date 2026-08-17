/**
 * Level of a permission of a provider, from the lowest to the highest.
 */
export type ProviderPermissionLevel = 'read' | 'write' | 'admin';

/**
 * The levels of a permission, ordered from the lowest to the highest.
 */
export const PROVIDER_PERMISSION_LEVELS: readonly ProviderPermissionLevel[] = ['read', 'write', 'admin'];

/**
 * The permissions a provider carries, as the provider reports them.
 */
export type ProviderAppPermissions = Readonly<Record<string, string>>;

/**
 * The permissions the platform needs from a provider.
 */
export const REQUIRED_PROVIDER_PERMISSIONS: Readonly<Record<string, ProviderPermissionLevel>> = {
    contents: 'read',
    metadata: 'read',
};
