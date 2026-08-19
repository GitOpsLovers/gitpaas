/**
 * Kind of account a GitHub App the platform creates belongs to
 */
export type ProviderAppOwnerType = 'personal' | 'organization';

/**
 * The manifest the platform writes, and the browser hands to GitHub.
 */
export interface ProviderAppManifest {
    name: string;
    url: string;
    redirect_url: string;
    setup_url: string;
    public: boolean;
    default_permissions: Record<string, string>;
    default_events: string[];
}

/**
 * What the start of a registration answers with.
 */
export interface StartedProviderRegistration {
    state: string;
    manifest: ProviderAppManifest;
    githubUrl: string;
}

/**
 * What the conversion of the temporary code answers with.
 */
export interface ConvertedProviderRegistration {
    state: string;
    appSlug: string | null;
}
