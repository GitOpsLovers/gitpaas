/**
 * Follower of the output of the containers that run.
 */
export interface RuntimeLogFollower {
    /**
     * The identifiers of the containers the follower streams right now.
     *
     * @returns Identifiers of the followed containers
     */
    followed: () => string[];

    /**
     * Open one stream of the daemon for a container, and send its lines to the store.
     *
     * A container that is followed already stays on its one stream.
     *
     * @param containerId Identifier of the container
     */
    follow: (containerId: string) => void;

    /**
     * Close the stream of a container that stopped.
     *
     * @param containerId Identifier of the container
     */
    unfollow: (containerId: string) => void;
}
