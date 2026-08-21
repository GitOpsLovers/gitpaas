import type { PlatformSettings } from '@gitpaas/contracts';

/**
 * Platform settings repository
 */
export interface PlatformSettingsRepository {
    /**
     * Reads the parameters of the deployment system that the operator saved
     *
     * @returns Saved parameters, or `null` while the operator saved none
     */
    find: () => Promise<PlatformSettings | null>;

    /**
     * Writes the parameters of the deployment system
     *
     * @param settings Parameters to keep
     *
     * @returns Parameters the system keeps
     */
    save: (settings: PlatformSettings) => Promise<PlatformSettings>;
}
