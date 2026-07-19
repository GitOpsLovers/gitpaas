import { Test } from '@nestjs/testing';

import { GitBranch } from '../../../domain/models/git-branch.model';
import { GitRepository } from '../../../domain/models/git-repository.model';
import { ProvidersService } from '../../services/providers.service';
import { ProvidersController } from '../providers.controller';

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

describe('ProvidersController', () => {
    let mockProvidersService: jest.Mocked<Pick<ProvidersService, 'listRepositories' | 'listBranches'>>;
    let sut: ProvidersController;

    beforeEach(async () => {
        jest.clearAllMocks();

        mockProvidersService = {
            listRepositories: jest.fn(),
            listBranches: jest.fn(),
        };

        const moduleRef = await Test.createTestingModule({
            controllers: [ProvidersController],
            providers: [{ provide: ProvidersService, useValue: mockProvidersService }],
        }).compile();

        sut = moduleRef.get(ProvidersController);
    });

    describe('listRepositories', () => {
        it('delegates to the service', async () => {
            mockProvidersService.listRepositories.mockResolvedValue(repositories);

            await sut.listRepositories();

            expect(mockProvidersService.listRepositories).toHaveBeenCalledTimes(1);
            expect(mockProvidersService.listRepositories).toHaveBeenCalledWith();
        });

        it('returns the repositories produced by the service', async () => {
            mockProvidersService.listRepositories.mockResolvedValue(repositories);

            const result = await sut.listRepositories();

            expect(result).toBe(repositories);
        });

        it('returns an empty list when no repositories are accessible', async () => {
            mockProvidersService.listRepositories.mockResolvedValue([]);

            const result = await sut.listRepositories();

            expect(result).toEqual([]);
        });

        it('propagates errors raised by the service unchanged', async () => {
            const error = new Error('github unreachable');
            mockProvidersService.listRepositories.mockRejectedValue(error);

            await expect(sut.listRepositories()).rejects.toBe(error);
        });
    });

    describe('listBranches', () => {
        it('delegates to the service with the received repository id', async () => {
            mockProvidersService.listBranches.mockResolvedValue(branches);

            await sut.listBranches(repositoryId);

            expect(mockProvidersService.listBranches).toHaveBeenCalledTimes(1);
            expect(mockProvidersService.listBranches).toHaveBeenCalledWith(repositoryId);
        });

        it('returns the branches produced by the service', async () => {
            mockProvidersService.listBranches.mockResolvedValue(branches);

            const result = await sut.listBranches(repositoryId);

            expect(result).toBe(branches);
        });

        it('returns an empty list when the repository has no branches', async () => {
            mockProvidersService.listBranches.mockResolvedValue([]);

            const result = await sut.listBranches(repositoryId);

            expect(result).toEqual([]);
        });

        it('propagates errors raised by the service unchanged', async () => {
            const error = new Error('repository not found');
            mockProvidersService.listBranches.mockRejectedValue(error);

            await expect(sut.listBranches(repositoryId)).rejects.toBe(error);
        });
    });
});
