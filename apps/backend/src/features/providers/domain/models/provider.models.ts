import { ProviderAppPermissions } from '../constants/provider-permissions.constants';

/**
 * Kind of provider account a provider holds.
 */
export enum ProviderType {
    GithubApp = 'github_app',
}

/**
 * A provider is a named provider account a service reaches its repository through.
 */
export interface Provider {
    id: string;
    name: string;
    type: ProviderType;
    appId: string;
    installationId: string;
    keyFingerprint: string;
    createdAt: Date;
    updatedAt: Date;
}

/**
 * The outcome of a test of the credentials of a provider.
 */
export type ProviderConnectionOutcome = 'ok' | 'unauthorized' | 'incomplete';

export interface ProviderConnectionTest {
    outcome: ProviderConnectionOutcome;
    missingPermissions: string[];
}

/**
 * The raw facts a provider reports about the credentials of a provider.
 */
export interface ProviderCredentialsVerification {
    accepted: boolean;
    permissions: ProviderAppPermissions;
}

/**
 * The credentials of a provider, as the provider client consumes them.
 */
export interface ProviderCredentials {
    providerId: string;
    appId: string;
    installationId: string;
    privateKey: string;
}
