import { hostname } from 'node:os';

import { QueuedDeploymentTask } from '../../domain/models/queued-deployment-task.models';

import { DEPLOYMENT_RUN_EVENT_NAME, TELEMETRY_SERVICE_NAME } from '@core/domain/constants/telemetry.constants';
import type { TelemetryEvent } from '@core/domain/models/telemetry.models';
import { resolveServiceVersion } from '@core/infrastructure/telemetry/resolve-service-version';

/**
 * Builds the fields known the moment the runner picks a queued task up.
 *
 * @param task Queued deployment task about to run
 *
 * @returns The seed of the telemetry event of the background run
 */
export function buildDeploymentRunSeed(task: QueuedDeploymentTask): TelemetryEvent {
    return {
        timestamp: new Date().toISOString(),
        'event.name': DEPLOYMENT_RUN_EVENT_NAME,
        'service.name': TELEMETRY_SERVICE_NAME,
        'service.version': resolveServiceVersion(),
        'service.env': process.env.NODE_ENV ?? 'development',
        'host.name': hostname(),
        'process.pid': process.pid,
        'trace.id': task.parentRequestId ?? task.id,
        'task.id': task.id,
        ...(task.parentRequestId === null ? {} : { 'parent.request_id': task.parentRequestId }),
        'deployment.id': task.deploymentId,
        'deployment.commit': task.commit,
        'deployment.compose_path': task.composerPath,
        'deployment.attempt': task.attempts + 1,
        'docker.project': task.projectName,
    };
}
