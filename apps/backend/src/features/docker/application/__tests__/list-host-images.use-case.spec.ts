import { listHostImagesUseCase } from '../list-host-images.use-case';

import type { RuntimeImageSummary } from '@core/domain/models/container-runtime.models';
import { ContainerRuntime } from '@core/domain/ports/container-runtime.port';

/** Builds a summary of an image of the host, overriding only the fields under test. */
const imageSummary = (overrides: Partial<RuntimeImageSummary> = {}): RuntimeImageSummary => ({
    id: 'sha256:1111',
    tags: ['nginx:latest'],
    size: 142_000_000,
    createdAt: new Date('2026-07-11T00:00:00.000Z'),
    ...overrides,
});

describe('listHostImagesUseCase', () => {
    let mockContainerRuntime: jest.Mocked<Pick<ContainerRuntime, 'listImages'>>;

    beforeEach(() => {
        jest.clearAllMocks();
        mockContainerRuntime = { listImages: jest.fn() };
    });

    it('asks the runtime for the images of the whole host', async () => {
        mockContainerRuntime.listImages.mockResolvedValue([]);

        await listHostImagesUseCase(mockContainerRuntime as unknown as ContainerRuntime);

        expect(mockContainerRuntime.listImages).toHaveBeenCalledTimes(1);
        expect(mockContainerRuntime.listImages).toHaveBeenCalledWith({ host: true });
    });

    it('returns the images the runtime reported', async () => {
        const images = [imageSummary()];
        mockContainerRuntime.listImages.mockResolvedValue(images);

        const result = await listHostImagesUseCase(mockContainerRuntime as unknown as ContainerRuntime);

        expect(result).toBe(images);
    });

    it('returns an empty list when the host holds no image', async () => {
        mockContainerRuntime.listImages.mockResolvedValue([]);

        const result = await listHostImagesUseCase(mockContainerRuntime as unknown as ContainerRuntime);

        expect(result).toEqual([]);
    });

    it('propagates the failure of the runtime', async () => {
        const error = new Error('daemon unreachable');
        mockContainerRuntime.listImages.mockRejectedValue(error);

        await expect(listHostImagesUseCase(mockContainerRuntime as unknown as ContainerRuntime)).rejects.toThrow(error);
    });
});
