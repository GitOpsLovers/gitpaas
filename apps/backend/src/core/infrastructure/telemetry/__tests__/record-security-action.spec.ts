import {
    SECURITY_ACTION_DEPLOYMENT,
    SECURITY_ACTION_LOGIN,
    SECURITY_ACTION_LOGIN_FAILED,
    SECURITY_ACTION_PROVIDER_CREDENTIAL_CHANGE,
    SECURITY_ACTION_SECRET_CHANGE,
} from '../../../domain/constants/telemetry.constants';
import type { TelemetrySecurityAction } from '../../../domain/models/telemetry.models';
import { recordSecurityAction } from '../record-security-action';
import { getTelemetry, runWithTelemetry } from '../telemetry.context';

describe('recordSecurityAction', () => {
    it('names the sensitive action on the event of the current unit of work', () => {
        const event = runWithTelemetry({ 'request.id': 'correlation-id' }, () => {
            recordSecurityAction(SECURITY_ACTION_LOGIN);

            return getTelemetry();
        });

        expect(event).toEqual({ 'request.id': 'correlation-id', 'security.action': 'login' });
    });

    const actions: TelemetrySecurityAction[] = [
        SECURITY_ACTION_LOGIN,
        SECURITY_ACTION_LOGIN_FAILED,
        SECURITY_ACTION_PROVIDER_CREDENTIAL_CHANGE,
        SECURITY_ACTION_SECRET_CHANGE,
        SECURITY_ACTION_DEPLOYMENT,
    ];

    it.each(actions)('publishes %s as the value of the field', (action) => {
        const event = runWithTelemetry({}, () => {
            recordSecurityAction(action);

            return getTelemetry();
        });

        expect(event).toEqual({ 'security.action': action });
    });

    it('keeps the last action when a unit of work performs two', () => {
        const event = runWithTelemetry({}, () => {
            recordSecurityAction(SECURITY_ACTION_LOGIN_FAILED);
            recordSecurityAction(SECURITY_ACTION_LOGIN);

            return getTelemetry();
        });

        expect(event).toEqual({ 'security.action': 'login' });
    });

    it('does nothing outside a unit of work', () => {
        expect(() => { recordSecurityAction(SECURITY_ACTION_DEPLOYMENT); }).not.toThrow();
        expect(getTelemetry()).toBeUndefined();
    });
});
