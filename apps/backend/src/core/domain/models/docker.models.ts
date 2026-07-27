/**
 * Status of a Docker instance
 */
export interface DockerInfo {
    ServerVersion: string;
    OperatingSystem: string;
    Containers: number;
    Images: number;
}
