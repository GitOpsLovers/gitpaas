import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { Network, ProjectNetwork } from '@gitpaas/contracts';

import { NetworksApiRepository } from './networks-api.repository';

import { environment } from '@environments/environment';

const SERVICE_ID = 'sv-1';

const PROJECT_ID = 'pr-1';

const NETWORK_ID = 'nw-1';

const SERVICE_NETWORKS_URL = `${environment.apiBaseUrl}/networks?serviceId=${SERVICE_ID}`;

const PROJECT_NETWORKS_URL = `${environment.apiBaseUrl}/projects/${PROJECT_ID}/networks`;

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

const joiningNetwork: Network = {
    id: NETWORK_ID,
    name: 'backend',
    state: 'joining',
};

const leavingNetwork: Network = {
    id: 'net-def',
    name: 'cache',
    state: 'leaving',
};

const projectNetwork: ProjectNetwork = {
    id: NETWORK_ID,
    projectId: PROJECT_ID,
    name: 'backend',
    daemonName: `gitpaas-${PROJECT_ID}-${NETWORK_ID}`,
    state: 'ready',
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

        test('exposes a joining row and a leaving row, which carry no field of the daemon', async () => {
            const resource = TestBed.runInInjectionContext(
                () => repository.networksByService(() => SERVICE_ID),
            );
            TestBed.tick();

            httpMock.expectOne(SERVICE_NETWORKS_URL).flush([joiningNetwork, leavingNetwork]);
            await settle();

            expect(resource.value()).toEqual([joiningNetwork, leavingNetwork]);
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
            req.flush([joiningNetwork]);
            await settle();

            expect(resource.value()).toEqual([joiningNetwork]);
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

    describe('networksByProject', () => {
        test('GETs the networks URL of the project and exposes the response', async () => {
            const resource = TestBed.runInInjectionContext(
                () => repository.networksByProject(() => PROJECT_ID),
            );
            TestBed.tick();

            const req = httpMock.expectOne(PROJECT_NETWORKS_URL);
            expect(req.request.method).toBe('GET');
            req.flush([projectNetwork]);
            await settle();

            expect(resource.value()).toEqual([projectNetwork]);
        });

        test('re-requests the collection under the new project when the identifier changes', async () => {
            const projectId = signal(PROJECT_ID);
            const resource = TestBed.runInInjectionContext(
                () => repository.networksByProject(() => projectId()),
            );
            TestBed.tick();

            httpMock.expectOne(PROJECT_NETWORKS_URL).flush([projectNetwork]);
            await settle();

            projectId.set('pr-2');
            TestBed.tick();

            const req = httpMock.expectOne(`${environment.apiBaseUrl}/projects/pr-2/networks`);
            expect(req.request.method).toBe('GET');
            req.flush([]);
            await settle();

            expect(resource.value()).toEqual([]);
        });

        test('issues no request while the project identifier is undefined', () => {
            const projectId = signal<string | undefined>(undefined);
            const resource = TestBed.runInInjectionContext(
                () => repository.networksByProject(() => projectId()),
            );
            TestBed.tick();

            httpMock.expectNone(() => true);
            expect(resource.value()).toBeUndefined();
        });
    });

    describe('createProjectNetwork', () => {
        test('POSTs the name to the networks URL of the given project', () => {
            let result: ProjectNetwork | undefined;

            repository.createProjectNetwork(PROJECT_ID, { name: 'backend' })
                .subscribe((value) => { result = value; });

            const req = httpMock.expectOne(PROJECT_NETWORKS_URL);
            expect(req.request.method).toBe('POST');
            expect(req.request.body).toEqual({ name: 'backend' });
            req.flush(projectNetwork);

            expect(result).toEqual(projectNetwork);
        });
    });

    describe('renameProjectNetwork', () => {
        test('PUTs the name to the URL of that network', () => {
            let result: ProjectNetwork | undefined;

            repository.renameProjectNetwork(PROJECT_ID, NETWORK_ID, { name: 'renamed' })
                .subscribe((value) => { result = value; });

            const req = httpMock.expectOne(`${PROJECT_NETWORKS_URL}/${NETWORK_ID}`);
            expect(req.request.method).toBe('PUT');
            expect(req.request.body).toEqual({ name: 'renamed' });
            req.flush({ ...projectNetwork, name: 'renamed' });

            expect(result).toEqual({ ...projectNetwork, name: 'renamed' });
        });
    });

    describe('removeProjectNetwork', () => {
        test('DELETEs the URL of that network', () => {
            repository.removeProjectNetwork(PROJECT_ID, NETWORK_ID).subscribe();

            const req = httpMock.expectOne(`${PROJECT_NETWORKS_URL}/${NETWORK_ID}`);
            expect(req.request.method).toBe('DELETE');
            req.flush(null);
        });
    });

    describe('joinProjectNetwork', () => {
        test('POSTs the service to the services URL of that network', () => {
            repository.joinProjectNetwork(PROJECT_ID, NETWORK_ID, { serviceId: SERVICE_ID }).subscribe();

            const req = httpMock.expectOne(`${PROJECT_NETWORKS_URL}/${NETWORK_ID}/services`);
            expect(req.request.method).toBe('POST');
            expect(req.request.body).toEqual({ serviceId: SERVICE_ID });
            req.flush(null);
        });
    });
});
