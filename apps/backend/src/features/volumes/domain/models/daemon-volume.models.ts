/**
 * A volume the daemon holds.
 */
export interface DaemonVolume {
    name: string;
    driver: string;
    mountpoint: string;
}

/**
 * The mount of a volume that one container of a service holds.
 */
export interface DaemonVolumeMount {
    volumeName: string;
    containerName: string;
}
