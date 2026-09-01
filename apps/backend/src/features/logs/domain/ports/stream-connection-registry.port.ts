/**
 * Registry of the live connections one user holds open, so a user opens no more than its share.
 */
export interface StreamConnectionRegistry {
    /**
     * Take one slot of the connections of a user, when that user stays under its limit.
     *
     * @param userId Identifier of the user that opens the connection
     *
     * @returns `true` when the user took a slot, and `false` when it holds its limit already
     */
    acquire: (userId: string) => boolean;

    /**
     * Give back the slot of a connection that closed.
     *
     * @param userId Identifier of the user that closed the connection
     */
    release: (userId: string) => void;
}
