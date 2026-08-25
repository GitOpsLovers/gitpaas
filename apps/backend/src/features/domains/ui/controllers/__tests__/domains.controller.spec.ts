import type { ClaimDomainDto, UpdateDomainDto } from '@gitpaas/contracts';
import { ConflictException, NotFoundException, ParseUUIDPipe } from '@nestjs/common';
import { ROUTE_ARGS_METADATA } from '@nestjs/common/constants';
import { Test } from '@nestjs/testing';

import { DomainNotFoundError, DomainTakenError } from '../../../domain/errors/domain.errors';
import { Domain } from '../../../domain/models/domain.models';
import { DomainsService } from '../../services/domains.service';
import { DomainsController } from '../domains.controller';

import { getTelemetry, runWithTelemetry } from '@core/infrastructure/telemetry/telemetry.context';
import { ZodValidationPipe } from '@core/ui/pipes/zod-validation.pipe';

const serviceId = 'f4f8c2a0-6d3b-4d0a-9b6e-2c1d5e8a7b90';
const domainId = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d';

const domain: Domain = {
    id: domainId,
    serviceId,
    host: 'app.example.com',
    targetService: 'web',
    port: 8080,
    https: true,
    certificateState: 'ready',
    certificateError: null,
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
 *
 * The pipes themselves are framework mechanics that the unit specs never run, so
 * this reads the declaration instead: dropping a pipe would let an unchecked
 * value reach the service, and must fail a test.
 */
const pipesFor = (handler: string, parameter?: string): unknown[] => {
    // eslint-disable-next-line operator-linebreak
    const metadata =
        (Reflect.getMetadata(ROUTE_ARGS_METADATA, DomainsController, handler) as Record<
            string,
            RouteArgMetadata
        >) ?? {};

    return Object.values(metadata).find((argument) => argument.data === parameter)?.pipes ?? [];
};

describe('DomainsController', () => {
    let mockDomainsService: jest.Mocked<
        Pick<DomainsService, 'getByService' | 'claim' | 'update' | 'remove'>
    >;
    let sut: DomainsController;

    beforeEach(async () => {
        jest.clearAllMocks();

        mockDomainsService = {
            getByService: jest.fn(),
            claim: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
        };

        const moduleRef = await Test.createTestingModule({
            controllers: [DomainsController],
            providers: [{ provide: DomainsService, useValue: mockDomainsService }],
        }).compile();

        sut = moduleRef.get(DomainsController);
    });

    describe('parameter validation', () => {
        it.each(['getByService', 'claim', 'update', 'remove'])(
            'validates the serviceId path parameter of %s as a UUID',
            (handler) => {
                expect(pipesFor(handler, 'serviceId')).toContain(ParseUUIDPipe);
            },
        );

        it.each(['update', 'remove'])('validates the id path parameter of %s as a UUID', (handler) => {
            expect(pipesFor(handler, 'id')).toContain(ParseUUIDPipe);
        });

        it.each(['claim', 'update'])('validates the body of %s with a Zod pipe', (handler) => {
            expect(pipesFor(handler)).toEqual([expect.any(ZodValidationPipe)]);
        });

        it.each(['getByService', 'remove'])('never binds a body on %s', (handler) => {
            expect(pipesFor(handler)).toEqual([]);
        });
    });

    describe('getByService', () => {
        it('delegates to the service with the received service id', async () => {
            mockDomainsService.getByService.mockResolvedValue([domain]);

            await sut.getByService(serviceId);

            expect(mockDomainsService.getByService).toHaveBeenCalledTimes(1);
            expect(mockDomainsService.getByService).toHaveBeenCalledWith(serviceId);
        });

        it('returns the domains produced by the service', async () => {
            mockDomainsService.getByService.mockResolvedValue([domain]);

            expect(await sut.getByService(serviceId)).toEqual([domain]);
        });

        it('returns an empty list when the service holds no domain', async () => {
            mockDomainsService.getByService.mockResolvedValue([]);

            expect(await sut.getByService(serviceId)).toEqual([]);
        });

        it('propagates an error that carries no translation', async () => {
            const error = new Error('db unreachable');
            mockDomainsService.getByService.mockRejectedValue(error);

            await expect(sut.getByService(serviceId)).rejects.toBe(error);
        });

        it('adds the service id to the telemetry', async () => {
            mockDomainsService.getByService.mockResolvedValue([]);

            const event = await runWithTelemetry({}, async () => {
                await sut.getByService(serviceId);

                return getTelemetry();
            });

            expect(event).toMatchObject({ 'service.id': serviceId });
        });
    });

    describe('claim', () => {
        const claimDto: ClaimDomainDto = {
            host: 'app.example.com',
            targetService: 'web',
            port: 8080,
            https: true,
        };

        it('delegates to the service with the service id and the body', async () => {
            mockDomainsService.claim.mockResolvedValue(domain);

            await sut.claim(serviceId, claimDto);

            expect(mockDomainsService.claim).toHaveBeenCalledTimes(1);
            expect(mockDomainsService.claim).toHaveBeenCalledWith(serviceId, claimDto);
        });

        it('returns the domain produced by the service', async () => {
            mockDomainsService.claim.mockResolvedValue(domain);

            expect(await sut.claim(serviceId, claimDto)).toBe(domain);
        });

        it('turns a claimed host into a conflict', async () => {
            mockDomainsService.claim.mockRejectedValue(new DomainTakenError('app.example.com'));

            await expect(sut.claim(serviceId, claimDto)).rejects.toBeInstanceOf(ConflictException);
        });

        it('carries the message of the domain error into the conflict', async () => {
            mockDomainsService.claim.mockRejectedValue(new DomainTakenError('app.example.com'));

            await expect(sut.claim(serviceId, claimDto))
                .rejects.toThrow('Domain app.example.com is already claimed');
        });

        it('propagates an error that carries no translation', async () => {
            const error = new Error('db unreachable');
            mockDomainsService.claim.mockRejectedValue(error);

            await expect(sut.claim(serviceId, claimDto)).rejects.toBe(error);
        });

        it('adds the service id to the telemetry', async () => {
            mockDomainsService.claim.mockResolvedValue(domain);

            const event = await runWithTelemetry({}, async () => {
                await sut.claim(serviceId, claimDto);

                return getTelemetry();
            });

            expect(event).toMatchObject({ 'service.id': serviceId });
        });
    });

    describe('update', () => {
        const updateDto: UpdateDomainDto = { port: 9090 };

        it('delegates to the service with both ids and the body', async () => {
            mockDomainsService.update.mockResolvedValue(domain);

            await sut.update(serviceId, domainId, updateDto);

            expect(mockDomainsService.update).toHaveBeenCalledTimes(1);
            expect(mockDomainsService.update).toHaveBeenCalledWith(serviceId, domainId, updateDto);
        });

        it('returns the domain produced by the service', async () => {
            mockDomainsService.update.mockResolvedValue(domain);

            expect(await sut.update(serviceId, domainId, updateDto)).toBe(domain);
        });

        it('turns an unknown domain into a not found', async () => {
            mockDomainsService.update.mockRejectedValue(new DomainNotFoundError(domainId));

            await expect(sut.update(serviceId, domainId, updateDto))
                .rejects.toBeInstanceOf(NotFoundException);
        });

        it('turns a claimed host into a conflict', async () => {
            mockDomainsService.update.mockRejectedValue(new DomainTakenError('api.example.com'));

            await expect(sut.update(serviceId, domainId, { host: 'api.example.com' }))
                .rejects.toBeInstanceOf(ConflictException);
        });

        it('propagates an error that carries no translation', async () => {
            const error = new Error('db unreachable');
            mockDomainsService.update.mockRejectedValue(error);

            await expect(sut.update(serviceId, domainId, updateDto)).rejects.toBe(error);
        });
    });

    describe('remove', () => {
        it('delegates to the service with both ids', async () => {
            mockDomainsService.remove.mockResolvedValue();

            await sut.remove(serviceId, domainId);

            expect(mockDomainsService.remove).toHaveBeenCalledTimes(1);
            expect(mockDomainsService.remove).toHaveBeenCalledWith(serviceId, domainId);
        });

        it('answers with no body', async () => {
            mockDomainsService.remove.mockResolvedValue();

            await expect(sut.remove(serviceId, domainId)).resolves.toBeUndefined();
        });

        it('turns an unknown domain into a not found', async () => {
            mockDomainsService.remove.mockRejectedValue(new DomainNotFoundError(domainId));

            await expect(sut.remove(serviceId, domainId)).rejects.toBeInstanceOf(NotFoundException);
        });

        it('carries the message of the domain error into the not found', async () => {
            mockDomainsService.remove.mockRejectedValue(new DomainNotFoundError(domainId));

            await expect(sut.remove(serviceId, domainId))
                .rejects.toThrow(`Domain ${domainId} not found`);
        });

        it('propagates an error that carries no translation', async () => {
            const error = new Error('db unreachable');
            mockDomainsService.remove.mockRejectedValue(error);

            await expect(sut.remove(serviceId, domainId)).rejects.toBe(error);
        });
    });
});
