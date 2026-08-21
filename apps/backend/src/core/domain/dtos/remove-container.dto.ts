/**
 * Data transfer object for removing a container
 */
export interface RemoveContainerDto {
    force?: boolean;
    removeVolumes?: boolean;
}
