import type { CreateProjectNetworkDto, JoinProjectNetworkDto, UpdateProjectNetworkDto } from '@gitpaas/contracts';
import { ConflictException, NotFoundException, ParseUUIDPipe } from '@nestjs/common';
import { ROUTE_ARGS_METADATA } from '@nestjs/common/constants';
import { Test } from '@nestjs/testing';

import {
    ProjectNetworkInUseError,
    ProjectNetworkNotFoundError,
} from '../../../domain/errors/project-network.errors';
import { ProjectNetworkStatus } from '../../../domain/models/project-network.models';
import { ProjectNetworksService } from '../../services/project-networks.service';
import { ProjectNetworksController } from '../project-networks.controller';

import { getTelemetry, runWithTelemetry } from '@core/infrastructure/telemetry/telemetry.context';
import { ZodValidationPipe } from '@core/ui/pipes/zod-validation.pipe';

const projectId = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d';
const networkId = 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e';
const serviceId = 'c3d4e5f6-a7b8-4c9d-8e1f-2a3b4c5d6e7f';

const network: ProjectNetworkStatus = {
    id: networkId,
    projectId,
    name: 'private',
    daemonName: `gitpaas-${projectId}-${networkId}`,
    state: 'ready',
};

const response = {
    id: networkId,
    projectId,
    name: 'private',
    daemonName: `gitpaas-${projectId}-${networkId}`,
    state: 'ready',
};

/**
 * Shape of a single entry of the route-argument metadata NestJS stores per handler.
 */
interface RouteArgMetadata {
    index: number;
    data: unknown;
    pipes: unknown[];
}

/**
 * Reads the pipes the controller declares for one bound argument of a handler.
 */
const pipesFor = (handler: string, parameter?: string): unknown[] => {
    // eslint-disable-next-line operator-linebreak
    const metadata =
        (Reflect.getMetadata(ROUTE_ARGS_METADATA, ProjectNetworksController, handler) as Record<
            string,
            RouteArgMetadata
        >) ?? {};

    return Object.values(metadata).find((argument) => argument.data === parameter)?.pipes ?? [];
};

describe('ProjectNetworksController', () => {
    let mockProjectNetworksService: jest.Mocked<
        Pick<ProjectNetworksService, 'getByProject' | 'create' | 'rename' | 'remove' | 'join' | 'leave'>
    >;
    let sut: ProjectNetworksController;

    beforeEach(async () => {
        jest.clearAllMocks();

        mockProjectNetworksService = {
            getByProject: jest.fn(),
            create: jest.fn(),
            rename: jest.fn(),
            remove: jest.fn(),
            join: jest.fn(),
            leave: jest.fn(),
        };

        const moduleRef = await Test.createTestingModule({
            controllers: [ProjectNetworksController],
            providers: [{ provide: ProjectNetworksService, useValue: mockProjectNetworksService }],
        }).compile();

        sut = moduleRef.get(ProjectNetworksController);
    });

    describe('parameter validation', () => {
        it.each(['getByProject', 'create', 'rename', 'remove', 'join', 'leave'])(
            'validates the projectId path parameter of %s as a UUID',
            (handler) => {
                expect(pipesFor(handler, 'projectId')).toContain(ParseUUIDPipe);
            },
        );

        it.each(['rename', 'remove', 'join', 'leave'])(
            'validates the id path parameter of %s as a UUID',
            (handler) => {
                expect(pipesFor(handler, 'id')).toContain(ParseUUIDPipe);
            },
        );

        it('validates the serviceId path parameter of leave as a UUID', () => {
            expect(pipesFor('leave', 'serviceId')).toContain(ParseUUIDPipe);
        });

        it.each(['create', 'rename', 'join'])('validates the body of %s with a Zod pipe', (handler) => {
            expect(pipesFor(handler)).toEqual([expect.any(ZodValidationPipe)]);
        });

        it.each(['getByProject', 'remove', 'leave'])('never binds a body on %s', (handler) => {
            expect(pipesFor(handler)).toEqual([]);
        });
    });

    describe('getByProject', () => {
        it('delegates to the service with the received project id', async () => {
            mockProjectNetworksService.getByProject.mockResolvedValue([network]);

            await sut.getByProject(projectId);

            expect(mockProjectNetworksService.getByProject).toHaveBeenCalledTimes(1);
            expect(mockProjectNetworksService.getByProject).toHaveBeenCalledWith(projectId);
        });

        it('returns the networks of the wire', async () => {
            mockProjectNetworksService.getByProject.mockResolvedValue([network]);

            expect(await sut.getByProject(projectId)).toEqual([response]);
        });

        it('returns an empty list when the project holds no network', async () => {
            mockProjectNetworksService.getByProject.mockResolvedValue([]);

            expect(await sut.getByProject(projectId)).toEqual([]);
        });

        it('propagates an error that carries no translation', async () => {
            const error = new Error('daemon unreachable');
            mockProjectNetworksService.getByProject.mockRejectedValue(error);

            await expect(sut.getByProject(projectId)).rejects.toBe(error);
        });

        it('adds the project id to the telemetry', async () => {
            mockProjectNetworksService.getByProject.mockResolvedValue([]);

            const event = await runWithTelemetry({}, async () => {
                await sut.getByProject(projectId);

                return getTelemetry();
            });

            expect(event).toMatchObject({ 'project.id': projectId });
        });
    });

    describe('create', () => {
        const createDto: CreateProjectNetworkDto = { name: 'private' };

        it('delegates to the service with the project id and the body', async () => {
            mockProjectNetworksService.create.mockResolvedValue(network);

            await sut.create(projectId, createDto);

            expect(mockProjectNetworksService.create).toHaveBeenCalledTimes(1);
            expect(mockProjectNetworksService.create).toHaveBeenCalledWith(projectId, createDto);
        });

        it('returns the created network of the wire', async () => {
            mockProjectNetworksService.create.mockResolvedValue(network);

            expect(await sut.create(projectId, createDto)).toEqual(response);
        });

        it('turns an absent project into a not found', async () => {
            mockProjectNetworksService.create.mockRejectedValue(new ProjectNetworkNotFoundError(networkId));

            await expect(sut.create(projectId, createDto)).rejects.toBeInstanceOf(NotFoundException);
        });
    });

    describe('rename', () => {
        const updateDto: UpdateProjectNetworkDto = { name: 'backend' };

        it('delegates to the service with the project id, the network id and the body', async () => {
            mockProjectNetworksService.rename.mockResolvedValue(network);

            await sut.rename(projectId, networkId, updateDto);

            expect(mockProjectNetworksService.rename).toHaveBeenCalledWith(projectId, networkId, updateDto);
        });

        it('returns the renamed network of the wire', async () => {
            mockProjectNetworksService.rename.mockResolvedValue(network);

            expect(await sut.rename(projectId, networkId, updateDto)).toEqual(response);
        });

        it('turns an absent network into a not found', async () => {
            mockProjectNetworksService.rename.mockRejectedValue(new ProjectNetworkNotFoundError(networkId));

            await expect(sut.rename(projectId, networkId, updateDto)).rejects.toBeInstanceOf(NotFoundException);
        });
    });

    describe('remove', () => {
        it('delegates to the service and answers with no content', async () => {
            mockProjectNetworksService.remove.mockResolvedValue();

            await expect(sut.remove(projectId, networkId)).resolves.toBeUndefined();

            expect(mockProjectNetworksService.remove).toHaveBeenCalledWith(projectId, networkId);
        });

        it('turns a network that a container holds into a conflict', async () => {
            mockProjectNetworksService.remove.mockRejectedValue(new ProjectNetworkInUseError('private'));

            await expect(sut.remove(projectId, networkId)).rejects.toBeInstanceOf(ConflictException);
        });

        it('carries the message of the domain error into the conflict', async () => {
            mockProjectNetworksService.remove.mockRejectedValue(new ProjectNetworkInUseError('private'));

            await expect(sut.remove(projectId, networkId))
                .rejects.toThrow('Network private is still held by a container');
        });

        it('turns an absent network into a not found', async () => {
            mockProjectNetworksService.remove.mockRejectedValue(new ProjectNetworkNotFoundError(networkId));

            await expect(sut.remove(projectId, networkId)).rejects.toBeInstanceOf(NotFoundException);
        });
    });

    describe('join', () => {
        const joinDto: JoinProjectNetworkDto = { serviceId };

        it('delegates to the service and answers with no content', async () => {
            mockProjectNetworksService.join.mockResolvedValue();

            await expect(sut.join(projectId, networkId, joinDto)).resolves.toBeUndefined();

            expect(mockProjectNetworksService.join).toHaveBeenCalledWith(projectId, networkId, joinDto);
        });

        it('adds the project and the service to the telemetry', async () => {
            mockProjectNetworksService.join.mockResolvedValue();

            const event = await runWithTelemetry({}, async () => {
                await sut.join(projectId, networkId, joinDto);

                return getTelemetry();
            });

            expect(event).toMatchObject({ 'project.id': projectId, 'service.id': serviceId });
        });
    });

    describe('leave', () => {
        it('delegates to the service and answers with no content', async () => {
            mockProjectNetworksService.leave.mockResolvedValue();

            await expect(sut.leave(projectId, networkId, serviceId)).resolves.toBeUndefined();

            expect(mockProjectNetworksService.leave).toHaveBeenCalledWith(projectId, networkId, serviceId);
        });

        it('turns an absent network into a not found', async () => {
            mockProjectNetworksService.leave.mockRejectedValue(new ProjectNetworkNotFoundError(networkId));

            await expect(sut.leave(projectId, networkId, serviceId)).rejects.toBeInstanceOf(NotFoundException);
        });
    });
});
