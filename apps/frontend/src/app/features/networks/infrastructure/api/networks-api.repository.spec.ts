import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { Network } from '@gitpaas/contracts';

import { NetworksApiRepository } from './networks-api.repository';

import { environment } from '@environments/environment';

const SERVICE_ID = 'sv-1';

const NETWORK_ID = 'nw-1';

const SERVICE_NETWORKS_URL = `${environment.apiBaseUrl}/networks?serviceId=${SERVICE_ID}`;

const network: Network = {
    id: 'net-abc',
    name: 'api_default',
    driver: 'bridge',
    scope: 'local',
    internal: false,
    attachable: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    state: 'attached',
};

const bareNetwork: Network = {
    id: NETWORK_ID,
    name: 'backend',
    state: 'connected',
};

const declaredNetwork: Network = {
    id: 'net-def',
    name: 'cache',
    state: 'declared',
};

/**
 * Yields to the macrotask queue and flushes effects so resource signals settle.
 */
async function settle(): Promise<void> {
    await new Promise((resolve) => { setTimeout(resolve, 0); });
    TestBed.tick();
}

describe('NetworksApiRepository', () => {
    let repository: NetworksApiRepository;
    let httpMock: HttpTestingController;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [
                NetworksApiRepository,
                provideHttpClient(),
                provideHttpClientTesting(),
            ],
        });

        repository = TestBed.inject(NetworksApiRepository);
        httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => {
        httpMock.verify();
    });

    describe('networksByService', () => {
        test('GETs the networks URL scoped by the service and exposes the response', async () => {
            const resource = TestBed.runInInjectionContext(
                () => repository.networksByService(() => SERVICE_ID),
            );
            TestBed.tick();

            const req = httpMock.expectOne(SERVICE_NETWORKS_URL);
            expect(req.request.method).toBe('GET');
            req.flush([network]);
            await settle();

            expect(resource.value()).toEqual([network]);
        });

        test('exposes a row that carries no field of the daemon', async () => {
            const resource = TestBed.runInInjectionContext(
                () => repository.networksByService(() => SERVICE_ID),
            );
            TestBed.tick();

            httpMock.expectOne(SERVICE_NETWORKS_URL).flush([bareNetwork, declaredNetwork]);
            await settle();

            expect(resource.value()).toEqual([bareNetwork, declaredNetwork]);
        });

        test('re-requests the networks under the new service when the identifier changes', async () => {
            const serviceId = signal(SERVICE_ID);
            const resource = TestBed.runInInjectionContext(
                () => repository.networksByService(() => serviceId()),
            );
            TestBed.tick();

            httpMock.expectOne(SERVICE_NETWORKS_URL).flush([network]);
            await settle();

            serviceId.set('sv-2');
            TestBed.tick();

            const req = httpMock.expectOne(`${environment.apiBaseUrl}/networks?serviceId=sv-2`);
            expect(req.request.method).toBe('GET');
            req.flush([bareNetwork]);
            await settle();

            expect(resource.value()).toEqual([bareNetwork]);
        });

        test('issues no request while the service identifier is undefined', () => {
            const serviceId = signal<string | undefined>(undefined);
            const resource = TestBed.runInInjectionContext(
                () => repository.networksByService(() => serviceId()),
            );
            TestBed.tick();

            httpMock.expectNone(() => true);
            expect(resource.value()).toBeUndefined();
        });
    });
});
