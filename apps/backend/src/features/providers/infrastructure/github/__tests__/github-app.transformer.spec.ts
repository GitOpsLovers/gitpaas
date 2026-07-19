import { toGitBranch, toGitCommit, toGitRepository } from '../github-app.transformer';

describe('github-app.transformer', () => {
    describe('toGitRepository', () => {
        it('maps a GitHub repository payload into the domain model', () => {
            expect(
                toGitRepository({
                    id: 42,
                    full_name: 'gitopslovers/gitpaas',
                    default_branch: 'main',
                    private: true,
                }),
            ).toEqual({
                id: 42,
                fullName: 'gitopslovers/gitpaas',
                defaultBranch: 'main',
                private: true,
            });
        });

        it('preserves a public repository flag', () => {
            const result = toGitRepository({
                id: 7,
                full_name: 'octocat/hello-world',
                default_branch: 'master',
                private: false,
            });

            expect(result.private).toBe(false);
            expect(result.defaultBranch).toBe('master');
        });
    });

    describe('toGitBranch', () => {
        it('maps a GitHub branch payload into the domain model', () => {
            expect(toGitBranch({ name: 'feature/logs' })).toEqual({ name: 'feature/logs' });
        });
    });

    describe('toGitCommit', () => {
        it('maps the sha and flattens the nested commit message', () => {
            expect(
                toGitCommit({
                    sha: '2b8c1f0a9e4d7c6b5a4f3e2d1c0b9a8f7e6d5c4b',
                    commit: { message: 'Add logs feature' },
                }),
            ).toEqual({
                sha: '2b8c1f0a9e4d7c6b5a4f3e2d1c0b9a8f7e6d5c4b',
                message: 'Add logs feature',
            });
        });
    });
});
