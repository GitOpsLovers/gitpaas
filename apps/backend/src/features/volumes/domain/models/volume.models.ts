/**
 * Where a volume of a service stands.
 */
export type VolumeState = 'mounted' | 'pending' | 'missing' | 'declared' | 'orphan';

/**
 * A volume of one service, as the database holds it.
 */
export interface Volume {
    id: string;
    serviceId: string;
    name: string;
    daemonKey: string;
}

/**
 * The mount of a volume inside one service of the Compose file of the stack.
 */
export interface VolumeMount {
    composeServiceName: string;
    containerPath: string;
    readOnly: boolean;
}

/**
 * The mount of one volume of a service, as the join of the database holds it.
 */
export interface ServiceVolumeMount extends VolumeMount {
    volumeId: string;
}

/**
 * A volume of a service, together with the state the reads of the daemon give it.
 */
export interface VolumeStatus {
    id: string;
    name: string;
    daemonName: string;
    state: VolumeState;
    driver?: string;
    mountpoint?: string;
    mount?: VolumeMount;
    containers: string[];
}

/**
 * One volume the Compose file of a service declares, with the mount it takes inside the stack.
 */
export interface ComposeVolumeDeclaration {
    daemonKey: string;
    mount: VolumeMount | null;
}
