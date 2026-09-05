import type { RuntimeLogLine, RuntimeLogsQuery } from '@gitpaas/contracts';
import { ForbiddenException, ServiceUnavailableException } from '@nestjs/common';
import { ROUTE_ARGS_METADATA } from '@nestjs/common/constants';
import { Test } from '@nestjs/testing';
import { EMPTY, firstValueFrom, of, toArray } from 'rxjs';

import { RuntimeLogStreamGuard } from '../../guards/runtime-log-stream.guard';
import { RuntimeLogsService } from '../../services/runtime-logs.service';
import { RuntimeLogsController } from '../runtime-logs.controller';

import { DaemonUnreachableError } from '@core/domain/errors/container-runtime.errors';
import { getTelemetry, runWithTelemetry } from '@core/infrastructure/telemetry/telemetry.context';
import { ZodValidationPipe } from '@core/ui/pipes/zod-validation.pipe';

const containerId = 'a1b2c3d4e5f6';

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
        (Reflect.getMetadata(ROUTE_ARGS_METADATA, RuntimeLogsController, handler) as Record<
            string,
            RouteArgMetadata
        >) ?? {};

    return Object.values(metadata).find((argument) => argument.data === parameter)?.pipes ?? [];
};

/** Builds one line of the output of a container, overriding only the fields under test. */
const logLine = (overrides: Partial<RuntimeLogLine> = {}): RuntimeLogLine => ({
    timestamp: '2026-01-01T00:00:00.000Z',
    source: 'stdout',
    text: 'listening on 8080',
    ...overrides,
});

/** Builds the query of the history, overriding only the fields under test. */
const query = (overrides: Partial<RuntimeLogsQuery> = {}): RuntimeLogsQuery => ({ containerId, ...overrides });

describe('RuntimeLogsController', () => {
    let mockRuntimeLogsService: jest.Mocked<Pick<RuntimeLogsService, 'getByContainer' | 'streamByContainer'>>;
    let sut: RuntimeLogsController;

    beforeEach(async () => {
        jest.clearAllMocks();

        mockRuntimeLogsService = {
            getByContainer: jest.fn(),
            streamByContainer: jest.fn(),
        };

        const moduleRef = await Test.createTestingModule({
            controllers: [RuntimeLogsController],
            providers: [{ provide: RuntimeLogsService, useValue: mockRuntimeLogsService }],
        })
            .overrideGuard(RuntimeLogStreamGuard)
            .useValue({ canActivate: (): boolean => true })
            .compile();

        sut = moduleRef.get(RuntimeLogsController);
    });

    describe('parameter validation', () => {
        it('validates the whole query of the history against the schema of the contract', () => {
            const [pipe] = pipesFor('getByContainer');

            expect(pipe).toBeInstanceOf(ZodValidationPipe);
        });

        it('validates the containerId of the stream against the schema of the contract', () => {
            const [pipe] = pipesFor('streamByContainer', 'containerId');

            expect(pipe).toBeInstanceOf(ZodValidationPipe);
        });
    });

    describe('getByContainer', () => {
        it('delegates to the service with the container and the bounds of the read', async () => {
            mockRuntimeLogsService.getByContainer.mockResolvedValue([]);

            await sut.getByContainer(query({ tail: 100, since: '2026-01-01T00:00:00.000Z' }));

            expect(mockRuntimeLogsService.getByContainer).toHaveBeenCalledTimes(1);
            expect(mockRuntimeLogsService.getByContainer).toHaveBeenCalledWith(containerId, {
                tail: 100,
                since: new Date('2026-01-01T00:00:00.000Z'),
            });
        });

        it('asks for no bound when the query carries neither the tail nor the start', async () => {
            mockRuntimeLogsService.getByContainer.mockResolvedValue([]);

            await sut.getByContainer(query());

            expect(mockRuntimeLogsService.getByContainer).toHaveBeenCalledWith(containerId, {
                tail: undefined,
                since: undefined,
            });
        });

        it('returns the lines of the output the service gives', async () => {
            const lines = [logLine()];
            mockRuntimeLogsService.getByContainer.mockResolvedValue(lines);

            await expect(sut.getByContainer(query())).resolves.toBe(lines);
        });

        it('returns an empty list for a container that wrote nothing', async () => {
            mockRuntimeLogsService.getByContainer.mockResolvedValue([]);

            await expect(sut.getByContainer(query())).resolves.toEqual([]);
        });
    });

    describe('streamByContainer', () => {
        it('delegates to the service with the received container id', async () => {
            mockRuntimeLogsService.streamByContainer.mockResolvedValue(EMPTY);

            await sut.streamByContainer(containerId);

            expect(mockRuntimeLogsService.streamByContainer).toHaveBeenCalledTimes(1);
            expect(mockRuntimeLogsService.streamByContainer).toHaveBeenCalledWith(containerId);
        });

        it('wraps each line of the output into an SSE message with JSON-encoded data', async () => {
            const lines = [logLine({ text: 'first' }), logLine({ text: 'second', source: 'stderr' })];
            mockRuntimeLogsService.streamByContainer.mockResolvedValue(of(...lines));

            const received = await firstValueFrom((await sut.streamByContainer(containerId)).pipe(toArray()));

            expect(received).toEqual([
                { data: JSON.stringify(lines[0]) },
                { data: JSON.stringify(lines[1]) },
            ]);
        });

        it('gives an empty stream for a container that writes nothing any more', async () => {
            mockRuntimeLogsService.streamByContainer.mockResolvedValue(EMPTY);

            const received = await firstValueFrom((await sut.streamByContainer(containerId)).pipe(toArray()));

            expect(received).toEqual([]);
        });

        it('wraps a failure of the daemon into a ServiceUnavailableException', async () => {
            mockRuntimeLogsService.streamByContainer.mockRejectedValue(new DaemonUnreachableError());

            await expect(sut.streamByContainer(containerId)).rejects.toBeInstanceOf(ServiceUnavailableException);
        });

        it('answers that failure of the daemon with a 503', async () => {
            mockRuntimeLogsService.streamByContainer.mockRejectedValue(new DaemonUnreachableError());

            const error = await sut.streamByContainer(containerId).catch((caught: unknown) => caught);

            expect((error as ServiceUnavailableException).getStatus()).toBe(503);
        });

        it('includes remediation guidance in the wrapped error message', async () => {
            mockRuntimeLogsService.streamByContainer.mockRejectedValue(new DaemonUnreachableError());

            await expect(sut.streamByContainer(containerId)).rejects.toThrow(/Could not reach the server Docker daemon/);
        });

        it('chains the failure of the daemon as the cause, so the envelope carries its code', async () => {
            const daemonFailure = new DaemonUnreachableError({ cause: new Error('ECONNREFUSED') });
            mockRuntimeLogsService.streamByContainer.mockRejectedValue(daemonFailure);

            const error = await sut.streamByContainer(containerId).catch((caught: unknown) => caught);

            expect((error as Error).cause).toBe(daemonFailure);
            expect(((error as Error).cause as DaemonUnreachableError).code).toBe('DAEMON_UNREACHABLE');
        });

        it('rethrows a failure of the database unchanged, so the client receives a 500', async () => {
            const original = new Error('database connection terminated');
            mockRuntimeLogsService.streamByContainer.mockRejectedValue(original);

            await expect(sut.streamByContainer(containerId)).rejects.toBe(original);
        });

        it('rethrows any HttpException raised by the service unchanged', async () => {
            const original = new ForbiddenException('nope');
            mockRuntimeLogsService.streamByContainer.mockRejectedValue(original);

            await expect(sut.streamByContainer(containerId)).rejects.toBe(original);
        });
    });

    describe('telemetry event enrichment', () => {
        it('adds the container id of a read of the history', async () => {
            mockRuntimeLogsService.getByContainer.mockResolvedValue([]);

            const event = await runWithTelemetry({}, async () => {
                await sut.getByContainer(query());

                return getTelemetry();
            });

            expect(event).toMatchObject({ 'container.id': containerId });
        });

        it('adds the container id of a stream', async () => {
            mockRuntimeLogsService.streamByContainer.mockResolvedValue(EMPTY);

            const event = await runWithTelemetry({}, async () => {
                await sut.streamByContainer(containerId);

                return getTelemetry();
            });

            expect(event).toMatchObject({ 'container.id': containerId });
        });
    });
});
