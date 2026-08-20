/**
 * Kind of account a provider holds
 */
export type ProviderType = 'github_app';

/**
 * A provider is a named GitHub account a service reaches its repository through.
 */
export interface Provider {
    id: string;
    name: string;
    type: ProviderType;
    appId: string;
    installationId: string;
    keyFingerprint: string;
}

/**
 * Outcome of a test of the credentials of a provider
 */
export type ProviderConnectionOutcome = 'ok' | 'unauthorized' | 'incomplete';

/**
 * Answer of the test of the credentials of a provider.
 */
export interface ProviderConnectionTest {
    outcome: ProviderConnectionOutcome;
    missingPermissions: string[];
}
