/**
 * The credentials one session of the debug of the database connects with.
 */
export interface DebugRoleCredentials {
    role: string;
    password: string;
}

/**
 * Debug role port.
 */
export interface DebugRole {
    /**
     * Opens the login of the read-only role, under a freshly generated password.
     *
     * @returns The credentials of the role, which the caller gives one time
     */
    grantLogin: () => Promise<DebugRoleCredentials>;

    /**
     * Closes the login of the read-only role.
     */
    revokeLogin: () => Promise<void>;
}
