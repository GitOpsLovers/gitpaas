import type { TelemetrySecurityAction } from '../../domain/models/telemetry.models';

import { enrichTelemetry } from './telemetry.context';

/**
 * Names the sensitive action of the current unit of work on its telemetry event.
 *
 * @param action Sensitive action the unit of work performed
 */
export function recordSecurityAction(action: TelemetrySecurityAction): void {
    enrichTelemetry({ 'security.action': action });
}
