import { GitBranch } from '../../domain/models/git-branch.model';
import { GitCommit } from '../../domain/models/git-commit.model';
import { GitRepository } from '../../domain/models/git-repository.model';

/**
 * Maps a GitHub repository payload into the domain model.
 *
 * @param repository GitHub repository payload
 *
 * @returns Domain git repository
 */
export function toGitRepository(repository: {
    id: number;
    full_name: string;
    default_branch: string;
    private: boolean;
}): GitRepository {
    return {
        id: repository.id,
        fullName: repository.full_name,
        defaultBranch: repository.default_branch,
        private: repository.private,
    };
}

/**
 * Maps a GitHub branch payload into the domain model.
 *
 * @param branch GitHub branch payload
 *
 * @returns Domain git branch
 */
export function toGitBranch(branch: { name: string }): GitBranch {
    return { name: branch.name };
}

/**
 * Maps a GitHub commit payload into the domain model.
 *
 * @param commit GitHub commit payload
 *
 * @returns Domain git commit
 */
export function toGitCommit(commit: { sha: string; commit: { message: string } }): GitCommit {
    return { sha: commit.sha, message: commit.commit.message };
}
