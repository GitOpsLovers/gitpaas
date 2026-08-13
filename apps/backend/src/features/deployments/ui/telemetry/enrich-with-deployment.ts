import { Deployment } from '../../domain/models/deployment.models';

import { enrichTelemetry } from '@core/infrastructure/telemetry/telemetry.context';

/**
 * Adds the business context of a deployment to the telemetry event of the current request.
 *
 * @param deployment Deployment the request resolved
 */
export function enrichWithDeployment(deployment: Deployment): void {
    enrichTelemetry({
        'service.id': deployment.serviceId,
        'deployment.id': deployment.id,
        'deployment.status': deployment.status,
        'deployment.branch': deployment.branch,
        'deployment.trigger': deployment.triggeredBy,
        'deployment.compose_path': deployment.composerPath,
        ...(deployment.commit === null ? {} : { 'deployment.commit': deployment.commit }),
    });
}
