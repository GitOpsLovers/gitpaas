import { Test } from '@nestjs/testing';

import { GitBranch } from '../../../domain/models/git-branch.model';
import { GitRepository } from '../../../domain/models/git-repository.model';
import { ProvidersService } from '../../services/providers.service';
import { ProvidersController } from '../providers.controller';

jest.mock('@features/providers/infrastructure/github/github-app.provider', () => ({
    GithubAppProvider: class GithubAppProvider {},
}));

const repositoryId = 42;

const repositories: GitRepository[] = [
    {
        id: repositoryId,
        fullName: 'gitopslovers/artifactory',
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
    let service: jest.Mocked<Pick<ProvidersService, 'listRepositories' | 'listBranches'>>;
    let sut: ProvidersController;

    beforeEach(async () => {
        service = {
            listRepositories: jest.fn(),
            listBranches: jest.fn(),
        };

        const moduleRef = await Test.createTestingModule({
            controllers: [ProvidersController],
            providers: [{ provide: ProvidersService, useValue: service }],
        }).compile();

        sut = moduleRef.get(ProvidersController);
    });

    describe('listRepositories', () => {
        it('delegates to the service', async () => {
            service.listRepositories.mockResolvedValue(repositories);

            await sut.listRepositories();

            expect(service.listRepositories).toHaveBeenCalledTimes(1);
            expect(service.listRepositories).toHaveBeenCalledWith();
        });

        it('returns the repositories produced by the service', async () => {
            service.listRepositories.mockResolvedValue(repositories);

            const result = await sut.listRepositories();

            expect(result).toBe(repositories);
        });

        it('returns an empty list when no repositories are accessible', async () => {
            service.listRepositories.mockResolvedValue([]);

            const result = await sut.listRepositories();

            expect(result).toEqual([]);
        });

        it('propagates errors raised by the service unchanged', async () => {
            const error = new Error('github unreachable');
            service.listRepositories.mockRejectedValue(error);

            await expect(sut.listRepositories()).rejects.toBe(error);
        });
    });

    describe('listBranches', () => {
        it('delegates to the service with the received repository id', async () => {
            service.listBranches.mockResolvedValue(branches);

            await sut.listBranches(repositoryId);

            expect(service.listBranches).toHaveBeenCalledTimes(1);
            expect(service.listBranches).toHaveBeenCalledWith(repositoryId);
        });

        it('returns the branches produced by the service', async () => {
            service.listBranches.mockResolvedValue(branches);

            const result = await sut.listBranches(repositoryId);

            expect(result).toBe(branches);
        });

        it('returns an empty list when the repository has no branches', async () => {
            service.listBranches.mockResolvedValue([]);

            const result = await sut.listBranches(repositoryId);

            expect(result).toEqual([]);
        });

        it('propagates errors raised by the service unchanged', async () => {
            const error = new Error('repository not found');
            service.listBranches.mockRejectedValue(error);

            await expect(sut.listBranches(repositoryId)).rejects.toBe(error);
        });
    });
});
