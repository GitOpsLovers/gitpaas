/**
 * A permission the platform needs from the GitHub App of a provider.
 */
export interface RequiredProviderPermission {
    name: string;
    level: string;
}

/**
 * The permissions the platform needs from the GitHub App of a provider.
 */
export const REQUIRED_PROVIDER_PERMISSIONS: readonly RequiredProviderPermission[] = [
    { name: 'contents', level: 'Read' },
    { name: 'metadata', level: 'Read' },
];
