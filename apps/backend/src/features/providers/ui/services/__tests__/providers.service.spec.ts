import { Test } from '@nestjs/testing';

import { listBranchesUseCase } from '../../../application/list-branches.use-case';
import { listRepositoriesUseCase } from '../../../application/list-repositories.use-case';
import { GitBranch } from '../../../domain/models/git-branch.model';
import { GitRepository } from '../../../domain/models/git-repository.model';
import { GithubAppProvider } from '../../../infrastructure/github/github-app.provider';
import { ProvidersService } from '../providers.service';

jest.mock('../../../application/list-repositories.use-case');
jest.mock('../../../application/list-branches.use-case');

const mockListRepositoriesUseCase = listRepositoriesUseCase as jest.MockedFunction<
    typeof listRepositoriesUseCase
>;
const mockListBranchesUseCase = listBranchesUseCase as jest.MockedFunction<typeof listBranchesUseCase>;

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
    let mockProvider: jest.Mocked<GithubAppProvider>;
    let sut: ProvidersService;

    beforeEach(async () => {
        jest.clearAllMocks();

        mockProvider = {} as jest.Mocked<GithubAppProvider>;

        const moduleRef = await Test.createTestingModule({
            providers: [
                ProvidersService,
                { provide: GithubAppProvider, useValue: mockProvider },
            ],
        }).compile();

        sut = moduleRef.get(ProvidersService);
    });

    describe('listRepositories', () => {
        it('delegates to the use case with the provider', async () => {
            mockListRepositoriesUseCase.mockResolvedValue(repositories);

            await sut.listRepositories();

            expect(mockListRepositoriesUseCase).toHaveBeenCalledTimes(1);
            expect(mockListRepositoriesUseCase).toHaveBeenCalledWith(mockProvider);
        });

        it('returns the repositories produced by the use case', async () => {
            mockListRepositoriesUseCase.mockResolvedValue(repositories);

            const result = await sut.listRepositories();

            expect(result).toBe(repositories);
        });

        it('returns an empty list when no repositories are accessible', async () => {
            mockListRepositoriesUseCase.mockResolvedValue([]);

            const result = await sut.listRepositories();

            expect(result).toEqual([]);
        });

        it('propagates errors thrown by the use case', async () => {
            const error = new Error('github unreachable');
            mockListRepositoriesUseCase.mockRejectedValue(error);

            await expect(sut.listRepositories()).rejects.toThrow(error);
        });
    });

    describe('listBranches', () => {
        it('delegates to the use case with the provider and repository id', async () => {
            mockListBranchesUseCase.mockResolvedValue(branches);

            await sut.listBranches(repositoryId);

            expect(mockListBranchesUseCase).toHaveBeenCalledTimes(1);
            expect(mockListBranchesUseCase).toHaveBeenCalledWith(mockProvider, repositoryId);
        });

        it('returns the branches produced by the use case', async () => {
            mockListBranchesUseCase.mockResolvedValue(branches);

            const result = await sut.listBranches(repositoryId);

            expect(result).toBe(branches);
        });

        it('returns an empty list when the repository has no branches', async () => {
            mockListBranchesUseCase.mockResolvedValue([]);

            const result = await sut.listBranches(repositoryId);

            expect(result).toEqual([]);
        });

        it('propagates errors thrown by the use case', async () => {
            const error = new Error('repository not found');
            mockListBranchesUseCase.mockRejectedValue(error);

            await expect(sut.listBranches(repositoryId)).rejects.toThrow(error);
        });
    });
});
