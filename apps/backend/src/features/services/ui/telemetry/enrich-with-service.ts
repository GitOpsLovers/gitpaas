import { Service } from '../../domain/models/service.models';

import { enrichTelemetry } from '@core/infrastructure/telemetry/telemetry.context';
import { getServiceSlug } from '@shared/application/get-service-slug.use-case';

/**
 * Adds the business context of a service to the telemetry event of the current request.
 *
 * @param service Service the request resolved
 */
export function enrichWithService(service: Service): void {
    enrichTelemetry({
        'service.id': service.id,
        'service.slug': getServiceSlug(service),
        'project.id': service.projectId,
    });
}
