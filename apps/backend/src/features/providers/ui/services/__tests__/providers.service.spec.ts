import { Test } from '@nestjs/testing';

import { listBranchesUseCase } from '../../../application/list-branches.use-case';
import { listRepositoriesUseCase } from '../../../application/list-repositories.use-case';
import { GitBranch } from '../../../domain/models/git-branch.model';
import { GitRepository } from '../../../domain/models/git-repository.model';
import { GithubAppProvider } from '../../../infrastructure/github/github-app.provider';
import { ProvidersService } from '../providers.service';

jest.mock('../../../infrastructure/github/github-app.provider', () => ({
    GithubAppProvider: class GithubAppProvider {},
}));
jest.mock('../../../application/list-repositories.use-case');
jest.mock('../../../application/list-branches.use-case');

const listRepositoriesUseCaseMock = listRepositoriesUseCase as jest.MockedFunction<
    typeof listRepositoriesUseCase
>;
const listBranchesUseCaseMock = listBranchesUseCase as jest.MockedFunction<typeof listBranchesUseCase>;

const repositoryId = 42;

const repositories: GitRepository[] = [
    {
        id: repositoryId,
        fullName: 'gitopslovers/gitpaas',
        defaultBranch: 'main',
        private: true,
    },
    {
        id: 7,
        fullName: 'gitopslovers/website',
        defaultBranch: 'develop',
        private: false,
    },
];

const branches: GitBranch[] = [{ name: 'main' }, { name: 'develop' }];

describe('ProvidersService', () => {
    let provider: jest.Mocked<GithubAppProvider>;
    let sut: ProvidersService;

    beforeEach(async () => {
        jest.clearAllMocks();

        provider = {} as jest.Mocked<GithubAppProvider>;

        const moduleRef = await Test.createTestingModule({
            providers: [
                ProvidersService,
                { provide: GithubAppProvider, useValue: provider },
            ],
        }).compile();

        sut = moduleRef.get(ProvidersService);
    });

    describe('listRepositories', () => {
        it('delegates to the use case with the provider', async () => {
            listRepositoriesUseCaseMock.mockResolvedValue(repositories);

            await sut.listRepositories();

            expect(listRepositoriesUseCaseMock).toHaveBeenCalledTimes(1);
            expect(listRepositoriesUseCaseMock).toHaveBeenCalledWith(provider);
        });

        it('returns the repositories produced by the use case', async () => {
            listRepositoriesUseCaseMock.mockResolvedValue(repositories);

            const result = await sut.listRepositories();

            expect(result).toBe(repositories);
        });

        it('returns an empty list when no repositories are accessible', async () => {
            listRepositoriesUseCaseMock.mockResolvedValue([]);

            const result = await sut.listRepositories();

            expect(result).toEqual([]);
        });

        it('propagates errors thrown by the use case', async () => {
            const error = new Error('github unreachable');
            listRepositoriesUseCaseMock.mockRejectedValue(error);

            await expect(sut.listRepositories()).rejects.toThrow(error);
        });
    });

    describe('listBranches', () => {
        it('delegates to the use case with the provider and repository id', async () => {
            listBranchesUseCaseMock.mockResolvedValue(branches);

            await sut.listBranches(repositoryId);

            expect(listBranchesUseCaseMock).toHaveBeenCalledTimes(1);
            expect(listBranchesUseCaseMock).toHaveBeenCalledWith(provider, repositoryId);
        });

        it('returns the branches produced by the use case', async () => {
            listBranchesUseCaseMock.mockResolvedValue(branches);

            const result = await sut.listBranches(repositoryId);

            expect(result).toBe(branches);
        });

        it('returns an empty list when the repository has no branches', async () => {
            listBranchesUseCaseMock.mockResolvedValue([]);

            const result = await sut.listBranches(repositoryId);

            expect(result).toEqual([]);
        });

        it('propagates errors thrown by the use case', async () => {
            const error = new Error('repository not found');
            listBranchesUseCaseMock.mockRejectedValue(error);

            await expect(sut.listBranches(repositoryId)).rejects.toThrow(error);
        });
    });
});
