import type {
    ErrorEnvelope,
    OrphanRemovalResult,
    PlatformSettings,
    PlatformUpdateStatus,
    PruneResult,
    ReadinessResult,
} from '@gitpaas/contracts';
import { updatePlatformSettingsSchema } from '@gitpaas/contracts';
import {
    ArgumentsHost,
    BadRequestException,
    ConflictException,
    ExecutionContext,
    ForbiddenException,
    ServiceUnavailableException,
} from '@nestjs/common';
import { HttpAdapterHost, Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';

import {
    DaemonUnreachableError,
    InvalidLogRetentionError,
    PlatformUpToDateError,
    UnknownPlatformVersionError,
    UpdateAlreadyRunningError,
} from '../../../domain/errors/server.errors';
import { ServerService } from '../../services/server.service';
import { ServerController } from '../server.controller';

import { ContainerRuntimeInfo } from '@core/domain/models/container-runtime.models';
import { AllExceptionsFilter } from '@core/ui/filters/all-exceptions.filter';
import { ZodValidationPipe } from '@core/ui/pipes/zod-validation.pipe';
import { ROLES_KEY } from '@features/authentication/ui/decorators/roles.decorator';
import { RolesGuard } from '@features/authentication/ui/guards/roles.guard';
import { User, UserRole } from '@features/users/domain/models/user.models';

const runtimeInfo: ContainerRuntimeInfo = {
    serverVersion: '27.1.1',
    operatingSystem: 'Ubuntu 24.04',
    containers: 4,
    images: 12,
};
const imagesResult: PruneResult = { deletedCount: 3, spaceReclaimed: 1_048_576 };
const volumesResult: PruneResult = { deletedCount: 2, spaceReclaimed: 524_288 };
const containersResult: PruneResult = { deletedCount: 5, spaceReclaimed: 0 };
const emptyResult: PruneResult = { deletedCount: 0, spaceReclaimed: 0 };
const orphanResult: OrphanRemovalResult = { removed: 2, names: ['stale-app-1', 'ghost-app-1'] };
const platformSettings: PlatformSettings = { logRetentionDays: 45 };
const updateStatus: PlatformUpdateStatus = {
    installedVersion: '2.1.0',
    latestVersion: '2.2.0',
    update: {
        id: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
        targetVersion: 'v2.2.0',
        step: 'starting',
        percent: 0,
        state: 'running',
        error: null,
        startedAt: '2026-08-28T10:00:00.000Z',
    },
};
const readyResult: ReadinessResult = {
    status: 'ok',
    dependencies: [
        { name: 'postgres', status: 'up' },
        { name: 'docker', status: 'up' },
    ],
};
const notReadyResult: ReadinessResult = {
    status: 'error',
    dependencies: [
        { name: 'postgres', status: 'up' },
        { name: 'docker', status: 'down' },
    ],
};

/**
 * Runs the thrown value through the global exception filter, so the specs assert the
 * envelope the client actually receives and not only the shape of the exception.
 */
const envelopeOf = (exception: unknown): ErrorEnvelope => {
    const mockReply = jest.fn();
    const httpAdapter = {
        getRequestUrl: jest.fn().mockReturnValue('/api/v1/server/status'),
        reply: mockReply,
    };
    const host = {
        switchToHttp: jest.fn().mockReturnValue({
            getRequest: jest.fn().mockReturnValue({ url: '/api/v1/server/status', headers: {} }),
            getResponse: jest.fn().mockReturnValue({}),
        }),
    } as unknown as ArgumentsHost;

    new AllExceptionsFilter({ httpAdapter } as unknown as HttpAdapterHost).catch(exception, host);

    return mockReply.mock.calls[0][1] as ErrorEnvelope;
};

describe('ServerController', () => {
    let mockServerService: jest.Mocked<
        Pick<
            ServerService,
            | 'pruneImages'
            | 'pruneVolumes'
            | 'pruneContainers'
            | 'removeOrphanedContainers'
            | 'checkReadiness'
            | 'getStatus'
            | 'getSettings'
            | 'updateSettings'
            | 'getUpdate'
            | 'startUpdate'
        >
    >;
    let sut: ServerController;

    beforeEach(async () => {
        jest.clearAllMocks();

        mockServerService = {
            pruneImages: jest.fn(),
            pruneVolumes: jest.fn(),
            pruneContainers: jest.fn(),
            removeOrphanedContainers: jest.fn(),
            checkReadiness: jest.fn(),
            getStatus: jest.fn(),
            getSettings: jest.fn(),
            updateSettings: jest.fn(),
            getUpdate: jest.fn(),
            startUpdate: jest.fn(),
        };

        const moduleRef = await Test.createTestingModule({
            controllers: [ServerController],
            providers: [{ provide: ServerService, useValue: mockServerService }],
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

    describe('getStatus', () => {
        it('delegates to the service to fetch the daemon info', async () => {
            mockServerService.getStatus.mockResolvedValue(runtimeInfo);

            await sut.getStatus();

            expect(mockServerService.getStatus).toHaveBeenCalledTimes(1);
        });

        it('maps the daemon info into a connected status payload', async () => {
            mockServerService.getStatus.mockResolvedValue(runtimeInfo);

            const result = await sut.getStatus();

            expect(result).toEqual({
                connected: true,
                serverVersion: runtimeInfo.serverVersion,
                operatingSystem: runtimeInfo.operatingSystem,
                containers: runtimeInfo.containers,
                images: runtimeInfo.images,
            });
        });

        it('reflects zeroed counts and empty strings from the daemon info', async () => {
            mockServerService.getStatus.mockResolvedValue({
                serverVersion: '',
                operatingSystem: '',
                containers: 0,
                images: 0,
            });

            const result = await sut.getStatus();

            expect(result).toEqual({
                connected: true,
                serverVersion: '',
                operatingSystem: '',
                containers: 0,
                images: 0,
            });
        });

        it('rethrows a ServiceUnavailableException raised by the service unchanged', async () => {
            const original = new ServiceUnavailableException('daemon down');
            mockServerService.getStatus.mockRejectedValue(original);

            await expect(sut.getStatus()).rejects.toBe(original);
        });

        it('rethrows any other HttpException raised by the service unchanged', async () => {
            const original = new ForbiddenException('nope');
            mockServerService.getStatus.mockRejectedValue(original);

            await expect(sut.getStatus()).rejects.toBe(original);
        });

        it('wraps an unexpected error into a ServiceUnavailableException', async () => {
            mockServerService.getStatus.mockRejectedValue(new Error('ECONNREFUSED'));

            await expect(sut.getStatus()).rejects.toBeInstanceOf(ServiceUnavailableException);
        });

        it('includes remediation guidance in the wrapped error message', async () => {
            mockServerService.getStatus.mockRejectedValue(new Error('ECONNREFUSED'));

            await expect(sut.getStatus()).rejects.toThrow(/Could not reach the server Docker daemon/);
        });

        it('wraps non-Error rejection values into a ServiceUnavailableException', async () => {
            mockServerService.getStatus.mockRejectedValue('boom');

            await expect(sut.getStatus()).rejects.toBeInstanceOf(ServiceUnavailableException);
        });

        it('chains a DaemonUnreachableError as the cause, which the global filter reads', async () => {
            mockServerService.getStatus.mockRejectedValue(new Error('ECONNREFUSED'));

            const error = await sut.getStatus().catch((caught: unknown) => caught);

            expect((error as Error).cause).toBeInstanceOf(DaemonUnreachableError);
        });

        it('keeps the original failure behind the domain error, which the global filter logs', async () => {
            const original = new Error('ECONNREFUSED');
            mockServerService.getStatus.mockRejectedValue(original);

            const error = await sut.getStatus().catch((caught: unknown) => caught);

            expect(((error as Error).cause as Error).cause).toBe(original);
        });

        it('publishes the DAEMON_UNREACHABLE code in the envelope the client receives', async () => {
            mockServerService.getStatus.mockRejectedValue(new Error('ECONNREFUSED'));

            const error = await sut.getStatus().catch((caught: unknown) => caught);

            expect(envelopeOf(error).code).toBe('DAEMON_UNREACHABLE');
        });

        it('keeps the remediation message of the endpoint in that envelope', async () => {
            mockServerService.getStatus.mockRejectedValue(new Error('ECONNREFUSED'));

            const error = await sut.getStatus().catch((caught: unknown) => caught);

            expect(envelopeOf(error).message).toBe(
                'Could not reach the server Docker daemon. Verify the server is running and reachable.',
            );
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

        it('rethrows any other HttpException raised by the service unchanged', async () => {
            const original = new ForbiddenException('nope');
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

            await expect(sut.pruneImages()).rejects.toThrow(
                /Verify the server is running and reachable/,
            );
        });

        it('wraps non-Error rejection values into a ServiceUnavailableException', async () => {
            mockServerService.pruneImages.mockRejectedValue('boom');

            await expect(sut.pruneImages()).rejects.toBeInstanceOf(ServiceUnavailableException);
        });

        it('chains a DaemonUnreachableError as the cause, so the envelope carries its code', async () => {
            mockServerService.pruneImages.mockRejectedValue(new Error('ECONNREFUSED'));

            const error = await sut.pruneImages().catch((caught: unknown) => caught);

            expect(envelopeOf(error).code).toBe('DAEMON_UNREACHABLE');
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

            await expect(sut.removeOrphanedContainers()).rejects.toThrow(
                /Verify the server is running and reachable/,
            );
        });

        it('wraps non-Error rejection values into a ServiceUnavailableException', async () => {
            mockServerService.removeOrphanedContainers.mockRejectedValue('boom');

            await expect(sut.removeOrphanedContainers()).rejects.toBeInstanceOf(ServiceUnavailableException);
        });
    });

    describe('getSettings', () => {
        it('delegates the read of the parameters to the service', async () => {
            mockServerService.getSettings.mockResolvedValue(platformSettings);

            const result = await sut.getSettings();

            expect(mockServerService.getSettings).toHaveBeenCalledTimes(1);
            expect(result).toBe(platformSettings);
        });

        it('propagates an unexpected failure of the read untranslated', async () => {
            const original = new Error('connection terminated');
            mockServerService.getSettings.mockRejectedValue(original);

            await expect(sut.getSettings()).rejects.toBe(original);
        });
    });

    describe('updateSettings', () => {
        it('delegates the write of the parameters to the service with the body', async () => {
            mockServerService.updateSettings.mockResolvedValue(platformSettings);

            const result = await sut.updateSettings({ logRetentionDays: 45 });

            expect(mockServerService.updateSettings).toHaveBeenCalledTimes(1);
            expect(mockServerService.updateSettings).toHaveBeenCalledWith({ logRetentionDays: 45 });
            expect(result).toBe(platformSettings);
        });

        it('translates an age outside the limits into a BadRequestException', async () => {
            mockServerService.updateSettings.mockRejectedValue(new InvalidLogRetentionError());

            await expect(sut.updateSettings({ logRetentionDays: 0 })).rejects.toBeInstanceOf(BadRequestException);
        });

        it('answers 400 in the envelope the client receives for an age outside the limits', async () => {
            mockServerService.updateSettings.mockRejectedValue(new InvalidLogRetentionError());

            const rejection = await sut.updateSettings({ logRetentionDays: 400 }).catch((error: unknown) => error);

            expect(envelopeOf(rejection).statusCode).toBe(400);
        });
    });

    describe('the validation of the body of the write', () => {
        /** Runs the body of the write through the pipe the controller binds to it. */
        const validate = (body: unknown): unknown =>
            new ZodValidationPipe(updatePlatformSettingsSchema).transform(body);

        it('accepts an age inside the limits', () => {
            expect(validate({ logRetentionDays: 30 })).toEqual({ logRetentionDays: 30 });
        });

        it('rejects an age below one day with a BadRequestException', () => {
            expect(() => validate({ logRetentionDays: 0 })).toThrow(BadRequestException);
        });

        it('rejects an age above 365 days with a BadRequestException', () => {
            expect(() => validate({ logRetentionDays: 366 })).toThrow(BadRequestException);
        });

        it('rejects an age that is no whole number with a BadRequestException', () => {
            expect(() => validate({ logRetentionDays: 7.5 })).toThrow(BadRequestException);
        });

        it('accepts a body that carries no host of the control plane', () => {
            expect(validate({ logRetentionDays: 30 })).toEqual({ logRetentionDays: 30 });
        });

        it('accepts a host of the control plane that follows the rule of a host name', () => {
            expect(validate({ logRetentionDays: 30, gitpaasDomain: 'gitpaas.example.com' })).toEqual({
                logRetentionDays: 30,
                gitpaasDomain: 'gitpaas.example.com',
            });
        });

        it('brings the host of the control plane down to small letters', () => {
            expect(validate({ logRetentionDays: 30, gitpaasDomain: 'GitPaaS.Example.COM' })).toEqual({
                logRetentionDays: 30,
                gitpaasDomain: 'gitpaas.example.com',
            });
        });

        it('rejects a host of a single label with a BadRequestException', () => {
            expect(() => validate({ logRetentionDays: 30, gitpaasDomain: 'localhost' }))
                .toThrow(BadRequestException);
        });

        it('rejects a host that carries a character the rule refuses with a BadRequestException', () => {
            expect(() => validate({ logRetentionDays: 30, gitpaasDomain: 'git paas.example.com' }))
                .toThrow(BadRequestException);
        });
    });

    describe('getUpdate', () => {
        it('delegates the read of the state of the update to the service', async () => {
            mockServerService.getUpdate.mockResolvedValue(updateStatus);

            const result = await sut.getUpdate();

            expect(mockServerService.getUpdate).toHaveBeenCalledTimes(1);
            expect(result).toBe(updateStatus);
        });

        it('answers the installed version and no update while the platform ran none', async () => {
            mockServerService.getUpdate.mockResolvedValue({
                installedVersion: '2.1.0',
                latestVersion: null,
                update: null,
            });

            const result = await sut.getUpdate();

            expect(result).toEqual({ installedVersion: '2.1.0', latestVersion: null, update: null });
        });

        it('propagates a failure with no translation', async () => {
            const error = new Error('connection terminated');
            mockServerService.getUpdate.mockRejectedValue(error);

            await expect(sut.getUpdate()).rejects.toBe(error);
        });
    });

    describe('startUpdate', () => {
        it('delegates the start of the update to the service', async () => {
            mockServerService.startUpdate.mockResolvedValue(updateStatus);

            const result = await sut.startUpdate();

            expect(mockServerService.startUpdate).toHaveBeenCalledTimes(1);
            expect(result).toBe(updateStatus);
        });

        it('translates a second update into a ConflictException', async () => {
            mockServerService.startUpdate.mockRejectedValue(new UpdateAlreadyRunningError());

            await expect(sut.startUpdate()).rejects.toBeInstanceOf(ConflictException);
        });

        it('translates a platform that runs the latest release into a ConflictException', async () => {
            mockServerService.startUpdate.mockRejectedValue(new PlatformUpToDateError('2.2.0'));

            await expect(sut.startUpdate()).rejects.toBeInstanceOf(ConflictException);
        });

        it('translates an unknown version into a ConflictException', async () => {
            mockServerService.startUpdate.mockRejectedValue(new UnknownPlatformVersionError());

            await expect(sut.startUpdate()).rejects.toBeInstanceOf(ConflictException);
        });

        it('answers 409 in the envelope the client receives for a second update', async () => {
            mockServerService.startUpdate.mockRejectedValue(new UpdateAlreadyRunningError());

            const rejection = await sut.startUpdate().catch((error: unknown) => error);

            expect(envelopeOf(rejection).statusCode).toBe(409);
        });

        it('translates an unreachable daemon into a ServiceUnavailableException', async () => {
            mockServerService.startUpdate.mockRejectedValue(new Error('connect ENOENT /var/run/docker.sock'));

            await expect(sut.startUpdate()).rejects.toBeInstanceOf(ServiceUnavailableException);
        });
    });

    describe('the routes of the update', () => {
        /** Reads the roles the decorator of a handler of the controller declares. */
        const rolesOf = (handler: string): UserRole[] | undefined => new Reflector().get(
            ROLES_KEY,
            Object.getOwnPropertyDescriptor(ServerController.prototype, handler)?.value as () => void,
        );

        it('reserves the read of the state of the update to an administrator', () => {
            expect(rolesOf('getUpdate')).toEqual([UserRole.Admin]);
        });

        it('reserves the start of the update to an administrator', () => {
            expect(rolesOf('startUpdate')).toEqual([UserRole.Admin]);
        });

        it('reserves the write of the parameters of the deployment system to an administrator', () => {
            expect(rolesOf('updateSettings')).toEqual([UserRole.Admin]);
        });

        it('leaves the other routes of the server to every authenticated user', () => {
            expect(rolesOf('getStatus')).toBeUndefined();
            expect(rolesOf('getSettings')).toBeUndefined();
        });
    });

    describe('the guard of the routes of the settings', () => {
        /** Builds the guard the controller declares, with the reflector that reads its metadata. */
        const guard = (): RolesGuard => new RolesGuard(new Reflector());

        /** Builds an execution context for a handler of the controller, with the given role. */
        const contextFor = (handler: string, role?: UserRole): ExecutionContext =>
            ({
                getHandler: () => Object.getOwnPropertyDescriptor(ServerController.prototype, handler)?.value,
                getClass: () => ServerController,
                switchToHttp: () => ({
                    getRequest: () => ({ user: role ? ({ role } as User) : undefined }),
                }),
            }) as unknown as ExecutionContext;

        it('lets an administrator write the parameters of the deployment system', () => {
            expect(guard().canActivate(contextFor('updateSettings', UserRole.Admin))).toBe(true);
        });

        it('refuses the write of the parameters to a user who is no administrator', () => {
            expect(() => guard().canActivate(contextFor('updateSettings', UserRole.User)))
                .toThrow(ForbiddenException);
        });

        it('refuses the write of the parameters to a request that carries no user', () => {
            expect(() => guard().canActivate(contextFor('updateSettings'))).toThrow(ForbiddenException);
        });

        it('lets a user who is no administrator read the parameters of the deployment system', () => {
            expect(guard().canActivate(contextFor('getSettings', UserRole.User))).toBe(true);
        });
    });
});
