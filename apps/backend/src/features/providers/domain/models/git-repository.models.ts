/**
 * Git repository
 */
export interface GitRepository {
    id: number;
    fullName: string;
    defaultBranch: string;
    private: boolean;
}
