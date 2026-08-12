/**
 * A repository the GitHub App installation has access to
 */
export interface GitRepository {
    id: number;
    fullName: string;
    defaultBranch: string;
    private: boolean;
}
