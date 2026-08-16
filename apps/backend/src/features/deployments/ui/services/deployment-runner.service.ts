import { Inject, Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EMPTY, Subscription, catchError, concatMap, from, groupBy, mergeMap } from 'rxjs';

import { runDeploymentUseCase } from '../../application/run-deployment.use-case';
import type { QueuedDeploymentTask } from '../../domain/models/queued-deployment-task.models';
import { MAX_ATTEMPTS, type DeploymentQueue } from '../../domain/ports/deployment-queue.port';
import type { DockerExecutor } from '../../domain/ports/docker-executor.port';
import type { DeploymentsRepository } from '../../domain/repositories/deployments.repository';
import { DatabaseDeploymentQueueAdapter } from '../../infrastructure/database/db-deployment-queue.adapter';
import { DatabaseDeploymentsRepository } from '../../infrastructure/database/db-deployments.repository';
import { DockerExecutorAdapter } from '../../infrastructure/docker/docker-executor.adapter';
import { buildDeploymentRunSeed } from '../telemetry/build-deployment-run-seed';

import { shouldKeepTelemetryUseCase } from '@core/application/should-keep-telemetry.use-case';
import { truncateStackUseCase } from '@core/application/truncate-stack.use-case';
import { TELEMETRY_DEFAULT_SAMPLE_RATE, TELEMETRY_DEFAULT_SLOW_MS } from '@core/domain/constants/telemetry.constants';
import { DomainError } from '@core/domain/errors/domain.error';
import type { TelemetryEvent } from '@core/domain/models/telemetry.models';
import type { AppLogger } from '@core/domain/ports/app-logger.port';
import type { TelemetryWriter } from '@core/domain/ports/telemetry-writer.port';
import { NestLoggerAdapter } from '@core/infrastructure/logging/nest-logger.adapter';
import { StdoutTelemetryWriterAdapter } from '@core/infrastructure/telemetry/stdout-telemetry-writer.adapter';
import { enrichTelemetry, getTelemetry, runWithTelemetry } from '@core/infrastructure/telemetry/telemetry.context';
import type { LogStore } from '@features/logs/domain/ports/log-store.port';
import { RedisLogStoreAdapter } from '@features/logs/infrastructure/redis/redis-log-store.adapter';
import type { ProviderClient } from '@features/providers/domain/ports/provider-client.port';
import type { ProvidersRepository } from '@features/providers/domain/repositories/providers.repository';
import { DatabaseProvidersRepository } from '@features/providers/infrastructure/database/db-providers.repository';
import { GithubProviderClientAdapter } from '@features/providers/infrastructure/github/github-provider-client.adapter';
import type { ServicesRepository } from '@features/services/domain/repositories/services.repository';
import { DatabaseServicesRepository } from '@features/services/infrastructure/database/db-services.repository';

/**
 * Nanoseconds in one millisecond, used to turn the monotonic clock into a duration.
 */
const NANOSECONDS_PER_MILLISECOND = 1_000_000;

/**
 * Deployment runner.
 */
@Injectable()
export class DeploymentRunnerService implements OnModuleInit, OnModuleDestroy {
    private subscription?: Subscription;

    private readonly slowMs: number;

    private readonly sampleRate: number;

    constructor(
        @Inject(DatabaseDeploymentsRepository)
        private readonly deploymentsRepository: DeploymentsRepository,
        @Inject(DatabaseServicesRepository)
        private readonly servicesRepository: ServicesRepository,
        @Inject(DatabaseProvidersRepository)
        private readonly providersRepository: ProvidersRepository,
        @Inject(GithubProviderClientAdapter)
        private readonly providerClient: ProviderClient,
        @Inject(DockerExecutorAdapter)
        private readonly dockerExecutor: DockerExecutor,
        @Inject(RedisLogStoreAdapter)
        private readonly logStore: LogStore,
        @Inject(DatabaseDeploymentQueueAdapter)
        private readonly deploymentQueue: DeploymentQueue,
        @Inject(NestLoggerAdapter)
        private readonly logger: AppLogger,
        @Inject(StdoutTelemetryWriterAdapter)
        private readonly telemetryWriter: TelemetryWriter,
        config: ConfigService,
    ) {
        this.slowMs = config.get<number>('TELEMETRY_SLOW_MS', TELEMETRY_DEFAULT_SLOW_MS);
        this.sampleRate = config.get<number>('TELEMETRY_SAMPLE_RATE', TELEMETRY_DEFAULT_SAMPLE_RATE);
    }

    /**
     * Subscribes to deployment-run requests when the module starts.
     */
    public async onModuleInit(): Promise<void> {
        this.subscription = this.deploymentQueue.dequeued$
            .pipe(
                groupBy((task) => task.projectName),
                mergeMap((group) =>
                    group.pipe(
                        concatMap((task) =>
                            from(this.run(task)).pipe(
                                catchError((error: unknown) => {
                                    this.logger.error(
                                        `Deployment runner failed unrecoverably for ${task.deploymentId}: ${this.resolveMessage(error)}`,
                                        error,
                                        DeploymentRunnerService.name,
                                    );

                                    return EMPTY;
                                }),
                            )),
                    )),
            )
            .subscribe();

        await this.deploymentQueue.recoverPending();
    }

    /**
     * Tears down the bus subscription when the module is destroyed.
     */
    public onModuleDestroy(): void {
        this.subscription?.unsubscribe();
    }

    /**
     * Runs a single deployment inside its own telemetry scope, emitting one event for the run.
     *
     * @param task Queued deployment task
     */
    private async run(task: QueuedDeploymentTask): Promise<void> {
        const startedAt = process.hrtime.bigint();
        const seed = buildDeploymentRunSeed(task);

        await runWithTelemetry(seed, async () => {
            const enrichment = getTelemetry();

            try {
                await this.deploymentQueue.markProcessing(task.id);

                await runDeploymentUseCase(
                    this.deploymentsRepository,
                    this.servicesRepository,
                    this.providersRepository,
                    this.providerClient,
                    this.dockerExecutor,
                    this.logStore,
                    task,
                );

                await this.deploymentQueue.markCompleted(task.id);

                enrichTelemetry({ 'deployment.status': 'success' });
            } catch (error) {
                const message = this.resolveMessage(error);

                enrichTelemetry({
                    'deployment.status': 'failed',
                    ...this.buildErrorFields(error, task),
                });

                try {
                    await this.deploymentQueue.markFailed(task.id, message);
                } catch (markFailedError) {
                    enrichTelemetry({
                        'error.message': `${message}; could not mark the task failed: ${this.resolveMessage(markFailedError)}`,
                    });
                }
            }

            const durationNs = process.hrtime.bigint() - startedAt;

            const event: TelemetryEvent = {
                ...seed,
                ...enrichment,
                timestamp: new Date().toISOString(),
                'task.duration_ms': Number(durationNs) / NANOSECONDS_PER_MILLISECOND,
            };

            const decision = shouldKeepTelemetryUseCase(
                event,
                this.slowMs,
                this.sampleRate,
                Math.random(),
            );

            if (decision.kept) {
                this.telemetryWriter.emit({
                    ...event,
                    'sampling.kept_reason': decision.reason,
                    'sampling.rate': decision.rate,
                });
            }
        });
    }

    /**
     * Builds the error fields the failed run publishes on its telemetry event.
     *
     * @param error Error that ended the run
     * @param task Queued deployment task that failed
     *
     * @returns The `error.*` fields of the failure
     */
    private buildErrorFields(error: unknown, task: QueuedDeploymentTask): Partial<TelemetryEvent> {
        const stack = error instanceof Error ? error.stack : undefined;

        return {
            'error.type': error instanceof Error ? error.constructor.name : typeof error,
            ...(error instanceof DomainError ? { 'error.code': error.code } : {}),
            'error.message': this.resolveMessage(error),
            ...(stack === undefined ? {} : { 'error.stack': truncateStackUseCase(stack) }),
            'error.retriable': task.attempts + 1 < MAX_ATTEMPTS,
        };
    }

    /**
     * Message of a thrown value.
     *
     * @param error Thrown value
     *
     * @returns Message of the error
     */
    private resolveMessage(error: unknown): string {
        return error instanceof Error ? error.message : String(error);
    }
}
