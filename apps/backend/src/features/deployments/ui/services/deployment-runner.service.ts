import { Inject, Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
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
import { DomainError } from '@core/domain/errors/domain.error';
import type { TelemetryEvent } from '@core/domain/models/telemetry.models';
import type { AppLogger } from '@core/domain/ports/app-logger.port';
import type { TelemetryWriter } from '@core/domain/ports/telemetry-writer.port';
import { NestLoggerAdapter } from '@core/infrastructure/logging/nest-logger.adapter';
import { StdoutTelemetryWriterAdapter } from '@core/infrastructure/telemetry/stdout-telemetry-writer.adapter';
import { enrichTelemetry, getTelemetry, runWithTelemetry } from '@core/infrastructure/telemetry/telemetry.context';
import type { LogStore } from '@features/logs/domain/ports/log-store.port';
import { RedisLogStoreAdapter } from '@features/logs/infrastructure/redis/redis-log-store.adapter';
import type { SourceControl } from '@features/source-control/domain/ports/source-control.port';
import { GithubSourceControlAdapter } from '@features/source-control/infrastructure/github/github-source-control.adapter';

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

    constructor(
        @Inject(DatabaseDeploymentsRepository)
        private readonly deploymentsRepository: DeploymentsRepository,
        @Inject(GithubSourceControlAdapter)
        private readonly sourceControl: SourceControl,
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
    ) {}

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
                    this.sourceControl,
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

            if (shouldKeepTelemetryUseCase(event)) {
                this.telemetryWriter.emit(event);
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
            ...(stack === undefined ? {} : { 'error.stack': stack }),
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
