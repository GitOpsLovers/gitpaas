import { errorEnvelopeSchema, readinessResultSchema, type ReadinessResult } from '@gitpaas/contracts';

import { ReadinessHealth } from '../domain/models/server-health.model';

import { readErrorPayloadUseCase } from './read-error-payload.use-case';

/**
 * Message shown when the readiness of the server could not be read at all.
 */
const UNREADABLE_MESSAGE = 'Could not read the health of the server.';

/**
 * Schema of the one field of the envelope that keeps the states of the dependencies.
 */
const envelopeDetailsSchema = errorEnvelopeSchema.pick({ details: true });

/**
 * Picks the readiness result out of the body of a failed reading.
 *
 * @param error Error reported by the resource of the readiness
 *
 * @returns The readiness result the body carries, or `null` when it carries none
 */
function readinessOfError(error: unknown): ReadinessResult | null {
    const { body } = readErrorPayloadUseCase(error);

    const result = readinessResultSchema.safeParse(body);

    if (result.success) {
        return result.data;
    }

    const envelope = envelopeDetailsSchema.safeParse(body);

    const details = readinessResultSchema.safeParse(envelope.success ? envelope.data.details : null);

    return details.success ? details.data : null;
}

/**
 * Maps the value and the error of the readiness read into the health the panel shows.
 *
 * @param value Body of the answer, when the answer arrived
 * @param error Error of the reading, when the answer failed
 *
 * @returns Health of the server as the panel shows it
 */
export function mapReadinessHealthUseCase(value: ReadinessResult | undefined, error: unknown): ReadinessHealth {
    const result = value ?? readinessOfError(error);

    if (!result) {
        return {
            read: false,
            ready: false,
            dependencies: [],
            message: UNREADABLE_MESSAGE,
        };
    }

    return {
        read: true,
        ready: result.status === 'ok' && result.dependencies.every((dependency) => dependency.status === 'up'),
        dependencies: result.dependencies,
        message: null,
    };
}
