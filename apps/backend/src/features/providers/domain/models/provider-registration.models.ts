import { ProviderPermissionLevel } from '../constants/provider-permissions.constants';

/**
 * Kind of account a GitHub App the platform creates belongs to.
 */
export enum ProviderAppOwnerType {
    Personal = 'personal',
    Organization = 'organization',
}

/**
 * Step a registration that runs has reached.
 */
export enum ProviderRegistrationStep {
    AwaitingCreation = 'awaiting_creation',
    AwaitingInstallation = 'awaiting_installation',
}

/**
 * A pending registration is the record of one registration that runs.
 */
export interface ProviderRegistration {
    id: string;
    state: string;
    name: string;
    ownerType: ProviderAppOwnerType;
    ownerLogin: string | null;
    step: ProviderRegistrationStep;
    appId: string | null;
    appSlug: string | null;
    encryptedPrivateKey: string | null;
    createdAt: Date;
    expiresAt: Date;
}

/**
 * What the operator asks a registration to start with.
 */
export interface ProviderRegistrationRequest {
    name: string;
    ownerType: ProviderAppOwnerType;
    ownerLogin: string | null;
}

/**
 * The data one registration starts with.
 */
export interface NewProviderRegistration {
    state: string;
    name: string;
    ownerType: ProviderAppOwnerType;
    ownerLogin: string | null;
    expiresAt: Date;
}

/**
 * The configuration of the application GitHub answers the conversion with.
 */
export interface ProviderRegistrationConversion {
    appId: string;
    appSlug: string;
    privateKey: string;
}

/**
 * The data the end of a registration writes one provider from.
 */
export interface ProviderRegistrationCompletion {
    name: string;
    appId: string;
    installationId: string;
    encryptedPrivateKey: string;
}

/**
 * The manifest the platform hands GitHub so that it creates the application.
 */
export interface ProviderAppManifest {
    name: string;
    url: string;
    redirect_url: string;
    setup_url: string;
    public: boolean;
    default_permissions: Readonly<Record<string, ProviderPermissionLevel>>;
    default_events: string[];
}

/**
 * The addresses the manifest carries.
 */
export interface ProviderAppManifestUrls {
    homepageUrl: string;
    redirectUrl: string;
    setupUrl: string;
}

/**
 * What the start of a registration answers with.
 */
export interface StartedProviderRegistration {
    state: string;
    manifest: ProviderAppManifest;
    githubUrl: string;
}
