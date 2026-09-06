import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import type { DockerContainer, DockerImage, DockerNetwork, DockerVolume } from '@gitpaas/contracts';

import { DockerApiRepository } from './docker-api.repository';

import { environment } from '@environments/environment';

const BASE_URL = `${environment.apiBaseUrl}/docker`;

const container: DockerContainer = {
    id: 'c-1',
    names: ['gitpaas-api'],
    image: 'gitpaas/api:1.4.0',
    state: 'running',
    status: 'Up 2 hours',
    createdAt: '2026-09-01T10:00:00.000Z',
    ports: [{ privatePort: 3000, publicPort: 8080, type: 'tcp' }],
    networks: ['gitpaas'],
    mounts: [{
        name: 'gitpaas-data', type: 'volume', source: '/var/lib/docker/volumes/gitpaas-data/_data', destination: '/data', readOnly: false,
    }],
};

const image: DockerImage = {
    id: 'sha256:1111111111112222',
    tags: ['gitpaas/api:1.4.0'],
    size: 1_572_864,
    createdAt: '2026-08-30T09:00:00.000Z',
};

const volume: DockerVolume = {
    name: 'gitpaas-data',
    driver: 'local',
    mountpoint: '/var/lib/docker/volumes/gitpaas-data/_data',
    scope: 'local',
    labels: {},
    createdAt: '2026-08-30T09:00:00.000Z',
};

const network: DockerNetwork = {
    id: 'n-1',
    name: 'gitpaas',
    driver: 'bridge',
    scope: 'local',
    internal: false,
    attachable: true,
    createdAt: '2026-08-30T09:00:00.000Z',
    labels: {},
};

/**
 * Yields to the macrotask queue and flushes effects so resource signals settle.
 */
async function settle(): Promise<void> {
    await new Promise((resolve) => { setTimeout(resolve, 0); });
    TestBed.tick();
}

describe('DockerApiRepository', () => {
    let repository: DockerApiRepository;
    let httpMock: HttpTestingController;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [
                DockerApiRepository,
                provideHttpClient(),
                provideHttpClientTesting(),
            ],
        });

        repository = TestBed.inject(DockerApiRepository);
        httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => {
        httpMock.verify();
    });

    describe('containers', () => {
        test('reads every container of the host, the stopped ones included', async () => {
            const resource = TestBed.runInInjectionContext(() => repository.containers());
            TestBed.tick();

            const req = httpMock.expectOne(`${BASE_URL}/containers`);
            expect(req.request.method).toBe('GET');
            req.flush([container]);

            await settle();

            expect(resource.value()).toEqual([container]);
        });
    });

    describe('images', () => {
        test('reads every image of the host', async () => {
            const resource = TestBed.runInInjectionContext(() => repository.images());
            TestBed.tick();

            const req = httpMock.expectOne(`${BASE_URL}/images`);
            expect(req.request.method).toBe('GET');
            req.flush([image]);

            await settle();

            expect(resource.value()).toEqual([image]);
        });
    });

    describe('volumes', () => {
        test('reads every volume of the host', async () => {
            const resource = TestBed.runInInjectionContext(() => repository.volumes());
            TestBed.tick();

            const req = httpMock.expectOne(`${BASE_URL}/volumes`);
            expect(req.request.method).toBe('GET');
            req.flush([volume]);

            await settle();

            expect(resource.value()).toEqual([volume]);
        });
    });

    describe('networks', () => {
        test('reads every network of the host', async () => {
            const resource = TestBed.runInInjectionContext(() => repository.networks());
            TestBed.tick();

            const req = httpMock.expectOne(`${BASE_URL}/networks`);
            expect(req.request.method).toBe('GET');
            req.flush([network]);

            await settle();

            expect(resource.value()).toEqual([network]);
        });
    });
});
