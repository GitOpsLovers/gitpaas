/**
 * Runner of the update of the platform.
 */
export interface UpdateRunner {
    /**
     * Starts the update of the platform, detached from the backend that asks for it
     *
     * @param updateId Identifier of the row the update reports its progress into
     * @param targetVersion Tag of the release the platform moves to
     */
    start: (updateId: string, targetVersion: string) => Promise<void>;
}
