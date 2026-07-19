import { ServiceUnavailableException } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import { OrphanRemovalResult } from '../../../domain/models/orphan-removal-result.model';
import { PruneResult } from '../../../domain/models/prune-result.model';
import { ReadinessResult } from '../../../domain/models/readiness-result.model';
import { ServerService } from '../../services/server.service';
import { ServerController } from '../server.controller';

import { DiagnosticLoggerService } from '@core/ui/services/diagnostic-logger.service';

const imagesResult: PruneResult = { deletedCount: 3, spaceReclaimed: 1_048_576 };
const volumesResult: PruneResult = { deletedCount: 2, spaceReclaimed: 524_288 };
const containersResult: PruneResult = { deletedCount: 5, spaceReclaimed: 0 };
const emptyResult: PruneResult = { deletedCount: 0, spaceReclaimed: 0 };
const orphanResult: OrphanRemovalResult = { removed: 2, names: ['stale-app-1', 'ghost-app-1'] };
const readyResult: ReadinessResult = {
    status: 'ok',
    dependencies: [
        { name: 'postgres', status: 'up' },
        { name: 'redis', status: 'up' },
        { name: 'docker', status: 'up' },
    ],
};
const notReadyResult: ReadinessResult = {
    status: 'error',
    dependencies: [
        { name: 'postgres', status: 'up' },
        { name: 'redis', status: 'down' },
        { name: 'docker', status: 'up' },
    ],
};

describe('ServerController', () => {
    let mockServerService: jest.Mocked<
        Pick<
            ServerService,
            'pruneImages' | 'pruneVolumes' | 'pruneContainers' | 'removeOrphanedContainers' | 'checkReadiness'
        >
    >;
    let mockDiagnostics: jest.Mocked<Pick<DiagnosticLoggerService, 'log' | 'warn' | 'error'>>;
    let sut: ServerController;

    beforeEach(async () => {
        jest.clearAllMocks();

        mockServerService = {
            pruneImages: jest.fn(),
            pruneVolumes: jest.fn(),
            pruneContainers: jest.fn(),
            removeOrphanedContainers: jest.fn(),
            checkReadiness: jest.fn(),
        };

        mockDiagnostics = {
            log: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
        };

        const moduleRef = await Test.createTestingModule({
            controllers: [ServerController],
            providers: [
                { provide: ServerService, useValue: mockServerService },
                { provide: DiagnosticLoggerService, useValue: mockDiagnostics },
            ],
        }).compile();

        sut = moduleRef.get(ServerController);
    });

    describe('readiness', () => {
        it('delegates to the service readiness check', async () => {
            mockServerService.checkReadiness.mockResolvedValue(readyResult);

            await sut.readiness();

            expect(mockServerService.checkReadiness).toHaveBeenCalledTimes(1);
        });

        it('returns the readiness payload when every dependency is up', async () => {
            mockServerService.checkReadiness.mockResolvedValue(readyResult);

            const result = await sut.readiness();

            expect(result).toBe(readyResult);
        });

        it('throws a ServiceUnavailableException when a dependency is down', async () => {
            mockServerService.checkReadiness.mockResolvedValue(notReadyResult);

            await expect(sut.readiness()).rejects.toBeInstanceOf(ServiceUnavailableException);
        });

        it('carries the full readiness breakdown in the 503 response body', async () => {
            mockServerService.checkReadiness.mockResolvedValue(notReadyResult);

            const error = await sut.readiness().catch((caught: unknown) => caught);

            expect(error).toBeInstanceOf(ServiceUnavailableException);
            expect((error as ServiceUnavailableException).getStatus()).toBe(503);
            expect((error as ServiceUnavailableException).getResponse()).toEqual(notReadyResult);
        });

        it('propagates errors thrown by the service unchanged', async () => {
            const original = new Error('unexpected');
            mockServerService.checkReadiness.mockRejectedValue(original);

            await expect(sut.readiness()).rejects.toBe(original);
        });
    });

    describe('pruneImages', () => {
        it('delegates to the service prune images action', async () => {
            mockServerService.pruneImages.mockResolvedValue(imagesResult);

            await sut.pruneImages();

            expect(mockServerService.pruneImages).toHaveBeenCalledTimes(1);
        });

        it('returns the prune result produced by the service', async () => {
            mockServerService.pruneImages.mockResolvedValue(imagesResult);

            const result = await sut.pruneImages();

            expect(result).toBe(imagesResult);
        });

        it('returns a zeroed result when nothing was reclaimed', async () => {
            mockServerService.pruneImages.mockResolvedValue(emptyResult);

            const result = await sut.pruneImages();

            expect(result).toEqual({ deletedCount: 0, spaceReclaimed: 0 });
        });

        it('never touches the other prune actions', async () => {
            mockServerService.pruneImages.mockResolvedValue(imagesResult);

            await sut.pruneImages();

            expect(mockServerService.pruneVolumes).not.toHaveBeenCalled();
            expect(mockServerService.pruneContainers).not.toHaveBeenCalled();
        });

        it('rethrows a ServiceUnavailableException raised by the service unchanged', async () => {
            const original = new ServiceUnavailableException('daemon down');
            mockServerService.pruneImages.mockRejectedValue(original);

            await expect(sut.pruneImages()).rejects.toBe(original);
        });

        it('wraps an unexpected error into a ServiceUnavailableException', async () => {
            mockServerService.pruneImages.mockRejectedValue(new Error('ECONNREFUSED'));

            await expect(sut.pruneImages()).rejects.toBeInstanceOf(ServiceUnavailableException);
        });

        it('names the images resource in the wrapped error message', async () => {
            mockServerService.pruneImages.mockRejectedValue(new Error('ECONNREFUSED'));

            await expect(sut.pruneImages()).rejects.toThrow(/Could not prune images/);
        });

        it('includes remediation guidance in the wrapped error message', async () => {
            mockServerService.pruneImages.mockRejectedValue(new Error('ECONNREFUSED'));

            await expect(sut.pruneImages()).rejects.toThrow(/emulated VPS/);
        });

        it('wraps non-Error rejection values into a ServiceUnavailableException', async () => {
            mockServerService.pruneImages.mockRejectedValue('boom');

            await expect(sut.pruneImages()).rejects.toBeInstanceOf(ServiceUnavailableException);
        });
    });

    describe('pruneVolumes', () => {
        it('delegates to the service prune volumes action', async () => {
            mockServerService.pruneVolumes.mockResolvedValue(volumesResult);

            await sut.pruneVolumes();

            expect(mockServerService.pruneVolumes).toHaveBeenCalledTimes(1);
        });

        it('returns the prune result produced by the service', async () => {
            mockServerService.pruneVolumes.mockResolvedValue(volumesResult);

            const result = await sut.pruneVolumes();

            expect(result).toBe(volumesResult);
        });

        it('returns a zeroed result when nothing was reclaimed', async () => {
            mockServerService.pruneVolumes.mockResolvedValue(emptyResult);

            const result = await sut.pruneVolumes();

            expect(result).toEqual({ deletedCount: 0, spaceReclaimed: 0 });
        });

        it('never touches the other prune actions', async () => {
            mockServerService.pruneVolumes.mockResolvedValue(volumesResult);

            await sut.pruneVolumes();

            expect(mockServerService.pruneImages).not.toHaveBeenCalled();
            expect(mockServerService.pruneContainers).not.toHaveBeenCalled();
        });

        it('rethrows a ServiceUnavailableException raised by the service unchanged', async () => {
            const original = new ServiceUnavailableException('daemon down');
            mockServerService.pruneVolumes.mockRejectedValue(original);

            await expect(sut.pruneVolumes()).rejects.toBe(original);
        });

        it('wraps an unexpected error into a ServiceUnavailableException', async () => {
            mockServerService.pruneVolumes.mockRejectedValue(new Error('ECONNREFUSED'));

            await expect(sut.pruneVolumes()).rejects.toBeInstanceOf(ServiceUnavailableException);
        });

        it('names the volumes resource in the wrapped error message', async () => {
            mockServerService.pruneVolumes.mockRejectedValue(new Error('ECONNREFUSED'));

            await expect(sut.pruneVolumes()).rejects.toThrow(/Could not prune volumes/);
        });

        it('wraps non-Error rejection values into a ServiceUnavailableException', async () => {
            mockServerService.pruneVolumes.mockRejectedValue('boom');

            await expect(sut.pruneVolumes()).rejects.toBeInstanceOf(ServiceUnavailableException);
        });
    });

    describe('pruneContainers', () => {
        it('delegates to the service prune containers action', async () => {
            mockServerService.pruneContainers.mockResolvedValue(containersResult);

            await sut.pruneContainers();

            expect(mockServerService.pruneContainers).toHaveBeenCalledTimes(1);
        });

        it('returns the prune result produced by the service', async () => {
            mockServerService.pruneContainers.mockResolvedValue(containersResult);

            const result = await sut.pruneContainers();

            expect(result).toBe(containersResult);
        });

        it('returns a zeroed result when nothing was reclaimed', async () => {
            mockServerService.pruneContainers.mockResolvedValue(emptyResult);

            const result = await sut.pruneContainers();

            expect(result).toEqual({ deletedCount: 0, spaceReclaimed: 0 });
        });

        it('never touches the other prune actions', async () => {
            mockServerService.pruneContainers.mockResolvedValue(containersResult);

            await sut.pruneContainers();

            expect(mockServerService.pruneImages).not.toHaveBeenCalled();
            expect(mockServerService.pruneVolumes).not.toHaveBeenCalled();
        });

        it('rethrows a ServiceUnavailableException raised by the service unchanged', async () => {
            const original = new ServiceUnavailableException('daemon down');
            mockServerService.pruneContainers.mockRejectedValue(original);

            await expect(sut.pruneContainers()).rejects.toBe(original);
        });

        it('wraps an unexpected error into a ServiceUnavailableException', async () => {
            mockServerService.pruneContainers.mockRejectedValue(new Error('ECONNREFUSED'));

            await expect(sut.pruneContainers()).rejects.toBeInstanceOf(ServiceUnavailableException);
        });

        it('names the containers resource in the wrapped error message', async () => {
            mockServerService.pruneContainers.mockRejectedValue(new Error('ECONNREFUSED'));

            await expect(sut.pruneContainers()).rejects.toThrow(/Could not prune containers/);
        });

        it('wraps non-Error rejection values into a ServiceUnavailableException', async () => {
            mockServerService.pruneContainers.mockRejectedValue('boom');

            await expect(sut.pruneContainers()).rejects.toBeInstanceOf(ServiceUnavailableException);
        });
    });

    describe('removeOrphanedContainers', () => {
        it('delegates to the service remove orphaned containers action', async () => {
            mockServerService.removeOrphanedContainers.mockResolvedValue(orphanResult);

            await sut.removeOrphanedContainers();

            expect(mockServerService.removeOrphanedContainers).toHaveBeenCalledTimes(1);
        });

        it('returns the orphan removal result produced by the service', async () => {
            mockServerService.removeOrphanedContainers.mockResolvedValue(orphanResult);

            const result = await sut.removeOrphanedContainers();

            expect(result).toBe(orphanResult);
        });

        it('returns an empty result when there is nothing to remove', async () => {
            mockServerService.removeOrphanedContainers.mockResolvedValue({ removed: 0, names: [] });

            const result = await sut.removeOrphanedContainers();

            expect(result).toEqual({ removed: 0, names: [] });
        });

        it('never touches the prune actions', async () => {
            mockServerService.removeOrphanedContainers.mockResolvedValue(orphanResult);

            await sut.removeOrphanedContainers();

            expect(mockServerService.pruneImages).not.toHaveBeenCalled();
            expect(mockServerService.pruneVolumes).not.toHaveBeenCalled();
            expect(mockServerService.pruneContainers).not.toHaveBeenCalled();
        });

        it('rethrows a ServiceUnavailableException raised by the service unchanged', async () => {
            const original = new ServiceUnavailableException('daemon down');
            mockServerService.removeOrphanedContainers.mockRejectedValue(original);

            await expect(sut.removeOrphanedContainers()).rejects.toBe(original);
        });

        it('wraps an unexpected error into a ServiceUnavailableException', async () => {
            mockServerService.removeOrphanedContainers.mockRejectedValue(new Error('ECONNREFUSED'));

            await expect(sut.removeOrphanedContainers()).rejects.toBeInstanceOf(ServiceUnavailableException);
        });

        it('names the orphaned containers resource in the wrapped error message', async () => {
            mockServerService.removeOrphanedContainers.mockRejectedValue(new Error('ECONNREFUSED'));

            await expect(sut.removeOrphanedContainers()).rejects.toThrow(/Could not prune orphaned containers/);
        });

        it('includes remediation guidance in the wrapped error message', async () => {
            mockServerService.removeOrphanedContainers.mockRejectedValue(new Error('ECONNREFUSED'));

            await expect(sut.removeOrphanedContainers()).rejects.toThrow(/emulated VPS/);
        });

        it('wraps non-Error rejection values into a ServiceUnavailableException', async () => {
            mockServerService.removeOrphanedContainers.mockRejectedValue('boom');

            await expect(sut.removeOrphanedContainers()).rejects.toBeInstanceOf(ServiceUnavailableException);
        });
    });
});
