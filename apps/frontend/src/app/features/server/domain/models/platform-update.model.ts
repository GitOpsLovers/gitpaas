/**
 * State of the update of the platform as the panel shows it.
 */
export interface PlatformUpdateView {
    installedVersion: string | null;
    latestVersion: string | null;
    available: boolean;
    running: boolean;
    failed: boolean;
    finished: boolean;
    step: string | null;
    percent: number;
    error: string | null;
}
