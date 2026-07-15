import { ServiceUnavailableException } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import { PruneResult } from '../../../domain/models/prune-result.model';
import { ServerService } from '../../services/server.service';
import { ServerController } from '../server.controller';

jest.mock('@features/providers/infrastructure/github/github-app.provider', () => ({
    GithubAppProvider: class GithubAppProvider {},
}));

const imagesResult: PruneResult = { deletedCount: 3, spaceReclaimed: 1_048_576 };
const volumesResult: PruneResult = { deletedCount: 2, spaceReclaimed: 524_288 };
const containersResult: PruneResult = { deletedCount: 5, spaceReclaimed: 0 };
const emptyResult: PruneResult = { deletedCount: 0, spaceReclaimed: 0 };

describe('ServerController', () => {
    let service: jest.Mocked<Pick<ServerService, 'pruneImages' | 'pruneVolumes' | 'pruneContainers'>>;
    let sut: ServerController;

    beforeEach(async () => {
        service = {
            pruneImages: jest.fn(),
            pruneVolumes: jest.fn(),
            pruneContainers: jest.fn(),
        };

        const moduleRef = await Test.createTestingModule({
            controllers: [ServerController],
            providers: [{ provide: ServerService, useValue: service }],
        }).compile();

        sut = moduleRef.get(ServerController);

        // Silence the error logged when a prune failure is wrapped into a 503.
        jest.spyOn(sut['logger'], 'error').mockImplementation(() => undefined);
    });

    describe('pruneImages', () => {
        it('delegates to the service prune images action', async () => {
            service.pruneImages.mockResolvedValue(imagesResult);

            await sut.pruneImages();

            expect(service.pruneImages).toHaveBeenCalledTimes(1);
        });

        it('returns the prune result produced by the service', async () => {
            service.pruneImages.mockResolvedValue(imagesResult);

            const result = await sut.pruneImages();

            expect(result).toBe(imagesResult);
        });

        it('returns a zeroed result when nothing was reclaimed', async () => {
            service.pruneImages.mockResolvedValue(emptyResult);

            const result = await sut.pruneImages();

            expect(result).toEqual({ deletedCount: 0, spaceReclaimed: 0 });
        });

        it('never touches the other prune actions', async () => {
            service.pruneImages.mockResolvedValue(imagesResult);

            await sut.pruneImages();

            expect(service.pruneVolumes).not.toHaveBeenCalled();
            expect(service.pruneContainers).not.toHaveBeenCalled();
        });

        it('rethrows a ServiceUnavailableException raised by the service unchanged', async () => {
            const original = new ServiceUnavailableException('daemon down');
            service.pruneImages.mockRejectedValue(original);

            await expect(sut.pruneImages()).rejects.toBe(original);
        });

        it('wraps an unexpected error into a ServiceUnavailableException', async () => {
            service.pruneImages.mockRejectedValue(new Error('ECONNREFUSED'));

            await expect(sut.pruneImages()).rejects.toBeInstanceOf(ServiceUnavailableException);
        });

        it('names the images resource in the wrapped error message', async () => {
            service.pruneImages.mockRejectedValue(new Error('ECONNREFUSED'));

            await expect(sut.pruneImages()).rejects.toThrow(/Could not prune images/);
        });

        it('includes remediation guidance in the wrapped error message', async () => {
            service.pruneImages.mockRejectedValue(new Error('ECONNREFUSED'));

            await expect(sut.pruneImages()).rejects.toThrow(/emulated VPS/);
        });

        it('wraps non-Error rejection values into a ServiceUnavailableException', async () => {
            service.pruneImages.mockRejectedValue('boom');

            await expect(sut.pruneImages()).rejects.toBeInstanceOf(ServiceUnavailableException);
        });
    });

    describe('pruneVolumes', () => {
        it('delegates to the service prune volumes action', async () => {
            service.pruneVolumes.mockResolvedValue(volumesResult);

            await sut.pruneVolumes();

            expect(service.pruneVolumes).toHaveBeenCalledTimes(1);
        });

        it('returns the prune result produced by the service', async () => {
            service.pruneVolumes.mockResolvedValue(volumesResult);

            const result = await sut.pruneVolumes();

            expect(result).toBe(volumesResult);
        });

        it('returns a zeroed result when nothing was reclaimed', async () => {
            service.pruneVolumes.mockResolvedValue(emptyResult);

            const result = await sut.pruneVolumes();

            expect(result).toEqual({ deletedCount: 0, spaceReclaimed: 0 });
        });

        it('never touches the other prune actions', async () => {
            service.pruneVolumes.mockResolvedValue(volumesResult);

            await sut.pruneVolumes();

            expect(service.pruneImages).not.toHaveBeenCalled();
            expect(service.pruneContainers).not.toHaveBeenCalled();
        });

        it('rethrows a ServiceUnavailableException raised by the service unchanged', async () => {
            const original = new ServiceUnavailableException('daemon down');
            service.pruneVolumes.mockRejectedValue(original);

            await expect(sut.pruneVolumes()).rejects.toBe(original);
        });

        it('wraps an unexpected error into a ServiceUnavailableException', async () => {
            service.pruneVolumes.mockRejectedValue(new Error('ECONNREFUSED'));

            await expect(sut.pruneVolumes()).rejects.toBeInstanceOf(ServiceUnavailableException);
        });

        it('names the volumes resource in the wrapped error message', async () => {
            service.pruneVolumes.mockRejectedValue(new Error('ECONNREFUSED'));

            await expect(sut.pruneVolumes()).rejects.toThrow(/Could not prune volumes/);
        });

        it('wraps non-Error rejection values into a ServiceUnavailableException', async () => {
            service.pruneVolumes.mockRejectedValue('boom');

            await expect(sut.pruneVolumes()).rejects.toBeInstanceOf(ServiceUnavailableException);
        });
    });

    describe('pruneContainers', () => {
        it('delegates to the service prune containers action', async () => {
            service.pruneContainers.mockResolvedValue(containersResult);

            await sut.pruneContainers();

            expect(service.pruneContainers).toHaveBeenCalledTimes(1);
        });

        it('returns the prune result produced by the service', async () => {
            service.pruneContainers.mockResolvedValue(containersResult);

            const result = await sut.pruneContainers();

            expect(result).toBe(containersResult);
        });

        it('returns a zeroed result when nothing was reclaimed', async () => {
            service.pruneContainers.mockResolvedValue(emptyResult);

            const result = await sut.pruneContainers();

            expect(result).toEqual({ deletedCount: 0, spaceReclaimed: 0 });
        });

        it('never touches the other prune actions', async () => {
            service.pruneContainers.mockResolvedValue(containersResult);

            await sut.pruneContainers();

            expect(service.pruneImages).not.toHaveBeenCalled();
            expect(service.pruneVolumes).not.toHaveBeenCalled();
        });

        it('rethrows a ServiceUnavailableException raised by the service unchanged', async () => {
            const original = new ServiceUnavailableException('daemon down');
            service.pruneContainers.mockRejectedValue(original);

            await expect(sut.pruneContainers()).rejects.toBe(original);
        });

        it('wraps an unexpected error into a ServiceUnavailableException', async () => {
            service.pruneContainers.mockRejectedValue(new Error('ECONNREFUSED'));

            await expect(sut.pruneContainers()).rejects.toBeInstanceOf(ServiceUnavailableException);
        });

        it('names the containers resource in the wrapped error message', async () => {
            service.pruneContainers.mockRejectedValue(new Error('ECONNREFUSED'));

            await expect(sut.pruneContainers()).rejects.toThrow(/Could not prune containers/);
        });

        it('wraps non-Error rejection values into a ServiceUnavailableException', async () => {
            service.pruneContainers.mockRejectedValue('boom');

            await expect(sut.pruneContainers()).rejects.toBeInstanceOf(ServiceUnavailableException);
        });
    });
});
