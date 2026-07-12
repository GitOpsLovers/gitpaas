/**
 * A resolved git commit.
 */
export interface GitCommit {
    /** Full commit SHA. */
    sha: string;
    /** Commit message (the first line is its title/subject). */
    message: string;
}
