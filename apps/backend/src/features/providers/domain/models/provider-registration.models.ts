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
