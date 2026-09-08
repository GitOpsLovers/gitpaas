// eslint-disable-next-line import/no-unassigned-import
import 'reflect-metadata';

import type { Reflector } from '@nestjs/core';
import { ThrottlerGuard, type ThrottlerStorage } from '@nestjs/throttler';

import { ClientAddressThrottlerGuard } from '../client-address-throttler.guard';

/** Shape that exposes the protected tracker of the guard to the spec. */
interface TrackerReader { getTracker: (request: Record<string, unknown>) => Promise<string> }

/** Builds the guard over empty options, since only its tracker is under test. */
const buildGuard = (): ClientAddressThrottlerGuard =>
    new ClientAddressThrottlerGuard(
        [],
        {} as unknown as ThrottlerStorage,
        {} as unknown as Reflector,
    );

describe('ClientAddressThrottlerGuard', () => {
    it('extends the guard of the throttler, so it keeps its whole behaviour', () => {
        expect(buildGuard()).toBeInstanceOf(ThrottlerGuard);
    });

    it('counts a request against the address Express resolved', async () => {
        const tracker = await (buildGuard() as unknown as TrackerReader).getTracker({ ip: '203.0.113.7' });

        expect(tracker).toBe('203.0.113.7');
    });

    it('never counts a request against the header of the proxy itself', async () => {
        const tracker = await (buildGuard() as unknown as TrackerReader).getTracker({
            ip: '203.0.113.7',
            headers: { 'x-forwarded-for': '198.51.100.9' },
        });

        expect(tracker).toBe('203.0.113.7');
    });

    it('counts an IPv6 client by its network of 64 bits', async () => {
        const tracker = await (buildGuard() as unknown as TrackerReader).getTracker({
            ip: '2001:db8:1234:5678::1',
        });

        expect(tracker).toBe('2001:db8:1234:5678::/64');
    });

    it('falls back to one tracker when the request carries no address', async () => {
        const tracker = await (buildGuard() as unknown as TrackerReader).getTracker({});

        expect(tracker).toBe('unknown');
    });
});
