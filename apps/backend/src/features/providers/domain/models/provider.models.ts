import type { ProviderType as ProviderTypeContract } from '@gitpaas/contracts';

import { ProviderAppPermissions } from '../constants/provider-permissions.constants';

/**
 * Kind of provider account a provider holds.
 */
export enum ProviderType {
    GithubApp = 'github_app',
}

/**
 * The enum of the domain that each kind of the wire maps onto.
 */
export const PROVIDER_TYPES: Readonly<Record<ProviderTypeContract, ProviderType>> = {
    github_app: ProviderType.GithubApp,
};

/**
 * Converts the kind of a provider of the wire into the enum of the domain.
 *
 * @param type Kind of a provider, as a request of the API carries it
 *
 * @returns The matching kind of the domain
 */
export function toProviderType(type: ProviderTypeContract): ProviderType {
    // eslint-disable-next-line security/detect-object-injection
    return PROVIDER_TYPES[type];
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
