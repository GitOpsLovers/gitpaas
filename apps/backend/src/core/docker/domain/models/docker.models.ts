/**
 * Subset of the Docker daemon's `/info` payload that we consume.
 * Dockerode types `info()` as `Promise<any>`, so we narrow it here.
 */
export interface DockerInfo {
    ServerVersion: string;
    OperatingSystem: string;
    Containers: number;
    Images: number;
}
