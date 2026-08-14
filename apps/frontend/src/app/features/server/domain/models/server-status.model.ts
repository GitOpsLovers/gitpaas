/**
 * Information the server's Docker daemon reports when it answers.
 */
export interface ServerStatus {
    /** Whether the daemon answered the status call. */
    connected: boolean;
    /** Version of the daemon. */
    serverVersion: string;
    /** Operating system the daemon runs on. */
    operatingSystem: string;
    /** Number of containers the daemon knows. */
    containers: number;
    /** Number of images the daemon knows. */
    images: number;
}
