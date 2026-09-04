/**
 * The values the form of the tab of the volumes holds while the user writes the mount of one volume.
 */
export interface VolumeMountDraft {
    composeServiceName: string;
    containerPath: string;
    readOnly: boolean;
}

/**
 * The values the form of the tab of the volumes holds while the user writes one new volume.
 */
export interface VolumeDraft extends VolumeMountDraft {
    name: string;
}
