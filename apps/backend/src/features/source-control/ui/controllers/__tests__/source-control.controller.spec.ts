import { Test } from '@nestjs/testing';

import { GitBranch } from '../../../domain/models/git-branch.models';
import { GitRepository } from '../../../domain/models/git-repository.models';
import { SourceControlService } from '../../services/source-control.service';
import { SourceControlController } from '../source-control.controller';

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

describe('SourceControlController', () => {
    let mockSourceControlService: jest.Mocked<Pick<SourceControlService, 'listRepositories' | 'listBranches'>>;
    let sut: SourceControlController;

    beforeEach(async () => {
        jest.clearAllMocks();

        mockSourceControlService = {
            listRepositories: jest.fn(),
            listBranches: jest.fn(),
        };

        const moduleRef = await Test.createTestingModule({
            controllers: [SourceControlController],
            providers: [{ provide: SourceControlService, useValue: mockSourceControlService }],
        }).compile();

        sut = moduleRef.get(SourceControlController);
    });

    describe('listRepositories', () => {
        it('delegates to the service', async () => {
            mockSourceControlService.listRepositories.mockResolvedValue(repositories);

            await sut.listRepositories();

            expect(mockSourceControlService.listRepositories).toHaveBeenCalledTimes(1);
            expect(mockSourceControlService.listRepositories).toHaveBeenCalledWith();
        });

        it('returns the repositories produced by the service', async () => {
            mockSourceControlService.listRepositories.mockResolvedValue(repositories);

            const result = await sut.listRepositories();

            expect(result).toBe(repositories);
        });

        it('returns an empty list when no repositories are accessible', async () => {
            mockSourceControlService.listRepositories.mockResolvedValue([]);

            const result = await sut.listRepositories();

            expect(result).toEqual([]);
        });

        it('propagates errors raised by the service unchanged', async () => {
            const error = new Error('github unreachable');
            mockSourceControlService.listRepositories.mockRejectedValue(error);

            await expect(sut.listRepositories()).rejects.toBe(error);
        });
    });

    describe('listBranches', () => {
        it('delegates to the service with the received repository id', async () => {
            mockSourceControlService.listBranches.mockResolvedValue(branches);

            await sut.listBranches(repositoryId);

            expect(mockSourceControlService.listBranches).toHaveBeenCalledTimes(1);
            expect(mockSourceControlService.listBranches).toHaveBeenCalledWith(repositoryId);
        });

        it('returns the branches produced by the service', async () => {
            mockSourceControlService.listBranches.mockResolvedValue(branches);

            const result = await sut.listBranches(repositoryId);

            expect(result).toBe(branches);
        });

        it('returns an empty list when the repository has no branches', async () => {
            mockSourceControlService.listBranches.mockResolvedValue([]);

            const result = await sut.listBranches(repositoryId);

            expect(result).toEqual([]);
        });

        it('propagates errors raised by the service unchanged', async () => {
            const error = new Error('repository not found');
            mockSourceControlService.listBranches.mockRejectedValue(error);

            await expect(sut.listBranches(repositoryId)).rejects.toBe(error);
        });
    });
});
